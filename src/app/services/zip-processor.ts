import { inject, Injectable } from '@angular/core';
import JSZip from 'jszip';
import { SpecType, SuwimlServiceProperties, UnpackedFile, ZipAnalysisResult } from '../models/gitlab.models';
import { ServicePropertiesParser } from './service-properties-parser';

@Injectable({
  providedIn: 'root'
})
export class ZipProcessor {
  private readonly servicePropertiesParser = inject(ServicePropertiesParser);

  private readonly TEXT_EXTENSIONS = new Set([
    'wsdl', 'xml', 'xsd', 'json', 'yaml', 'yml', 'properties', 'proto',
    'md', 'txt', 'csv', 'graphql', 'html', 'css', 'js', 'ts', 'sh', 'env'
  ]);

  /**
   * Process a zip file from user upload or ArrayBuffer
   */
  async processZipFile(fileOrBuffer: File | ArrayBuffer, fileName = 'archive.zip'): Promise<ZipAnalysisResult> {
    const buffer = fileOrBuffer instanceof File ? await fileOrBuffer.arrayBuffer() : fileOrBuffer;
    const fileSize = buffer.byteLength;

    const zip = await JSZip.loadAsync(buffer);
    const unpackedFiles: UnpackedFile[] = [];

    let crlfCount = 0;
    let bomCount = 0;
    let filteredMacArtifactsCount = 0;

    const entries = Object.keys(zip.files).sort();

    for (const relativePath of entries) {
      const entry = zip.files[relativePath];
      if (entry.dir) continue; // Skip directory entries

      // Filter out any '__MACOSX' root directories and '.DS_Store' files
      if (this.isMacOsArtifact(relativePath)) {
        filteredMacArtifactsCount++;
        continue;
      }

      const ext = relativePath.split('.').pop()?.toLowerCase() || '';
      const name = relativePath.split('/').pop() || relativePath;
      const isBinary = !this.isTextExtension(ext);

      if (isBinary) {
        // Handle binary files (e.g. images, certs) as base64 or placeholder
        const base64Content = await entry.async('base64');
        unpackedFiles.push({
          path: relativePath,
          name,
          extension: ext,
          content: base64Content,
          originalContent: base64Content,
          originalLineEnding: 'none',
          hasBom: false,
          isBinary: true,
          size: base64Content.length,
          isNormalized: false,
          selectedForCommit: true
        });
      } else {
        // Read as text
        const rawText = await entry.async('string');
        const size = rawText.length;

        // Check for BOM
        const hasBom = rawText.charCodeAt(0) === 0xFEFF;
        if (hasBom) bomCount++;

        // Detect line endings
        const textWithoutBom = hasBom ? rawText.slice(1) : rawText;
        const hasCrlf = textWithoutBom.includes('\r\n');
        const hasLoneLf = textWithoutBom.replace(/\r\n/g, '').includes('\n');
        
        let originalLineEnding: 'crlf' | 'lf' | 'mixed' | 'none' = 'none';
        if (hasCrlf && hasLoneLf) {
          originalLineEnding = 'mixed';
          crlfCount++;
        } else if (hasCrlf) {
          originalLineEnding = 'crlf';
          crlfCount++;
        } else if (hasLoneLf) {
          originalLineEnding = 'lf';
        }

        // Normalize text to Unix LF
        const normalizedContent = textWithoutBom.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
        const isNormalized = (originalLineEnding === 'crlf' || originalLineEnding === 'mixed' || hasBom);

        unpackedFiles.push({
          path: relativePath,
          name,
          extension: ext,
          content: normalizedContent,
          originalContent: rawText,
          originalLineEnding,
          hasBom,
          isBinary: false,
          size,
          isNormalized,
          selectedForCommit: true
        });
      }
    }

    // Inspect specifications
    const analysis = this.analyzeSpecifications(unpackedFiles);

    return {
      fileName: fileOrBuffer instanceof File ? fileOrBuffer.name : fileName,
      fileSize,
      files: unpackedFiles,
      detectedSpecType: analysis.detectedSpecType,
      primarySpecPath: analysis.primarySpecPath,
      totalFiles: unpackedFiles.length,
      crlfCount,
      bomCount,
      filteredMacArtifactsCount,
      detectedOperations: analysis.operations,
      targetNamespace: analysis.targetNamespace,
      suwimlHeaderVersion: analysis.suwimlHeaderVersion,
      suwimlFaultVersion: analysis.suwimlFaultVersion,
      serviceProperties: analysis.serviceProperties,
      parsedSummary: analysis.summary
    };
  }

  /**
   * Identifies macOS archive artifacts that must be filtered out:
   * 1. Any entry within a '__MACOSX' root directory or path segment
   * 2. Any '.DS_Store' file (case-insensitive, root or nested within folders)
   */
  isMacOsArtifact(relativePath: string): boolean {
    const normalized = relativePath.replace(/\\/g, '/').replace(/^\.\//, '');
    const segments = normalized.split('/');
    const fileName = segments[segments.length - 1];

    // Filter out '__MACOSX' root directory or any nested '__MACOSX' directory
    if (segments[0] === '__MACOSX' || segments.includes('__MACOSX')) {
      return true;
    }

    // Filter out '.DS_Store' or AppleDouble '._.DS_Store' files anywhere in archive
    if (fileName.toLowerCase() === '.ds_store' || fileName.toLowerCase() === '._.ds_store') {
      return true;
    }

    return false;
  }

  private isTextExtension(ext: string): boolean {
    return this.TEXT_EXTENSIONS.has(ext);
  }

  private analyzeSpecifications(files: UnpackedFile[]): {
    detectedSpecType: SpecType;
    primarySpecPath: string;
    operations: string[];
    targetNamespace?: string;
    suwimlHeaderVersion?: string;
    suwimlFaultVersion?: string;
    serviceProperties?: SuwimlServiceProperties;
    summary: string;
  } {
    let detectedSpecType: SpecType = 'unknown';
    let primarySpecPath = '';
    const operations: string[] = [];
    let targetNamespace: string | undefined;
    let suwimlHeaderVersion: string | undefined;
    let suwimlFaultVersion: string | undefined;
    let serviceProperties: SuwimlServiceProperties | undefined;

    // Check for generated-reference/nl/bkwi/specification/wsdl/*/service.properties
    const servicePropFile = files.find(f =>
      f.name === 'service.properties' ||
      f.path.includes('service.properties')
    );

    if (servicePropFile) {
      serviceProperties = this.servicePropertiesParser.parse(servicePropFile.content, servicePropFile.path);
      primarySpecPath = servicePropFile.path;
      if (serviceProperties.operations && serviceProperties.operations.length > 0) {
        operations.push(...serviceProperties.operations);
      }
      if (serviceProperties.headerVersionAbbr && serviceProperties.headerVersionAbbr !== '—') {
        suwimlHeaderVersion = serviceProperties.headerVersionAbbr;
      }
      if (serviceProperties.fwiVersionAbbr && serviceProperties.fwiVersionAbbr !== '—') {
        suwimlFaultVersion = serviceProperties.fwiVersionAbbr;
      }

      // Rule: Only wsdl projects with either a SuwiML header or fault version should be considered a SuwiML project,
      // other wsdl projects are non-SuwiML soap projects.
      const hasHeader = !!(serviceProperties.headerRaw && serviceProperties.headerRaw.trim());
      const hasFault = !!(serviceProperties.fwiRaw && serviceProperties.fwiRaw.trim());
      detectedSpecType = (hasHeader || hasFault) ? 'suwiml' : 'soap';
    } else {
      // Rule: Only project not having the wsdl service.properties but having src/main/resources/nl/bkwi/specification/openapi/*.yaml
      // should be considered an openapi project.
      const openApiFile = files.find(f =>
        (f.path.startsWith('src/main/resources/nl/bkwi/specification/openapi/') ||
         f.path.includes('specification/openapi/')) &&
        (f.name.endsWith('.yaml') || f.name.endsWith('.yml'))
      );

      if (openApiFile) {
        detectedSpecType = 'openapi';
        primarySpecPath = openApiFile.path;
        const content = openApiFile.content;
        const pathMatches = content.matchAll(/^\s{2}(\/[a-zA-Z0-9_\-{}/.]+):\s*$/gm);
        for (const match of pathMatches) {
          operations.push(`ROUTE ${match[1]}`);
        }
      } else {
        // Projects which are not a SuwiML project, non-suwiml soap or openapi should be considered of type unknown
        detectedSpecType = 'unknown';
      }
    }

    let summary = '';
    if (detectedSpecType === 'suwiml') {
      summary = `SuwiML Contract: ${serviceProperties?.serviceName || 'Service'} (${operations.length} operations, FWI ${suwimlFaultVersion || '—'}, Header ${suwimlHeaderVersion || '—'})`;
    } else if (detectedSpecType === 'soap') {
      summary = `Non-SuwiML SOAP Contract: ${serviceProperties?.serviceName || 'Service'} (${operations.length} operations)`;
    } else if (detectedSpecType === 'openapi') {
      summary = `OpenAPI 3.x Specification (${operations.length} endpoints)`;
    } else {
      summary = `Unclassified / Unknown project (${files.length} files unpacked)`;
    }

    return {
      detectedSpecType,
      primarySpecPath: primarySpecPath || (files[0]?.path ?? ''),
      operations,
      targetNamespace,
      suwimlHeaderVersion,
      suwimlFaultVersion,
      serviceProperties,
      summary
    };
  }

  /**
   * Generates a sample zip archive for quick demonstration and testing
   */
  async generateSampleZip(type: 'suwiml' | 'openapi' | 'macos-sample', withWindowsCrlf = true): Promise<File> {
    const zip = new JSZip();
    const eol = withWindowsCrlf ? '\r\n' : '\n';

    if (type === 'macos-sample') {
      const wsdlContent = [
        '<?xml version="1.0" encoding="UTF-8"?>',
        '<definitions xmlns="http://schemas.xmlsoap.org/wsdl/"',
        '             xmlns:soap="http://schemas.xmlsoap.org/wsdl/soap/"',
        '             xmlns:tns="http://suwiml.suwinet.nl/services/aow/v0401"',
        '             xmlns:suwi="http://suwiml.suwinet.nl/headers/v0401"',
        '             targetNamespace="http://suwiml.suwinet.nl/services/aow/v0401"',
        '             name="SVB-AOW-Inkomsten-v0401">',
        '  <types>',
        '    <xsd:schema xmlns:xsd="http://www.w3.org/2001/XMLSchema">',
        '      <xsd:import namespace="http://suwiml.suwinet.nl/services/aow/v0401" schemaLocation="schemas/aow-types.xsd"/>',
        '    </xsd:schema>',
        '  </types>',
        '  <message name="RaadpleegAOWStatusRequest">',
        '    <part name="parameters" element="tns:RaadpleegAOWStatus"/>',
        '  </message>',
        '  <message name="RaadpleegAOWStatusResponse">',
        '    <part name="parameters" element="tns:RaadpleegAOWStatusResponse"/>',
        '  </message>',
        '  <portType name="AOWInkomstenPortType">',
        '    <operation name="RaadpleegAOWStatus">',
        '      <input message="tns:RaadpleegAOWStatusRequest"/>',
        '      <output message="tns:RaadpleegAOWStatusResponse"/>',
        '    </operation>',
        '  </portType>',
        '</definitions>'
      ].join(eol);

      zip.file('specs/SVB-AOW-Inkomsten-v0401.wsdl', wsdlContent);
      zip.file('README.md', `# SVB AOW Inkomsten v0401 (macOS export)${eol}Archive exported on macOS.${eol}`);
      // macOS metadata artifacts to be filtered
      zip.file('.DS_Store', new Uint8Array([0x42, 0x75, 0x64, 0x31, 0x00, 0x00, 0x10, 0x00]));
      zip.file('specs/.DS_Store', new Uint8Array([0x42, 0x75, 0x64, 0x31, 0x00, 0x00, 0x10, 0x00]));
      zip.file('__MACOSX/._SVB-AOW-Inkomsten-v0401.wsdl', new Uint8Array([0x00, 0x05, 0x16, 0x07, 0x00, 0x02, 0x00, 0x00]));
      zip.file('__MACOSX/specs/._aow-types.xsd', new Uint8Array([0x00, 0x05, 0x16, 0x07, 0x00, 0x02, 0x00, 0x00]));

      const blob = await zip.generateAsync({ type: 'blob' });
      return new File([blob], 'SVB-AOW-macOS-with-artifacts.zip', { type: 'application/zip' });
    } else if (type === 'suwiml') {
      const wsdlContent = [
        '<?xml version="1.0" encoding="UTF-8"?>',
        '<definitions xmlns="http://schemas.xmlsoap.org/wsdl/"',
        '             xmlns:soap="http://schemas.xmlsoap.org/wsdl/soap/"',
        '             xmlns:tns="http://suwiml.suwinet.nl/services/aow/v0401"',
        '             xmlns:suwi="http://suwiml.suwinet.nl/headers/v0401"',
        '             targetNamespace="http://suwiml.suwinet.nl/services/aow/v0401"',
        '             name="SVB-AOW-Inkomsten-v0401">',
        '  <types>',
        '    <xsd:schema xmlns:xsd="http://www.w3.org/2001/XMLSchema">',
        '      <xsd:import namespace="http://suwiml.suwinet.nl/services/aow/v0401" schemaLocation="schemas/aow-types.xsd"/>',
        '    </xsd:schema>',
        '  </types>',
        '  <message name="RaadpleegAOWStatusRequest">',
        '    <part name="parameters" element="tns:RaadpleegAOWStatus"/>',
        '  </message>',
        '  <message name="RaadpleegAOWStatusResponse">',
        '    <part name="parameters" element="tns:RaadpleegAOWStatusResponse"/>',
        '  </message>',
        '  <message name="BerekenAOWAanvullingRequest">',
        '    <part name="parameters" element="tns:BerekenAOWAanvulling"/>',
        '  </message>',
        '  <message name="BerekenAOWAanvullingResponse">',
        '    <part name="parameters" element="tns:BerekenAOWAanvullingResponse"/>',
        '  </message>',
        '  <portType name="AOWInkomstenPortType">',
        '    <operation name="RaadpleegAOWStatus">',
        '      <input message="tns:RaadpleegAOWStatusRequest"/>',
        '      <output message="tns:RaadpleegAOWStatusResponse"/>',
        '    </operation>',
        '    <operation name="BerekenAOWAanvulling">',
        '      <input message="tns:BerekenAOWAanvullingRequest"/>',
        '      <output message="tns:BerekenAOWAanvullingResponse"/>',
        '    </operation>',
        '  </portType>',
        '</definitions>'
      ].join(eol);

      const xsdContent = [
        '<?xml version="1.0" encoding="UTF-8"?>',
        '<xsd:schema xmlns:xsd="http://www.w3.org/2001/XMLSchema"',
        '            targetNamespace="http://suwiml.suwinet.nl/services/aow/v0401"',
        '            elementFormDefault="qualified">',
        '  <xsd:element name="RaadpleegAOWStatus">',
        '    <xsd:complexType>',
        '      <xsd:sequence>',
        '        <xsd:element name="burgerservicenummer" type="xsd:string"/>',
        '        <xsd:element name="peildatum" type="xsd:date"/>',
        '      </xsd:sequence>',
        '    </xsd:complexType>',
        '  </xsd:element>',
        '  <xsd:element name="BerekenAOWAanvulling">',
        '    <xsd:complexType>',
        '      <xsd:sequence>',
        '        <xsd:element name="burgerservicenummer" type="xsd:string"/>',
        '        <xsd:element name="partnerInkomsten" type="xsd:decimal"/>',
        '      </xsd:sequence>',
        '    </xsd:complexType>',
        '  </xsd:element>',
        '</xsd:schema>'
      ].join(eol);

      zip.file('specs/SVB-AOW-Inkomsten-v0401.wsdl', wsdlContent);
      zip.file('specs/schemas/aow-types.xsd', xsdContent);
      zip.file('README.md', `# SVB AOW Inkomsten v0401${eol}Exported SuwiML specification package.${eol}`);

      const blob = await zip.generateAsync({ type: 'blob' });
      return new File([blob], 'SVB-AOW-Inkomsten-v0401-release.zip', { type: 'application/zip' });
    } else {
      const openApiContent = [
        'openapi: 3.0.3',
        'info:',
        '  title: Municipal Citizen Dossier REST API',
        '  version: 2.2.0',
        '  description: REST API specification for exchanging citizen profile and document status.',
        'paths:',
        '  /v2/citizens/{bsn}:',
        '    get:',
        '      summary: Retrieve citizen metadata',
        '      parameters:',
        '        - name: bsn',
        '          in: path',
        '          required: true',
        '          schema:',
        '            type: string',
        '      responses:',
        '        "200":',
        '          description: Citizen found',
        '  /v2/citizens/{bsn}/dossiers:',
        '    post:',
        '      summary: Create new status dossier',
        '      responses:',
        '        "201":',
        '          description: Dossier created',
        '  /v2/citizens/{bsn}/verification:',
        '    post:',
        '      summary: Submit automated income verification',
        '      responses:',
        '        "200":',
        '          description: Verification acknowledged'
      ].join(eol);

      zip.file('openapi.yaml', openApiContent);
      zip.file('package.json', `{\n  "name": "citizen-dossier-spec",\n  "version": "2.2.0"\n}\n`);

      const blob = await zip.generateAsync({ type: 'blob' });
      return new File([blob], 'citizen-dossier-openapi-v2.2.0.zip', { type: 'application/zip' });
    }
  }
}

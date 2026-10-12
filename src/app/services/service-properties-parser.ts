import { Injectable } from '@angular/core';
import { SuwimlOperationDetails, SuwimlServiceProperties } from '../models/gitlab.models';

@Injectable({
  providedIn: 'root'
})
export class ServicePropertiesParser {

  /**
   * Parse Java-style properties string taking multi-line continuations into account.
   * Handles trailing backslashes with potential trailing spaces, comment lines (# and !),
   * and empty line continuations.
   */
  parseRaw(content: string): Record<string, string> {
    const properties: Record<string, string> = {};
    const lines = content.split(/\r?\n/);
    let currentKey = '';
    let currentValue = '';
    let isContinuing = false;

    for (const rawLine of lines) {
      const trimmedEnd = rawLine.trimEnd();

      if (isContinuing) {
        // If a new property declaration starts or an empty line is encountered
        const isCommentOrEmpty = !trimmedEnd.trim() || trimmedEnd.trim().startsWith('#') || trimmedEnd.trim().startsWith('!');
        const looksLikeNewProp = /^[a-zA-Z0-9_.-]+\s*[=:]/.test(trimmedEnd.trim());

        if (looksLikeNewProp) {
          // Finalize previous key before starting new one
          if (currentKey) {
            properties[currentKey] = currentValue.trim();
          }
          currentKey = '';
          currentValue = '';
          isContinuing = false;
          // fall through to standard line processing below
        } else if (isCommentOrEmpty) {
          // Empty line or comment terminates line continuation in properties file
          if (currentKey) {
            properties[currentKey] = currentValue.trim();
          }
          currentKey = '';
          currentValue = '';
          isContinuing = false;
          continue;
        } else {
          // Continued value line
          const lineTrimmed = rawLine.trim();
          if (trimmedEnd.endsWith('\\')) {
            const chunk = trimmedEnd.slice(0, -1).trim();
            currentValue += (currentValue ? ' ' : '') + chunk;
            isContinuing = true;
          } else {
            currentValue += (currentValue ? ' ' : '') + lineTrimmed;
            isContinuing = false;
            if (currentKey) {
              properties[currentKey] = currentValue.trim();
            }
            currentKey = '';
            currentValue = '';
          }
          continue;
        }
      }

      const trimmed = rawLine.trim();
      if (!trimmed || trimmed.startsWith('#') || trimmed.startsWith('!')) {
        continue;
      }

      const match = trimmed.match(/^([^=:]+?)\s*[=:]\s*(.*)$/);
      if (match) {
        currentKey = match[1].trim();
        const rawVal = match[2].trimEnd();
        if (rawVal.endsWith('\\')) {
          currentValue = rawVal.slice(0, -1).trim();
          isContinuing = true;
        } else {
          properties[currentKey] = rawVal.trim();
          currentKey = '';
          currentValue = '';
        }
      }
    }

    if (currentKey && isContinuing) {
      properties[currentKey] = currentValue.trim();
    }

    return properties;
  }

  /**
   * Extracts abbreviated version string from a namespace or version declaration.
   * e.g. "http://bkwi.nl/SuwiML/FWI/v0205" -> "v0205"
   * e.g. "http://suwiml.suwinet.nl/headers/v0401" -> "v0401"
   * e.g. "" -> "—"
   */
  abbreviateVersion(raw?: string): string {
    if (!raw || !raw.trim()) {
      return '—';
    }

    const trimmed = raw.trim();

    // Look for v0100, v0205, v0401, v20170101, v1.0, etc.
    const versionMatch = trimmed.match(/\/(v\d+(?:\.\d+)?(?:-b\d+)?)(?:\/|$)/i) ||
                         trimmed.match(/\b(v\d{3,8}(?:-b\d+)?)\b/i) ||
                         trimmed.match(/\b(v\d+\.\d+)\b/i);

    if (versionMatch) {
      return versionMatch[1];
    }

    // Try last segment of URL if short
    if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
      const parts = trimmed.split('/').filter(Boolean);
      const last = parts[parts.length - 1];
      if (last && last.length <= 10) {
        return last;
      }
    }

    return trimmed.length <= 10 ? trimmed : trimmed.substring(0, 10);
  }

  /**
   * Parses service.properties content into a typed SuwimlServiceProperties object.
   * Robust against variations in operations formatting and missing SuwiML headers.
   */
  parse(content: string, filePath?: string): SuwimlServiceProperties {
    const raw = this.parseRaw(content);

    // Parse operation names
    const rawOpNames = raw['operation.names'] || '';
    let operations = rawOpNames
      .split(/[\s,]+/)
      .map(op => op.replace(/\\/g, '').trim())
      .filter(op => op.length > 0 && op !== '\\');

    // If operation.names was empty, discover operations from operation.<name>.* keys
    if (operations.length === 0) {
      const discovered = new Set<string>();
      for (const key of Object.keys(raw)) {
        const m = key.match(/^operation\.([^.]+)\./);
        if (m && m[1]) {
          discovered.add(m[1]);
        }
      }
      operations = Array.from(discovered);
    }

    // Parse each operation's detailed configuration
    const operationDetails: Record<string, SuwimlOperationDetails> = {};
    for (const op of operations) {
      const prefix = `operation.${op}.`;
      operationDetails[op] = {
        name: op,
        requestName: raw[`${prefix}request.name`],
        requestNamespace: raw[`${prefix}request.namespace`],
        requestAction: raw[`${prefix}request.action`],
        responseName: raw[`${prefix}response.name`],
        responseNamespace: raw[`${prefix}response.namespace`],
        responseAction: raw[`${prefix}response.action`],
        faultName: raw[`${prefix}fault.name`],
        faultNamespace: raw[`${prefix}fault.namespace`],
        faultAction: raw[`${prefix}fault.action`],
        requestValid: raw[`${prefix}request.valid`],
        requestNotFound: raw[`${prefix}request.notfound`]
      };
    }

    const serviceName = raw['name'] || (filePath ? this.extractServiceNameFromPath(filePath) : '');

    return {
      filePath,
      serviceName,
      operations,
      operationCount: operations.length,
      operationDetails,
      rawProperties: raw,
      headerRaw: raw['suwiml.header'] || undefined,
      headerVersionAbbr: this.abbreviateVersion(raw['suwiml.header']),
      fwiRaw: raw['suwiml.fwi'] || undefined,
      fwiVersionAbbr: this.abbreviateVersion(raw['suwiml.fwi']),
      nietsgevonden: raw['suwiml.nietsgevonden'] === 'true',
      addressing: raw['suwiml.addressing'] === 'true',
      security: raw['suwiml.security'] === 'true',
      soapaction: raw['suwiml.soapaction'] === 'true',
      schemaWsdl: raw['schema.wsdl'],
      schemaRequest: raw['schema.request'],
      schemaResponse: raw['schema.response'],
      schemaTypeless: raw['schema.typeless'],
      schemaSample: raw['schema.sample'],
      filterKeyExpression: raw['filter.key.expression']
    };
  }

  private extractServiceNameFromPath(filePath: string): string {
    // pattern: generated-reference/nl/bkwi/specification/wsdl/<service name>/service.properties
    const match = filePath.match(/generated-reference\/nl\/bkwi\/specification\/wsdl\/([^/]+)\/service\.properties/i);
    if (match) return match[1];

    const altMatch = filePath.match(/(?:^|\/)([^/]+)\/service\.properties$/i);
    return altMatch ? altMatch[1] : '';
  }
}

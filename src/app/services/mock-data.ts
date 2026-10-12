import { GitlabGroup, GitlabProject } from '../models/gitlab.models';

export const MOCK_SUBGROUPS: GitlabGroup[] = [
  {
    id: 100,
    name: 'BKWI SuwiML Diensten (WSDL)',
    path: 'bkwi-suwiml-diensten',
    full_path: 'service-specifications/bkwi-suwiml-diensten',
    description: 'BKWI SuwiML hub service specifications including justice, identity and municipal social services',
    web_url: 'https://gitlab.example.corp/service-specifications/bkwi-suwiml-diensten',
    parent_id: 1,
    subgroups_count: 0,
    projects_count: 6
  },
  {
    id: 101,
    name: 'SVB Social Security (SuwiML)',
    path: 'svb-social-security',
    full_path: 'service-specifications/svb-social-security',
    description: 'SuwiML compliant WSDL and XSD specifications for SVB national pensions and remigration services',
    web_url: 'https://gitlab.example.corp/service-specifications/svb-social-security',
    parent_id: 1,
    subgroups_count: 0,
    projects_count: 5
  },
  {
    id: 102,
    name: 'UWV Employment & Benefits (SuwiML)',
    path: 'uwv-employment-benefits',
    full_path: 'service-specifications/uwv-employment-benefits',
    description: 'SuwiML labor market exchange, unemployment benefits (WW) and policy administration SOAP specs',
    web_url: 'https://gitlab.example.corp/service-specifications/uwv-employment-benefits',
    parent_id: 1,
    subgroups_count: 0,
    projects_count: 4
  },
  {
    id: 103,
    name: 'Belastingdienst Toeslagen (SOAP)',
    path: 'belastingdienst-toeslagen',
    full_path: 'service-specifications/belastingdienst-toeslagen',
    description: 'Standard enterprise SOAP specifications with WS-Security for child allowance & rent subsidy computations',
    web_url: 'https://gitlab.example.corp/service-specifications/belastingdienst-toeslagen',
    parent_id: 1,
    subgroups_count: 0,
    projects_count: 3
  },
  {
    id: 104,
    name: 'Partner Integration Gateway (OpenAPI)',
    path: 'partner-integration-rest',
    full_path: 'service-specifications/partner-integration-rest',
    description: 'RESTful OpenAPI 3.0 JSON specifications for external citizen portals and municipal integrations',
    web_url: 'https://gitlab.example.corp/service-specifications/partner-integration-rest',
    parent_id: 1,
    subgroups_count: 0,
    projects_count: 4
  }
];

export const MOCK_PROJECTS: GitlabProject[] = [
  {
    id: 200,
    name: 'BijstandsregelingenIncJustitieGegWGS-v0100',
    path: 'bijstandsregelingen-inc-justitiegeg-wgs-v0100',
    path_with_namespace: 'service-specifications/bkwi-suwiml-diensten/BijstandsregelingenIncJustitieGegWGS-v0100',
    description: 'BKWI SuwiML specification for Assistance Schemes & Judicial Data Integration (WGS v0100)',
    default_branch: 'master',
    web_url: 'https://gitlab.example.corp/service-specifications/bkwi-suwiml-diensten/BijstandsregelingenIncJustitieGegWGS-v0100',
    last_activity_at: '2026-10-10T04:30:00Z',
    specType: 'suwiml',
    currentTag: '1.0.0',
    subgroupId: 100,
    subgroupPath: 'bkwi-suwiml-diensten',
    operations: ['BijstandsregelingenIncJustitieGegInfo'],
    suwimlHeaderVersion: '—',
    filesCount: 14,
    serviceProperties: {
      filePath: 'generated-reference/nl/bkwi/specification/wsdl/BijstandsregelingenIncJustitieGegWGS-v0100/service.properties',
      serviceName: 'BijstandsregelingenIncJustitieGegWGS-v0100',
      operations: ['BijstandsregelingenIncJustitieGegInfo'],
      operationCount: 1,
      operationDetails: {
        BijstandsregelingenIncJustitieGegInfo: {
          name: 'BijstandsregelingenIncJustitieGegInfo',
          requestName: 'BijstandsregelingenIncJustitieGegInfo',
          requestNamespace: 'http://bkwi.nl/SuwiML/Diensten/BijstandsregelingenIncJustitieGegWGS/v0100',
          requestAction: 'http://bkwi.nl/SuwiML/Diensten/BijstandsregelingenIncJustitieGegWGS-v0100/BijstandsregelingenIncJustitieGegInfo',
          responseName: 'BijstandsregelingenIncJustitieGegInfoResponse',
          responseNamespace: 'http://bkwi.nl/SuwiML/Diensten/BijstandsregelingenIncJustitieGegWGS/v0100',
          responseAction: 'http://bkwi.nl/SuwiML/Diensten/BijstandsregelingenIncJustitieWGS-v0100/BijstandsregelingenIncJustitieGegInfoResponse',
          faultName: 'Fout',
          faultNamespace: 'http://bkwi.nl/SuwiML/FWI/v0205',
          faultAction: 'http://bkwi.nl/SuwiML/Diensten/BijstandsregelingenIncJustitieGegWGS-v0100/Fout',
          requestValid: '<smls:BijstandsregelingenIncJustitieGegInfo xmlns:smls="http://bkwi.nl/SuwiML/Diensten/BijstandsregelingenIncJustitieGegWGS/v0100"><Burgerservicenr>111111110</Burgerservicenr></smls:BijstandsregelingenIncJustitieGegInfo>',
          requestNotFound: '<smls:BijstandsregelingenIncJustitieGegInfo xmlns:smls="http://bkwi.nl/SuwiML/Diensten/BijstandsregelingenIncJustitieGegWGS/v0100"><Burgerservicenr>000000000</Burgerservicenr></smls:BijstandsregelingenIncJustitieGegInfo>'
        }
      },
      rawProperties: {
        'name': 'BijstandsregelingenIncJustitieGegWGS-v0100',
        'operation.names': 'BijstandsregelingenIncJustitieGegInfo',
        'suwiml.header': '',
        'suwiml.fwi': 'http://bkwi.nl/SuwiML/FWI/v0205',
        'suwiml.nietsgevonden': 'true',
        'suwiml.addressing': 'true',
        'suwiml.security': 'true',
        'suwiml.soapaction': 'false',
        'schema.wsdl': 'nl/bkwi/specification/wsdl/BijstandsregelingenIncJustitieGegWGS-v0100/Diensten/BijstandsregelingenIncJustitieGegWGS/v0100-b01/Impl/BKWI.wsdl',
        'schema.request': 'nl/bkwi/specification/wsdl/BijstandsregelingenIncJustitieGegWGS-v0100/Diensten/BijstandsregelingenIncJustitieGegWGS/v0100-b01/BodyAction.xsd',
        'schema.response': 'nl/bkwi/specification/wsdl/BijstandsregelingenIncJustitieGegWGS-v0100/Diensten/BijstandsregelingenIncJustitieGegWGS/v0100-b01/BodyReaction.xsd',
        'schema.typeless': 'nl/bkwi/specification/wsdl/BijstandsregelingenIncJustitieGegWGS-v0100/BijstandsregelingenIncJustitieGegWGS-v0100.typeless.wsdl',
        'schema.sample': 'nl/bkwi/specification/wsdl/BijstandsregelingenIncJustitieGegWGS-v0100/BijstandsregelingenIncJustitieGegWGS-v0100.sample.xml',
        'filter.key.expression': "/*[local-name() = 'BijstandsregelingenIncJustitieGegInfo']/*[local-name() = 'Burgerservicenr']"
      },
      headerRaw: '',
      headerVersionAbbr: '—',
      fwiRaw: 'http://bkwi.nl/SuwiML/FWI/v0205',
      fwiVersionAbbr: 'v0205',
      nietsgevonden: true,
      addressing: true,
      security: true,
      soapaction: false,
      schemaWsdl: 'nl/bkwi/specification/wsdl/BijstandsregelingenIncJustitieGegWGS-v0100/Diensten/BijstandsregelingenIncJustitieGegWGS/v0100-b01/Impl/BKWI.wsdl',
      schemaRequest: 'nl/bkwi/specification/wsdl/BijstandsregelingenIncJustitieGegWGS-v0100/Diensten/BijstandsregelingenIncJustitieGegWGS/v0100-b01/BodyAction.xsd',
      schemaResponse: 'nl/bkwi/specification/wsdl/BijstandsregelingenIncJustitieGegWGS-v0100/Diensten/BijstandsregelingenIncJustitieGegWGS/v0100-b01/BodyReaction.xsd',
      schemaTypeless: 'nl/bkwi/specification/wsdl/BijstandsregelingenIncJustitieGegWGS-v0100/BijstandsregelingenIncJustitieGegWGS-v0100.typeless.wsdl',
      schemaSample: 'nl/bkwi/specification/wsdl/BijstandsregelingenIncJustitieGegWGS-v0100/BijstandsregelingenIncJustitieGegWGS-v0100.sample.xml',
      filterKeyExpression: "/*[local-name() = 'BijstandsregelingenIncJustitieGegInfo']/*[local-name() = 'Burgerservicenr']"
    },
    latestPipeline: {
      id: 95014,
      status: 'success',
      ref: 'master',
      sha: 'e482a901ff',
      web_url: 'https://gitlab.example.corp/service-specifications/bkwi-suwiml-diensten/BijstandsregelingenIncJustitieGegWGS-v0100/-/pipelines/95014',
      created_at: '2026-10-10T04:31:00Z',
      finished_at: '2026-10-10T04:33:15Z',
      stageNames: ['validate-wsdl', 'extract-properties', 'verify-filter-xpath', 'publish-registry']
    },
    files: [
      {
        path: 'generated-reference/nl/bkwi/specification/wsdl/BijstandsregelingenIncJustitieGegWGS-v0100/service.properties',
        content: `# Service name and operations
name=BijstandsregelingenIncJustitieGegWGS-v0100

operation.names=\\
  BijstandsregelingenIncJustitieGegInfo \\

operation.BijstandsregelingenIncJustitieGegInfo.request.name=BijstandsregelingenIncJustitieGegInfo
operation.BijstandsregelingenIncJustitieGegInfo.request.namespace=http://bkwi.nl/SuwiML/Diensten/BijstandsregelingenIncJustitieGegWGS/v0100
operation.BijstandsregelingenIncJustitieGegInfo.request.action=http://bkwi.nl/SuwiML/Diensten/BijstandsregelingenIncJustitieGegWGS-v0100/BijstandsregelingenIncJustitieGegInfo
operation.BijstandsregelingenIncJustitieGegInfo.response.name=BijstandsregelingenIncJustitieGegInfoResponse
operation.BijstandsregelingenIncJustitieGegInfo.response.namespace=http://bkwi.nl/SuwiML/Diensten/BijstandsregelingenIncJustitieGegWGS/v0100
operation.BijstandsregelingenIncJustitieGegInfo.response.action=http://bkwi.nl/SuwiML/Diensten/BijstandsregelingenIncJustitieWGS-v0100/BijstandsregelingenIncJustitieGegInfoResponse
operation.BijstandsregelingenIncJustitieGegInfo.fault.name=Fout
operation.BijstandsregelingenIncJustitieGegInfo.fault.namespace=http://bkwi.nl/SuwiML/FWI/v0205
operation.BijstandsregelingenIncJustitieGegInfo.fault.action=http://bkwi.nl/SuwiML/Diensten/BijstandsregelingenIncJustitieGegWGS-v0100/Fout

# SuwiML specific configuration
suwiml.header=
suwiml.fwi=http://bkwi.nl/SuwiML/FWI/v0205
suwiml.nietsgevonden=true
suwiml.addressing=true
suwiml.security=true
suwiml.soapaction=false

# WSDL and XSD schema location
schema.wsdl=nl/bkwi/specification/wsdl/BijstandsregelingenIncJustitieGegWGS-v0100/Diensten/BijstandsregelingenIncJustitieGegWGS/v0100-b01/Impl/BKWI.wsdl
schema.request=nl/bkwi/specification/wsdl/BijstandsregelingenIncJustitieGegWGS-v0100/Diensten/BijstandsregelingenIncJustitieGegWGS/v0100-b01/BodyAction.xsd
schema.response=nl/bkwi/specification/wsdl/BijstandsregelingenIncJustitieGegWGS-v0100/Diensten/BijstandsregelingenIncJustitieGegWGS/v0100-b01/BodyReaction.xsd
schema.typeless=nl/bkwi/specification/wsdl/BijstandsregelingenIncJustitieGegWGS-v0100/BijstandsregelingenIncJustitieGegWGS-v0100.typeless.wsdl
schema.sample=nl/bkwi/specification/wsdl/BijstandsregelingenIncJustitieGegWGS-v0100/BijstandsregelingenIncJustitieGegWGS-v0100.sample.xml

# Generated test data
operation.BijstandsregelingenIncJustitieGegInfo.request.valid=<smls:BijstandsregelingenIncJustitieGegInfo xmlns:smls="http://bkwi.nl/SuwiML/Diensten/BijstandsregelingenIncJustitieGegWGS/v0100"><Burgerservicenr>111111110</Burgerservicenr></smls:BijstandsregelingenIncJustitieGegInfo>
operation.BijstandsregelingenIncJustitieGegInfo.request.notfound=<smls:BijstandsregelingenIncJustitieGegInfo xmlns:smls="http://bkwi.nl/SuwiML/Diensten/BijstandsregelingenIncJustitieGegWGS/v0100"><Burgerservicenr>000000000</Burgerservicenr></smls:BijstandsregelingenIncJustitieGegInfo>

# Broker filter (blacklist and whitelist) configuration
filter.key.expression=/*[local-name() = 'BijstandsregelingenIncJustitieGegInfo']/*[local-name() = 'Burgerservicenr']`
      },
      {
        path: 'nl/bkwi/specification/wsdl/BijstandsregelingenIncJustitieGegWGS-v0100/Diensten/BijstandsregelingenIncJustitieGegWGS/v0100-b01/Impl/BKWI.wsdl',
        content: `<?xml version="1.0" encoding="UTF-8"?>
<definitions xmlns="http://schemas.xmlsoap.org/wsdl/"
             xmlns:soap="http://schemas.xmlsoap.org/wsdl/soap/"
             xmlns:tns="http://bkwi.nl/SuwiML/Diensten/BijstandsregelingenIncJustitieGegWGS/v0100"
             xmlns:fwi="http://bkwi.nl/SuwiML/FWI/v0205"
             targetNamespace="http://bkwi.nl/SuwiML/Diensten/BijstandsregelingenIncJustitieGegWGS/v0100"
             name="BijstandsregelingenIncJustitieGegWGS-v0100">
  <portType name="BijstandsregelingenIncJustitieGegPortType">
    <operation name="BijstandsregelingenIncJustitieGegInfo">
      <input message="tns:BijstandsregelingenIncJustitieGegInfoRequest"/>
      <output message="tns:BijstandsregelingenIncJustitieGegInfoResponse"/>
      <fault name="Fout" message="fwi:Fout"/>
    </operation>
  </portType>
</definitions>`
      }
    ]
  },
  {
    id: 201,
    name: 'SVB-AOW-Inkomsten-v0401',
    path: 'svb-aow-inkomsten-v0401',
    path_with_namespace: 'service-specifications/svb-social-security/svb-aow-inkomsten-v0401',
    description: 'SuwiML AOW pension income verification service contract specification (WSDL 1.1 + SuwiML 4.1)',
    default_branch: 'master',
    web_url: 'https://gitlab.example.corp/service-specifications/svb-social-security/svb-aow-inkomsten-v0401',
    last_activity_at: '2026-10-09T14:22:10Z',
    specType: 'suwiml',
    currentTag: '4.1.2',
    subgroupId: 101,
    subgroupPath: 'svb-social-security',
    operations: ['RaadpleegAOWStatus', 'ControleerInkomstenOpgave', 'VerwerkPensioenMutatie'],
    suwimlHeaderVersion: 'v0401',
    filesCount: 12,
    serviceProperties: {
      filePath: 'generated-reference/nl/bkwi/specification/wsdl/SVB-AOW-Inkomsten-v0401/service.properties',
      serviceName: 'SVB-AOW-Inkomsten-v0401',
      operations: ['RaadpleegAOWStatus', 'ControleerInkomstenOpgave', 'VerwerkPensioenMutatie'],
      operationCount: 3,
      operationDetails: {},
      rawProperties: {
        'name': 'SVB-AOW-Inkomsten-v0401',
        'operation.names': 'RaadpleegAOWStatus ControleerInkomstenOpgave VerwerkPensioenMutatie',
        'suwiml.header': 'http://suwiml.suwinet.nl/headers/v0401',
        'suwiml.fwi': 'http://bkwi.nl/SuwiML/FWI/v0205',
        'suwiml.nietsgevonden': 'true',
        'schema.wsdl': 'nl/bkwi/specification/wsdl/SVB-AOW-Inkomsten-v0401/Impl/BKWI.wsdl'
      },
      headerRaw: 'http://suwiml.suwinet.nl/headers/v0401',
      headerVersionAbbr: 'v0401',
      fwiRaw: 'http://bkwi.nl/SuwiML/FWI/v0205',
      fwiVersionAbbr: 'v0205',
      nietsgevonden: true,
      addressing: true,
      security: true,
      schemaWsdl: 'nl/bkwi/specification/wsdl/SVB-AOW-Inkomsten-v0401/Impl/BKWI.wsdl',
      filterKeyExpression: "/*[local-name() = 'RaadpleegAOWStatus']/*[local-name() = 'Burgerservicenr']"
    },
    latestPipeline: {
      id: 94812,
      status: 'success',
      ref: 'master',
      sha: 'a7f920bc81',
      web_url: 'https://gitlab.example.corp/service-specifications/svb-social-security/svb-aow-inkomsten-v0401/-/pipelines/94812',
      created_at: '2026-10-09T14:23:00Z',
      finished_at: '2026-10-09T14:24:45Z',
      stageNames: ['validate-specs', 'extract-artifacts', 'check-backwards-compatibility', 'publish-grpc']
    },
    files: [
      {
        path: 'generated-reference/nl/bkwi/specification/wsdl/SVB-AOW-Inkomsten-v0401/service.properties',
        content: `name=SVB-AOW-Inkomsten-v0401\noperation.names=\\\n  RaadpleegAOWStatus \\\n  ControleerInkomstenOpgave \\\n  VerwerkPensioenMutatie \\\nsuwiml.header=http://suwiml.suwinet.nl/headers/v0401\nsuwiml.fwi=http://bkwi.nl/SuwiML/FWI/v0205\nsuwiml.nietsgevonden=true\nschema.wsdl=nl/bkwi/specification/wsdl/SVB-AOW-Inkomsten-v0401/Impl/BKWI.wsdl`
      }
    ]
  },
  {
    id: 202,
    name: 'SVB-Remigratiewet-v0200',
    path: 'svb-remigratiewet-v0200',
    path_with_namespace: 'service-specifications/svb-social-security/svb-remigratiewet-v0200',
    description: 'SuwiML Remigration Act benefit entitlement and validation endpoint specification',
    default_branch: 'master',
    web_url: 'https://gitlab.example.corp/service-specifications/svb-social-security/svb-remigratiewet-v0200',
    last_activity_at: '2026-10-07T09:12:00Z',
    specType: 'suwiml',
    currentTag: '2.0.4',
    subgroupId: 101,
    subgroupPath: 'svb-social-security',
    operations: ['ToetsRemigratieRecht', 'OpvragenRemigratieDossier'],
    suwimlHeaderVersion: 'v0400',
    filesCount: 9,
    serviceProperties: {
      filePath: 'generated-reference/nl/bkwi/specification/wsdl/SVB-Remigratiewet-v0200/service.properties',
      serviceName: 'SVB-Remigratiewet-v0200',
      operations: ['ToetsRemigratieRecht', 'OpvragenRemigratieDossier'],
      operationCount: 2,
      operationDetails: {},
      rawProperties: {
        'name': 'SVB-Remigratiewet-v0200',
        'operation.names': 'ToetsRemigratieRecht OpvragenRemigratieDossier',
        'suwiml.header': 'http://suwiml.suwinet.nl/headers/v0400',
        'suwiml.fwi': 'http://bkwi.nl/SuwiML/FWI/v0200'
      },
      headerRaw: 'http://suwiml.suwinet.nl/headers/v0400',
      headerVersionAbbr: 'v0400',
      fwiRaw: 'http://bkwi.nl/SuwiML/FWI/v0200',
      fwiVersionAbbr: 'v0200',
      schemaWsdl: 'nl/bkwi/specification/wsdl/SVB-Remigratiewet-v0200/BKWI.wsdl'
    },
    latestPipeline: {
      id: 94520,
      status: 'success',
      ref: 'master',
      sha: 'c813a451e0',
      web_url: 'https://gitlab.example.corp/service-specifications/svb-social-security/svb-remigratiewet-v0200/-/pipelines/94520',
      created_at: '2026-10-07T09:15:00Z',
      finished_at: '2026-10-07T09:17:10Z'
    }
  },
  {
    id: 203,
    name: 'UWV-Werkloosheid-WW-v0500',
    path: 'uwv-werkloosheid-ww-v0500',
    path_with_namespace: 'service-specifications/uwv-employment-benefits/uwv-werkloosheid-ww-v0500',
    description: 'SuwiML Unemployment Act (WW) claim intake, calculation and decision export specification',
    default_branch: 'master',
    web_url: 'https://gitlab.example.corp/service-specifications/uwv-employment-benefits/uwv-werkloosheid-ww-v0500',
    last_activity_at: '2026-10-08T18:05:00Z',
    specType: 'suwiml',
    currentTag: '5.0.1',
    subgroupId: 102,
    subgroupPath: 'uwv-employment-benefits',
    operations: ['OntvangWWClaim', 'BerekenWWDagloon', 'GeefBeslissingStatus'],
    suwimlHeaderVersion: 'v0500',
    filesCount: 16,
    serviceProperties: {
      filePath: 'generated-reference/nl/bkwi/specification/wsdl/UWV-Werkloosheid-WW-v0500/service.properties',
      serviceName: 'UWV-Werkloosheid-WW-v0500',
      operations: ['OntvangWWClaim', 'BerekenWWDagloon', 'GeefBeslissingStatus'],
      operationCount: 3,
      operationDetails: {},
      rawProperties: {
        'name': 'UWV-Werkloosheid-WW-v0500',
        'operation.names': 'OntvangWWClaim BerekenWWDagloon GeefBeslissingStatus',
        'suwiml.header': 'http://suwiml.suwinet.nl/headers/v0500',
        'suwiml.fwi': 'http://bkwi.nl/SuwiML/FWI/v0205'
      },
      headerRaw: 'http://suwiml.suwinet.nl/headers/v0500',
      headerVersionAbbr: 'v0500',
      fwiRaw: 'http://bkwi.nl/SuwiML/FWI/v0205',
      fwiVersionAbbr: 'v0205',
      schemaWsdl: 'nl/bkwi/specification/wsdl/UWV-Werkloosheid-WW-v0500/BKWI.wsdl'
    },
    latestPipeline: {
      id: 94702,
      status: 'success',
      ref: 'master',
      sha: '5e38102dca',
      web_url: 'https://gitlab.example.corp/service-specifications/uwv-employment-benefits/uwv-werkloosheid-ww-v0500/-/pipelines/94702',
      created_at: '2026-10-08T18:06:00Z',
      finished_at: '2026-10-08T18:08:15Z'
    }
  },
  {
    id: 204,
    name: 'UWV-Polisadministratie-v0310',
    path: 'uwv-polisadministratie-v0310',
    path_with_namespace: 'service-specifications/uwv-employment-benefits/uwv-polisadministratie-v0310',
    description: 'SuwiML wage history and insurance record query service contract',
    default_branch: 'master',
    web_url: 'https://gitlab.example.corp/service-specifications/uwv-employment-benefits/uwv-polisadministratie-v0310',
    last_activity_at: '2026-10-05T11:40:00Z',
    specType: 'suwiml',
    currentTag: '3.1.5',
    subgroupId: 102,
    subgroupPath: 'uwv-employment-benefits',
    operations: ['VraagLoonverledenOp', 'ControleerVerzekeringspositie'],
    suwimlHeaderVersion: 'v0401',
    filesCount: 14,
    serviceProperties: {
      filePath: 'generated-reference/nl/bkwi/specification/wsdl/UWV-Polisadministratie-v0310/service.properties',
      serviceName: 'UWV-Polisadministratie-v0310',
      operations: ['VraagLoonverledenOp', 'ControleerVerzekeringspositie'],
      operationCount: 2,
      operationDetails: {},
      rawProperties: {
        'name': 'UWV-Polisadministratie-v0310',
        'operation.names': 'VraagLoonverledenOp ControleerVerzekeringspositie',
        'suwiml.header': 'http://suwiml.suwinet.nl/headers/v0401',
        'suwiml.fwi': 'http://bkwi.nl/SuwiML/FWI/v0205'
      },
      headerRaw: 'http://suwiml.suwinet.nl/headers/v0401',
      headerVersionAbbr: 'v0401',
      fwiRaw: 'http://bkwi.nl/SuwiML/FWI/v0205',
      fwiVersionAbbr: 'v0205'
    },
    latestPipeline: {
      id: 94110,
      status: 'success',
      ref: 'master',
      sha: '298db3948e',
      web_url: 'https://gitlab.example.corp/service-specifications/uwv-employment-benefits/uwv-polisadministratie-v0310/-/pipelines/94110',
      created_at: '2026-10-05T11:42:00Z',
      finished_at: '2026-10-05T11:44:00Z'
    }
  },
  {
    id: 205,
    name: 'Toeslagen-Voorschotberekening-v2',
    path: 'toeslagen-voorschotberekening-v2',
    path_with_namespace: 'service-specifications/belastingdienst-toeslagen/toeslagen-voorschotberekening-v2',
    description: 'Non-SuwiML SOAP 1.2 enterprise service for provisional allowance calculation',
    default_branch: 'master',
    web_url: 'https://gitlab.example.corp/service-specifications/belastingdienst-toeslagen/toeslagen-voorschotberekening-v2',
    last_activity_at: '2026-09-30T16:20:00Z',
    specType: 'soap',
    currentTag: '2.3.0',
    subgroupId: 103,
    subgroupPath: 'belastingdienst-toeslagen',
    operations: ['BerekenZorgtoeslag', 'BerekenHuurtoeslag', 'BerekenKindgebondenBudget'],
    filesCount: 8,
    serviceProperties: {
      filePath: 'generated-reference/nl/bkwi/specification/wsdl/Toeslagen-Voorschotberekening-v2/service.properties',
      serviceName: 'Toeslagen-Voorschotberekening-v2',
      operations: ['BerekenZorgtoeslag', 'BerekenHuurtoeslag', 'BerekenKindgebondenBudget'],
      operationCount: 3,
      operationDetails: {},
      rawProperties: {
        'name': 'Toeslagen-Voorschotberekening-v2',
        'operation.names': 'BerekenZorgtoeslag BerekenHuurtoeslag BerekenKindgebondenBudget',
        'schema.wsdl': 'nl/bkwi/specification/wsdl/Toeslagen-Voorschotberekening-v2/Impl/BKWI.wsdl'
      },
      headerVersionAbbr: '—',
      fwiVersionAbbr: '—'
    },
    latestPipeline: {
      id: 93800,
      status: 'success',
      ref: 'master',
      sha: 'b12389104a',
      web_url: 'https://gitlab.example.corp/service-specifications/belastingdienst-toeslagen/toeslagen-voorschotberekening-v2/-/pipelines/93800',
      created_at: '2026-09-30T16:21:00Z',
      finished_at: '2026-09-30T16:23:12Z'
    },
    files: [
      {
        path: 'generated-reference/nl/bkwi/specification/wsdl/Toeslagen-Voorschotberekening-v2/service.properties',
        content: `name=Toeslagen-Voorschotberekening-v2\noperation.names=BerekenZorgtoeslag BerekenHuurtoeslag BerekenKindgebondenBudget\nschema.wsdl=nl/bkwi/specification/wsdl/Toeslagen-Voorschotberekening-v2/Impl/BKWI.wsdl`
      }
    ]
  },
  {
    id: 206,
    name: 'citizen-dossier-rest-v2',
    path: 'citizen-dossier-rest-v2',
    path_with_namespace: 'service-specifications/partner-integration-rest/citizen-dossier-rest-v2',
    description: 'OpenAPI 3.0 specification for Municipal Citizen Dossier REST API with OAuth2 scopes',
    default_branch: 'master',
    web_url: 'https://gitlab.example.corp/service-specifications/partner-integration-rest/citizen-dossier-rest-v2',
    last_activity_at: '2026-10-10T02:15:00Z',
    specType: 'openapi',
    currentTag: '2.1.0',
    subgroupId: 104,
    subgroupPath: 'partner-integration-rest',
    operations: ['GET /v2/citizens/{bsn}', 'POST /v2/citizens/{bsn}/dossiers', 'GET /v2/notifications'],
    filesCount: 6,
    latestPipeline: {
      id: 94890,
      status: 'success',
      ref: 'master',
      sha: 'f1029e812d',
      web_url: 'https://gitlab.example.corp/service-specifications/partner-integration-rest/citizen-dossier-rest-v2/-/pipelines/94890',
      created_at: '2026-10-10T02:16:00Z',
      finished_at: '2026-10-10T02:17:40Z'
    },
    files: [
      {
        path: 'src/main/resources/nl/bkwi/specification/openapi/citizen-dossier-rest-v2.yaml',
        content: `openapi: 3.0.3
info:
  title: Municipal Citizen Dossier REST API
  version: 2.1.0
  description: REST API specification for exchanging citizen profile and document status.
paths:
  /v2/citizens/{bsn}:
    get:
      summary: Retrieve citizen metadata
      parameters:
        - name: bsn
          in: path
          required: true
          schema:
            type: string
      responses:
        '200':
          description: Citizen found
  /v2/citizens/{bsn}/dossiers:
    post:
      summary: Create new status dossier
      responses:
        '201':
          description: Dossier created`
      }
    ]
  },
  {
    id: 207,
    name: 'service-kadaster-kik-v0501',
    path: 'service-kadaster-kik-v0501',
    path_with_namespace: 'service-specifications/bkwi-suwiml-diensten/service-kadaster-kik-v0501',
    description: 'Kadaster KIK-Inzage WSDL specification (Kadaster-KIK-v0510 contract with 8 operations)',
    default_branch: 'master',
    web_url: 'https://gitlab.example.corp/service-specifications/bkwi-suwiml-diensten/service-kadaster-kik-v0501',
    last_activity_at: '2026-10-10T05:15:00Z',
    specType: 'soap',
    currentTag: '5.1.0',
    subgroupId: 100,
    subgroupPath: 'bkwi-suwiml-diensten',
    operations: [
      'VerzoekTotInformatieBD',
      'VerzoekTotInformatieHBO',
      'VerzoekTotInformatieKBO',
      'VerzoekTotInformatieKBP',
      'VerzoekTotInformatieKSO',
      'VerzoekTotInformatieUKK',
      'VerzoekTotInformatieOLB',
      'VerzoekTotInformatieOLR'
    ],
    filesCount: 10,
    serviceProperties: {
      filePath: 'generated-reference/nl/bkwi/specification/wsdl/Kadaster-KIK-v0510/service.properties',
      serviceName: 'Kadaster-KIK-v0510',
      operations: [
        'VerzoekTotInformatieBD',
        'VerzoekTotInformatieHBO',
        'VerzoekTotInformatieKBO',
        'VerzoekTotInformatieKBP',
        'VerzoekTotInformatieKSO',
        'VerzoekTotInformatieUKK',
        'VerzoekTotInformatieOLB',
        'VerzoekTotInformatieOLR'
      ],
      operationCount: 8,
      operationDetails: {
        VerzoekTotInformatieBD: {
          name: 'VerzoekTotInformatieBD',
          requestName: 'VerzoekTotInformatieRequest',
          requestNamespace: 'http://www.kadaster.nl/schemas/kik-inzage/verzoektotinformatie/v20170101',
          responseName: 'VerzoekTotInformatieBDResponse',
          responseNamespace: 'http://www.kadaster.nl/schemas/kik-inzage/verzoektotinformatie/v20170101'
        },
        VerzoekTotInformatieHBO: {
          name: 'VerzoekTotInformatieHBO',
          requestName: 'VerzoekTotInformatieRequest',
          requestNamespace: 'http://www.kadaster.nl/schemas/kik-inzage/verzoektotinformatie/v20170101',
          responseName: 'VerzoekTotInformatieHBOResponse',
          responseNamespace: 'http://www.kadaster.nl/schemas/kik-inzage/verzoektotinformatie/v20170101'
        },
        VerzoekTotInformatieKBO: {
          name: 'VerzoekTotInformatieKBO',
          requestName: 'VerzoekTotInformatieRequest',
          requestNamespace: 'http://www.kadaster.nl/schemas/kik-inzage/verzoektotinformatie/v20170101',
          responseName: 'VerzoekTotInformatieKBOResponse',
          responseNamespace: 'http://www.kadaster.nl/schemas/kik-inzage/verzoektotinformatie/v20170101'
        },
        VerzoekTotInformatieKBP: {
          name: 'VerzoekTotInformatieKBP',
          requestName: 'VerzoekTotInformatieRequest',
          requestNamespace: 'http://www.kadaster.nl/schemas/kik-inzage/verzoektotinformatie/v20170101',
          responseName: 'VerzoekTotInformatieKBPResponse',
          responseNamespace: 'http://www.kadaster.nl/schemas/kik-inzage/verzoektotinformatie/v20170101'
        },
        VerzoekTotInformatieKSO: {
          name: 'VerzoekTotInformatieKSO',
          requestName: 'VerzoekTotInformatieRequest',
          requestNamespace: 'http://www.kadaster.nl/schemas/kik-inzage/verzoektotinformatie/v20170101',
          responseName: 'VerzoekTotInformatieKSOResponse',
          responseNamespace: 'http://www.kadaster.nl/schemas/kik-inzage/verzoektotinformatie/v20170101'
        },
        VerzoekTotInformatieUKK: {
          name: 'VerzoekTotInformatieUKK',
          requestName: 'VerzoekTotInformatieRequest',
          requestNamespace: 'http://www.kadaster.nl/schemas/kik-inzage/verzoektotinformatie/v20170101',
          responseName: 'VerzoekTotInformatieUKKResponse',
          responseNamespace: 'http://www.kadaster.nl/schemas/kik-inzage/verzoektotinformatie/v20170101'
        },
        VerzoekTotInformatieOLB: {
          name: 'VerzoekTotInformatieOLB',
          requestName: 'VerzoekTotInformatieRequest',
          requestNamespace: 'http://www.kadaster.nl/schemas/kik-inzage/verzoektotinformatie/v20170101',
          responseName: 'VerzoekTotInformatieOLBResponse',
          responseNamespace: 'http://www.kadaster.nl/schemas/kik-inzage/verzoektotinformatie/v20170101'
        },
        VerzoekTotInformatieOLR: {
          name: 'VerzoekTotInformatieOLR',
          requestName: 'VerzoekTotInformatieRequest',
          requestNamespace: 'http://www.kadaster.nl/schemas/kik-inzage/verzoektotinformatie/v20170101',
          responseName: 'VerzoekTotInformatieOLRResponse',
          responseNamespace: 'http://www.kadaster.nl/schemas/kik-inzage/verzoektotinformatie/v20170101'
        }
      },
      rawProperties: {
        'name': 'Kadaster-KIK-v0510',
        'operation.names': 'VerzoekTotInformatieBD VerzoekTotInformatieHBO VerzoekTotInformatieKBO VerzoekTotInformatieKBP VerzoekTotInformatieKSO VerzoekTotInformatieUKK VerzoekTotInformatieOLB VerzoekTotInformatieOLR'
      },
      headerVersionAbbr: '—',
      fwiVersionAbbr: '—'
    },
    latestPipeline: {
      id: 95022,
      status: 'success',
      ref: 'master',
      sha: 'f482a90101',
      web_url: 'https://gitlab.example.corp/service-specifications/bkwi-suwiml-diensten/service-kadaster-kik-v0501/-/pipelines/95022',
      created_at: '2026-10-10T05:16:00Z',
      finished_at: '2026-10-10T05:18:10Z'
    },
    files: [
      {
        path: 'generated-reference/nl/bkwi/specification/wsdl/Kadaster-KIK-v0510/service.properties',
        content: `# Service name and operations
name=Kadaster-KIK-v0510

operation.names=\\
  VerzoekTotInformatieBD \\
  VerzoekTotInformatieHBO \\
  VerzoekTotInformatieKBO \\
  VerzoekTotInformatieKBP \\
  VerzoekTotInformatieKSO \\
  VerzoekTotInformatieUKK \\
  VerzoekTotInformatieOLB \\
  VerzoekTotInformatieOLR \\

operation.VerzoekTotInformatieBD.request.name=VerzoekTotInformatieRequest
operation.VerzoekTotInformatieBD.request.namespace=http://www.kadaster.nl/schemas/kik-inzage/verzoektotinformatie/v20170101
operation.VerzoekTotInformatieBD.request.action=
operation.VerzoekTotInformatieBD.response.name=VerzoekTotInformatieBDResponse
operation.VerzoekTotInformatieBD.response.namespace=http://www.kadaster.nl/schemas/kik-inzage/verzoektotinformatie/v20170101
operation.VerzoekTotInformatieBD.response.action=
operation.VerzoekTotInformatieHBO.request.name=VerzoekTotInformatieRequest
operation.VerzoekTotInformatieHBO.request.namespace=http://www.kadaster.nl/schemas/kik-inzage/verzoektotinformatie/v20170101
operation.VerzoekTotInformatieHBO.request.action=
operation.VerzoekTotInformatieHBO.response.name=VerzoekTotInformatieHBOResponse
operation.VerzoekTotInformatieHBO.response.namespace=http://www.kadaster.nl/schemas/kik-inzage/verzoektotinformatie/v20170101
operation.VerzoekTotInformatieHBO.response.action=
operation.VerzoekTotInformatieKBO.request.name=VerzoekTotInformatieRequest
operation.VerzoekTotInformatieKBO.request.namespace=http://www.kadaster.nl/schemas/kik-inzage/verzoektotinformatie/v20170101
operation.VerzoekTotInformatieKBO.request.action=
operation.VerzoekTotInformatieKBO.response.name=VerzoekTotInformatieKBOResponse
operation.VerzoekTotInformatieKBO.response.namespace=http://www.kadaster.nl/schemas/kik-inzage/verzoektotinformatie/v20170101
operation.VerzoekTotInformatieKBO.response.action=
operation.VerzoekTotInformatieKBP.request.name=VerzoekTotInformatieRequest
operation.VerzoekTotInformatieKBP.request.namespace=http://www.kadaster.nl/schemas/kik-inzage/verzoektotinformatie/v20170101
operation.VerzoekTotInformatieKBP.request.action=
operation.VerzoekTotInformatieKBP.response.name=VerzoekTotInformatieKBPResponse
operation.VerzoekTotInformatieKBP.response.namespace=http://www.kadaster.nl/schemas/kik-inzage/verzoektotinformatie/v20170101
operation.VerzoekTotInformatieKBP.response.action=
operation.VerzoekTotInformatieKSO.request.name=VerzoekTotInformatieRequest
operation.VerzoekTotInformatieKSO.request.namespace=http://www.kadaster.nl/schemas/kik-inzage/verzoektotinformatie/v20170101
operation.VerzoekTotInformatieKSO.request.action=
operation.VerzoekTotInformatieKSO.response.name=VerzoekTotInformatieKSOResponse
operation.VerzoekTotInformatieKSO.response.namespace=http://www.kadaster.nl/schemas/kik-inzage/verzoektotinformatie/v20170101
operation.VerzoekTotInformatieKSO.response.action=
operation.VerzoekTotInformatieUKK.request.name=VerzoekTotInformatieRequest
operation.VerzoekTotInformatieUKK.request.namespace=http://www.kadaster.nl/schemas/kik-inzage/verzoektotinformatie/v20170101
operation.VerzoekTotInformatieUKK.request.action=
operation.VerzoekTotInformatieUKK.response.name=VerzoekTotInformatieUKKResponse
operation.VerzoekTotInformatieUKK.response.namespace=http://www.kadaster.nl/schemas/kik-inzage/verzoektotinformatie/v20170101
operation.VerzoekTotInformatieUKK.response.action=
operation.VerzoekTotInformatieOLB.request.name=VerzoekTotInformatieRequest
operation.VerzoekTotInformatieOLB.request.namespace=http://www.kadaster.nl/schemas/kik-inzage/verzoektotinformatie/v20170101
operation.VerzoekTotInformatieOLB.request.action=
operation.VerzoekTotInformatieOLB.response.name=VerzoekTotInformatieOLBResponse
operation.VerzoekTotInformatieOLB.response.namespace=http://www.kadaster.nl/schemas/kik-inzage/verzoektotinformatie/v20170101
operation.VerzoekTotInformatieOLB.response.action=
operation.VerzoekTotInformatieOLR.request.name=VerzoekTotInformatieRequest
operation.VerzoekTotInformatieOLR.request.namespace=http://www.kadaster.nl/schemas/kik-inzage/verzoektotinformatie/v20170101
operation.VerzoekTotInformatieOLR.request.action=
operation.VerzoekTotInformatieOLR.response.name=VerzoekTotInformatieOLRResponse
operation.VerzoekTotInformatieOLR.response.namespace=http://www.kadaster.nl/schemas/kik-inzage/verzoektotinformatie/v20170101
operation.VerzoekTotInformatieOLR.response.action=`
      }
    ]
  },
  {
    id: 208,
    name: 'specification-pipeline-tooling',
    path: 'specification-pipeline-tooling',
    path_with_namespace: 'service-specifications/bkwi-suwiml-diensten/specification-pipeline-tooling',
    description: 'Shared CI/CD pipeline automation and Maven build plugins (no WSDL or OpenAPI contracts)',
    default_branch: 'master',
    web_url: 'https://gitlab.example.corp/service-specifications/bkwi-suwiml-diensten/specification-pipeline-tooling',
    last_activity_at: '2026-10-09T08:00:00Z',
    specType: 'unknown',
    currentTag: '1.2.0',
    subgroupId: 100,
    subgroupPath: 'bkwi-suwiml-diensten',
    operations: [],
    filesCount: 4,
    latestPipeline: {
      id: 94990,
      status: 'success',
      ref: 'master',
      sha: '109283fade',
      web_url: 'https://gitlab.example.corp/service-specifications/bkwi-suwiml-diensten/specification-pipeline-tooling/-/pipelines/94990',
      created_at: '2026-10-09T08:01:00Z',
      finished_at: '2026-10-09T08:02:15Z'
    },
    files: [
      {
        path: '.gitlab-ci.yml',
        content: 'stages:\n  - test\n  - deploy\n'
      }
    ]
  }
];

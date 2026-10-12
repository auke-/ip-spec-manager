# WSDL service.properties Metadata Extraction & Overview Plan

Extract specification metadata from `generated-reference/nl/bkwi/specification/wsdl/*/service.properties` files in WSDL projects and display key attributes (Service Name, Operation Count, abbreviated Header version, and abbreviated FWI version) in the main project overview and detailed inspection views.

## User Review & Critical Decisions

> [!IMPORTANT]
> The following metadata extraction and layout specifications were aligned with your requirements:

- **Target Path Pattern**: Locate `service.properties` under `generated-reference/nl/bkwi/specification/wsdl/*/service.properties` (using the project's default branch, e.g. `master`).
- **Overview Table Key Metadata**:
  1. **Service Name**: Derived from `name=` in the property file (e.g. `BijstandsregelingenIncJustitieGegWGS-v0100`).
  2. **Operation Count & Names**: Parsed from multi-line `operation.names=\ ... \` property, showing the numeric count with operation names on hover.
  3. **SuwiML Header Version (Abbreviated)**: Extracted from `suwiml.header` (e.g. `v0401` or `—` if blank).
  4. **SuwiML FWI Version (Abbreviated)**: Extracted from namespace in `suwiml.fwi` (e.g. `http://bkwi.nl/SuwiML/FWI/v0205` $\rightarrow$ `v0205`).
- **Inspection Drawer Integration**: Dedicated "SuwiML Service Contract Properties" panel in the Project Detail Drawer displaying full operation namespaces, actions, WSDL/XSD schema paths (`schema.wsdl`, `schema.request`), broker filter key expression (`filter.key.expression`), and generated test payload snippets (`request.valid`, `request.notfound`).

---

## 1. Overview & Core Concept

### What It Does
When scanning projects from GitLab (in both Live and Demo modes), the application locates `generated-reference/nl/bkwi/specification/wsdl/*/service.properties`, parses its multi-line key-value entries, extracts canonical SuwiML contract parameters, and enriches the project entity.

### Namespace to Abbreviated Version Mapping
- `http://bkwi.nl/SuwiML/FWI/v0205` $\rightarrow$ **`v0205`**
- `http://suwiml.suwinet.nl/headers/v0401` $\rightarrow$ **`v0401`**
- `http://bkwi.nl/SuwiML/Diensten/BijstandsregelingenIncJustitieGegWGS/v0100` $\rightarrow$ **`v0100`**

---

## 2. User Experience & Visual Design

### Projects Overview Table Enhancements
Add high-density, unboxed metadata columns to the project table:
- **Specification Project**: Project Name + Service Name subtitle (from `name=`)
- **Subgroup**: Subgroup identifier (e.g. `svb-social-security`, `uwv-employment-benefits`)
- **Type**: Spec type (SuwiML SOAP / OpenAPI)
- **Operations**: Numerical count with operation pill-free text (e.g. `1 op: BijstandsregelingenIncJustitieGegInfo`)
- **SuwiML Protocol**: Abbreviated Header & FWI versions (e.g. `FWI v0205 · Header v0401`)
- **Version Tag**: Raw `x.y.z` tag (e.g. `1.0.0`)
- **Actions**: Inspect / Update via Zip

### Project Detail Drawer Enhancements
- Structured cards for:
  - **SuwiML Protocol Settings**: FWI version (`v0205`), Addressing, Security, Nietsgevonden flags.
  - **WSDL & Schemas**: Paths to `schema.wsdl`, `schema.request`, `schema.response`, `schema.typeless`, and `schema.sample`.
  - **Broker Filter Expression**: XPath expression (`/*[local-name() = ...]/*[local-name() = 'Burgerservicenr']`).
  - **Test XML Payloads**: Formatted XML snippets for `request.valid` and `request.notfound`.

---

## 3. Technical Architecture & Data Strategy

### Properties Parser Architecture

```
generated-reference/nl/bkwi/specification/wsdl/*/service.properties
                              │
                              ▼
           ┌──────────────────────────────────────┐
           │     ServicePropertiesParser          │
           │  - Multi-line continuation (\)       │
           │  - Operation names array parsing     │
           │  - Namespace version abbreviation    │
           │  - Schema & Filter key extraction    │
           └──────────────────┬───────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│ Extracted SuwiML Metadata Entity:                               │
│ {                                                               │
│   serviceName: "BijstandsregelingenIncJustitieGegWGS-v0100",    │
│   operations: ["BijstandsregelingenIncJustitieGegInfo"],        │
│   operationsCount: 1,                                           │
│   headerVersion: "none",                                        │
│   fwiVersion: "v0205",                                          │
│   wsdlSchemaPath: "nl/bkwi/specification/wsdl/.../BKWI.wsdl",   │
│   filterKeyExpression: "/*[local-name() = ...]..."              │
│ }                                                               │
└─────────────────────────────────────────────────────────────────┘
```

### Components to Update
1. **`GitlabModels` (`src/app/models/gitlab.models.ts`)**:
   - Add `SuwimlServiceProperties` interface with fields: `serviceName`, `operations`, `fwiVersion`, `headerVersion`, `schemaWsdl`, `schemaRequest`, `filterKeyExpression`, `rawProperties`.
   - Add `serviceProperties?: SuwimlServiceProperties` to `GitlabProject`.
2. **`ServicePropertiesParser` (`src/app/services/service-properties-parser.ts`)**:
   - New dedicated parser service handling Java properties format with trailing line continuations (`\`).
   - Abbreviates FWI/Header versions by matching `v\d{4}` or trailing path segments.
3. **`GitlabApi` (`src/app/services/gitlab-api.ts`)**:
   - In Live Mode: fetches `generated-reference/nl/bkwi/specification/wsdl/*/service.properties` from the default branch (`master`) and parses it into `project.serviceProperties`.
   - In Demo Mode: provides realistic parsed metadata matching the user's exact example.
4. **`ProjectExplorer` (`src/app/components/project-explorer/project-explorer.ts`)**:
   - Update table to display Service Name, Operation count, and abbreviated Header & FWI versions.
5. **`ProjectDetailDrawer` (`src/app/components/project-detail/project-detail-drawer.ts`)**:
   - Add visual panels for the SuwiML broker filter, schema paths, and XML sample payloads.

---

## 4. Verification & Testing Plan

1. **Parser Unit Verification**:
   - Verify parsing of multi-line `operation.names=\ \n op1 \`.
   - Verify extracting `v0205` from `http://bkwi.nl/SuwiML/FWI/v0205`.
   - Verify XML test payloads and filter expressions extraction.
2. **UI Verification**:
   - Verify table column alignment, responsive typography, and clean unboxed presentation.
   - Verify project detail drawer displays all contract details.
3. **Compilation & Linting**:
   - Run `lint_applet` and `compile_applet` to confirm zero errors.

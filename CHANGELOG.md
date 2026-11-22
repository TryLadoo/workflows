# Changelog

## Unreleased

- `then` and `on_error` accept `null`, as real exports store it when branches carry the flow.
- The LeadConnector (CRM) step is a known type, `ghl`, with `note`, `add_tags`, `contact_fields` and the pipeline keys. `contact_fields` values must be fields in the file.
- `layout` accepts extra editor data next to each step's `x` and `y`.

## 0.1.0 (2026-11-22)

- JSON Schema (2020-12) for `.lassi-workflow.json` files, format version 1.
- Validator: `npx -y github:TryLadoo/workflows <file>` checks the schema and the graph rules from the docs.
- Mermaid diagram generator for template READMEs, checked in CI.
- 12 templates: emergency triage, after-hours, dental, med spa, roofing, law firm intake, property maintenance, salon, restaurant, real estate, bilingual front desk and an agency starter.

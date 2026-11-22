<p>
  <a href="https://tryladoo.com">
    <picture>
      <source media="(prefers-color-scheme: dark)" srcset="assets/ladoo-wordmark-on-dark.svg">
      <img src="assets/ladoo-wordmark.svg" alt="Ladoo" height="40">
    </picture>
  </a>
</p>

# Ladoo workflows

[![CI](https://github.com/TryLadoo/workflows/actions/workflows/ci.yml/badge.svg)](https://github.com/TryLadoo/workflows/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

Call workflow templates for [Ladoo](https://tryladoo.com) agents, and the open format they're written in.

A Ladoo agent follows a workflow on every call: steps like Talk, Collect info, Book appointment, Condition and Transfer, joined by branches. A workflow exports to a `.lassi-workflow.json` file. This repo has a JSON Schema for that file, a validator, and templates you can import as they are or change for your business.

## Templates

<!-- BEGIN GENERATED: gallery (npm run diagram) -->
<!-- prettier-ignore-start -->

| Template | Industry | What it does | Steps |
| --- | --- | --- | --- |
| [Agency starter](templates/agency/starter) | Agency | A starting point for client agents: questions, bookings, messages, and urgent calls put through to the owner. | 12 |
| [Dental new-patient booking](templates/dental/new-patient-booking) | Dental | New-patient and existing-patient booking, insurance questions from the knowledge base, and dental emergencies put through to the office. | 17 |
| [Bilingual front desk (English and Spanish)](templates/general/bilingual-front-desk) | Any business | A front desk for English and Spanish callers: questions, bookings, messages, and a person during booking hours. | 11 |
| [After-hours receptionist](templates/home-services/after-hours) | Home services | Books visits, takes messages and flags emergencies while the office is closed. | 10 |
| [Emergency triage](templates/home-services/emergency-triage) | Home services | Separates emergencies from routine requests. Emergencies are marked urgent and put through to your on-call number; routine requests become messages, with a note for renters. | 12 |
| [Law firm intake with conflict check](templates/legal/intake-conflict-check) | Legal | New-matter intake by practice area, the other party's name for a conflict check, and urgent deadlines put through to intake. | 14 |
| [Med spa consultations](templates/med-spa/consultation-booking) | Med spa | Treatment and price questions from the knowledge base, consultation booking, and post-treatment reactions put through to the clinic. | 14 |
| [Property maintenance requests](templates/property-management/maintenance-requests) | Property management | Routine work orders with permission to enter, emergencies put through to on-call maintenance, and rental questions. | 14 |
| [Real estate showing requests](templates/real-estate/showing-requests) | Real estate | Listing questions from the knowledge base, showings for buyers without an agent, and messages for buyers' agents and sellers. | 13 |
| [Restaurant reservations and FAQ](templates/restaurant/reservations-and-faq) | Restaurant | Table bookings, menu and hours questions, and large parties sent to the events team. | 13 |
| [Roofing estimate intake](templates/roofing/estimate-intake) | Roofing | Free estimate booking with the details the estimator needs, commercial jobs as messages, and active leaks flagged urgent. | 13 |
| [Salon appointment booking](templates/salon/appointment-booking) | Salon | Bookings with a preferred stylist, service and price questions, and messages for changes and late arrivals. | 13 |

<!-- prettier-ignore-end -->
<!-- END GENERATED: gallery -->

Each template's folder has a diagram of its steps, the fields it collects and the business settings to add before you publish.

## Import into Ladoo

**In the dashboard.** Download a template's `workflow.lassi-workflow.json`. Open the agent, go to the **Workflow** tab, click **⋯** and choose **Import from file**. The import replaces the draft; calls keep following the live workflow until you click **Save & publish**.

**Through the API.** Import replaces the agent's draft (`agents:write`). Publishing is a separate call.

```sh
curl https://api.tryladoo.com/v1/agents/$AGENT_ID/workflow/import \
  -H "Authorization: Bearer $LADOO_API_KEY" \
  -H "Ladoo-Version: 2026-11-16" \
  -H "Content-Type: application/json" \
  -H "Idempotency-Key: $(uuidgen)" \
  --data-binary @templates/dental/new-patient-booking/workflow.lassi-workflow.json
```

The response has the new draft, its `validation` and a `needs_setup` list of anything to fill in, like a business setting a transfer uses. When it's ready:

```sh
curl -X POST https://api.tryladoo.com/v1/agents/$AGENT_ID/workflow/draft/publish \
  -H "Authorization: Bearer $LADOO_API_KEY" \
  -H "Content-Type: application/json" \
  -H "Idempotency-Key: $(uuidgen)" \
  -d '{ "changelog": "Dental new-patient booking template" }'
```

Publishing answers `422 invalid_workflow` if the draft still has problems.

## Recipes

### Validate a file

No install needed. Node.js 22 or later:

```sh
npx -y github:TryLadoo/workflows my-agent.lassi-workflow.json
```

From a clone, `node scripts/validate.mjs path/to/file-or-folder`. It checks the file against the schema and then the graph rules from the docs: every branch points at a real step, every step is reachable and can reach an End call, Conditions have an else, Collect steps only ask for fields that exist, and so on. Add `--json` for machine-readable output. It exits 1 on any error.

This is an offline check. Ladoo's own `POST /v1/agents/{id}/workflow/validate` is the final word, since it also knows your agent's tools, calendar and business settings.

### Keep an agent's workflow in git

```sh
curl -s "https://api.tryladoo.com/v1/agents/$AGENT_ID/workflow/export?from=draft" \
  -H "Authorization: Bearer $LADOO_API_KEY" > front-desk.lassi-workflow.json
npx -y github:TryLadoo/workflows front-desk.lassi-workflow.json
git add front-desk.lassi-workflow.json && git commit -m "Update front desk workflow"
```

Exports leave out phone numbers, teams, knowledge base ids, CRM pipeline stages and webhook header values, and list each one in `needs_setup`, so the file is safe to commit.

### Check a file against your agent

```sh
jq '{ graph, fields }' front-desk.lassi-workflow.json |
  curl https://api.tryladoo.com/v1/agents/$AGENT_ID/workflow/validate \
    -H "Authorization: Bearer $LADOO_API_KEY" \
    -H "Content-Type: application/json" \
    --data-binary @-
```

```json
{
  "valid": false,
  "errors": [{ "node_id": "book", "code": "missing_then", "message": "Choose what happens after this step." }]
}
```

### Autocomplete in your editor

The schema has a description on every key. In VS Code, add this to your settings:

```json
"json.schemas": [
  {
    "fileMatch": ["*.lassi-workflow.json"],
    "url": "https://raw.githubusercontent.com/TryLadoo/workflows/main/schema/lassi-workflow.schema.json"
  }
]
```

Other editors that speak JSON Schema 2020-12 work the same way. The schema's `$id` is that URL.

## The format

```json
{
  "format": "lassi.workflow",
  "format_version": 1,
  "name": "Front desk",
  "graph": {
    "start": "greet",
    "nodes": [
      {
        "id": "greet",
        "type": "conversation",
        "prompt": "Find out what the caller needs.",
        "edges": [
          { "to": "message", "when": { "intent": "wants a callback" } },
          { "to": "goodbye", "when": { "else": true } }
        ]
      },
      { "id": "message", "type": "action", "action": "take_message", "then": "goodbye" },
      { "id": "goodbye", "type": "end" }
    ]
  }
}
```

The full reference is [The .lassi-workflow.json file format](https://tryladoo.com/docs/developers/workflow-file-format). For Webhook and Custom code steps, see [Webhook and Custom Code steps](https://tryladoo.com/docs/developers/webhook-and-code-steps). The schema in [`schema/`](schema/lassi-workflow.schema.json) follows those pages; where they disagree, the docs win and the schema is a bug.

## Contributing

New templates and fixes are welcome. See [CONTRIBUTING.md](CONTRIBUTING.md) for what a template needs and how to submit one.

## Roadmap

- Publish the validator to npm, so `npx` doesn't need the GitHub path. The release workflow is ready.
- Templates that use Webhook and LeadConnector steps, once their keys are fully documented.
- More industries: auto repair, veterinary, cleaning, pest control.

## License

[MIT](LICENSE). Ladoo and the Ladoo logo are trademarks of Ladoo LLC.

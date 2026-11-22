# Contributing

Templates, schema fixes and validator improvements are all welcome. Node.js 22 or later.

```sh
git clone https://github.com/TryLadoo/workflows && cd workflows
npm install
npm run validate   # schema and graph rules for every template
npm test
```

## Submit a template

1. Build and test the workflow in Ladoo, then export it: **Workflow** tab, **⋯ → Export to file**.
2. Save it as `templates/<industry>/<name>/workflow.lassi-workflow.json`. Use an existing industry folder if one fits. Remove `exported_at`.
3. Copy a README from another template next to it and rewrite it: what the workflow handles, and a table of every business setting (`{{variables.…}}`) it uses. The validator fails if one is missing.
4. Run `npm run diagram` to draw the steps into the README and add the template to the gallery table.
5. Run `npm run validate` and `npm test`, then open a pull request.

What we look for:

- **A demo business.** No real business names, people, addresses, phone numbers or emails. Use 555-01xx numbers and example.com. Put phone numbers in business settings, not in the steps.
- **Prompts that follow the docs.** Don't greet in the first step (the greeting comes before it) and don't repeat the AI disclosure. Collect steps don't ask for a phone number; the agent confirms the number they're calling from. Facts like prices and hours belong in the knowledge base, so prompts say what to do when something isn't there.
- **No dead ends.** Every booking and transfer has a way out when it fails, every Condition has an else, and Answer questions steps go back to a step that asks what else the caller needs.
- **No time check in front of booking.** The calendar only offers open times, so callers can book at any hour.
- **Something real.** A template should handle the calls a business in that industry actually gets.

## Change the schema or validator

The schema follows the public docs at https://tryladoo.com/docs/developers/workflow-file-format. If they disagree, open an issue with a link to the docs section. Add a test in `test/` for any new rule, with a case that fails and one that passes. Keep the validator dependency-free.

## Style

`npm run format` before committing. CI runs `npm run lint`, which also fails if a README diagram is out of date.

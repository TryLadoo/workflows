# Property maintenance requests

Takes maintenance requests from tenants as complete work orders, puts emergencies through to on-call maintenance, and answers rental questions from the knowledge base.

## What it handles

- Routine repairs: address, unit, issue type, a description, permission to enter and pets, saved as a work order message.
- Emergencies (flooding, no heat, gas, sparking, sewage, a door that won't lock) from anywhere in the call: flagged urgent, safety advice, address and unit, then on-call maintenance.
- Prospective renters: availability, pets, fees and how to apply, then a message for leasing.
- Rent, lease and billing calls, as a message for the office without discussing balances.

## Steps

<!-- BEGIN GENERATED: diagram (npm run diagram) -->
<!-- prettier-ignore-start -->

```mermaid
flowchart TD
  s0("Find out why they're calling<br/>(Talk)")
  s1[/"Maintenance request details<br/>(Collect info)"/]
  s2["Take the work order<br/>(Take message)"]
  s3("Wrap up the request<br/>(Talk)")
  s4[("Rental questions<br/>(Answer questions)")]
  s5["Message for leasing<br/>(Take message)"]
  s6["Flag the emergency<br/>(Flag urgent)"]
  s7[/"Where is it?<br/>(Collect info)"/]
  s8[["Connect on-call maintenance<br/>(Transfer)"]]
  s9["Urgent work order<br/>(Take message)"]
  s10["Message for the office<br/>(Take message)"]
  s11("Wrap up the message<br/>(Talk)")
  s12(["Decline politely<br/>(End call)"])
  s13(["Goodbye<br/>(End call)"])
  start(("Call starts")) --> s0
  s0 -->|"Routine repair"| s1
  s0 -->|"is asking about available units, showings…"| s4
  s0 -->|"is calling about rent, a lease, a payment, a…"| s10
  s0 -->|"is a telemarketer, robocall or sales pitch"| s12
  s0 -->|"otherwise"| s10
  s1 --> s2
  s2 --> s3
  s3 -->|"otherwise"| s13
  s4 -->|"wants to see a unit or talk to the leasing team"| s5
  s4 -->|"says they're all set"| s13
  s4 -->|"otherwise"| s0
  s5 --> s11
  s6 --> s7
  s7 --> s8
  s8 -.->|"if nobody answers"| s9
  s9 --> s11
  s10 --> s11
  s11 -->|"otherwise"| s13
  anytime{{"Anytime the caller…"}}
  anytime -.->|"describes a maintenance emergency: flooding or…"| s6
```

| Field | Type | Asked | What it's for |
| --- | --- | --- | --- |
| `property_address` | string | Required | Street address of the building. |
| `unit_number` | string | Required | Unit or apartment number. "None" for a single-family home. |
| `issue_category` | one of `plumbing`, `electrical`, `appliance`, `heating_cooling`, `doors_locks`, `pests`, `other` | Required | What kind of problem it is. |
| `issue_description` | string | Required | The problem in the caller's words. |
| `permission_to_enter` | boolean | Required | Whether maintenance may enter if the tenant isn't home. |
| `pets_in_unit` | boolean | Optional | Whether there are pets in the unit that maintenance should know about. |

<!-- prettier-ignore-end -->
<!-- END GENERATED: diagram -->

## Before you publish

Business settings to add under **Whole call → Business settings**:

| Setting                     | What to set                    |
| --------------------------- | ------------------------------ |
| `maintenance_oncall_number` | The on-call maintenance phone. |

- Add a knowledge base with available units, rent ranges, pet policy, application steps and fees.
- Make a test call for each path. See [Test your agent](https://tryladoo.com/docs/getting-started/test-your-agent).

## Import

Download [`workflow.lassi-workflow.json`](workflow.lassi-workflow.json), then in Ladoo open the agent's **Workflow** tab and choose **⋯ → Import from file**. To import through the API, see [Import into Ladoo](../../../README.md#import-into-ladoo).

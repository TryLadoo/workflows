# Med spa consultations

Books consultations for injectables, lasers, facials and other treatments, and answers price and prep questions from the knowledge base without giving medical advice. Callers describing a reaction after a treatment get safety advice first and then a provider.

## What it handles

- Consultations: treatment, first visit or not, and a preferred provider, then a booking.
- Prices, specials, downtime and prep, from the knowledge base only.
- Reactions after a treatment, from anywhere in the call: flagged urgent, 911 for red-flag symptoms, otherwise put through to the clinic or an urgent message.
- Changes to existing appointments, as a message for the front desk.

## Steps

<!-- BEGIN GENERATED: diagram (npm run diagram) -->
<!-- prettier-ignore-start -->

```mermaid
flowchart TD
  s0("Find out why they're calling<br/>(Talk)")
  s1[("Treatment questions<br/>(Answer questions)")]
  s2[/"Consultation details<br/>(Collect info)"/]
  s3["Book the consultation<br/>(Book appointment)"]
  s4("Confirm the consultation<br/>(Talk)")
  s5["Flag the reaction<br/>(Flag urgent)"]
  s6("Safety first<br/>(Talk)")
  s7[["Put them through to the clinic<br/>(Transfer)"]]
  s8["Urgent message<br/>(Take message)"]
  s9["Message about a change<br/>(Take message)"]
  s10["Take a message<br/>(Take message)"]
  s11("Wrap up the message<br/>(Talk)")
  s12(["Decline politely<br/>(End call)"])
  s13(["Goodbye<br/>(End call)"])
  start(("Call starts")) --> s0
  s0 -->|"wants to book a consultation or a treatment"| s2
  s0 -->|"has a question about treatments, prices…"| s1
  s0 -->|"wants to reschedule or cancel an appointment…"| s9
  s0 -->|"is a telemarketer, robocall or sales pitch"| s12
  s0 -->|"otherwise"| s10
  s1 -->|"wants to book a consultation or a treatment"| s2
  s1 -->|"says they're all set"| s13
  s1 -->|"otherwise"| s0
  s2 --> s3
  s3 --> s4
  s3 -.->|"if it fails"| s10
  s4 -->|"otherwise"| s13
  s5 --> s6
  s6 -->|"is going to call 911 or go to the emergency room"| s13
  s6 -->|"otherwise"| s7
  s7 -.->|"if nobody answers"| s8
  s8 --> s11
  s9 --> s11
  s10 --> s11
  s11 -->|"otherwise"| s13
  anytime{{"Anytime the caller…"}}
  anytime -.->|"describes a problem after a treatment…"| s5
```

| Field | Type | Asked | What it's for |
| --- | --- | --- | --- |
| `treatment_interest` | one of `injectables`, `dermal_fillers`, `laser_hair_removal`, `facial`, `chemical_peel`, `body_contouring`, `not_sure` | Required | The treatment they're interested in. |
| `first_visit` | boolean | Required | Whether this is their first visit to the clinic. |
| `preferred_provider` | string | Optional | A provider they asked for by name, if any. |
| `how_heard` | string | Picked up, never asked | Referral or marketing source, if mentioned. |

<!-- prettier-ignore-end -->
<!-- END GENERATED: diagram -->

## Before you publish

Business settings to add under **Whole call → Business settings**:

| Setting         | What to set                                                       |
| --------------- | ----------------------------------------------------------------- |
| `clinic_number` | The line a provider or nurse answers for post-treatment concerns. |

- Turn on **Book appointments** and **Look up open times** under **Tools** on the **Agent** tab, and connect a calendar.
- Add a knowledge base with treatments, starting prices, specials, downtime, prep instructions and your cancellation policy.
- Make a test call for each path. See [Test your agent](https://tryladoo.com/docs/getting-started/test-your-agent).

## Import

Download [`workflow.lassi-workflow.json`](workflow.lassi-workflow.json), then in Ladoo open the agent's **Workflow** tab and choose **⋯ → Import from file**. To import through the API, see [Import into Ladoo](../../../README.md#import-into-ladoo).

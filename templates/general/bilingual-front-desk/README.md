# Bilingual front desk (English and Spanish)

A general front desk for businesses with English and Spanish callers. The workflow stays in English; Ladoo answers Spanish speakers in Spanish from the same steps, and the prompts ask it to keep read-backs in the caller's language.

## What it handles

- Questions, from the knowledge base.
- Bookings: what the visit is for, then two open times.
- Requests for a person: put through to the office during booking hours, a message otherwise or when nobody answers.
- Messages, with the caller's preferred language noted for the callback.

## Steps

<!-- BEGIN GENERATED: diagram (npm run diagram) -->
<!-- prettier-ignore-start -->

```mermaid
flowchart TD
  s0("Find out why they're calling<br/>(Talk)")
  s1[("Questions<br/>(Answer questions)")]
  s2[/"Visit details<br/>(Collect info)"/]
  s3["Book the visit<br/>(Book appointment)"]
  s4("Confirm the visit<br/>(Talk)")
  s5{"During booking hours?<br/>(Condition)"}
  s6[["Put them through to the office<br/>(Transfer)"]]
  s7["Take a message<br/>(Take message)"]
  s8("Wrap up the message<br/>(Talk)")
  s9(["Decline politely<br/>(End call)"])
  s10(["Goodbye<br/>(End call)"])
  start(("Call starts")) --> s0
  s0 -->|"wants to book an appointment or a visit"| s2
  s0 -->|"has a question about services, prices, hours or…"| s1
  s0 -->|"asks for a person, the owner or a specific…"| s5
  s0 -->|"is a telemarketer, robocall or sales pitch"| s9
  s0 -->|"otherwise"| s7
  s1 -->|"wants to book"| s2
  s1 -->|"says they're all set"| s10
  s1 -->|"otherwise"| s0
  s2 --> s3
  s3 --> s4
  s3 -.->|"if it fails"| s7
  s4 -->|"otherwise"| s10
  s5 -->|"Open"| s6
  s5 -->|"otherwise"| s7
  s6 -.->|"if nobody answers"| s7
  s7 --> s8
  s8 -->|"otherwise"| s10
```

| Field | Type | Asked | What it's for |
| --- | --- | --- | --- |
| `visit_reason` | string | Required | What the visit is for, in the caller's words. |
| `how_heard` | string | Picked up, never asked | Referral or marketing source, if mentioned. |

<!-- prettier-ignore-end -->
<!-- END GENERATED: diagram -->

## Before you publish

Business settings to add under **Whole call → Business settings**:

| Setting         | What to set                                   |
| --------------- | --------------------------------------------- |
| `office_number` | The office line that takes transferred calls. |

- Under **Basics → Languages** on the **Agent** tab, choose **English and Spanish**. See [Spanish-speaking callers](https://tryladoo.com/docs/agents/spanish-callers).
- Turn on **Book appointments** and **Look up open times** under **Tools** on the **Agent** tab, and connect a calendar.
- Set your booking hours in **Calendar → Settings**. The Condition step reads them on every call.
- Make a test call for each path. See [Test your agent](https://tryladoo.com/docs/getting-started/test-your-agent).

## Import

Download [`workflow.lassi-workflow.json`](workflow.lassi-workflow.json), then in Ladoo open the agent's **Workflow** tab and choose **⋯ → Import from file**. To import through the API, see [Import into Ladoo](../../../README.md#import-into-ladoo).

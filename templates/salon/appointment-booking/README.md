# Salon appointment booking

Books salon services with a preferred stylist and answers service and price questions from the knowledge base. Color clients hear about the patch test before they book.

## What it handles

- Bookings: service, preferred stylist and whether they're new, then two open times.
- Color and highlights: a one-sentence patch test note for new color clients before booking.
- Starting prices, how long services take and products, from the knowledge base.
- Running late, can't make it today, or changing a future appointment: a message for the front desk.

## Steps

<!-- BEGIN GENERATED: diagram (npm run diagram) -->
<!-- prettier-ignore-start -->

```mermaid
flowchart TD
  s0("Find out why they're calling<br/>(Talk)")
  s1[("Service questions<br/>(Answer questions)")]
  s2[/"What they're booking<br/>(Collect info)"/]
  s3{"Color service?<br/>(Condition)"}
  s4("Patch test note<br/>(Talk)")
  s5["Book the appointment<br/>(Book appointment)"]
  s6("Confirm the appointment<br/>(Talk)")
  s7["Late or missed today<br/>(Take message)"]
  s8["Message about a change<br/>(Take message)"]
  s9["Take a message<br/>(Take message)"]
  s10("Wrap up the message<br/>(Talk)")
  s11(["Decline politely<br/>(End call)"])
  s12(["Goodbye<br/>(End call)"])
  start(("Call starts")) --> s0
  s0 -->|"wants to book an appointment"| s2
  s0 -->|"has a question about services, prices, products…"| s1
  s0 -->|"is running late for or can't make an…"| s7
  s0 -->|"wants to reschedule or cancel a future…"| s8
  s0 -->|"is a telemarketer, robocall or sales pitch"| s11
  s0 -->|"otherwise"| s9
  s1 -->|"wants to book"| s2
  s1 -->|"says they're all set"| s12
  s1 -->|"otherwise"| s0
  s2 --> s3
  s3 -->|"Color"| s4
  s3 -->|"otherwise"| s5
  s4 --> s5
  s5 --> s6
  s5 -.->|"if it fails"| s9
  s6 -->|"otherwise"| s12
  s7 --> s10
  s8 --> s10
  s9 --> s10
  s10 -->|"otherwise"| s12
```

| Field | Type | Asked | What it's for |
| --- | --- | --- | --- |
| `service` | one of `haircut`, `color`, `highlights`, `blowout`, `extensions`, `treatment`, `nails`, `other` | Required | The service they want. |
| `stylist_preference` | string | Optional | A stylist they asked for by name, if any. |
| `new_client` | boolean | Optional | Whether they've been to the salon before. |

<!-- prettier-ignore-end -->
<!-- END GENERATED: diagram -->

## Before you publish

- Turn on **Book appointments** and **Look up open times** under **Tools** on the **Agent** tab, and connect a calendar.
- If each stylist has their own calendar, choose them all in the agent's **Calendars** card so the agent can offer a stylist's own times.
- Add a knowledge base with services, starting prices, durations and your patch test and cancellation policies.
- Make a test call for each path. See [Test your agent](https://tryladoo.com/docs/getting-started/test-your-agent).

## Import

Download [`workflow.lassi-workflow.json`](workflow.lassi-workflow.json), then in Ladoo open the agent's **Workflow** tab and choose **⋯ → Import from file**. To import through the API, see [Import into Ladoo](../../../README.md#import-into-ladoo).

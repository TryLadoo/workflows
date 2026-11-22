# Restaurant reservations and FAQ

Answers the questions restaurants get all day (hours, menu, parking, allergens, takeout) and books tables. Parties above your limit and private events go to the events team as a message.

## What it handles

- Reservations: party size and special requests, then a booking.
- Large parties: a Custom code step compares the party size with `max_party_size` and sends bigger groups to the events team.
- Menu, hours, location, parking, dietary and takeout questions, from the knowledge base, with a careful answer for serious allergies.
- Changes to existing reservations, as a message.

## Steps

<!-- BEGIN GENERATED: diagram (npm run diagram) -->
<!-- prettier-ignore-start -->

```mermaid
flowchart TD
  s0("Find out why they're calling<br/>(Talk)")
  s1[("Menu and hours questions<br/>(Answer questions)")]
  s2[/"Party details<br/>(Collect info)"/]
  s3["Large party?<br/>(Custom code)"]
  s4{"Route by party size<br/>(Condition)"}
  s5["Book the table<br/>(Book appointment)"]
  s6("Confirm the reservation<br/>(Talk)")
  s7["Message for the events team<br/>(Take message)"]
  s8["Message about a change<br/>(Take message)"]
  s9["Take a message<br/>(Take message)"]
  s10("Wrap up the message<br/>(Talk)")
  s11(["Decline politely<br/>(End call)"])
  s12(["Goodbye<br/>(End call)"])
  start(("Call starts")) --> s0
  s0 -->|"wants to make a reservation"| s2
  s0 -->|"wants to book a private event, a buyout or…"| s7
  s0 -->|"has a question about the menu, hours, location…"| s1
  s0 -->|"wants to change or cancel a reservation they…"| s8
  s0 -->|"is a telemarketer, robocall or sales pitch"| s11
  s0 -->|"otherwise"| s9
  s1 -->|"wants to make a reservation"| s2
  s1 -->|"says they're all set"| s12
  s1 -->|"otherwise"| s0
  s2 --> s3
  s3 --> s4
  s3 -.->|"if it fails"| s5
  s4 -->|"Large party"| s7
  s4 -->|"otherwise"| s5
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
| `party_size` | number | Required | How many people, including children. |
| `special_requests` | string | Optional | Accessibility needs, high chairs, allergies or a celebration. |

<!-- prettier-ignore-end -->
<!-- END GENERATED: diagram -->

## Before you publish

Business settings to add under **Whole call → Business settings**:

| Setting          | What to set                                                                                                        |
| ---------------- | ------------------------------------------------------------------------------------------------------------------ |
| `max_party_size` | The largest party you book online, like `8`. Bigger groups go to the events team. Defaults to 8 when it isn't set. |

- Turn on **Book appointments** and **Look up open times** under **Tools** on the **Agent** tab, and connect a calendar. Use table slots as the calendar's open times.
- Add a knowledge base with your menu, hours, location, parking, allergen notes and online ordering link.
- Make a test call for each path. See [Test your agent](https://tryladoo.com/docs/getting-started/test-your-agent).

## Import

Download [`workflow.lassi-workflow.json`](workflow.lassi-workflow.json), then in Ladoo open the agent's **Workflow** tab and choose **⋯ → Import from file**. To import through the API, see [Import into Ladoo](../../../README.md#import-into-ladoo).

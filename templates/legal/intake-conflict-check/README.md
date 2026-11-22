# Law firm intake with conflict check

Screens new matters for a firm that handles personal injury, family, estate planning and employment law. It gets the other party's name up front so intake can run a conflict check before anyone discusses the case, and it never gives legal advice.

## What it handles

- New matters: client name, practice area, the other party, a one or two sentence summary and any deadline, then an intake message marked for a conflict check.
- Matters the firm doesn't handle: a pointer to the state bar's referral service.
- Current clients, as a message for their attorney, without discussing the case.
- Court dates, filing deadlines, arrests and service of papers, from anywhere in the call: flagged urgent and put through to intake.

## Steps

<!-- BEGIN GENERATED: diagram (npm run diagram) -->
<!-- prettier-ignore-start -->

```mermaid
flowchart TD
  s0("Find out why they're calling<br/>(Talk)")
  s1[("Questions about the firm<br/>(Answer questions)")]
  s2[/"Intake details<br/>(Collect info)"/]
  s3{"A practice area we handle?<br/>(Condition)"}
  s4["Intake message for conflict check<br/>(Take message)"]
  s5("Matter we don't handle<br/>(Talk)")
  s6["Message for the client's team<br/>(Take message)"]
  s7["Flag the deadline<br/>(Flag urgent)"]
  s8[["Put them through to intake<br/>(Transfer)"]]
  s9["Urgent message<br/>(Take message)"]
  s10["Take a message<br/>(Take message)"]
  s11("Wrap up the message<br/>(Talk)")
  s12(["Decline politely<br/>(End call)"])
  s13(["Goodbye<br/>(End call)"])
  start(("Call starts")) --> s0
  s0 -->|"New matter"| s2
  s0 -->|"Current client"| s6
  s0 -->|"has a question about the firm, its practice…"| s1
  s0 -->|"is a telemarketer, robocall or sales pitch"| s12
  s0 -->|"otherwise"| s10
  s1 -->|"wants a consultation"| s2
  s1 -->|"says they're all set"| s13
  s1 -->|"otherwise"| s0
  s2 --> s3
  s3 -->|"We handle it"| s4
  s3 -->|"otherwise"| s5
  s4 --> s11
  s5 -->|"wants someone to call back anyway"| s10
  s5 -->|"otherwise"| s13
  s6 --> s11
  s7 --> s8
  s8 -.->|"if nobody answers"| s9
  s9 --> s11
  s10 --> s11
  s11 -->|"otherwise"| s13
  anytime{{"Anytime the caller…"}}
  anytime -.->|"mentions a court date, filing deadline or…"| s7
```

| Field | Type | Asked | What it's for |
| --- | --- | --- | --- |
| `client_name` | string | Required | Full name of the person who needs help, which may not be the caller. |
| `practice_area` | one of `personal_injury`, `family`, `estate_planning`, `employment`, `criminal`, `real_estate`, `other` | Required | The kind of legal matter. |
| `opposing_party` | string | Required | Full name of the other person or company involved, for the conflict check. "None" if there isn't one. |
| `matter_summary` | string | Required | A sentence or two about what happened. No confidential details. |
| `upcoming_deadline` | date | Optional | A court date or filing deadline, if there is one. |
| `how_heard` | string | Picked up, never asked | Referral or marketing source, if mentioned. |

<!-- prettier-ignore-end -->
<!-- END GENERATED: diagram -->

## Before you publish

Business settings to add under **Whole call → Business settings**:

| Setting         | What to set                                       |
| --------------- | ------------------------------------------------- |
| `intake_number` | The intake coordinator's line for urgent matters. |

- Change the practice areas in the **A practice area we handle?** step and the `practice_area` options to match your firm.
- Add a knowledge base with your practice areas, consultation fees, office hours and location.
- Have your intake team review the disclaimer wording in **Intake message for conflict check** against your state's rules.
- Make a test call for each path. See [Test your agent](https://tryladoo.com/docs/getting-started/test-your-agent).

## Import

Download [`workflow.lassi-workflow.json`](workflow.lassi-workflow.json), then in Ladoo open the agent's **Workflow** tab and choose **⋯ → Import from file**. To import through the API, see [Import into Ladoo](../../../README.md#import-into-ladoo).

# Dental new-patient booking

Books first visits for new patients, including parents booking for children, and visits for existing patients. Insurance and office questions come from the knowledge base. Dental emergencies go to the office during booking hours and to an urgent message after.

## What it handles

- New patients: patient name, reason for the visit and insurance, then a booking and a reminder to arrive early with their insurance card.
- Existing patients booking a visit. Changes and cancellations become a message for the front desk.
- Insurance, payment and "what happens at a first visit" questions, without guessing coverage.
- Emergencies (severe pain, swelling, a broken or knocked-out tooth) from anywhere in the call: flagged urgent, ER advice for red-flag symptoms, then the office or an urgent message.

## Steps

<!-- BEGIN GENERATED: diagram (npm run diagram) -->
<!-- prettier-ignore-start -->

```mermaid
flowchart TD
  s0("Find out why they're calling<br/>(Talk)")
  s1[("Insurance and office questions<br/>(Answer questions)")]
  s2[/"New patient details<br/>(Collect info)"/]
  s3["Book the first visit<br/>(Book appointment)"]
  s4("Confirm the first visit<br/>(Talk)")
  s5[/"Visit details<br/>(Collect info)"/]
  s6["Book the visit<br/>(Book appointment)"]
  s7("Confirm the visit<br/>(Talk)")
  s8["Message about a change<br/>(Take message)"]
  s9["Flag the emergency<br/>(Flag urgent)"]
  s10{"Is the office open?<br/>(Condition)"}
  s11[["Put them through to the office<br/>(Transfer)"]]
  s12["Urgent message<br/>(Take message)"]
  s13["Take a message<br/>(Take message)"]
  s14("Wrap up the message<br/>(Talk)")
  s15(["Decline politely<br/>(End call)"])
  s16(["Goodbye<br/>(End call)"])
  start(("Call starts")) --> s0
  s0 -->|"New patient"| s2
  s0 -->|"Existing patient"| s5
  s0 -->|"wants to reschedule or cancel an appointment…"| s8
  s0 -->|"has a question about insurance, payment, the…"| s1
  s0 -->|"is a telemarketer, robocall or sales pitch"| s15
  s0 -->|"otherwise"| s13
  s1 -->|"wants to book a visit as a new patient"| s2
  s1 -->|"wants to book a visit as an existing patient"| s5
  s1 -->|"says they're all set"| s16
  s1 -->|"otherwise"| s0
  s2 --> s3
  s3 --> s4
  s3 -.->|"if it fails"| s13
  s4 -->|"otherwise"| s16
  s5 --> s6
  s6 --> s7
  s6 -.->|"if it fails"| s13
  s7 -->|"otherwise"| s16
  s8 --> s14
  s9 --> s10
  s10 -->|"Open"| s11
  s10 -->|"otherwise"| s12
  s11 -.->|"if nobody answers"| s12
  s12 --> s14
  s13 --> s14
  s14 -->|"otherwise"| s16
  anytime{{"Anytime the caller…"}}
  anytime -.->|"describes a dental emergency: severe tooth…"| s9
```

| Field | Type | Asked | What it's for |
| --- | --- | --- | --- |
| `patient_name` | string | Required | Full name of the person the visit is for, which may not be the caller. |
| `visit_reason` | one of `cleaning_and_exam`, `tooth_pain`, `cosmetic_consult`, `second_opinion`, `other` | Required | What the visit is for. |
| `insurance_provider` | string | Optional | Name of the patient's dental insurance, or none. |
| `how_heard` | string | Picked up, never asked | Referral or marketing source, if mentioned. |

<!-- prettier-ignore-end -->
<!-- END GENERATED: diagram -->

## Before you publish

Business settings to add under **Whole call → Business settings**:

| Setting         | What to set                                             |
| --------------- | ------------------------------------------------------- |
| `office_number` | The front desk line that takes transferred emergencies. |

- Turn on **Book appointments** and **Look up open times** under **Tools** on the **Agent** tab, and connect a calendar.
- Set your booking hours in **Calendar → Settings**. The Condition step reads them on every call.
- Add a knowledge base with the insurance plans you accept, payment options, parking and what a first visit involves.
- Make a test call for each path. See [Test your agent](https://tryladoo.com/docs/getting-started/test-your-agent).

## Import

Download [`workflow.lassi-workflow.json`](workflow.lassi-workflow.json), then in Ladoo open the agent's **Workflow** tab and choose **⋯ → Import from file**. To import through the API, see [Import into Ladoo](../../../README.md#import-into-ladoo).

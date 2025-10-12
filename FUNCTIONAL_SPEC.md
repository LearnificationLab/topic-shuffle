# Functional Specification — Topic Shuffle (Micro Web Game)

## Problem Statement

Language teachers need a lightweight, embeddable web activity that prompts learners with random questions, offers optional translation and hints, and encourages reflection on whether learners used hints. The app must be simple to host as a static site and easy to embed in an LMS or Wix page.

## User Stories

- As a learner, I want to receive a random question so I can practice speaking or writing spontaneously.
- As a learner, I want an optional translation of the question so I can check meaning when I'm unsure.
- As a learner, I want an optional tip/answer variant so I can scaffold my response.
- As a learner, I want to record whether I answered with or without a tip so I can track my independent performance.
- As a teacher, I want the app to be embeddable (iframe) and require no server-side components.
 - As a learner, I want the session to start with a simple start screen that shows the session `topic`, the total number of questions available, and a prominent `Start` button so I can confirm the activity before beginning.
 - As a learner, I want, while the session is running, a small, unobtrusive display that shows my current `score` and the number of questions remaining so I can monitor progress without being distracted.
 - As a learner, when the session finishes, I want a short summary page that shows my final `score`, how many questions I answered, how many times I viewed tips, and how many times I viewed translations so I can reflect on my performance.

## Functional Requirements (must-haves)

1. Load questions dynamically from an external JSON file (for example `questions.json`) and display a random question from that data each time the learner requests a new question.
2. Provide a `Translate` button that reveals a translation for the current question.
3. Provide a `Tip` button that reveals a single suggested answer or hint (`tip`) for the current question; the tip should be optional and toggleable.
4. Automatically record when the learner reveals a translation or views the tip; the app must increment local session counters when the `Translate` or `Tip` controls are activated (no explicit reflection buttons required).
5. Provide two controls to move forward: `Skip` to move to the next random question without changing score, and `Answered` which records the learner's result, updates the session score according to the scoring rules below, and moves to the next random question.
6. UI should be simple, accessible, and mobile-friendly (tailwind CSS allowed).
7. The app must be static (HTML/CSS/JS) and embeddable in an iframe.
8. On initial page load the app shows a lightweight start screen (not the first question): it displays the `topic` (if present in `questions.json`), the total number of questions available, and a `Start` button. The session counters (for score, tip/translation views, counts) must be initialized but not incremented until the learner starts the session. Clicking `Start` transitions the UI into the main application mode and displays the first random question.
9. During an active session the UI must include a small, non-distracting status element that shows the learner's current `score` and the number of questions remaining. Design must keep this element minimal (small font, compact layout) so it does not distract from the question content.
10. When the session is finished (for example after a configured number of questions or when the learner chooses to end the session), the app shows a concise end-of-session summary page with: final `score`, `answeredCount`, `skippedCount`, `tipShown` (how many times tips were viewed), and `translationsShown` (how many times translations were viewed).

## Acceptance Criteria

- On page load (or on first use), the app fetches and parses an external JSON file (`questions.json`) in the same origin and loads the question set — PASS.
 - On page load, after successfully loading `questions.json`, the app shows a start screen that includes the `topic` (when present), the total number of questions, and a visible `Start` button; no question should be shown until the learner clicks `Start` — PASS.
 - Given the start screen, when the learner clicks `Start`, the app transitions to the main application mode, initializes session counters (score, tipShown, translationsShown, asked/skipped/answered counts), and displays the first random question — PASS.
 - During the session, a small status element is visible showing the current `score` and number of questions remaining; the display must be compact and not interrupt the question content — PASS.
 - When the session ends, the app shows an end-of-session summary page containing: final `score`, `answeredCount`, `skippedCount`, `tipShown` and `translationsShown` (counts of tip and translation views) — PASS.
- Given a loaded page, when the learner clicks `Next question`, a question from the loaded data is shown (not always the same) — PASS.
- Given a shown question, when the learner clicks `Translate`, a translation text appears beneath the question — PASS.
- Given a shown question, when the learner clicks `Tip`, the tip (single hint) appears and the app increments the `tipShown` session counter — PASS.
- Given a shown question, when the learner clicks `Translate`, a translation text appears and the app increments the `translationsShown` session counter — PASS.
- The app records whether the learner viewed the tip or translation implicitly by tracking those counts; no separate 'I answered with the tip' / 'I answered without tip' buttons are required — PASS.
- Given a learner clicks `Answered`, the app increases the learner's session `score` by the base amount and any applicable bonuses (see scoring rules), then immediately shows the next random question — PASS.
- Given a learner clicks `Skip`, the app advances to another random question without changing the `score` — PASS.
- If the JSON file is missing, malformed, or cannot be fetched (CORS/host issues), the app shows a clear error message explaining how to place the `questions.json` file next to the app and provides a small sample format — PASS.

## JSON file format requirement

- The app expects a `questions.json` file that follows the example you provided. The root may include optional metadata (for example `topic`) and must include a `questions` array. Each question object should include the question text and include a translation and a tip.


## JSON file format requirement

- Canonical schema (JSON):

- {
-   "topic"?: string,
-   "questions": [
-     {
-       "text": string,
-       "translation": string,
-       "tip": string
-     }
-   ]
- }

- Example (based on the file you attached):

- {
-   "topic": "Mathematics",
-   "questions": [
-     { "text": "What is the value of π (pi) to two decimal places?", "tip": "3 and some more digits", "translation": "¿Cuál es el valor de π (pi) con dos decimales?" },
-     { "text": "What is the square root of 64?", "tip": "It's a whole number", "translation": "¿Cuál es la raíz cuadrada de 64?" }
-   ]
- }

- Notes for robustness:
- - The loader will validate that `questions` is an array and that each question has a `text` string. If validation fails the app will show a helpful error message with the expected shape and the example above.

- Teachers can replace `questions.json` with their own file following this schema. Avoid trailing commas (strict JSON) when editing the file.

## Data model (client-side)

- Question: { text, translation, tip }
- Session stats (in-memory or localStorage): { totalAsked, tipShown, translationsShown, score, answeredCount, skippedCount }
 - Session stats (in-memory or localStorage): { totalAsked, tipShown, translationsShown, score, answeredCount, skippedCount }
	- End-of-session summary fields: { score, answeredCount, skippedCount, tipShown, translationsShown }

Per-question transient state (not stored in JSON): { currentQuestionId, tipViewed: boolean, translationViewed: boolean }

## Scoring rules

- When the learner presses `Answered` for the current question:
	- Base points: +2 points.
	- If the learner did not view the tip for that question (tipViewed is false): +2 bonus points.
	- If the learner did not view the translation for that question (translationViewed is false): +1 bonus point.
	- Total points for the question = 2 + (2 if no tip) + (1 if no translation).

These points are added to the session `score` and `answeredCount` is incremented.

## Assumptions

- The teacher will provide an external `questions.json` file or edit the sample `questions.json` that ships with the app. The app will fetch that file from the same origin.
- If the app is embedded cross-origin, the teacher is responsible for hosting the JSON on the same host or enabling proper CORS headers (out-of-scope for the app itself).
- No user accounts or cloud storage are required for version 1.
- Accessibility considerations (keyboard navigation, readable color contrast) will be basic but considered.

## Out of Scope

- User authentication, server-side analytics, or collaborative features.

---

If this spec looks good, reply "approve" or request changes. After approval I'll switch to the Planner role and create `SCRATCHPAD.md` with a task breakdown.

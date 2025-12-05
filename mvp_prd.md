# Atova MVP Product Requirements Document (PRD)

### How to Interpret This Document

This PRD outlines **exactly what to build**, step by step. Do **not** make assumptions. Each part of the flow must be implemented in sequence before moving to the next. If something seems ambiguous, stop and ask for clarification. Treat this document as the **single source of truth** for the first MVP build.

---

## 1. Purpose

Atova is a **visual notebook for your network**. It lets users add people, write quick notes about interactions, and see trust relationships visually as dots and lines on a simple map.

The goal: create the **simplest possible version** where users can:

1. Add a person.
2. Log an event (good, bad, neutral).
3. See dots, lines, and color changes.

---

## 2. User Flow

### Step 1: Open the App

* User lands on a **blank grid** with a single black “+” button in the bottom right corner.
* A personal dot (center dot) is already visible in the middle of the screen, labeled with the user's initial and gradient color.
* If not logged in, clicking the “+” triggers **Clerk login**.

### Step 2: Add Connection

* Clicking the **+ button** opens a modal with the following fields:

  * **Name** (text input)
  * **Role / Company** (text input)
  * **How did you meet?** (dropdown)

    * Options: *Introduced by someone*, *Met directly*, *Other*
    * If *Introduced by someone*: secondary dropdown appears → existing contacts or text input for new introducer.
    * If *Other*: a short text box appears for description.
  * **Notes** (optional free-text input)
* User clicks **Save** → new dot appears connected to the central user dot.
* If there’s an introducer, a line connects all three (user → introducer → new person).

### Step 3: Map Behavior

* Central dot remains fixed (represents the user).
* Added people appear around it, connected by lines.
* Hovering shows basic info (name, role, company).
* Clicking a person opens a right-side **profile panel**.

### Step 4: Profile Panel

* Displays:

  * Name
  * Role / Company
  * List of past events (chronological)
  * Button: **Add Event**

### Step 5: Add Event

* Clicking **Add Event** opens a popup:

  * Text area: “What happened?”
  * Three buttons: 👍 Good, ⚪ Neutral, 👎 Bad
* After saving:

  * Event appears in person’s log.
  * Connection line color updates:

    * **Green** = Good
    * **Gray** = Neutral
    * **Red** = Bad
  * If multiple events exist, color averages to a soft mix (e.g., pinkish = mixed good/bad).

---

## 3. UI Summary

**Elements:**

* Blank grid background.
* Floating “+” button (bottom right).
* Central user dot (gradient background, user initial).
* Other dots for contacts.
* Connecting lines for relationships.
* Right-side sliding panel for person details and notes.

**Color logic:**

* Default line: black.
* Event-driven updates: line color reflects interaction quality.

---

## 4. Technical Notes

* Use **Next.js + React + Tailwind**.
* Use **Clerk** for authentication.
* Use **Supabase** for storing users, people, and event logs.
* Data structure (high-level):

  * `Users` → id, name, email.
  * `People` → id, user_id, name, role, company, introducer_id.
  * `Events` → id, person_id, description, sentiment (good/bad/neutral), created_at.
* Graph rendering: start with **React Flow** or **D3.js** (whichever is easier to render connected nodes).

---

## 5. Execution Order

1. Implement login (Clerk).
2. Implement grid screen and + button.
3. Implement add-person modal and database write.
4. Implement person dots and connecting lines.
5. Implement right-side person panel.
6. Implement add-event modal and log + line color updates.
7. Test full flow manually.

---

## 6. Definition of Done

* User can add a person.
* User can log events.
* Dots and lines display correctly.
* Line colors update based on interactions.
* No additional features or screens beyond this.

---

Interpret everything **literally.** Do not abstract or assume. Build only what’s written here. Ask questions before coding anything that’s not explicitly described.

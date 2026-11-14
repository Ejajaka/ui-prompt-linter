# Vector — User Manual

Version 2.0 · Last updated 14 November 2026

Vector is a requirement engineering workspace for UI/UX teams. It turns company
requirement documents into traceable requirements, reviewed edge cases,
audited acceptance criteria and a six-section design brief — before a
generative UI tool is allowed to guess.

This manual covers every page and control in the web app at
`https://ejajaka.github.io/ui-prompt-linter/`.

---

## 1. Getting started

### 1.1 Visiting for the first time

New visitors land on **About**, not on a login wall. The public page has no
sidebar and no title bar: only a dark-mode toggle and a **Sign in** button sit at
the top of the page. They scroll away with the content instead of staying
pinned to the viewport.

Nothing behind the workspace is accessible until you sign in. Selecting a
protected area while signed out opens the sign-in screen instead.

### 1.2 Creating an account

1. Select **Sign in** in the header.
2. Choose **Create account**.
3. Enter your name, email and a password of at least eight characters.
4. Submit.

If email confirmation is enabled on the deployment, check your inbox, confirm
the account, then sign in. If confirmation is disabled, the account is ready
immediately.

### 1.3 Signing in

Enter your email and password. Use the eye icon to reveal the password. The
form validates the email format and the minimum password length before
submitting.

### 1.4 Resetting a password

Choose **Forgot password?**, enter your email and submit. Open the emailed
link; Vector shows the reset-password screen instead of the app until a new
password is saved.

### 1.5 What happens after sign-in

- If this browser has visited a page before, Vector returns you to it.
- Otherwise you start on **Projects**.
- About is the public onboarding page; it is not shown in the signed-in
  sidebar.
- The last visited page is remembered per account, so refreshing, closing the
  tab, signing out and signing back in all restore the same page.
- Guests keep a separate remembered page for the public site.

### 1.6 Logging out

Select the logout icon in the header. Vector always asks for confirmation
first. Your projects, documents, prompts and history stay saved; only the
session ends.

---

## 2. Navigation map

After sign-in the sidebar is the primary navigation. Public visitors see the
About page without a sidebar.

| Page | Purpose |
| --- | --- |
| About & Overview | Public onboarding page (no sidebar, theme + Sign in at the top) |
| Projects | Create, edit, switch and delete workspaces |
| Requirement Compiler | Upload documents and approve requirements |
| Requirement Intelligence | Requirement graph, ambiguities, conflicts, dependencies |
| Review & Acceptance | Edge-case suggestions and Given/When/Then criteria |
| Specification & Prompt | Six-section brief, versions, regression |
| Design Systems | Brand tokens and version history |
| Bolt Workspace | Prompt-to-Bolt launch and published preview |
| New Analysis | Prompt review and risk read-out |
| Manual | In-app guide to every workflow |
| Settings | Theme, manual, local data |
| Privacy | Data and processing policy |

On mobile the signed-in sidebar becomes a drawer opened from the header. On
desktop it can be collapsed to an icon rail. Public pages have no sidebar.

### 2.1 Header

From left to right:

1. **Page title and breadcrumb subtitle**
2. **Project switcher** — a dropdown listing every project. Choosing one
   changes the active project everywhere without leaving the page.
3. **Light / dark mode**
4. **Settings**
5. **Log out** — always asks for confirmation.

Public pages render no title bar at all; only the dark-mode toggle and Sign in
are shown, in that order.

The email address is shown on very wide screens. In local mode (no Supabase
configured) a "Local mode" badge replaces the account controls.

---

## 3. Projects

Everything in Vector is scoped to a project: documents, requirements,
approvals, design systems, prompts, analyses and history. Analyses in one
project never appear in another project's dashboard or history.

### 3.1 Creating a project

1. Open **Projects**.
2. Enter a name (required) and an optional description.
3. Select **Create project**.

The new project becomes the active project immediately.

### 3.2 Editing a project

Select the pencil icon on a project row. Change the name or description and
choose **Save changes**. Existing documents and requirements are unaffected.

### 3.3 Switching projects

Use the project switcher in the header, or select the arrow on a project row.
The switcher also contains **Manage projects**. Switching projects updates
every page in place. Analysis History also has its own project dropdown for
looking into another project's records.

### 3.4 Deleting a project

Select the bin icon. A confirmation dialog explains that documents,
requirements, analyses, design systems and prompts in that project are
removed. Deletion cannot be undone.

### 3.5 Importing legacy browser analyses

If you used earlier versions of Vector, old analyses may exist in this
browser without a project. The **Import existing browser history** card copies
them to the active project and attaches them locally so they appear in that
project's history. Other projects are not affected.

---

## 4. Requirement Compiler

The compiler converts a requirement document into individual, traceable
requirements.

### 4.1 Supported files

PDF, DOCX, TXT, Markdown (`.md`, `.markdown`). Maximum 25 MB.

### 4.2 Uploading and compiling

1. Open **Requirement Compiler**.
2. Select **Choose document** and pick a file.
3. Vector uploads the original, extracts text, then compiles requirement-like
   statements.

Progress messages report uploading, parsing and saving. When finished, the
document appears under **Documents** and the compiled statements appear under
**Extracted requirements**.

### 4.3 What a compiled requirement contains

- **Requirement code** — document prefix plus a sequence, e.g. `REQ-49D2B5-001`
- **Original text** — the exact statement from the document
- **Kind** — functional or non-functional
- **Priority** — critical, high, medium or low, with a stored reason
- **Source trace** — page, paragraph, character start and end
- **Metadata** — screens, components, roles and behaviours detected in the text
- **Status** — pending review, approved or rejected

### 4.4 Prioritisation

Select **Prioritize** to classify every requirement. Security, payments,
authentication, permissions and accessibility become critical; mandatory
user-facing flows become high; cosmetic requirements become low.

### 4.5 Approving and rejecting

- Use **Approve** or **Reject** on a single requirement.
- Use the checkbox on each card to select several requirements, then
  **Approve selected** or **Reject selected**.
- **Select all** selects every requirement matching the current filter.
- Bulk rejection asks for confirmation.
- Only approved requirements become confirmed source text in the design brief.

Every decision writes an audit row containing the project, requirement,
decision, actor and timestamp.

### 4.6 Filtering and searching

Filter by **All**, **Functional** or **Non-functional**, and search by text,
requirement code or role.

### 4.7 Deleting a document

Select the bin icon on a document. The confirmation dialog explains that the
document and every requirement compiled from it will be removed.

---

## 5. Requirement Intelligence

### 5.1 The graph

The page maps requirements to the screens, components and roles they mention.
Edges show relationships, including dependencies and conflicts. Nodes can be
dragged; zoom and pan controls are in the corner.

### 5.2 Findings

Vector reports:

- **Ambiguities** — vague quantifiers, missing states, undefined actors
- **Conflicts** — requirements that contradict each other
- **Dependencies** — statements that depend on another requirement, including
  circular chains

Each finding names the affected requirement codes and shows the original
sentence, so you can judge it against the source.

### 5.3 Downloading the graph

Select **Download PNG**. Vector renders the full graph — not just the visible
area — and downloads a 2× PNG named after the project and date. Use it in
design reviews, tickets or documentation.

### 5.4 AI contextual review

If the `analyze-requirements` edge function is deployed and configured,
**AI contextual review** sends the requirement text for an additional
grounded review. Findings are marked AI-assisted and appended to the
deterministic findings. If the function is not deployed, the button reports
that AI review is unavailable; nothing else breaks.

---

## 6. Review & Acceptance

### 6.1 Suggestions versus requirements

Suggestions are **AI-inferred behaviour**, not company requirements. They stay
labelled as suggestions until a human accepts them.

Vector proposes edge cases such as:

- submission failure and duplicate submission
- empty search results and loading states
- invalid or expired sessions
- unauthorized access
- payment failure and retry
- invalid or oversized uploads
- long content and narrow screens

### 6.2 Accepting suggestions

- Accept or reject a single suggestion.
- Select multiple suggestions with the checkboxes, then **Accept selected** or
  **Reject selected**.
- **Reject selected** asks for confirmation.
- Accepted suggestions appear in the generated brief under "Approved
  suggestions", clearly separated from original company requirements.

### 6.3 Acceptance criteria

Every requirement receives Given/When/Then criteria linked to its requirement
code:

- **Given** the initial context
- **When** the action occurs
- **Then** the observable result

Approve or reject each criterion, or select many and use **Approve selected**
or **Reject selected**. Each decision is audited.

### 6.4 Tabs and counters

The counters show pending suggestions and pending criteria. The tabs switch
between suggestion review and criteria approval.

---

## 7. Specification & Prompt

### 7.1 The six-section brief

Vector generates a professional UI/UX design task with exactly six sections:

1. **Objective** — what the interface must achieve
2. **Problem Statement** — why the requirements need a designed interface
3. **Requirements** — approved requirements, with pending items clearly marked
4. **Design Guidelines** — visual style, colour, typography, spacing, radius,
   shadows, buttons, inputs, navigation, responsiveness, accessibility and brand
5. **Deliverables** — screens, wireframes, high-fidelity designs, prototype and
   reusable components
6. **Acceptance Criteria** — approved Given/When/Then criteria

Plus constraints: do not invent requirements, mark unresolved assumptions, and
preserve the design system.

### 7.2 Source of truth

The side panel counts requirements, criteria, approved suggestions and
unresolved assumptions. Only approved requirements are confirmed source text.
Pending requirements are prefixed as such. Unresolved assumptions are listed
separately and de-duplicated.

The brief status is **Ready for design** when at least one requirement is
approved, otherwise **Draft — pending requirement approval**.

### 7.3 Design system selection

Choose a design system from the dropdown. Tokens are injected into section 4.
The selection is remembered per project.

### 7.4 Editing the brief

The prompt is editable. Type directly in the editor to tighten wording or
remove a section.

Below the editor, **Coverage check** reports how many approved requirements and
criteria are still present in the edited text, and lists the missing
requirement codes. This is measured from the text in the editor, not from the
project records, so it updates as you type.

Use **Reset to generated** to discard the draft and rebuild from the current
approved inputs. One draft is kept per project and is shared with the Bolt
workspace.

### 7.5 Copy and save

- **Copy prompt** copies the current text (edited draft or generated brief).
- **Save version** stores the current text and a coverage snapshot with an
  incrementing version number.

### 7.6 Versions and restore

Every saved version lists its date and change summary. Select a version to
compare it with the previous one; the comparison reports requirements added or
removed and criteria added or removed. **Restore version** loads that text back
into the editor so it can be saved again if needed.

### 7.7 Regression baseline

Select **Save baseline** to snapshot the current requirements. After editing
documents, the regression panel reports which requirements disappeared,
changed status or priority, or were newly added.

---

## 8. Design Systems

### 8.1 Creating a design system

1. Open **Design Systems** and select **New design system**.
2. Enter a name.
3. Fill the tokens: primary, secondary and accent colour; typography; font
   sizes; spacing; border radius; shadows; navigation pattern; responsive
   breakpoints; button styles; input styles; component styles; brand
   guidelines.
4. Select **Save design system**.

Systems are shared by default and optionally linked to the active project.

### 8.2 Version history

Each save records a snapshot. **Version history** lists every version with its
date and a colour preview. **Restore** applies that version's tokens and records
the restore as a new version, so history is never lost.

### 8.3 Editing and deleting

Select a system in the library to edit it. Deleting a system asks for
confirmation and removes its version history.

---

## 9. Bolt Workspace

### 9.1 Layout

The workspace is split into two panels:

- **Vector Prompt Analyser** — the editable brief, readiness status and
  requirement/criteria coverage
- **Bolt Workspace** — launch and preview area

The brief here is the same per-project draft used in Specification & Prompt.
Edits made in either place are reflected in the other, and coverage recalculates
as you type.

Both panels can be collapsed, and the divider can be dragged to resize.

### 9.2 Send to Bolt

**Send to Bolt** opens `bolt.new` with the brief already filled into the composer
and copies it as a fallback. Sign in if needed, review the brief, then press
**Build**. This is a supported launch workflow, not a fake embedded editor.

### 9.3 Published-app preview

After publishing in Bolt, copy the live URL, select **Paste URL** in Vector, then
**Save preview**. Vector validates the URL and embeds the published app.
Only `https://*.bolt.host` and `bolt.new` URLs are accepted. If the host blocks
framing, use **Open Bolt** instead; Vector never pretends to embed an editor it
cannot embed.

The preview URL is remembered per project.

---

## 10. New UI Prompt Analysis

### 10.1 How the review works

Vector reads the prompt in your browser, detects the UI elements it describes,
and links colours, placement, actions and labels to each element. When a detail
is missing or ambiguous it asks a targeted question rather than guessing. The
review finishes with a risk index, a completeness score and a suggested rewrite.

### 10.2 Project scope

Analysis requires an active project. The page shows which project will receive
the run. Without a project the Analyze button is disabled and an **Open
projects** button is offered. Every completed analysis is stored with its
project ID.

### 10.3 Running an analysis

1. Select or create a project.
2. Enter a UI request describing the screen and its elements.
3. Select **Analyze Prompt** (or use Ctrl/Cmd + Enter).

Vector detects elements, colours, placement, actions and labels, and reports
missing details per element. If a detail is ambiguous, it asks targeted
questions. Answer them, or choose placeholders, to finish.

### 10.4 Reading the result

- **Detected elements** with element-specific completeness
- **Suggested rewrite** for each element
- **Clarification questions** for unresolved details
- **Risk score** once the prompt is unambiguous
- **A plain-language summary** of what affected the score

### 10.5 Saving and history

Select the project this analysis belongs to directly on the page. Completed
analyses are saved to that project and appear only in its **Analysis History**.

### 10.6 Reopening an analysis

Selecting **Reopen** from history loads the prompt and, if the record belongs to
another project, switches to that project first so the context matches.

---

## 11. Analysis History

History lists project-scoped analyses. Use the project dropdown at the top to
switch which project you are looking into; the header project switches with it.
Search by prompt or element, filter by risk level and sort by date, risk or
completeness.

- **Clear All** clears this project's history only, after confirmation.
- Delete a single record with the bin icon; a confirmation dialog appears.
- Older records saved before project scoping can be attached to the active
  project from the banner at the top of the page.

---

## 12. Settings, theme and data

### 12.1 Theme

Use the moon/sun button in the header or the choice in Settings. The preference
is stored in the browser.

### 12.2 Local data

**Clear local prompt history** removes browser-stored analyses after
confirmation. Cloud projects and requirement documents are not affected.

---

## 13. Security and privacy

- Your projects, documents, requirements and prompts are private to your account.
- Every project area is isolated, so one workspace can never read another.
- Approval decisions are recorded with the person and time, forming an audit trail.
- Prompt analyses are saved only to the project you select.
- No prompt or project data is shared with third parties.

---

## 14. Feature limitations

- Suggestions and acceptance criteria are intentionally conservative; they are
  proposals for a human to review, never silent requirements.
- Graph findings are recomputed from the current requirements on each visit.
  Individual finding acceptance or muting is not persisted separately.
- Bolt opens in a new tab. Vector previews a published app when the host allows
  it; otherwise use the direct launch link.
- The risk score is a heuristic, not a guarantee. It highlights missing detail
  and uncertainty; it does not replace design review.

---

## 15. Recommended workflow

1. Create a project.
2. Upload the requirement document in **Requirement Compiler**.
3. Select **Prioritize**, then review and approve requirements — use bulk
   actions for large documents.
4. Open **Requirement Intelligence**, inspect ambiguities, conflicts and
   dependencies, and download the graph for the review meeting.
5. Open **Review & Acceptance**, accept the edge cases you agree with, and
   approve the criteria.
6. Choose a design system and generate the six-section brief in
   **Specification & Prompt**.
7. Use **Save baseline** before the next change, then generate and save a
   version.
8. Send the brief to Bolt from **Bolt Workspace**, generate the UI, and attach
   the published preview.
9. Optionally analyse individual UI prompts in **New Analysis**; they stay in
   the project's history.

---

## 16. Troubleshooting

**The app shows "Choose a project first".**
Select a project from the header switcher or create one in Projects. Analyses,
documents, prompts and design-system links are project scoped.

**The Analyze button is disabled.**
The analyser is still preparing, or no project is active.

**The Bolt preview is blank.**
The published host is blocking framing. Use **Open Bolt**; the prompt is still
copied and the workflow is unchanged.

**A document parsed but produced no requirements.**
The compiler keeps statement-like lines. Very short fragments, headings and
tables of contents are ignored. Rewrite the requirements as full sentences.

**History is empty after switching projects.**
History is per project by design. Switch back, or attach legacy records using
the banner on the History page.

**Sign-in email never arrives.**
Check spam, then ask the workspace owner to confirm the Supabase email settings
and redirect URLs.

---

## 17. Glossary

| Term | Meaning |
| --- | --- |
| Requirement | A single traceable statement compiled from a document |
| Priority | Critical / high / medium / low classification with a reason |
| Suggestion | AI-inferred behaviour or edge case awaiting human review |
| Acceptance criterion | Given/When/Then testable statement linked to a requirement |
| Specification | Structured brief data used to render the six-section prompt |
| Design tokens | Colour, type, spacing, radius and brand guidelines |
| Baseline | Snapshot of requirements used for regression comparison |
| Analysis run | A single prompt evaluation stored in a project |
| Workspace isolation | Projects visible only to their owner |

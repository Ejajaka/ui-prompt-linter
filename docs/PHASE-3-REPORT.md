# Phase 3 implementation report — Requirement Intelligence

Status: **deterministic graph, ambiguity, conflict and dependency analysis implemented; optional LLM Edge Function added but not deployed.**

## Implemented

### Requirement graph

- Requirement nodes linked to screens, components, user roles and interactions.
- Edges: `belongs_to`, `implements`, `triggers`, `related_to`, `depends_on`,
  `conflicts_with`.
- Interactive React Flow canvas with pan, zoom, minimap, draggable nodes and
  fit-to-view.
- Graph legend and project-scoped loading.

### Contextual ambiguity detection

Deterministic checks for:

- subjective/ambiguous wording
- button actions that are not specified
- navigation without a named destination
- input/forms without validation rules
- named roles without permission scope
- missing responsive behaviour

Each finding includes the affected requirement, source evidence, what is
ambiguous, why it matters, and the clarification needed.

### Conflict detection

Detects pairs such as:

- mandatory vs optional fields
- public vs restricted access
- fixed vs disappearing navigation
- editable vs read-only screens
- automatic vs manual save
- desktop-only vs responsive requirements

Conflicts are never auto-resolved. Both source statements and page references are
shown.

### Dependency detection

- Explicit cues such as “depends on”, “requires”, “after”, “only after”.
- Inferred common dependencies (profile → auth, dashboard → employee data,
  payment confirmation → payment processing).
- Dependency graph edges.
- Circular dependency detection with a critical finding.

### Optional AI review

`supabase/functions/analyze-requirements`:

- authenticated via the caller's JWT
- reads project requirements through RLS
- calls a server-side OpenAI-compatible endpoint
- validates returned IDs/types before returning findings
- UI keeps deterministic findings if the function is unavailable

Deployment is documented in the function README. Provider keys remain in
Supabase secrets.

## Tests

- 8 frontend tests passing:
  - local project CRUD
  - requirement compiler traceability/classification
  - graph construction
  - conflict detection
  - dependency and cycle detection
  - ambiguity detection
- TypeScript lint passes.
- Production build passes.
- CI passes.

## Not yet done

- Deploy `analyze-requirements` and configure its LLM secrets.
- Persist findings/relationships into dedicated tables and approval workflow
  (Phase 6).
- Accept/reject actions for findings.
- Full LLM semantic review in the live environment.

## Next

Phase 4: implicit behaviour discovery, edge-case suggestions and Given/When/Then
acceptance criteria. ETA: **6–8 focused hours**.

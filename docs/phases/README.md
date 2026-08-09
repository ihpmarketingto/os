# IHP OS — Build Docs

Your original master prompt has been split into two kinds of files, matching
how Claude Code actually works best over a long, multi-session build:

```
CLAUDE.md                                  ← durable rules, read every session
phases/phase-0-foundation.md               ← what to build, session 1
phases/phase-1-core-agency-operations.md   ← what to build, session 2
phases/phase-2-commercial-operations.md
phases/phase-3-marketing-delivery.md
phases/phase-4-landing-page-factory.md
phases/phase-5-ai-connected-workspace.md
phases/phase-6-advanced-automation.md
```

## Why split it

A single 3,000-line prompt gets re-read (and re-interpreted) in full every
session, which is expensive and invites drift — a rule stated once on line
40 quietly stops being enforced by line 2,000. Splitting it means:

- **`CLAUDE.md`** holds everything that must never be violated, in any
  phase: security model, RLS, roles, the three AI action modes, Canadian
  spelling, no em dashes, no-publish-without-approval, the coding stack,
  and the definition of done. Claude Code reads project-root `CLAUDE.md`
  automatically at the start of a session — this is the standard place for
  it.
- **Phase files** hold only what's new to build in that session, and
  reference back to `CLAUDE.md` rather than repeating its rules. Each one
  is short enough to actually stay loaded in context for the whole session.

## How to use this

1. Create a GitHub repo for IHP OS.
2. Put `CLAUDE.md` at the repo root.
3. Put the `phases/` folder under `/docs/phases/`.
4. Open the repo in Claude Code.
5. Start a session with: *"Read CLAUDE.md, then read
   docs/phases/phase-0-foundation.md and build it."*
6. When Phase 0's acceptance criteria are met and reviewed, start a new
   session the same way with Phase 1, and so on.

Each phase file ends with a pointer to the deliverable format in
`CLAUDE.md` §2 — Claude Code should report what's built, what's mocked, and
what's needed before you approve moving to the next phase. Don't skip that
review step; the phases are sequenced so each one's acceptance criteria
give you something real to check before more surface area gets added on
top.

## Nothing was cut

Every requirement from your original document is preserved in one of these
files — this is a reorganisation, not a summary. If you spot something
missing, it's worth flagging before the build starts rather than after.

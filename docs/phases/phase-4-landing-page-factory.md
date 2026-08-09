# Phase 4 — Landing Page Factory

Read `/docs/CLAUDE.md` in full before starting, especially §6 Landing-Page
Rules — this phase is where those rules get exercised the most.

This phase builds a dedicated module allowing IHP Marketing to use previous
Replit and GitHub work as **governed reference material**, not direct
copy-paste output.

README files, `replit.md` files and `CLAUDE.md` files provide instructions
and context. Git repositories, source code, reusable components, assets,
styles, tracking setup and deployment configuration provide implementation
reference. Do not treat README files as complete templates.

## Source of Truth Hierarchy

1. GitHub repository source code
2. Approved reusable IHP component packages
3. Approved client brand profile
4. Approved landing-page brief
5. Approved client assets and copy
6. Replit project metadata and README files
7. Historical performance data
8. AI-generated recommendations

Never use imported code or old copy as direct client output without
verifying brand, legal, offer and tracking requirements.

## Build Library

Each imported project record needs: client, project name, repository URL,
branch, deployment URL, Replit URL if available, source provider,
technology stack, page type, offer type, funnel type, industry, target
audience, conversion goal, traffic source, screenshot, design style tags,
components detected, tracking detected, form system detected, performance
data, conversion rate, leads, revenue, ROAS, learnings, status, reusable
permission status, client-specific restrictions, asset rights, source
ownership.

## Project Ingestion

**GitHub OAuth Sync**: connect via OAuth, select repositories/branches/
folders, read-only mode, scheduled sync, last sync time, sync error log,
file manifest, commit history, project metadata, source code indexing,
component discovery, asset discovery, README indexing, Replit metadata
indexing when included.

**Replit Export Upload**: support ZIP uploads. Extract and index
`README.md`, `replit.md`, `package.json`, lock files, routes, pages,
components, styles, Tailwind config, public assets, configuration files,
deployment settings, analytics code, tracking code, environment variable
examples.

**Secret scanning is mandatory on every import** — see CLAUDE.md §6 for the
full list of secret types to scan for and redact. Never store an exposed
secret from an imported repository.

**Manual Knowledge Upload**: README files, `replit.md` files, screenshots,
project briefs, brand guides, Figma exports, HTML exports, CSV reports,
landing page copy, ad creative, analytics reports, client feedback,
published URLs.

## Component Discovery

Extract reusable components only after human review. Catalogue: hero
sections, navigation, offer blocks, pricing, reviews, testimonials,
before-and-after sections, product blocks, booking blocks, event blocks,
speaker sections, FAQ, forms, trust bars, CTA sections, countdown sections,
location sections, video sections, footers.

Each component needs: preview image, source project, code reference,
props, dependencies, editable content fields, desktop preview, mobile
preview, accessibility requirements, analytics events, conversion purpose,
client restrictions, reuse approval status.

## Landing Page Brief Builder

Fields: client, offer, product/service, audience, goal, conversion action,
main CTA, secondary CTA, traffic source, campaign, price, promotion,
deadline, location, booking link, product link, ticket link, testimonials,
reviews, objections, proof points, differentiators, required claims,
forbidden claims, required disclaimer, brand direction, desired
prior-project references, required tracking, required integrations, launch
date, stakeholders, approval owner.

## Page Generation Workflow

Strict order, no skipping steps:

1. Conversion strategy
2. Proposed funnel
3. Page architecture
4. Wireframe
5. Section map
6. Copy hierarchy
7. Visual asset list
8. Tracking plan
9. Form and routing plan
10. Mobile requirements
11. Technical implementation plan
12. Code generation
13. Preview deployment
14. QA
15. Internal approval
16. Client approval
17. Publish approval

Never generate a live production deployment without explicit approval
(CLAUDE.md §6).

## Generation Modes

- **Clone and Adapt** — use an approved past page as structural reference
  while changing brand, typography, colour, offer, copy, CTA, assets,
  forms, tracking, testimonials, legal requirements, geography, audience.
- **Build From Components** — combine approved reusable sections into a
  coherent page.
- **Build From Strategy** — generate fresh from client data, campaign
  objective, brief and approved components.
- **Improve Existing Page** — analyse a supplied URL or codebase for offer
  clarity, message match, CTA hierarchy, form friction, trust, visual
  hierarchy, mobile experience, page performance, accessibility, tracking,
  SEO, conversion opportunities. Generate an improved draft, never an
  automatic overwrite.

## Generated Code Rules

Real code only — Next.js, React, Tailwind CSS, or static HTML/CSS/JS where
appropriate. Every generated page must include: responsive layout, semantic
HTML, accessibility, SEO metadata, Open Graph metadata, image optimisation,
form validation, error and success states, UTM capture, hidden lead-source
fields, GA4 event hooks, Meta Pixel event hooks, Google Ads conversion
hooks, CRM routing placeholders, cookie-consent compatibility, Canadian
spelling in approved copy.

## Code Isolation

Per CLAUDE.md §6: dedicated landing-page repo, client-specific repo,
branch, or git worktree — never the IHP OS production repo directly. Pull
request or approval required before merging.

## Deployment Workflow

Support: GitHub push, Vercel preview/production deployment, Netlify
deployment, Cloudflare Pages deployment, Replit deployment, ZIP export,
custom domain connection, subdomain connection, DNS instructions, SSL
status, redirect rules, preview environment, production environment.

## QA Checklist

Before publishing, verify: desktop/mobile/tablet layout, CTA links, form
validation, form submission, booking links, ticket links, checkout links,
thank-you workflow, CRM routing, email notifications, GA4 events, Meta
events, Google Ads conversions, UTM capture, SEO metadata, Open Graph
image, page speed, accessibility, legal disclaimers, brand consistency,
Canadian spelling, broken links, missing images, cookie consent, error
states.

QA report format: Pass / Warning / Fail, recommended fix, owner, date
resolved.

## Schema (this phase)

`landing_page_projects`, `landing_page_briefs`, `build_library_projects`,
`reusable_components`, `page_versions`, `qa_runs`, `deployments`.

## Acceptance Criteria

Maps to Definition of Done items 15–19 in CLAUDE.md §11: import a GitHub or
Replit project safely (with secret scanning proven, not assumed), create a
landing-page brief, generate a landing-page plan and code draft, create a
preview deployment workflow, run QA before publish. No path exists in the
UI to publish to production without an explicit, audited human approval
step.

## Deliverable Format

Follow CLAUDE.md §2.

# Phase 3 — Marketing Delivery

Read `/docs/CLAUDE.md` in full before starting.

## Build

### Campaigns

Fields: client, campaign name, objective, start/end dates, offer, audience,
channels, budget, KPIs, related landing pages (placeholder until Phase 4),
related content, related ads, related tasks, related reports, documents,
approvals, tracking plan, results, learnings, status.

Statuses: Planning, Awaiting Approval, Ready to Launch, Live, Optimising,
Paused, Complete, Archived.

### Paid Media

Support imported data now; live API integrations (Meta Ads, Google Ads) are
a later integration-framework task, not required for this phase's
acceptance criteria. Support: campaign/ad-set/creative tracking, audience
testing, budget pacing, creative fatigue, conversion tracking, landing page
association, UTM tracking, performance comparison.

Metrics: spend, revenue, ROAS, CPA, CPL, CPC, CTR, CPM, frequency,
conversion rate, leads, purchases, bookings, cost per booking, cost per
purchase.

Include: optimisation log, anomaly detection, action recommendations,
weekly review template, monthly client-report widgets, creative testing
matrix, audience testing matrix, budget change history.

### SEO and Local SEO

Support: technical audits, keyword research, keyword clustering, competitor
tracking, rank tracking, content briefs, on-page tasks, backlink tracking,
citation tracking, local SEO tasks, Google Business Profile workflow,
Search Console reporting, GA4 reporting, Core Web Vitals reporting, content
performance, monthly recommendations, keyword opportunity scoring, priority
queue, content calendar connection, SEO task queue, local landing-page
tracking, location-based keyword tracking, monthly SEO report templates.

### Website and CRO

Support: website projects, website audits, landing page audits, funnel
mapping, copy review, wireframes, CMS/DNS/domain tracking, conversion
tracking, A/B test tracker, CRO experiment tracker, form analytics, page
performance, heatmap/session-recording integration placeholders.

Each CRO experiment: hypothesis, page, audience, variant, success metric,
start/end date, result, statistical confidence field, decision, learnings.

### Email and Lifecycle

Support: Klaviyo, SendGrid, Gmail integration hooks (framework only — real
send requires Phase 5 Google Workspace / human approval per CLAUDE.md §6),
campaign calendar, email campaign builder, automation map, audience
segmentation, deliverability monitoring, revenue attribution, approval
workflow, template library.

Templates: welcome flow, lead nurture, abandoned cart, browse abandonment,
post-purchase, review request, win-back, re-engagement, event reminders,
booking reminders, client announcements.

Metrics: sends, deliverability, open rate, click rate, conversion rate,
revenue, revenue per recipient, unsubscribe rate, spam complaints.

### PR, Influencers, Partnerships and Events

Modules: media contacts, journalists, publications, pitch tracking, media
lists, press releases, influencer CRM, creator outreach, partnership
outreach, compensation, usage rights, deliverables, contract status,
coverage tracking, affiliate tracking, event planning, ticket sales,
sponsor tracking, speaker tracking, run-of-show, media accreditation,
volunteer/staff tracking, event reporting.

### Reports

Internal reports: revenue, profitability, pipeline, lead conversion, client
retention, team capacity, delivery completion, campaign performance,
service profitability, client health, accounts at risk, AI spend
(placeholder until Phase 5), automation performance (placeholder until
Phase 6).

Client reports: executive summary, goals, KPIs, paid media, SEO,
website/CRO, social, email, ecommerce, completed deliverables, key wins,
risks, priorities, recommendations, next-month plan.

Reports must support: draft status, internal review, client approval, PDF
export, client portal publishing, shareable secure link, report history,
AI-generated commentary drafts (placeholder until Phase 5), source metric
traceability.

## Schema (this phase)

`campaigns`, `campaign_metrics`, `influencers`, `media_contacts`,
`outreach`, `events`, `event_attendees`, `reports`, `report_snapshots`.

## Acceptance Criteria

Client 360 and Content Studio (Phase 1) should now show live campaign data
instead of placeholders. Reports built here should be draftable, reviewable
and client-approvable end to end, even with imported/manual metric data
rather than live API feeds.

## Deliverable Format

Follow CLAUDE.md §2.

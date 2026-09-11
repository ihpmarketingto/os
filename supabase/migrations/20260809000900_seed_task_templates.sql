-- IHP OS — Phase 1: system task templates (spec section 12).
-- default_tasks is applied by lib/projects/apply-template.ts when a project
-- is created from a template — each entry becomes one row in `tasks`.

insert into public.task_templates (organisation_id, name, category, description, default_tasks) values
(null, 'Client Onboarding', 'onboarding', 'Kickoff through first deliverable for a newly signed client.', '[
  {"title": "Send welcome packet and contract recap", "category": "admin", "due_offset_days": 1},
  {"title": "Collect brand assets and platform access", "category": "admin", "due_offset_days": 3},
  {"title": "Schedule kickoff call", "category": "meeting", "due_offset_days": 3},
  {"title": "Set up client folder and shared drive", "category": "admin", "due_offset_days": 2},
  {"title": "Draft 90-day strategy outline", "category": "strategy", "due_offset_days": 10}
]'::jsonb),
(null, 'Paid Ads Launch', 'paid_media', 'Standard Meta/Google Ads launch checklist.', '[
  {"title": "Confirm budget and KPI targets", "category": "strategy", "due_offset_days": 2},
  {"title": "Build audience and targeting plan", "category": "paid_media", "due_offset_days": 4},
  {"title": "Install and QA tracking pixels", "category": "technical", "due_offset_days": 5},
  {"title": "Draft ad creative and copy", "category": "content", "due_offset_days": 7},
  {"title": "Internal review of campaign setup", "category": "review", "due_offset_days": 8},
  {"title": "Launch campaign", "category": "paid_media", "due_offset_days": 10}
]'::jsonb),
(null, 'Website Launch', 'website', 'Pre-launch through go-live for a new website build.', '[
  {"title": "Finalize sitemap and wireframes", "category": "web", "due_offset_days": 5},
  {"title": "QA all pages on staging", "category": "qa", "due_offset_days": 20},
  {"title": "Set up analytics and conversion tracking", "category": "technical", "due_offset_days": 22},
  {"title": "Client sign-off on staging site", "category": "approval", "due_offset_days": 24},
  {"title": "DNS cutover and go-live", "category": "web", "due_offset_days": 26}
]'::jsonb),
(null, 'Landing Page Launch', 'website', 'Single landing page from brief to publish.', '[
  {"title": "Approve landing page brief", "category": "approval", "due_offset_days": 2},
  {"title": "Build page from approved components", "category": "web", "due_offset_days": 7},
  {"title": "QA desktop, tablet, mobile", "category": "qa", "due_offset_days": 8},
  {"title": "Client approval", "category": "approval", "due_offset_days": 9},
  {"title": "Publish and verify tracking", "category": "web", "due_offset_days": 10}
]'::jsonb),
(null, 'SEO Onboarding', 'seo', 'Technical audit through first content recommendations.', '[
  {"title": "Run technical SEO audit", "category": "seo", "due_offset_days": 5},
  {"title": "Keyword research and clustering", "category": "seo", "due_offset_days": 10},
  {"title": "Connect Search Console and GA4", "category": "technical", "due_offset_days": 3},
  {"title": "Deliver first month priority list", "category": "reporting", "due_offset_days": 14}
]'::jsonb),
(null, 'Monthly Reporting', 'reporting', 'Recurring monthly client report cycle.', '[
  {"title": "Pull performance data from all channels", "category": "reporting", "due_offset_days": 2},
  {"title": "Draft report commentary", "category": "reporting", "due_offset_days": 4},
  {"title": "Internal review", "category": "review", "due_offset_days": 5},
  {"title": "Send report for client approval", "category": "approval", "due_offset_days": 6}
]'::jsonb),
(null, 'Social Production', 'content', 'One production cycle of social content.', '[
  {"title": "Content calendar planning", "category": "content", "due_offset_days": 2},
  {"title": "Produce assets", "category": "content", "due_offset_days": 6},
  {"title": "Internal review", "category": "review", "due_offset_days": 7},
  {"title": "Client review", "category": "approval", "due_offset_days": 8},
  {"title": "Schedule approved posts", "category": "content", "due_offset_days": 9}
]'::jsonb),
(null, 'Influencer Campaign', 'partnerships', 'Outreach through coverage tracking.', '[
  {"title": "Build creator shortlist", "category": "partnerships", "due_offset_days": 3},
  {"title": "Send outreach and negotiate terms", "category": "partnerships", "due_offset_days": 7},
  {"title": "Confirm deliverables and usage rights", "category": "partnerships", "due_offset_days": 9},
  {"title": "Track content delivery", "category": "partnerships", "due_offset_days": 14},
  {"title": "Report on coverage and engagement", "category": "reporting", "due_offset_days": 21}
]'::jsonb),
(null, 'Event Promotion', 'events', 'Pre-event marketing push.', '[
  {"title": "Finalize event landing page", "category": "web", "due_offset_days": 5},
  {"title": "Launch promotional campaign", "category": "paid_media", "due_offset_days": 7},
  {"title": "Coordinate sponsor and speaker assets", "category": "events", "due_offset_days": 10},
  {"title": "Send final reminder push", "category": "email", "due_offset_days": 20}
]'::jsonb),
(null, 'Email Campaign', 'email', 'Single email campaign send.', '[
  {"title": "Draft copy and subject lines", "category": "email", "due_offset_days": 3},
  {"title": "Build and QA in ESP", "category": "email", "due_offset_days": 5},
  {"title": "Client approval", "category": "approval", "due_offset_days": 6},
  {"title": "Schedule and send", "category": "email", "due_offset_days": 7}
]'::jsonb),
(null, 'Google Business Profile Setup', 'seo', 'Local SEO foundation setup.', '[
  {"title": "Claim and verify listing", "category": "seo", "due_offset_days": 3},
  {"title": "Complete profile and categories", "category": "seo", "due_offset_days": 5},
  {"title": "Add photos and initial posts", "category": "seo", "due_offset_days": 7}
]'::jsonb),
(null, 'Retainer Renewal', 'account_management', 'Renewal conversation and paperwork.', '[
  {"title": "Prepare renewal performance recap", "category": "reporting", "due_offset_days": -14},
  {"title": "Schedule renewal conversation", "category": "meeting", "due_offset_days": -10},
  {"title": "Send updated contract", "category": "admin", "due_offset_days": -5}
]'::jsonb),
(null, 'Website Audit', 'website', 'Standalone website health audit.', '[
  {"title": "Run technical and CRO audit", "category": "web", "due_offset_days": 5},
  {"title": "Prioritize findings", "category": "web", "due_offset_days": 7},
  {"title": "Present recommendations", "category": "reporting", "due_offset_days": 9}
]'::jsonb),
(null, 'CRO Experiment', 'website', 'One conversion experiment cycle.', '[
  {"title": "Document hypothesis and success metric", "category": "web", "due_offset_days": 2},
  {"title": "Build variant", "category": "web", "due_offset_days": 6},
  {"title": "QA and launch test", "category": "qa", "due_offset_days": 7},
  {"title": "Analyze results and decide", "category": "reporting", "due_offset_days": 21}
]'::jsonb)
on conflict do nothing;

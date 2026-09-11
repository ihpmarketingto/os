-- IHP OS — ad creative production SOP. Paid media fulfilment is not just
-- reporting: every cycle needs new copy, new images and new variants to
-- test, reviewed by a human before spend goes behind them.

insert into public.task_templates (organisation_id, name, category, description, default_tasks) values
(null, 'Ad Creative Production', 'paid_media', 'One production cycle of ad creative: concepts, copy, images and variants through client approval.', '[
  {"title": "Review last cycle performance and creative fatigue", "category": "paid_media", "due_offset_days": 2},
  {"title": "Agree creative concepts and testing hypothesis", "category": "strategy", "due_offset_days": 4},
  {"title": "Write primary text, headlines and CTAs per concept", "category": "content", "due_offset_days": 7},
  {"title": "Produce or source images and video assets", "category": "content", "due_offset_days": 10},
  {"title": "Build variants for the testing matrix", "category": "paid_media", "due_offset_days": 12},
  {"title": "Internal review: brand, claims and legal check", "category": "review", "due_offset_days": 14},
  {"title": "Client approval of creative before spend", "category": "approval", "due_offset_days": 16},
  {"title": "Launch variants and log the optimisation", "category": "paid_media", "due_offset_days": 18},
  {"title": "Read results and decide scale, iterate or kill", "category": "reporting", "due_offset_days": 28}
]'::jsonb),
(null, 'Ad Account Audit', 'paid_media', 'Audit an inherited or underperforming ad account before taking over management.', '[
  {"title": "Review account structure and naming conventions", "category": "paid_media", "due_offset_days": 3},
  {"title": "Verify pixel, Conversions API and conversion events", "category": "technical", "due_offset_days": 5},
  {"title": "Assess audiences, exclusions and overlap", "category": "paid_media", "due_offset_days": 7},
  {"title": "Assess creative library and fatigue", "category": "paid_media", "due_offset_days": 8},
  {"title": "Deliver findings with prioritised fixes", "category": "reporting", "due_offset_days": 10}
]'::jsonb)
on conflict do nothing;

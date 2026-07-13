UPDATE public.brief_form_config
SET config = jsonb_set(
  config,
  '{collaborationTypesBrand}',
  '[
    "Organic Social Content\n(Strategy, Planning and/or Production)",
    "Paid Social Content\n(Strategy, Planning and/or Production)",
    "Creator content (Organic Socials)",
    "Creator content (Paid Media)",
    "Ambassador talent and/or Creators",
    "Talent to appear in my brand content",
    "Event or Real World Activations\n(Strategy, Planning and/or Production)",
    "E-Commerce Collaborations",
    "Artist Playlists and Streaming Integration",
    "I''d like your recommendation based on my campaign",
    "Fan page creation and/or management"
  ]'::jsonb
)
WHERE id = 'default';
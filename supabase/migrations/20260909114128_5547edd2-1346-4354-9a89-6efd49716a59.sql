create or replace function public.get_public_roster(p_slug text)
returns json
language sql
stable
security definer
set search_path = public
as $$
  select case when r.id is null then null else json_build_object(
    'roster', to_jsonb(r),
    'items', coalesce((
      select json_agg(to_jsonb(i) order by i.position asc)
      from (
        select id, kind, name, avatar_url, vibe, instagram_url, instagram_followers,
               tiktok_url, tiktok_followers, youtube_url, youtube_subscribers,
               twitch_url, twitch_followers, facebook_url, facebook_followers,
               x_url, x_followers, custom_label, custom_url, custom_followers,
               spotify_url, spotify_monthly_listens, apple_music_url, apple_music_followers,
               example_video_url, bio_page_url, content_review_url, content_review_label,
               co_posts, position, status, category, categories, location
        from public.roster_items
        where roster_id = r.id and hidden = false
      ) i
    ), '[]'::json)
  ) end
  from (
    select id, title, description, slug, published, published_at, updated_at,
           header_image_url, profile_image_url, hide_prospect_tags, hide_statuses,
           hide_metric_socials, hide_metric_fans, hide_metric_reach, hide_metric_engagement,
           show_metric_creators, est_engagement_pct, categories, custom_links
    from public.rosters
    where slug = p_slug and published = true and access_code is null
  ) r;
$$;

grant execute on function public.get_public_roster(text) to anon, authenticated;
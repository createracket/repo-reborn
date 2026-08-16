import { useEffect, useState } from "react";

import { ClipCard } from "@/components/spotlight/ClipCard";
import { getClipPosters } from "@/lib/clip-poster.functions";
import { getSocialEmbed } from "@/lib/social-embed";

export type ProfileMedia = {
  video1?: string;
  video2?: string;
  video3?: string;
  video4?: string;
  video1_cover?: string;
  video2_cover?: string;
  video3_cover?: string;
  video4_cover?: string;
  photo1?: string;
  photo2?: string;
  photo3?: string;
  photo4?: string;
};

export const MEDIA_VIDEO_KEYS = ["video1", "video2", "video3", "video4"] as const;
export const MEDIA_PHOTO_KEYS = ["photo1", "photo2", "photo3", "photo4"] as const;

/** Featured videos row — same 9:16 clip cards used on spotlight pages. */
export function FeaturedVideos({
  media,
  heading = "Watch",
}: {
  media: ProfileMedia;
  heading?: string;
}) {
  const [posters, setPosters] = useState<Record<string, string | null>>({});
  const urls = MEDIA_VIDEO_KEYS.map((k) => media[k]).filter(
    (u): u is string => !!u && u.trim().length > 0,
  );
  const key = urls.join("|");

  useEffect(() => {
    if (!key) return;
    let cancelled = false;
    (async () => {
      try {
        const list = key.split("|");
        const res = await getClipPosters({ data: { urls: list } });
        if (cancelled) return;
        const byHref: Record<string, string | null> = {};
        for (const u of list) {
          const embed = getSocialEmbed(u);
          if (embed) byHref[embed.href] = res.posters[u] ?? null;
        }
        setPosters(byHref);
      } catch {
        /* posters are optional */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [key]);

  const videos = MEDIA_VIDEO_KEYS.map((k) => {
    const url = media[k];
    const embed = url ? getSocialEmbed(url) : null;
    return embed ? { embed, cover: media[`${k}_cover` as keyof ProfileMedia] } : null;
  }).filter((v): v is { embed: NonNullable<ReturnType<typeof getSocialEmbed>>; cover?: string } => !!v);

  if (videos.length === 0) return null;

  return (
    <section className="mt-12">
      <h2 className="font-display text-2xl md:text-3xl">{heading}</h2>
      <div
        className={`mt-4 grid gap-3 sm:gap-6 ${videos.length >= 4 ? "grid-cols-2 md:grid-cols-4" : "grid-cols-2 md:grid-cols-3"}`}
      >
        {videos.map((v, i) => (
          <ClipCard
            key={i}
            href={v.embed.href}
            provider={v.embed.provider}
            poster={v.cover ?? posters[v.embed.href] ?? null}
          />
        ))}
      </div>
    </section>
  );
}

/** Featured photos row — 4:5 images, two per row on mobile. */
export function FeaturedPhotos({ media }: { media: ProfileMedia }) {
  const photos = MEDIA_PHOTO_KEYS.map((k) => media[k]).filter(
    (u): u is string => !!u && u.trim().length > 0,
  );
  if (photos.length === 0) return null;

  return (
    <section className="mt-8">
      <div
        className={`grid gap-3 sm:gap-6 ${photos.length >= 4 ? "grid-cols-2 md:grid-cols-4" : photos.length === 3 ? "grid-cols-2 md:grid-cols-3" : "grid-cols-2"}`}
      >
        {photos.map((src, i) => (
          <div
            key={i}
            className="overflow-hidden rounded-3xl border border-border/60 bg-muted/40"
            style={{ aspectRatio: "4 / 5" }}
          >
            <img src={src} alt="" loading="lazy" className="size-full object-cover" />
          </div>
        ))}
      </div>
    </section>
  );
}

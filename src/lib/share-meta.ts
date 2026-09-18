import type { SharePreview } from "@/lib/share-preview.functions";

type Meta = Record<string, string>[];

/**
 * Build the link-preview meta tags (title, description, og:*, twitter:*) for a
 * shared page. Falls back to static copy when the page details can't be read.
 */
export function shareMeta(opts: {
  preview: SharePreview | null | undefined;
  fallbackTitle: string;
  fallbackDescription: string;
  noindex?: boolean;
}): Meta {
  const { preview, fallbackTitle, fallbackDescription } = opts;
  const rawTitle = preview?.title?.trim();
  const title = rawTitle ? `${rawTitle} — Create Racket` : fallbackTitle;
  const description = preview?.description?.trim() || fallbackDescription;

  const meta: Meta = [
    { title },
    { name: "description", content: description },
    { property: "og:title", content: title },
    { property: "og:description", content: description },
    { property: "og:type", content: "website" },
    { name: "twitter:title", content: title },
    { name: "twitter:description", content: description },
  ];

  if (opts.noindex) meta.push({ name: "robots", content: "noindex, nofollow" });

  if (preview?.image) {
    meta.push({ property: "og:image", content: preview.image });
    meta.push({ name: "twitter:image", content: preview.image });
    meta.push({ name: "twitter:card", content: "summary_large_image" });
  } else {
    meta.push({ name: "twitter:card", content: "summary" });
  }

  return meta;
}

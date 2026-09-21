import type { SharePreview } from "@/lib/share-preview.functions";

type Meta = Record<string, string>[];

/** Site-wide default link-preview image (1200x630-friendly homepage artwork). */
export const DEFAULT_SHARE_IMAGE =
  "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/de886712-fa2b-4751-9d22-3a70a7ad0f0e/id-preview-312afdf3--8600de53-73c0-4602-8b8c-36b97c35e736.lovable.app-1780385400907.png";

/** og:image / twitter:image tags for pages that don't set their own artwork. */
export function shareImageMeta(): Meta {
  return [
    { property: "og:image", content: DEFAULT_SHARE_IMAGE },
    { name: "twitter:image", content: DEFAULT_SHARE_IMAGE },
    { name: "twitter:card", content: "summary_large_image" },
  ];
}

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

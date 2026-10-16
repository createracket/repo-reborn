import { useState } from "react";

/**
 * Post thumbnail with a gradient fallback so report previews never look broken.
 * Renders the gradient when there is no thumbnail URL or when the image fails to load.
 */
export function PostThumb({
  src,
  className = "",
  videoSrc,
}: {
  src: string | null | undefined;
  videoSrc?: string | null;
  className?: string;
}) {
  const [failed, setFailed] = useState(false);

  const uploadedVideo =
    videoSrc && /\/storage\/v1\/object\/public\/.*\.(mp4|mov|webm|m4v)$/i.test(videoSrc) ? videoSrc : null;
  if ((!src || failed) && uploadedVideo) {
    return (
      <video
        src={`${uploadedVideo}#t=0.1`}
        muted
        playsInline
        preload="metadata"
        className={`size-full object-cover ${className}`}
      />
    );
  }

  if (!src || failed) {
    return (
      <div
        className={`size-full bg-gradient-to-br from-[#6a4de0] via-[#a175d4] to-[#efb3c4] ${className}`}
        aria-hidden="true"
      />
    );
  }

  return (
    <img
      src={src}
      alt=""
      className={`size-full object-cover ${className}`}
      onError={() => setFailed(true)}
    />
  );
}

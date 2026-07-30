import { useState } from "react";

/**
 * Post thumbnail with a gradient fallback so report previews never look broken.
 * Renders the gradient when there is no thumbnail URL or when the image fails to load.
 */
export function PostThumb({
  src,
  className = "",
}: {
  src: string | null | undefined;
  className?: string;
}) {
  const [failed, setFailed] = useState(false);

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

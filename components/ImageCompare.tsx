"use client";

/**
 * Displays two images side by side with captions. Used to compare the
 * original and stylised images.
 */
export default function ImageCompare({
  original,
  stylized
}: {
  original: string;
  stylized: string;
}) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <figure>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={original} alt="Original" className="w-full rounded-xl" />
        <figcaption className="text-white/60 text-sm mt-1">Original</figcaption>
      </figure>
      <figure>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={stylized} alt="Stylized" className="w-full rounded-xl" />
        <figcaption className="text-white/60 text-sm mt-1">Stylized</figcaption>
      </figure>
    </div>
  );
}
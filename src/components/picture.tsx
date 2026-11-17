import Image from "next/image";

import { getImageSize } from "@/lib/image-size";

import "./picture.css";

type PictureProps = {
  src: string;
  alt: string;
  caption?: string;
  // The picture at the top of a page loads first
  lead?: boolean;
};

// A screenshot or photo set into the page inside a pen-drawn frame, with its caption beneath.
// Clicking it opens the full picture. Built from spans, so it can sit inside the paragraph that
// Markdown wraps an image in; two or three in one paragraph stand side by side.
export async function Picture({ src, alt, caption, lead = false }: PictureProps) {
  const size = await getImageSize(src);
  // A phone screenshot is kept narrow; anything else takes the column
  const tall = size ? size.height > size.width * 1.15 : false;

  return (
    <span className="picture" data-shape={tall ? "tall" : "wide"}>
      <a className="picture__frame" href={src} rel="noreferrer" target="_blank">
        {size ? (
          <Image
            src={src}
            alt={alt || "Picture"}
            width={size.width}
            height={size.height}
            sizes={tall ? "(min-width: 44rem) 18rem, 60vw" : "(min-width: 44rem) 40rem, 100vw"}
            priority={lead}
          />
        ) : (
          // A picture hosted elsewhere, or in a format with no size to read
          // eslint-disable-next-line @next/next/no-img-element
          <img src={src} alt={alt || "Picture"} loading="lazy" decoding="async" />
        )}
      </a>
      {caption ? <span className="picture__caption">{caption}</span> : null}
    </span>
  );
}

"use client";

import { useState } from "react";

interface Props {
  src: string;
  alt: string;
  dominantColors: string[];
  className?: string;
  style?: React.CSSProperties;
  referrerPolicy?: React.HTMLAttributeReferrerPolicy;
  loading?: "lazy" | "eager";
  title?: string;
}

/** Keep failed references visibly distinct from an actual painting. */
export default function PaintingImage({
  src,
  alt,
  dominantColors,
  className,
  style,
  referrerPolicy,
  loading,
  title,
}: Props) {
  const [failedSrc, setFailedSrc] = useState<string | null>(null);
  if (failedSrc === src) {
    return (
      <div
        role="img"
        aria-label={`${alt}：图片暂不可用，显示参考色板`}
        className={className}
        style={{
          display: "flex",
          overflow: "hidden",
          position: "relative",
          ...style,
        }}
        title={title ?? `${alt} · 图片暂不可用`}
      >
        {dominantColors.map((color, i) => (
          <div key={i} style={{ flex: 1, background: color, minWidth: 0 }} />
        ))}
        <span className="absolute inset-0 flex items-center justify-center text-center p-1">
          <span
            className="rounded px-1 py-0.5 text-[10px]"
            style={{ background: "#FFFFFFDE", color: "#344438" }}
          >
            参考色板
          </span>
        </span>
      </div>
    );
  }
  return (
    <img
      key={src}
      src={src}
      alt={alt}
      className={className}
      style={style}
      referrerPolicy={referrerPolicy}
      loading={loading}
      title={title}
      onError={() => setFailedSrc(src)}
      onLoad={() => setFailedSrc(null)}
    />
  );
}

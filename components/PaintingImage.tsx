'use client'

import { useState } from 'react'

interface Props {
  src: string
  alt: string
  dominantColors: string[]
  className?: string
  style?: React.CSSProperties
  referrerPolicy?: React.HTMLAttributeReferrerPolicy
  loading?: 'lazy' | 'eager'
  title?: string
}

/**
 * Renders a painting image with a fallback color-stripe mosaic
 * (using the painting's dominant colors) when the image fails to load.
 */
export default function PaintingImage({
  src, alt, dominantColors, className, style, referrerPolicy, loading, title,
}: Props) {
  const [error, setError] = useState(false)

  if (error) {
    return (
      <div
        className={className}
        style={{ display: 'flex', overflow: 'hidden', ...style }}
        title={title ?? alt}
        aria-label={alt}
      >
        {dominantColors.map((color, i) => (
          <div key={i} style={{ flex: 1, backgroundColor: color, minWidth: 0 }} />
        ))}
      </div>
    )
  }

  return (
    <img
      src={src}
      alt={alt}
      className={className}
      style={style}
      referrerPolicy={referrerPolicy}
      loading={loading}
      title={title}
      onError={() => setError(true)}
    />
  )
}

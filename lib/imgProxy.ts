/**
 * Returns the image URL. Local /paintings/ paths are served directly.
 * External URLs still go through the proxy as fallback.
 */
export function proxyImg(url: string): string {
  if (url.startsWith('/')) return url  // local static file, serve directly
  return `/api/img?url=${encodeURIComponent(url)}`
}

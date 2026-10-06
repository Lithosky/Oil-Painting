/** Local painting assets are served directly; remote images use the restricted proxy. */
export function proxyImg(url: string): string {
  if (url.startsWith("/") && !url.startsWith("//")) return url;
  return `/api/img?url=${encodeURIComponent(url)}`;
}

import { NextRequest, NextResponse } from "next/server";

const ALLOWED_HOSTS = new Set(["upload.wikimedia.org"]);
const MAX_BYTES = 12 * 1024 * 1024;

function allowedUrl(raw: string): URL | null {
  try {
    const url = new URL(raw);
    return url.protocol === "https:" &&
      ALLOWED_HOSTS.has(url.hostname) &&
      !url.username &&
      !url.password &&
      !url.port
      ? url
      : null;
  } catch {
    return null;
  }
}

/** Restrict the optional image proxy to known public painting hosts. */
export async function GET(req: NextRequest) {
  // URLSearchParams already decodes once. A second decode corrupts escaped filenames.
  const url = allowedUrl(req.nextUrl.searchParams.get("url") ?? "");
  if (!url) return new NextResponse("Unsupported image URL", { status: 400 });
  try {
    const response = await fetch(url, {
      headers: {
        Accept: "image/jpeg,image/png,image/webp",
        "User-Agent": "OilColorStudio/1.0",
      },
      signal: AbortSignal.timeout(8000),
      redirect: "error",
    });
    if (!response.ok || !response.body)
      return new NextResponse("Image unavailable", { status: 502 });
    const mime = response.headers
      .get("Content-Type")
      ?.split(";")[0]
      .trim()
      .toLowerCase();
    if (
      !mime ||
      ![
        "image/jpeg",
        "image/png",
        "image/webp",
        "image/avif",
        "image/gif",
      ].includes(mime)
    ) {
      await response.body.cancel();
      return new NextResponse("Unsupported image format", { status: 415 });
    }
    if (Number(response.headers.get("Content-Length") ?? 0) > MAX_BYTES) {
      await response.body.cancel();
      return new NextResponse("Image too large", { status: 413 });
    }
    const reader = response.body.getReader();
    const chunks: Uint8Array[] = [];
    let length = 0;
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      length += value.length;
      if (length > MAX_BYTES) {
        await reader.cancel();
        return new NextResponse("Image too large", { status: 413 });
      }
      chunks.push(value);
    }
    const buffer = new Uint8Array(length);
    let offset = 0;
    for (const chunk of chunks) {
      buffer.set(chunk, offset);
      offset += chunk.length;
    }
    return new NextResponse(buffer, {
      headers: {
        "Content-Type": mime,
        "X-Content-Type-Options": "nosniff",
        "Cache-Control":
          "public, max-age=604800, s-maxage=604800, stale-while-revalidate=86400",
      },
    });
  } catch {
    return new NextResponse("Image unavailable", { status: 502 });
  }
}

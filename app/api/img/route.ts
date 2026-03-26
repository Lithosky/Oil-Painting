import { NextRequest, NextResponse } from 'next/server'

const HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
  'Accept': 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8',
  'Accept-Language': 'en-US,en;q=0.9',
  'Accept-Encoding': 'gzip, deflate, br',
  'Cache-Control': 'no-cache',
  'Referer': 'https://en.wikipedia.org/',
  'Sec-Fetch-Dest': 'image',
  'Sec-Fetch-Mode': 'no-cors',
}

/** For Wikimedia thumb URLs, return a smaller variant (300px) as a fallback */
function getSmallerThumb(url: string): string | null {
  const m = url.match(/\/(\d+)px-/)
  if (m && parseInt(m[1]) > 320) {
    return url.replace(/\/\d+px-/, '/300px-')
  }
  return null
}

async function tryFetch(url: string, retries = 2): Promise<Response | null> {
  for (let i = 0; i < retries; i++) {
    try {
      const res = await fetch(url, { headers: HEADERS, signal: AbortSignal.timeout(8000) })
      if (res.ok) return res
      if (res.status === 429 && i < retries - 1) {
        await new Promise(r => setTimeout(r, (i + 1) * 600))
        continue
      }
      return res
    } catch {
      if (i === retries - 1) return null
      await new Promise(r => setTimeout(r, 300))
    }
  }
  return null
}

export async function GET(req: NextRequest) {
  const raw = req.nextUrl.searchParams.get('url')
  if (!raw) return new NextResponse('Missing url', { status: 400 })

  const url = decodeURIComponent(raw)

  // Try the original URL first, then fall back to a smaller thumbnail
  let res = await tryFetch(url)
  if (!res?.ok) {
    const fallback = getSmallerThumb(url)
    if (fallback) res = await tryFetch(fallback)
  }

  if (!res?.ok) {
    return new NextResponse(null, { status: res?.status ?? 502 })
  }

  const buffer = await res.arrayBuffer()
  return new NextResponse(buffer, {
    headers: {
      'Content-Type': res.headers.get('Content-Type') || 'image/jpeg',
      'Cache-Control': 'public, max-age=604800, s-maxage=604800, stale-while-revalidate=86400',
      'Access-Control-Allow-Origin': '*',
    },
  })
}

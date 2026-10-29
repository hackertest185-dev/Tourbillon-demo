// Catch-all reverse proxy — forwards /api/backend/* to the .NET backend.
// Allows the entire app to be shared via a single ngrok tunnel on port 3000;
// all backend traffic is relayed server-side so visitors never need direct access to port 5248.
import { NextRequest, NextResponse } from 'next/server';

// Storage uploads can outlast the short default on older Vercel projects.
export const maxDuration = 60;

const BACKEND = process.env.BACKEND_INTERNAL_URL ?? 'http://localhost:5248/api';

// Headers that must not be forwarded to the upstream backend
const HOP_BY_HOP = new Set([
  'host',
  'connection',
  'keep-alive',
  'transfer-encoding',
  'te',
  'trailer',
  'proxy-authorization',
  'proxy-authenticate',
  'upgrade',
  'content-length', // recalculated by fetch
  // Vercel's fetch may transparently decompress the upstream response. Forwarding
  // the original marker would make browsers try to decompress it a second time.
  'content-encoding',
]);

function buildUpstreamHeaders(req: NextRequest): HeadersInit {
  const headers: Record<string, string> = {};
  req.headers.forEach((value, key) => {
    if (!HOP_BY_HOP.has(key.toLowerCase())) {
      headers[key] = value;
    }
  });
  return headers;
}

async function proxy(req: NextRequest, path: string[]): Promise<NextResponse> {
  const upstream = `${BACKEND}/${path.join('/')}${req.nextUrl.search}`;

  const hasBody = req.method !== 'GET' && req.method !== 'HEAD';

  const upstreamRes = await fetch(upstream, {
    method: req.method,
    headers: buildUpstreamHeaders(req),
    body: hasBody ? req.body : undefined,
    // OAuth endpoints must return their 302 to the browser. Following the
    // redirect here makes Vercel fetch Google's HTML and serve it on our own
    // origin, which leaves Google's sign-in page stuck on "Loading".
    redirect: 'manual',
    // Required for streaming request bodies in Node.js fetch
    ...(hasBody ? { duplex: 'half' } : {}),
  } as RequestInit);

  // Forward the response — preserve status, headers (including Set-Cookie for auth), and body
  const resHeaders = new Headers();
  upstreamRes.headers.forEach((value, key) => {
    if (key.toLowerCase() === 'set-cookie') return;
    if (!HOP_BY_HOP.has(key.toLowerCase())) {
      resHeaders.append(key, value);
    }
  });
  // Preserve each Identity/Google correlation cookie independently.
  const setCookies = upstreamRes.headers.getSetCookie?.() ?? [];
  for (const cookie of setCookies) resHeaders.append('set-cookie', cookie);

  // Materialize the upstream stream before returning it. On Vercel, forwarding
  // this particular cross-origin response stream directly can yield an empty
  // body even when the .NET API returned JSON successfully.
  // 204/205/304 responses are not allowed to carry a body. Constructing a
  // NextResponse with an empty ArrayBuffer for one of those statuses throws in
  // Vercel and turned successful backend deletes (such as clearing chat) into
  // a 500 at the proxy boundary.
  const hasNoBody = req.method === 'HEAD'
    || upstreamRes.status === 204
    || upstreamRes.status === 205
    || upstreamRes.status === 304;
  const body = hasNoBody ? null : await upstreamRes.arrayBuffer();

  return new NextResponse(body, {
    status: upstreamRes.status,
    headers: resHeaders,
  });
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  return proxy(req, (await params).path);
}
export async function POST(req: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  return proxy(req, (await params).path);
}
export async function PUT(req: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  return proxy(req, (await params).path);
}
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  return proxy(req, (await params).path);
}
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  return proxy(req, (await params).path);
}

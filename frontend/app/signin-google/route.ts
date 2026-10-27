import { NextRequest, NextResponse } from 'next/server';

const BACKEND = process.env.BACKEND_INTERNAL_URL ?? 'http://localhost:5248/api';
const HOP_BY_HOP = new Set([
  'host', 'connection', 'keep-alive', 'transfer-encoding', 'te', 'trailer',
  'proxy-authorization', 'proxy-authenticate', 'upgrade', 'content-length',
]);

export async function GET(req: NextRequest) {
  const backendRoot = BACKEND.replace(/\/api\/?$/, '');
  const upstream = `${backendRoot}/signin-google${req.nextUrl.search}`;
  const headers = new Headers();
  req.headers.forEach((value, key) => {
    if (!HOP_BY_HOP.has(key.toLowerCase())) headers.set(key, value);
  });

  const response = await fetch(upstream, { headers, redirect: 'manual' });
  const responseHeaders = new Headers();
  response.headers.forEach((value, key) => {
    if (!HOP_BY_HOP.has(key.toLowerCase())) responseHeaders.append(key, value);
  });

  return new NextResponse(await response.arrayBuffer(), {
    status: response.status,
    headers: responseHeaders,
  });
}

import { NextResponse } from "next/server";
import { z } from "zod";
import {
  createOperatorSession,
  isSameOriginRequest,
  operatorCookieName,
  operatorSessionMaxAge,
  verifyOperatorPassword,
} from "@/lib/operator-auth";
import { consumeRateLimit, readJsonBody, RequestBodyTooLargeError } from "@/lib/request-security";
import { getSupabaseAdmin } from "@/lib/supabase";
import { consumeBlobRateLimit } from "@/lib/netlify-commerce";

const schema = z.object({ password: z.string().min(1).max(256) });
const localAttempts = new Map<string, { count: number; resetsAt: number }>();

async function loginAllowed(request: Request) {
  const supabase = getSupabaseAdmin();
  if (supabase) {
    const [client, global] = await Promise.all([
      consumeRateLimit({ supabase, request, scope: "operations-login", limit: 8, windowSeconds: 900 }),
      consumeRateLimit({ supabase, request, scope: "operations-login-global", limit: 60, windowSeconds: 900, global: true }),
    ]);
    return client.allowed && global.allowed;
  }
  const hostname = new URL(request.url).hostname;
  const isLoopback = hostname === "localhost" || hostname === "127.0.0.1" || hostname === "::1";
  if (process.env.NODE_ENV === "production" && !isLoopback) {
    try {
      const [client, global] = await Promise.all([
        consumeBlobRateLimit({ request, scope: "operations-login", limit: 8, windowSeconds: 900 }),
        consumeBlobRateLimit({ request, scope: "operations-login-global", limit: 60, windowSeconds: 900, global: true }),
      ]);
      return client.allowed && global.allowed;
    } catch {
      return false;
    }
  }
  const key = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
  const now = Date.now();
  const current = localAttempts.get(key);
  if (!current || current.resetsAt <= now) {
    localAttempts.set(key, { count: 1, resetsAt: now + 15 * 60 * 1000 });
    return true;
  }
  current.count += 1;
  return current.count <= 8;
}

export async function POST(request: Request) {
  if (!isSameOriginRequest(request)) return NextResponse.json({ error: "Invalid request origin" }, { status: 403 });
  try {
    if (!await loginAllowed(request)) return NextResponse.json({ error: "Sign-in is temporarily unavailable. Try again later." }, { status: 429 });
    const input = schema.parse(await readJsonBody<unknown>(request, 1_024));
    if (!verifyOperatorPassword(input.password)) return NextResponse.json({ error: "That password was not accepted." }, { status: 401 });
    const token = createOperatorSession();
    if (!token) return NextResponse.json({ error: "Operator access is not configured." }, { status: 503 });
    const response = NextResponse.json({ authenticated: true });
    response.cookies.set(operatorCookieName(), token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      path: "/",
      maxAge: operatorSessionMaxAge,
    });
    return response;
  } catch (error) {
    if (error instanceof RequestBodyTooLargeError) return NextResponse.json({ error: "Request body is too large" }, { status: 413 });
    if (error instanceof z.ZodError || error instanceof SyntaxError || error instanceof TypeError) return NextResponse.json({ error: "Invalid sign-in request" }, { status: 400 });
    console.error("Operator sign-in failed", error);
    return NextResponse.json({ error: "Sign-in is temporarily unavailable." }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  if (!isSameOriginRequest(request)) return NextResponse.json({ error: "Invalid request origin" }, { status: 403 });
  const response = NextResponse.json({ authenticated: false });
  response.cookies.set(operatorCookieName(), "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/",
    maxAge: 0,
  });
  return response;
}

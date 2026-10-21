import { NextResponse, type NextRequest } from "next/server";
import { checkEdgeTraffic, hasEdgeSecurityStore } from "@/lib/edge-security";

const suspiciousPatterns = [
  /(?:union\s+select|select\s+.+\s+from|insert\s+into|drop\s+table|delete\s+from)/i,
  /(?:<script|javascript:|onerror\s*=|onload\s*=|%3cscript)/i,
  /(?:\.\.\/|\.\.%2f|etc\/passwd|proc\/self)/i,
  /(?:wp-admin|xmlrpc\.php|\.env|\.git(?:\/|%2f))/i,
  /(?:sleep\s*\(|benchmark\s*\(|\bwaitfor\s+delay)/i,
];

function getIp(request: NextRequest) {
  const forwarded = request.headers.get("x-forwarded-for");
  return (forwarded?.split(",")[0]?.trim() || request.headers.get("x-real-ip") || "unknown").slice(0, 100);
}

function looksSuspicious(request: NextRequest) {
  const target = `${request.nextUrl.pathname}?${request.nextUrl.search}`;
  return suspiciousPatterns.some((pattern) => pattern.test(target));
}

export async function proxy(request: NextRequest) {
  if (!hasEdgeSecurityStore()) return NextResponse.next();

  const ip = getIp(request);
  const suspicious = looksSuspicious(request);
  const result = await checkEdgeTraffic(ip, suspicious);

  if (!result.allowed) {
    return NextResponse.json(
      { error: result.blocked ? "Access temporarily blocked." : "Too many requests." },
      {
        status: result.blocked ? 403 : 429,
        headers: {
          "Cache-Control": "no-store",
          "Retry-After": String(result.retryAfter),
          "X-Content-Type-Options": "nosniff",
        },
      },
    );
  }

  const response = NextResponse.next();
  response.headers.set("X-Request-ID", crypto.randomUUID());
  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml).*)",
  ],
};

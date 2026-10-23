import { NextResponse, type NextRequest } from "next/server";

const suspiciousPatterns = [
  /(?:union\s+select|select\s+.+\s+from|insert\s+into|drop\s+table|delete\s+from)/i,
  /(?:<script|javascript:|onerror\s*=|onload\s*=|%3cscript)/i,
  /(?:\.\.\/|\.\.%2f|etc\/passwd|proc\/self)/i,
  /(?:wp-admin|xmlrpc\.php|\.env|\.git(?:\/|%2f))/i,
  /(?:sleep\s*\(|benchmark\s*\(|\bwaitfor\s+delay)/i,
];

function looksSuspicious(request: NextRequest) {
  const target = `${request.nextUrl.pathname}?${request.nextUrl.search}`;
  return suspiciousPatterns.some((pattern) => pattern.test(target));
}

export function proxy(request: NextRequest) {
  if (looksSuspicious(request)) {
    return NextResponse.json(
      { error: "Access blocked." },
      {
        status: 403,
        headers: { "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" },
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

import { NextResponse, type NextRequest } from "next/server";

// Gate the entire admin app behind HTTP Basic Auth, with an optional IP
// allowlist. Runs at the edge before any page or server action. There is no
// login UI — the browser's native Basic Auth prompt is the login.
//
// Next 16 renamed the "middleware" convention to "proxy"; the behavior is the
// same. See node_modules/next/dist/docs/01-app/01-getting-started/16-proxy.md.

export const config = {
  // Everything except Next's static assets.
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};

function constantTimeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

function unauthorized(): NextResponse {
  return new NextResponse("Authentication required.", {
    status: 401,
    headers: {
      "WWW-Authenticate": 'Basic realm="Gospel Library Admin", charset="UTF-8"',
    },
  });
}

export function proxy(req: NextRequest): NextResponse {
  const allowlist = (process.env.ADMIN_IP_ALLOWLIST ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  if (allowlist.length > 0) {
    const ip = (req.headers.get("x-forwarded-for") ?? "").split(",")[0].trim();
    if (!ip || !allowlist.includes(ip)) {
      return new NextResponse("Forbidden.", { status: 403 });
    }
  }

  const user = process.env.ADMIN_USER;
  const pass = process.env.ADMIN_PASSWORD;
  if (!user || !pass) {
    return new NextResponse(
      "Admin credentials are not configured. Set ADMIN_USER and ADMIN_PASSWORD.",
      { status: 503 },
    );
  }

  const header = req.headers.get("authorization") ?? "";
  if (header.startsWith("Basic ")) {
    let decoded = "";
    try {
      decoded = atob(header.slice(6));
    } catch {
      decoded = "";
    }
    const sep = decoded.indexOf(":");
    if (sep >= 0) {
      const okUser = constantTimeEqual(decoded.slice(0, sep), user);
      const okPass = constantTimeEqual(decoded.slice(sep + 1), pass);
      if (okUser && okPass) return NextResponse.next();
    }
  }

  return unauthorized();
}

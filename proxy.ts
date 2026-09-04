import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
export async function proxy(request: NextRequest) {
  if (["POST", "PUT", "PATCH", "DELETE"].includes(request.method)) {
    const origin = request.headers.get("origin"),
      host = request.headers.get("x-forwarded-host") || request.headers.get("host");
    if (origin && host) {
      try {
        if (new URL(origin).host !== host)
          return NextResponse.json(
            { error: "Ungültiger Anfrageursprung", code: "CSRF_REJECTED" },
            { status: 403 },
          );
      } catch {
        return NextResponse.json(
          { error: "Ungültiger Anfrageursprung", code: "CSRF_REJECTED" },
          { status: 403 },
        );
      }
    }
  }
  let response = NextResponse.next({ request });
  const client = createServerClient(process.env.SUPABASE_URL!, process.env.SUPABASE_ANON_KEY!, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll(values) {
        values.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        values.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, {
            ...options,
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: "lax",
          }),
        );
      },
    },
  });
  await client.auth.getUser();
  return response;
}
export const config = { matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"] };

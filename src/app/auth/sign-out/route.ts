import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";

const SESSION_COOKIE_NAMES = [
  "better-auth.session_token",
  "better-auth.session_data",
  "__Secure-better-auth.session_token",
  "__Secure-better-auth.session_data",
];

export async function GET(request: Request) {
  try {
    await auth.api.signOut({
      headers: request.headers,
    });
  } catch (error) {
    console.error("Sign out failed", error);
  }

  const cookieStore = await cookies();
  for (const name of SESSION_COOKIE_NAMES) {
    cookieStore.delete(name);
  }

  return NextResponse.redirect(new URL("/", request.url));
}

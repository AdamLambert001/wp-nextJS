import { NextResponse } from "next/server";
import { resolveProfileAvatarUrl } from "@/lib/profile/avatar";
import { loadPublicProfileById } from "@/lib/profile/load";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(_request: Request, context: RouteContext) {
  const { id } = await context.params;

  try {
    const profile = await loadPublicProfileById(id);
    if (!profile) {
      return NextResponse.json({ ok: false, message: "Profile not found" }, { status: 404 });
    }

    const avatarUrl = await resolveProfileAvatarUrl({
      id: profile.id,
      avatarUrl: profile.avatarUrl,
    });

    return NextResponse.json({ ok: true, avatarUrl });
  } catch (error) {
    console.error("Failed to resolve profile avatar", error);
    return NextResponse.json(
      { ok: false, message: "Failed to fetch profile avatar" },
      { status: 500 },
    );
  }
}

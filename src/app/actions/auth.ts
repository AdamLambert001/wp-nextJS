"use server";

import { headers } from "next/headers";
import { actionError, actionOk, type ActionResult } from "@/lib/actions/result";
import { auth } from "@/lib/auth";

export async function signOutAction(): Promise<ActionResult> {
  try {
    await auth.api.signOut({
      headers: await headers(),
    });
    return actionOk(undefined);
  } catch (error) {
    console.error("Failed to sign out", error);
    return actionError(error);
  }
}

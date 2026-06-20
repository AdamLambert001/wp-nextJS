import { ShieldOff } from "lucide-react";
import Link from "next/link";
import { LinkButton } from "@/components/ui/link-button";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "No access — Zeta Company",
};

export default function NoAccessPage() {
  return (
    <main className="mx-auto max-w-6xl px-4 py-14 sm:px-6 sm:py-16">
      <Empty className="border border-border/80 bg-card/40">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <ShieldOff />
          </EmptyMedia>
          <EmptyTitle>No access</EmptyTitle>
          <EmptyDescription>
            Your Discord account is not authorized for this area. Ask a panel admin to
            grant permissions in the Discord roles table.
          </EmptyDescription>
        </EmptyHeader>
        <div className="flex flex-wrap justify-center gap-3">
          <LinkButton href="/" variant="secondary">Back to home</LinkButton>
          <Link
            href="/"
            className="text-sm text-muted-foreground underline-offset-4 hover:underline"
          >
            Sign in with a different Discord account
          </Link>
        </div>
      </Empty>
    </main>
  );
}

"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const PROFILE_PAGES = [
  { label: "ORBAT", href: "/orbat" },
  { label: "Profiles", href: "/profile" },
  { label: "Ranks", href: "/ranks" },
  { label: "Radios", href: "/radios" },
  { label: "Admin Departments", href: "/admin-departments" },
  { label: "Lore", href: "/lore" },
] as const;

type ProfilePagesNavProps = {
  showAdminLink?: boolean;
};

export function ProfilePagesNav({ showAdminLink = false }: ProfilePagesNavProps) {
  const pathname = usePathname();

  return (
    <nav
      className="mb-4 flex flex-wrap items-center gap-2"
      aria-label="Profile pages"
    >
      {PROFILE_PAGES.map((item) => {
        const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "inline-block rounded-lg border px-3 py-1.5 text-sm no-underline transition-colors",
              active
                ? "border-sky-400/80 bg-muted text-foreground"
                : "border-border bg-card text-muted-foreground hover:text-foreground",
            )}
          >
            {item.label}
          </Link>
        );
      })}
      {showAdminLink ? (
        <Link
          href="/admin"
          className="ml-auto rounded-md border border-transparent px-2 py-1 text-xs text-muted-foreground no-underline hover:border-border hover:bg-card hover:text-foreground"
          title="Service records admin"
        >
          Admin
        </Link>
      ) : null}
    </nav>
  );
}

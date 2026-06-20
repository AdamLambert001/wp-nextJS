"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { HeaderNavDropdown } from "@/components/header-nav-dropdown";
import { buttonVariants } from "@/components/ui/button";
import type { NavItem } from "@/lib/rbac/types";
import { cn } from "@/lib/utils";

type HeaderNavProps = {
  items: readonly NavItem[];
};

function isLinkActive(pathname: string, href: string): boolean {
  return href === "/"
    ? pathname === "/"
    : pathname === href || pathname.startsWith(`${href}/`);
}

export function HeaderNav({ items }: HeaderNavProps) {
  const pathname = usePathname();

  return (
    <nav className="hidden items-center gap-1 md:flex" aria-label="Main">
      {items.map((item) => {
        if (item.children?.length) {
          return (
            <HeaderNavDropdown
              key={item.label}
              item={{ ...item, children: item.children }}
              pathname={pathname}
            />
          );
        }

        if (!item.href) {
          return null;
        }

        const isActive = isLinkActive(pathname, item.href);

        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              buttonVariants({
                variant: isActive ? "secondary" : "ghost",
                size: "sm",
              }),
            )}
            aria-current={isActive ? "page" : undefined}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}

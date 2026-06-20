"use client";

import Link from "next/link";
import {
  BookOpenIcon,
  Building2Icon,
  RadioIcon,
  ShieldIcon,
  type LucideIcon,
} from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuTrigger,
} from "@/components/ui/navigation-menu";
import type { NavDropdownItem, NavItem } from "@/lib/rbac/types";
import { cn } from "@/lib/utils";

const dropdownIcons: Record<string, LucideIcon> = {
  Ranks: ShieldIcon,
  Radios: RadioIcon,
  Lore: BookOpenIcon,
  "Admin Departments": Building2Icon,
};

type HeaderNavDropdownProps = {
  item: NavItem & { children: readonly NavDropdownItem[] };
  pathname: string;
};

function isChildActive(pathname: string, href: string): boolean {
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function HeaderNavDropdown({ item, pathname }: HeaderNavDropdownProps) {
  const isActive = item.children.some((child) => isChildActive(pathname, child.href));

  return (
    <NavigationMenu className="max-w-none flex-none">
      <NavigationMenuList>
        <NavigationMenuItem>
          <NavigationMenuTrigger
            className={cn(
              buttonVariants({
                variant: isActive ? "secondary" : "ghost",
                size: "sm",
              }),
              "h-7 px-2.5 text-[0.8rem] [&>svg]:size-3.5",
            )}
          >
            {item.label}
          </NavigationMenuTrigger>
          <NavigationMenuContent>
            <div className="w-80 space-y-1 p-1">
              {item.children.map((child) => {
                const Icon = dropdownIcons[child.label] ?? ShieldIcon;
                const childActive = isChildActive(pathname, child.href);

                return (
                  <NavigationMenuLink
                    key={child.href}
                    render={<Link href={child.href} />}
                    className={cn(
                      "flex items-start gap-2 *:[svg]:mt-0.5 *:[svg]:size-5",
                      childActive && "bg-muted/50",
                    )}
                    aria-current={childActive ? "page" : undefined}
                  >
                    <Icon />
                    <div className="flex-1">
                      <span className="font-medium">{child.label}</span>
                      {child.description ? (
                        <p className="text-muted-foreground">{child.description}</p>
                      ) : null}
                    </div>
                  </NavigationMenuLink>
                );
              })}
            </div>
          </NavigationMenuContent>
        </NavigationMenuItem>
      </NavigationMenuList>
    </NavigationMenu>
  );
}

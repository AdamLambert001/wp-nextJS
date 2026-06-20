import Link from "next/link";
import Image from "next/image";
import { DiscordSignInButton } from "@/components/discord-sign-in-button";
import { HeaderNav } from "@/components/header-nav";
import { UserMenu } from "@/components/user-menu";
import { getAccess } from "@/lib/rbac/get-access";
import { filterNavigation } from "@/lib/rbac/navigation";
import { serializeAccessContext } from "@/lib/rbac/types";
import { headerNav, siteConfig } from "@/lib/site-config";

export async function AppHeader() {
  const access = await getAccess();
  const serialized = serializeAccessContext(access);
  const visibleNav = filterNavigation(headerNav, access.permissions, access.role);

  return (
    <header className="sticky top-0 z-50 border-b border-border/80 bg-background/80 backdrop-blur-md">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
        <div className="flex min-w-0 items-center gap-4 sm:gap-8">
          <Link href="/" className="group flex shrink-0 items-center gap-3">
            <Image
              src={siteConfig.logoSrc}
              alt={siteConfig.logoAlt}
              width={40}
              height={40}
              priority
              className="size-10 shrink-0 rounded-lg object-contain"
            />
            <div className="hidden sm:block">
              <p className="text-sm font-semibold tracking-wide text-foreground group-hover:text-foreground/90">
                {siteConfig.siteTitle}
              </p>
              <p className="text-xs text-muted-foreground">Arma 3 Halosim</p>
            </div>
          </Link>

          <HeaderNav items={visibleNav} />
        </div>

        <div className="flex shrink-0 items-center gap-2">
          {access.authenticated ? (
            <UserMenu access={serialized} />
          ) : (
            <DiscordSignInButton size="sm" />
          )}
        </div>
      </div>
    </header>
  );
}

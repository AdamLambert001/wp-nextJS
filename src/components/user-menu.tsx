"use client";

import { useRouter } from "next/navigation";
import { LogOut, Palette, Shield, User } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { buttonVariants } from "@/components/ui/button";
import { ThemeColorPicker } from "@/components/theme-color-picker";
import { useThemeSecondary } from "@/components/theme-secondary-provider";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { authClient } from "@/lib/auth-client";
import { hasPermission } from "@/lib/rbac/access";
import { Permission } from "@/lib/rbac/permissions";
import type { SerializedAccessContext } from "@/lib/rbac/types";
import { cn } from "@/lib/utils";

type UserMenuProps = {
  access: SerializedAccessContext;
};

export function UserMenu({ access }: UserMenuProps) {
  const router = useRouter();
  const {
    effectiveSecondaryHex,
    globalSecondaryHex,
    userSecondaryHex,
    setUserSecondaryHex,
    clearUserSecondaryHex,
  } = useThemeSecondary();
  const permissions = new Set(access.permissions);
  const canAccessAdmin = hasPermission(permissions, Permission.ACCESS_ADMIN);

  async function handleSignOut() {
    await authClient.signOut({
      fetchOptions: {
        onSuccess: () => {
          router.push("/");
          router.refresh();
        },
      },
    });
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className={cn(
          buttonVariants({ variant: "outline", size: "sm" }),
          "gap-2 px-2 sm:px-3",
        )}
      >
        <Avatar className="size-7 border border-border">
          {access.image ? <AvatarImage src={access.image} alt={access.name ?? ""} /> : null}
          <AvatarFallback className="bg-muted text-xs font-semibold">
            {(access.name ?? "?").slice(0, 1).toUpperCase()}
          </AvatarFallback>
        </Avatar>
        <span className="hidden max-w-32 truncate sm:inline">{access.name}</span>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuGroup>
          <DropdownMenuLabel className="font-normal">
            <div className="flex flex-col gap-1">
              <span className="truncate font-medium text-foreground">{access.name}</span>
              {access.email ? (
                <span className="truncate text-xs text-muted-foreground">{access.email}</span>
              ) : null}
              <span className="text-xs text-muted-foreground capitalize">
                Role: {access.role.replaceAll("_", " ")}
              </span>
            </div>
          </DropdownMenuLabel>
        </DropdownMenuGroup>

        <DropdownMenuSeparator />

        <DropdownMenuGroup>
          <DropdownMenuItem onClick={() => router.push("/")}>
            <User />
            Home
          </DropdownMenuItem>
          {canAccessAdmin ? (
            <DropdownMenuItem onClick={() => router.push("/admin")}>
              <Shield />
              Admin
            </DropdownMenuItem>
          ) : null}
          <DropdownMenuSub>
            <DropdownMenuSubTrigger>
              <Palette />
              Accent colour
            </DropdownMenuSubTrigger>
            <DropdownMenuSubContent className="w-72 p-3">
              <ThemeColorPicker
                id="user-accent"
                value={effectiveSecondaryHex}
                onChange={setUserSecondaryHex}
              />
              <p className="mt-2 text-xs text-muted-foreground">
                Saved in this browser only. Site default: {globalSecondaryHex}
              </p>
              {userSecondaryHex ? (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="mt-3 w-full"
                  onClick={clearUserSecondaryHex}
                >
                  Use site default
                </Button>
              ) : null}
            </DropdownMenuSubContent>
          </DropdownMenuSub>
        </DropdownMenuGroup>

        <DropdownMenuSeparator />

        <DropdownMenuItem variant="destructive" onClick={handleSignOut}>
          <LogOut />
          Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

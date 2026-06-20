import { Toaster } from "@/components/ui/sonner";
import { AppHeader } from "@/components/app-header";
import { AuthenticatedEdgeStoreProvider } from "@/components/edgestore/authenticated-edgestore-provider";
import { ThemeSecondaryProvider } from "@/components/theme-secondary-provider";
import { ThemeVariables } from "@/components/theme-variables";
import { TooltipProvider } from "@/components/ui/tooltip";
import { loadServerSettingsFromDb } from "@/lib/server-settings/load";
import { USER_THEME_SECONDARY_COOKIE } from "@/lib/server-settings/constants";
import { getAccess } from "@/lib/rbac/get-access";
import { siteConfig } from "@/lib/site-config";
import { isValidHexColor } from "@/lib/theme-colors";
import { cn } from "@/lib/utils";
import type { Metadata } from "next";
import { cookies } from "next/headers";
import { Geist, Questrial } from "next/font/google";
import "./globals.css";

const geist = Geist({
  subsets: ["latin"],
  variable: "--font-geist",
});

const questrial = Questrial({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-questrial",
});

export const metadata: Metadata = {
  title: siteConfig.documentTitle,
  description: siteConfig.tagline,
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const [serverSettings, cookieStore, access] = await Promise.all([
    loadServerSettingsFromDb(),
    cookies(),
    getAccess(),
  ]);
  const userOverride = cookieStore.get(USER_THEME_SECONDARY_COOKIE)?.value?.trim();
  const effectiveSecondaryHex =
    userOverride && isValidHexColor(userOverride)
      ? userOverride.startsWith("#")
        ? userOverride
        : `#${userOverride}`
      : serverSettings.secondaryColorHex;

  return (
    <html
      lang="en"
      className={cn("dark h-full", questrial.variable, geist.variable)}
      suppressHydrationWarning
    >
      <body className="min-h-full font-sans antialiased">
        <ThemeVariables secondaryHex={effectiveSecondaryHex} />
        <ThemeSecondaryProvider globalSecondaryHex={serverSettings.secondaryColorHex}>
          <AuthenticatedEdgeStoreProvider enabled={access.authenticated}>
            <TooltipProvider>
              <div className="min-h-screen bg-background text-foreground">
                <AppHeader />
                {children}
              </div>
              <Toaster closeButton position="top-right" />
            </TooltipProvider>
          </AuthenticatedEdgeStoreProvider>
        </ThemeSecondaryProvider>
      </body>
    </html>
  );
}

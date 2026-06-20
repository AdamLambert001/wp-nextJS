"use client";

import { EdgeStoreProvider } from "@/lib/edgestore";
import type { ReactNode } from "react";

type AuthenticatedEdgeStoreProviderProps = {
  enabled: boolean;
  children: ReactNode;
};

export function AuthenticatedEdgeStoreProvider({
  enabled,
  children,
}: AuthenticatedEdgeStoreProviderProps) {
  if (!enabled) {
    return children;
  }

  return <EdgeStoreProvider>{children}</EdgeStoreProvider>;
}

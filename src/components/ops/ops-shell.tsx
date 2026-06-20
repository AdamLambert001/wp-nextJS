import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import "./ops.css";

type OpsShellProps = {
  children: ReactNode;
  className?: string;
  orbitron?: boolean;
};

export function OpsShell({ children, className, orbitron = false }: OpsShellProps) {
  return (
    <div
      className={cn(
        "ops-shell mx-auto max-w-5xl px-4 py-8 sm:px-6",
        orbitron && "ops-shell--orbitron",
        className,
      )}
    >
      {children}
    </div>
  );
}

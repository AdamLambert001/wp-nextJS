import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import "./home.css";

type HomeShellProps = {
  children: ReactNode;
  className?: string;
};

export function HomeShell({ children, className }: HomeShellProps) {
  return <div className={cn("home-shell", className)}>{children}</div>;
}

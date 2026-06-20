import type { CSSProperties } from "react";

type ToastStyle = CSSProperties & Record<`--${string}`, string>;

/** Solid toast styles from @shadcn-studio/sonner-17 through sonner-20 */
export const toastCategoryStyles = {
  info: {
    "--normal-bg": "light-dark(var(--color-sky-600), var(--color-sky-400))",
    "--normal-text": "var(--color-white)",
    "--normal-border":
      "light-dark(var(--color-sky-600), var(--color-sky-400))",
  },
  success: {
    "--normal-bg":
      "light-dark(var(--color-green-600), var(--color-green-400))",
    "--normal-text": "var(--color-white)",
    "--normal-border":
      "light-dark(var(--color-green-600), var(--color-green-400))",
  },
  warning: {
    "--normal-bg":
      "light-dark(var(--color-amber-600), var(--color-amber-400))",
    "--normal-text": "var(--color-white)",
    "--normal-border":
      "light-dark(var(--color-amber-600), var(--color-amber-400))",
  },
  error: {
    "--normal-bg":
      "light-dark(var(--destructive), color-mix(in oklab, var(--destructive) 60%, var(--background)))",
    "--normal-text": "var(--color-white)",
    "--normal-border": "transparent",
  },
} satisfies Record<"info" | "success" | "warning" | "error", ToastStyle>;

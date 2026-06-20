import {
  toast as sonnerToast,
  type ExternalToast,
} from "sonner";

import { toastCategoryStyles } from "@/lib/toast-styles";

type ToastCategory = keyof typeof toastCategoryStyles;

function withCategoryStyle(
  category: ToastCategory,
  options?: ExternalToast,
): ExternalToast {
  return {
    ...options,
    style: {
      ...toastCategoryStyles[category],
      ...options?.style,
    },
  };
}

export const toast = Object.assign(
  (...args: Parameters<typeof sonnerToast>) => sonnerToast(...args),
  sonnerToast,
  {
    info: (message: Parameters<typeof sonnerToast.info>[0], options?: ExternalToast) =>
      sonnerToast.info(message, withCategoryStyle("info", options)),
    success: (
      message: Parameters<typeof sonnerToast.success>[0],
      options?: ExternalToast,
    ) => sonnerToast.success(message, withCategoryStyle("success", options)),
    warning: (
      message: Parameters<typeof sonnerToast.warning>[0],
      options?: ExternalToast,
    ) => sonnerToast.warning(message, withCategoryStyle("warning", options)),
    error: (message: Parameters<typeof sonnerToast.error>[0], options?: ExternalToast) =>
      sonnerToast.error(message, withCategoryStyle("error", options)),
  },
);

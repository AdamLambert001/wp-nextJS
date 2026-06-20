"use client";

import { useCallback } from "react";
import { useEdgeStore } from "@/lib/edgestore";

export type ImageUploadFolder = "lore" | "medals" | "ranks" | "home" | "orbat";

type ImageUploadOptions = {
  onProgressChange?: (progress: number) => void;
  replaceTargetUrl?: string;
};

export function useImageUpload() {
  const { edgestore } = useEdgeStore();

  return useCallback(
    async (file: File, folder: ImageUploadFolder, options?: ImageUploadOptions) => {
      const result = await edgestore.images.upload({
        file,
        input: { folder },
        onProgressChange: options?.onProgressChange,
        options: options?.replaceTargetUrl
          ? { replaceTargetUrl: options.replaceTargetUrl }
          : undefined,
      });
      return result.url;
    },
    [edgestore],
  );
}

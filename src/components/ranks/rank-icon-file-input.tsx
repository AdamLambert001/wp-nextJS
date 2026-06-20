"use client";

import { Input } from "@/components/ui/input";
import { useImageUpload } from "@/lib/edgestore/use-image-upload";
import { toast } from "@/lib/toast";

type RankIconFileInputProps = {
  onUploaded: (url: string) => void;
};

export function RankIconFileInput({ onUploaded }: RankIconFileInputProps) {
  const uploadRankIcon = useImageUpload();

  return (
    <Input
      type="file"
      accept="image/png,image/jpeg,image/webp,image/gif"
      onChange={async (event) => {
        const file = event.target.files?.[0];
        if (!file) return;
        try {
          const url = await uploadRankIcon(file, "ranks");
          onUploaded(url);
        } catch (error) {
          toast.error(error instanceof Error ? error.message : "Failed to upload icon");
        } finally {
          event.target.value = "";
        }
      }}
    />
  );
}

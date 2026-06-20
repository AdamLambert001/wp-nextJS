"use client";

import { useEffect, useState } from "react";
import { ImageUrlOrUpload } from "@/components/edgestore/image-url-or-upload";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type OrbatGroupBackgroundDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  value: string;
  groupTitle: string;
  onChange: (url: string) => void;
};

export function OrbatGroupBackgroundDialog({
  open,
  onOpenChange,
  value,
  groupTitle,
  onChange,
}: OrbatGroupBackgroundDialogProps) {
  const [draft, setDraft] = useState(value);

  useEffect(() => {
    if (open) {
      setDraft(value);
    }
  }, [open, value]);

  function handleDone() {
    onChange(draft.trim());
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Section background</DialogTitle>
          <DialogDescription>
            Optional background image behind the roster table for{" "}
            <span className="font-medium text-foreground">{groupTitle || "this group"}</span>.
            Paste a link or upload to EdgeStore.
          </DialogDescription>
        </DialogHeader>

        <ImageUrlOrUpload
          value={draft}
          onChange={setDraft}
          folder="orbat"
          label="Background image"
        />

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="button" onClick={handleDone}>
            Done
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

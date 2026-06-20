"use client";

import { useEffect, useState } from "react";
import { updateSecondaryColorAction } from "@/app/admin/actions/update-secondary-color";
import { ThemeColorPicker } from "@/components/theme-color-picker";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "@/lib/toast";
import { isValidHexColor } from "@/lib/theme-colors";

type SiteSecondaryColorDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialHex: string;
  onSaved?: (hex: string) => void;
};

export function SiteSecondaryColorDialog({
  open,
  onOpenChange,
  initialHex,
  onSaved,
}: SiteSecondaryColorDialogProps) {
  const [color, setColor] = useState(initialHex);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setColor(initialHex);
    }
  }, [initialHex, open]);

  async function handleSave() {
    if (!isValidHexColor(color)) {
      toast.error("Enter a valid 6-digit hex colour.");
      return;
    }

    setSaving(true);
    try {
      const result = await updateSecondaryColorAction(color);
      if (!result.ok) {
        toast.error(result.message);
        return;
      }
      toast.success("Site accent colour updated.");
      onSaved?.(result.data.secondaryColorHex);
      onOpenChange(false);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Site accent colour</DialogTitle>
          <DialogDescription>
            Sets the global secondary accent for all users. Visitors can still override this in
            their account menu for their own browser.
          </DialogDescription>
        </DialogHeader>

        <ThemeColorPicker value={color} onChange={setColor} id="site-secondary" disabled={saving} />

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancel
          </Button>
          <Button type="button" onClick={() => void handleSave()} disabled={saving}>
            {saving ? "Saving..." : "Save colour"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

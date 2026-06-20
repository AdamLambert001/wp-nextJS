"use client";

import { useEffect, useState } from "react";
import { Tags } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "@/lib/toast";
import { DetachmentTagBadge } from "@/components/admin/detachment-tag-badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/ui/spinner";
import { LucideIconPicker } from "@/components/admin/lucide-icon-picker";
import {
  loadDetachmentTagsAction,
  saveDetachmentTagsAction,
} from "@/app/admin/actions/detachment-tags";
import type { DetachmentTagEntry } from "@/lib/admin/detachment-tags.shared";

type DetachmentTagsDialogProps = {
  open: boolean;
  onClose: () => void;
};

export function DetachmentTagsDialog({ open, onClose }: DetachmentTagsDialogProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [tags, setTags] = useState<DetachmentTagEntry[]>([]);

  useEffect(() => {
    if (!open) return;

    let cancelled = false;
    setLoading(true);

    void (async () => {
      try {
        const result = await loadDetachmentTagsAction();

        if (!result.ok) {
          throw new Error(result.message);
        }

        if (!cancelled) {
          setTags(result.data);
        }
      } catch (error) {
        if (!cancelled) {
          toast.error(error instanceof Error ? error.message : "Failed to load detachment tags");
          onClose();
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [onClose, open]);

  function updateTag(index: number, patch: Partial<DetachmentTagEntry>) {
    setTags((current) =>
      current.map((entry, entryIndex) =>
        entryIndex === index ? { ...entry, ...patch } : entry,
      ),
    );
  }

  async function handleSave() {
    setSaving(true);
    try {
      const result = await saveDetachmentTagsAction(
        tags.map((tag) => ({
          title: tag.title,
          color: tag.color,
          icon: tag.icon,
        })),
      );

      if (!result.ok) {
        throw new Error(result.message);
      }

      toast.success("Detachment tags saved");
      setTags(result.data);
      onClose();
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to save detachment tags");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(nextOpen) => !nextOpen && onClose()}>
      <DialogContent className="flex max-h-[90vh] flex-col sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Tags className="size-4" />
            Edit detachment tags
          </DialogTitle>
          <DialogDescription>
            Configure badge colours and optional Lucide icons for each current ORBAT detachment.
            Members show the tag that matches their assignment.
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center gap-2 py-16 text-muted-foreground">
            <Spinner />
            <span>Loading detachments...</span>
          </div>
        ) : tags.length ? (
          <div className="min-h-0 flex-1 space-y-3 overflow-y-auto pr-1">
            {tags.map((tag, index) => (
              <div
                key={tag.title}
                className="rounded-xl border border-border/80 bg-card/40 p-4"
              >
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0 space-y-1">
                    <p className="font-medium">{tag.title}</p>
                    <p className="text-xs text-muted-foreground">{tag.categoryTitle}</p>
                    <DetachmentTagBadge
                      title={tag.title}
                      color={tag.color}
                      icon={tag.icon}
                      className="mt-2"
                    />
                  </div>

                  <div className="grid w-full gap-3 sm:max-w-xs">
                    <div className="space-y-2">
                      <Label htmlFor={`tag-color-${index}`}>Colour</Label>
                      <div className="flex items-center gap-2">
                        <Input
                          id={`tag-color-${index}`}
                          type="color"
                          value={/^#[0-9a-fA-F]{6}$/.test(tag.color) ? tag.color : "#334155"}
                          onChange={(event) => updateTag(index, { color: event.target.value })}
                          className="h-9 w-14 shrink-0 cursor-pointer p-1"
                        />
                        <Input
                          value={tag.color}
                          onChange={(event) => updateTag(index, { color: event.target.value })}
                          placeholder="#2563eb"
                          className="font-mono text-xs"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label>Icon (optional)</Label>
                      <LucideIconPicker
                        value={tag.icon}
                        onChange={(icon) => updateTag(index, { icon })}
                      />
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="rounded-xl border border-dashed border-border/80 px-4 py-12 text-center text-sm text-muted-foreground">
            No ORBAT detachments found. Add groups in the ORBAT editor first.
          </div>
        )}

        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button type="button" onClick={() => void handleSave()} disabled={saving || loading || !tags.length}>
            {saving ? "Saving..." : "Save tags"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

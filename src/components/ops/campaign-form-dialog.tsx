"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "@/lib/toast";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { DatePicker04 } from "@/components/shadcn-studio/date-picker/date-picker-04";
import { ASSET_LINK_STATUSES, CAMPAIGN_PROGRESS_VALUES } from "@/lib/ops/constants";
import type { CampaignIntelRow, CampaignLinkedAsset, LegacyCampaign } from "@/lib/ops/types";
import type { LoreAsset } from "@/lib/lore/types";
import { requestJson } from "@/lib/client/request-json";

type CampaignFormDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  campaign?: LegacyCampaign | null;
  loreAssets: LoreAsset[];
  onSaved: () => void;
};

const emptyCampaign = {
  id: "",
  title: "",
  slug: "",
  startDate: "",
  endDate: "",
  loreDate: "",
  progress: "Planned",
  overview: "",
  hostileStrengthLevel: "",
  hostileAssets: "",
  sector: "",
  environmentalThreats: "",
  linkedAssets: [] as CampaignLinkedAsset[],
  additionalIntel: [] as CampaignIntelRow[],
};

export function CampaignFormDialog({
  open,
  onOpenChange,
  campaign,
  loreAssets,
  onSaved,
}: CampaignFormDialogProps) {
  const [form, setForm] = useState(emptyCampaign);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const isEdit = Boolean(form.id);

  const assetOptions = useMemo(
    () => [...loreAssets].sort((a, b) => a.title.localeCompare(b.title)),
    [loreAssets],
  );

  const assetTitleById = useMemo(
    () => new Map(assetOptions.map((asset) => [asset.id, asset.title])),
    [assetOptions],
  );

  useEffect(() => {
    if (!open) return;
    if (campaign) {
      setForm({
        id: campaign.id,
        title: campaign.title,
        slug: campaign.slug,
        startDate: campaign.startDate,
        endDate: campaign.endDate,
        loreDate: campaign.loreDate,
        progress: campaign.progress || "Planned",
        overview: campaign.overview,
        hostileStrengthLevel: campaign.hostileStrengthLevel,
        hostileAssets: campaign.hostileAssets,
        sector: campaign.sector,
        environmentalThreats: campaign.environmentalThreats,
        linkedAssets: campaign.linkedAssets ?? [],
        additionalIntel: campaign.additionalIntel ?? [],
      });
    } else {
      setForm(emptyCampaign);
    }
    setError("");
  }, [open, campaign]);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError("");

    try {
      const url = isEdit ? "/api/ops/campaigns/edit" : "/api/ops/campaigns";
      await requestJson(url, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(form),
      });
      toast.success(isEdit ? "Campaign updated" : "Campaign created");
      onOpenChange(false);
      onSaved();
    } catch (submitError) {
      const message =
        submitError instanceof Error ? submitError.message : "Failed to save campaign";
      setError(message);
    } finally {
      setSaving(false);
    }
  }

  function updateLinkedAsset(index: number, patch: Partial<CampaignLinkedAsset>) {
    setForm((current) => ({
      ...current,
      linkedAssets: current.linkedAssets.map((row, rowIndex) =>
        rowIndex === index ? { ...row, ...patch } : row,
      ),
    }));
  }

  function addLinkedAsset() {
    setForm((current) => ({
      ...current,
      linkedAssets: [...current.linkedAssets, { assetId: "", status: "Unknown" }],
    }));
  }

  function removeLinkedAsset(index: number) {
    setForm((current) => ({
      ...current,
      linkedAssets: current.linkedAssets.filter((_, rowIndex) => rowIndex !== index),
    }));
  }

  function updateIntelRow(index: number, patch: Partial<CampaignIntelRow>) {
    setForm((current) => ({
      ...current,
      additionalIntel: current.additionalIntel.map((row, rowIndex) =>
        rowIndex === index ? { ...row, ...patch } : row,
      ),
    }));
  }

  function addIntelRow() {
    setForm((current) => ({
      ...current,
      additionalIntel: [...current.additionalIntel, { label: "", value: "" }],
    }));
  }

  function removeIntelRow(index: number) {
    setForm((current) => ({
      ...current,
      additionalIntel: current.additionalIntel.filter((_, rowIndex) => rowIndex !== index),
    }));
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] max-w-[calc(100%-2rem)] gap-5 overflow-y-auto p-6 sm:max-w-5xl">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit campaign" : "Create campaign"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          {error ? <p className="text-sm text-destructive">{error}</p> : null}

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="camp-title">Title</Label>
              <Input
                id="camp-title"
                value={form.title}
                onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="camp-slug">URL slug</Label>
              <Input
                id="camp-slug"
                value={form.slug}
                onChange={(event) => setForm((current) => ({ ...current, slug: event.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label>Progress</Label>
              <Select
                value={form.progress}
                onValueChange={(value) =>
                  setForm((current) => ({ ...current, progress: value ?? "Planned" }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CAMPAIGN_PROGRESS_VALUES.map((value) => (
                    <SelectItem key={value} value={value}>
                      {value}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="camp-start">Start date</Label>
              <DatePicker04
                id="camp-start"
                value={form.startDate}
                onValueChange={(value) =>
                  setForm((current) => ({ ...current, startDate: value }))
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="camp-end">End date</Label>
              <DatePicker04
                id="camp-end"
                value={form.endDate}
                onValueChange={(value) =>
                  setForm((current) => ({ ...current, endDate: value }))
                }
              />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="camp-lore">Lore date</Label>
              <DatePicker04
                id="camp-lore"
                value={form.loreDate}
                onValueChange={(value) =>
                  setForm((current) => ({ ...current, loreDate: value }))
                }
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="camp-overview">Overview</Label>
            <Textarea
              id="camp-overview"
              value={form.overview}
              onChange={(event) =>
                setForm((current) => ({ ...current, overview: event.target.value }))
              }
              rows={5}
            />
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="camp-hostile-level">Hostile strength level</Label>
              <Input
                id="camp-hostile-level"
                value={form.hostileStrengthLevel}
                onChange={(event) =>
                  setForm((current) => ({ ...current, hostileStrengthLevel: event.target.value }))
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="camp-sector">Sector</Label>
              <Input
                id="camp-sector"
                value={form.sector}
                onChange={(event) =>
                  setForm((current) => ({ ...current, sector: event.target.value }))
                }
              />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="camp-hostile-assets">Hostile assets</Label>
              <Textarea
                id="camp-hostile-assets"
                value={form.hostileAssets}
                onChange={(event) =>
                  setForm((current) => ({ ...current, hostileAssets: event.target.value }))
                }
                rows={4}
              />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="camp-threats">Environmental threats</Label>
              <Textarea
                id="camp-threats"
                value={form.environmentalThreats}
                onChange={(event) =>
                  setForm((current) => ({ ...current, environmentalThreats: event.target.value }))
                }
                rows={4}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Attached assets (unit lore)</Label>
            {form.linkedAssets.map((row, index) => (
              <div key={`linked-${index}`} className="ops-intel-row">
                <Select
                  value={row.assetId || "__none__"}
                  onValueChange={(value) =>
                    updateLinkedAsset(index, {
                      assetId: !value || value === "__none__" ? "" : value,
                    })
                  }
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select asset">
                      {row.assetId ? assetTitleById.get(row.assetId) : undefined}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">— Select —</SelectItem>
                    {assetOptions.map((asset) => (
                      <SelectItem key={asset.id} value={asset.id}>
                        {asset.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select
                  value={row.status}
                  onValueChange={(value) =>
                    updateLinkedAsset(index, { status: value ?? "Unknown" })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ASSET_LINK_STATUSES.map((status) => (
                      <SelectItem key={status} value={status}>
                        {status}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button type="button" variant="outline" onClick={() => removeLinkedAsset(index)}>
                  Remove
                </Button>
              </div>
            ))}
            <Button type="button" variant="outline" onClick={addLinkedAsset}>
              Add asset link
            </Button>
          </div>

          <div className="space-y-2">
            <Label>Additional intel</Label>
            {form.additionalIntel.map((row, index) => (
              <div key={`intel-${index}`} className="ops-intel-row">
                <Input
                  placeholder="Label"
                  value={row.label}
                  onChange={(event) => updateIntelRow(index, { label: event.target.value })}
                />
                <Input
                  placeholder="Value"
                  value={row.value}
                  onChange={(event) => updateIntelRow(index, { value: event.target.value })}
                />
                <Button type="button" variant="outline" onClick={() => removeIntelRow(index)}>
                  Remove
                </Button>
              </div>
            ))}
            <Button type="button" variant="outline" onClick={addIntelRow}>
              Add intel row
            </Button>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? "Saving…" : "Save"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

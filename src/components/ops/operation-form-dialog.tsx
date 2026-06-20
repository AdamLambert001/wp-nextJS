"use client";

import { useEffect, useState } from "react";
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
import { BASE_DEFAULT_OP_META, BASE_TERRAIN_CONDITIONS } from "@/lib/ops/constants";
import type { LegacyCampaign, LegacyOperation } from "@/lib/ops/types";
import { requestJson } from "@/lib/client/request-json";

type OperationFormDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  campaigns: LegacyCampaign[];
  operation?: LegacyOperation | null;
  onSaved: () => void;
};

const emptyForm = {
  originalSlug: "",
  Operationtitle: "",
  opfreindlyname: "",
  campaignId: "",
  postDate: "",
  loreDate: "",
  planet: BASE_DEFAULT_OP_META.planet as string,
  sector: BASE_DEFAULT_OP_META.sector as string,
  opposingforce: BASE_DEFAULT_OP_META.opposingforce as string,
  missionstatement: "",
  opdescription: "",
  mainobjective: "",
  secondaryobjective: "",
  optionalobjectives: "",
  environmentalElements: BASE_TERRAIN_CONDITIONS.environmentalElements as string,
  timeOfDay: BASE_TERRAIN_CONDITIONS.timeOfDay as string,
  terrain: BASE_TERRAIN_CONDITIONS.terrain as string,
  localsPresence: BASE_TERRAIN_CONDITIONS.localsPresence as string,
  planopsLink: BASE_TERRAIN_CONDITIONS.planopsLink as string,
};

export function OperationFormDialog({
  open,
  onOpenChange,
  campaigns,
  operation,
  onSaved,
}: OperationFormDialogProps) {
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const isEdit = Boolean(form.originalSlug);

  useEffect(() => {
    if (!open) return;
    if (operation) {
      const terrain = operation.terrainConditions ?? BASE_TERRAIN_CONDITIONS;
      setForm({
        originalSlug: operation.opfreindlyname,
        Operationtitle: operation.Operationtitle,
        opfreindlyname: operation.opfreindlyname,
        campaignId: operation.campaignId ?? "",
        postDate: operation.postDate ?? "",
        loreDate: operation.loreDate ?? "",
        planet: operation.planet || BASE_DEFAULT_OP_META.planet,
        sector: operation.sector || BASE_DEFAULT_OP_META.sector,
        opposingforce: operation.opposingforce || BASE_DEFAULT_OP_META.opposingforce,
        missionstatement: operation.missionstatement,
        opdescription: operation.opdescription,
        mainobjective: operation.mainobjective,
        secondaryobjective: operation.secondaryobjective,
        optionalobjectives: (operation.optionalobjectives ?? []).join("\n"),
        environmentalElements: terrain.environmentalElements,
        timeOfDay: terrain.timeOfDay,
        terrain: terrain.terrain,
        localsPresence: terrain.localsPresence,
        planopsLink: terrain.planopsLink,
      });
    } else {
      setForm(emptyForm);
    }
    setError("");
  }, [open, operation]);

  function updateField<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError("");

    const payload = {
      ...form,
      campaignId: form.campaignId || "",
      optionalobjectives: form.optionalobjectives,
    };

    try {
      const url = isEdit ? "/api/ops/edit" : "/api/ops";
      const body = isEdit ? { ...payload, originalSlug: form.originalSlug } : payload;
      await requestJson(url, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      });
      toast.success(isEdit ? "Operation updated" : "Operation created");
      onOpenChange(false);
      onSaved();
    } catch (submitError) {
      const message =
        submitError instanceof Error ? submitError.message : "Failed to save operation";
      setError(message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] max-w-[calc(100%-2rem)] gap-5 overflow-y-auto p-6 sm:max-w-5xl">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit operation" : "New operation"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          {error ? <p className="text-sm text-destructive">{error}</p> : null}

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="op-title">Operation title</Label>
              <Input
                id="op-title"
                value={form.Operationtitle}
                onChange={(event) => updateField("Operationtitle", event.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="op-slug">URL slug</Label>
              <Input
                id="op-slug"
                value={form.opfreindlyname}
                onChange={(event) => updateField("opfreindlyname", event.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label>Campaign</Label>
              <Select
                value={form.campaignId || "__none__"}
                onValueChange={(value) =>
                  updateField("campaignId", !value || value === "__none__" ? "" : value)
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Unassigned" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">— Unassigned —</SelectItem>
                  {campaigns.map((campaign) => (
                    <SelectItem key={campaign.id} value={campaign.id}>
                      {campaign.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="op-post-date">Post date</Label>
              <DatePicker04
                id="op-post-date"
                value={form.postDate}
                onValueChange={(value) => updateField("postDate", value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="op-lore-date">Lore date</Label>
              <DatePicker04
                id="op-lore-date"
                value={form.loreDate}
                onValueChange={(value) => updateField("loreDate", value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="op-planet">Planet</Label>
              <Input
                id="op-planet"
                value={form.planet}
                onChange={(event) => updateField("planet", event.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="op-sector">Sector</Label>
              <Input
                id="op-sector"
                value={form.sector}
                onChange={(event) => updateField("sector", event.target.value)}
              />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="op-opposing">Opposing force</Label>
              <Input
                id="op-opposing"
                value={form.opposingforce}
                onChange={(event) => updateField("opposingforce", event.target.value)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="op-mission">Mission statement</Label>
            <Textarea
              id="op-mission"
              value={form.missionstatement}
              onChange={(event) => updateField("missionstatement", event.target.value)}
              rows={4}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="op-briefing">Briefing / description</Label>
            <Textarea
              id="op-briefing"
              value={form.opdescription}
              onChange={(event) => updateField("opdescription", event.target.value)}
              rows={5}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="op-main">Main objective</Label>
            <Textarea
              id="op-main"
              value={form.mainobjective}
              onChange={(event) => updateField("mainobjective", event.target.value)}
              rows={3}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="op-secondary">Secondary objective</Label>
            <Textarea
              id="op-secondary"
              value={form.secondaryobjective}
              onChange={(event) => updateField("secondaryobjective", event.target.value)}
              rows={3}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="op-optional">Optional objectives (one per line)</Label>
            <Textarea
              id="op-optional"
              value={form.optionalobjectives}
              onChange={(event) => updateField("optionalobjectives", event.target.value)}
              rows={4}
            />
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="op-env">Environment</Label>
              <Textarea
                id="op-env"
                value={form.environmentalElements}
                onChange={(event) => updateField("environmentalElements", event.target.value)}
                rows={3}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="op-time">Local time</Label>
              <Input
                id="op-time"
                value={form.timeOfDay}
                onChange={(event) => updateField("timeOfDay", event.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="op-terrain">Terrain</Label>
              <Textarea
                id="op-terrain"
                value={form.terrain}
                onChange={(event) => updateField("terrain", event.target.value)}
                rows={3}
              />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="op-locals">Civilian presence</Label>
              <Textarea
                id="op-locals"
                value={form.localsPresence}
                onChange={(event) => updateField("localsPresence", event.target.value)}
                rows={3}
              />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="op-link">Command link</Label>
              <Input
                id="op-link"
                value={form.planopsLink}
                onChange={(event) => updateField("planopsLink", event.target.value)}
              />
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? "Saving…" : isEdit ? "Save changes" : "Create"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

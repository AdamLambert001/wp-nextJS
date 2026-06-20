"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "@/lib/toast";
import { ServiceRecordFieldSelect } from "@/components/admin/service-record-field-select";
import { useServiceRecordFormOptions } from "@/components/admin/use-service-record-form-options";
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
import { Switch } from "@/components/ui/switch";
import { DatePicker04 } from "@/components/shadcn-studio/date-picker/date-picker-04";
import { createServiceRecordAction } from "@/app/admin/actions/service-records";
import { todayIsoDate } from "@/lib/admin/service-record-actions/display-utils";
import { isDiscordSnowflake } from "@/lib/rbac/panel-roles";

type ServiceRecordCreateDialogProps = {
  open: boolean;
  onClose: () => void;
};

type CreateFormState = {
  id: string;
  displayName: string;
  firstName: string;
  lastName: string;
  rank: string;
  assignment: string;
  dateJoined: string;
  isProfilePublic: boolean;
};

function createEmptyForm(): CreateFormState {
  return {
    id: "",
    displayName: "",
    firstName: "",
    lastName: "",
    rank: "",
    assignment: "",
    dateJoined: todayIsoDate(),
    isProfilePublic: true,
  };
}

export function ServiceRecordCreateDialog({ open, onClose }: ServiceRecordCreateDialogProps) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<CreateFormState>(createEmptyForm);
  const { rankOptions, detachmentOptions, loading: optionsLoading } =
    useServiceRecordFormOptions(open);

  useEffect(() => {
    if (open) {
      setForm(createEmptyForm());
    }
  }, [open]);

  function updateField<K extends keyof CreateFormState>(key: K, value: CreateFormState[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function handleClose() {
    setForm(createEmptyForm());
    onClose();
  }

  async function handleCreate() {
    const id = form.id.trim();
    if (!id) {
      toast.error("Enter a record ID before creating.");
      return;
    }

    if (!isDiscordSnowflake(id)) {
      toast.error("Record ID must be a valid Discord numeric ID.");
      return;
    }

    setSaving(true);
    try {
      const result = await createServiceRecordAction({
        id,
        displayName: form.displayName.trim() || null,
        firstName: form.firstName.trim() || null,
        lastName: form.lastName.trim() || null,
        rank: form.rank.trim() || null,
        assignment: form.assignment.trim() || null,
        position: null,
        primaryMOS: null,
        unit: null,
        isProfilePublic: form.isProfilePublic,
        operationCount: 0,
        coolDown: 0,
        datePromoted: null,
        dateJoined: form.dateJoined.trim() || todayIsoDate(),
        avatarUrl: null,
        bio: null,
        specialties: null,
        timezone: null,
        awards: [],
        trainings: [],
        campaignRib: [],
      });

      if (!result.ok) {
        throw new Error(result.message);
      }

      const label =
        form.displayName.trim() ||
        [form.firstName.trim(), form.lastName.trim()].filter(Boolean).join(" ") ||
        id;
      toast.success(`Service record created for ${label}`);
      handleClose();
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to create service record");
    } finally {
      setSaving(false);
    }
  }

  const selectsDisabled = saving || optionsLoading;

  return (
    <Dialog open={open} onOpenChange={(nextOpen) => !nextOpen && handleClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Create service record</DialogTitle>
          <DialogDescription>
            Add a new personnel record. The record ID should match the member&apos;s Discord ID so
            panel roles and avatars can link correctly.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <Field label="Record ID (Discord ID)">
            <Input
              value={form.id}
              onChange={(event) => updateField("id", event.target.value)}
              placeholder="Discord snowflake ID"
              className="font-mono"
            />
          </Field>

          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="First name">
              <Input
                value={form.firstName}
                onChange={(event) => updateField("firstName", event.target.value)}
              />
            </Field>
            <Field label="Last name">
              <Input
                value={form.lastName}
                onChange={(event) => updateField("lastName", event.target.value)}
              />
            </Field>
          </div>

          <Field label="Display name (nickname)">
            <Input
              value={form.displayName}
              onChange={(event) => updateField("displayName", event.target.value)}
            />
          </Field>

          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Rank">
              <ServiceRecordFieldSelect
                value={form.rank || null}
                onValueChange={(value) => updateField("rank", value ?? "")}
                options={rankOptions}
                placeholder={optionsLoading ? "Loading ranks..." : "Select rank"}
                disabled={selectsDisabled}
              />
            </Field>
            <Field label="Detachment">
              <ServiceRecordFieldSelect
                value={form.assignment || null}
                onValueChange={(value) => updateField("assignment", value ?? "")}
                options={detachmentOptions}
                placeholder={optionsLoading ? "Loading detachments..." : "Select detachment"}
                disabled={selectsDisabled}
              />
            </Field>
          </div>

          <Field label="Date joined">
            <DatePicker04
              id="create-date-joined"
              value={form.dateJoined}
              onValueChange={(value) => updateField("dateJoined", value || todayIsoDate())}
            />
          </Field>

          <label className="flex items-center justify-between rounded-lg border border-border/70 p-3">
            <span className="space-y-1">
              <span className="block text-sm font-medium">Public profile</span>
              <span className="block text-xs text-muted-foreground">
                Show this member in the public profile directory.
              </span>
            </span>
            <Switch
              checked={form.isProfilePublic}
              onCheckedChange={(checked) => updateField("isProfilePublic", checked)}
            />
          </label>
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={handleClose} disabled={saving}>
            Cancel
          </Button>
          <Button
            type="button"
            onClick={() => void handleCreate()}
            disabled={saving}
            className="bg-orange-500 text-white hover:bg-orange-600"
          >
            {saving ? "Creating..." : "Create record"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      {children}
    </div>
  );
}

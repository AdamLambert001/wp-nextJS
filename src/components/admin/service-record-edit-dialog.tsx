"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "@/lib/toast";
import { ServiceRecordFieldSelect } from "@/components/admin/service-record-field-select";
import { useServiceRecordFormOptions } from "@/components/admin/use-service-record-form-options";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
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
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { DatePicker04 } from "@/components/shadcn-studio/date-picker/date-picker-04";
import {
  deleteServiceRecordAction,
  loadServiceRecordDetailAction,
  updateServiceRecordAction,
} from "@/app/admin/actions/service-records";
import type { ServiceRecordDetail } from "@/lib/admin/service-record-detail";
import type { AwardTuple } from "@/lib/profile/types";

type ServiceRecordEditDialogProps = {
  recordId: string | null;
  displayName: string;
  canDeleteRecord: boolean;
  onClose: () => void;
};

type FormState = ServiceRecordDetail;

function emptyForm(id: string): FormState {
  return {
    id,
    displayName: null,
    firstName: null,
    lastName: null,
    rank: null,
    assignment: null,
    position: null,
    primaryMOS: null,
    unit: null,
    operationCount: 0,
    coolDown: 0,
    datePromoted: null,
    dateJoined: null,
    avatarUrl: null,
    bio: null,
    specialties: null,
    timezone: null,
    isProfilePublic: true,
    awards: [],
    trainings: [],
    campaignRib: [],
  };
}

function toJsonText(value: unknown): string {
  return JSON.stringify(value, null, 2);
}

function parseJsonField(label: string, value: string): unknown {
  const trimmed = value.trim();
  if (!trimmed) return [];
  try {
    return JSON.parse(trimmed) as unknown;
  } catch {
    throw new Error(`${label} must be valid JSON.`);
  }
}

export function ServiceRecordEditDialog({
  recordId,
  displayName,
  canDeleteRecord,
  onClose,
}: ServiceRecordEditDialogProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [form, setForm] = useState<FormState | null>(null);
  const [awardsJson, setAwardsJson] = useState("[]");
  const [trainingsJson, setTrainingsJson] = useState("[]");
  const [campaignRibJson, setCampaignRibJson] = useState("[]");
  const { rankOptions, detachmentOptions, loading: optionsLoading } =
    useServiceRecordFormOptions(Boolean(recordId));

  useEffect(() => {
    if (!recordId) {
      setForm(null);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setForm(emptyForm(recordId));

    void (async () => {
      try {
        const result = await loadServiceRecordDetailAction(recordId);

        if (!result.ok) {
          throw new Error(result.message);
        }

        if (!cancelled) {
          setForm(result.data);
          setAwardsJson(toJsonText(result.data.awards));
          setTrainingsJson(toJsonText(result.data.trainings));
          setCampaignRibJson(toJsonText(result.data.campaignRib));
        }
      } catch (error) {
        if (!cancelled) {
          toast.error(error instanceof Error ? error.message : "Failed to load service record");
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
  }, [onClose, recordId]);

  function updateField<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((current) => (current ? { ...current, [key]: value } : current));
  }

  async function handleSave() {
    if (!form || !recordId) return;

    setSaving(true);
    try {
      const payload = {
        displayName: form.displayName,
        firstName: form.firstName,
        lastName: form.lastName,
        rank: form.rank,
        assignment: form.assignment,
        position: form.position,
        primaryMOS: form.primaryMOS,
        unit: form.unit,
        operationCount: form.operationCount,
        coolDown: form.coolDown,
        datePromoted: form.datePromoted,
        dateJoined: form.dateJoined,
        avatarUrl: form.avatarUrl,
        bio: form.bio,
        specialties: form.specialties,
        timezone: form.timezone,
        isProfilePublic: form.isProfilePublic,
        awards: parseJsonField("Awards", awardsJson) as AwardTuple[],
        trainings: parseJsonField("Trainings", trainingsJson) as string[],
        campaignRib: parseJsonField("Campaign ribbons", campaignRibJson) as AwardTuple[],
      };

      const result = await updateServiceRecordAction(recordId, payload);
      if (!result.ok) {
        throw new Error(result.message);
      }

      toast.success(`Service record updated for ${displayName}`);
      onClose();
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to save service record");
    } finally {
      setSaving(false);
    }
  }

  async function confirmDelete() {
    if (!recordId) return;

    setDeleting(true);
    try {
      const result = await deleteServiceRecordAction(recordId);
      if (!result.ok) {
        throw new Error(result.message);
      }

      toast.success(`Service record deleted for ${displayName}`);
      setDeleteDialogOpen(false);
      onClose();
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to delete service record");
    } finally {
      setDeleting(false);
    }
  }

  const busy = saving || deleting;

  return (
    <>
    <Dialog open={Boolean(recordId)} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="flex max-h-[90vh] flex-col sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>Edit service record</DialogTitle>
          <DialogDescription>
            Update every field for{" "}
            <span className="font-medium text-foreground">{displayName}</span>.
          </DialogDescription>
        </DialogHeader>

        {loading || !form ? (
          <div className="flex items-center justify-center gap-2 py-16 text-muted-foreground">
            <Spinner />
            <span>Loading service record...</span>
          </div>
        ) : (
          <div className="min-h-0 flex-1 space-y-6 overflow-y-auto pr-1">
            <section className="space-y-3">
              <h3 className="text-sm font-semibold">Identity</h3>
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Record ID">
                  <Input value={form.id} readOnly className="font-mono" />
                </Field>
                <Field label="Display name">
                  <Input
                    value={form.displayName ?? ""}
                    onChange={(event) => updateField("displayName", event.target.value || null)}
                  />
                </Field>
                <Field label="First name">
                  <Input
                    value={form.firstName ?? ""}
                    onChange={(event) => updateField("firstName", event.target.value || null)}
                  />
                </Field>
                <Field label="Last name">
                  <Input
                    value={form.lastName ?? ""}
                    onChange={(event) => updateField("lastName", event.target.value || null)}
                  />
                </Field>
              </div>
            </section>

            <section className="space-y-3">
              <h3 className="text-sm font-semibold">Service</h3>
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Rank">
                  <ServiceRecordFieldSelect
                    value={form.rank}
                    onValueChange={(value) => updateField("rank", value)}
                    options={rankOptions}
                    placeholder={optionsLoading ? "Loading ranks..." : "Select rank"}
                    disabled={saving || optionsLoading}
                  />
                </Field>
                <Field label="Detachment">
                  <ServiceRecordFieldSelect
                    value={form.assignment}
                    onValueChange={(value) => updateField("assignment", value)}
                    options={detachmentOptions}
                    placeholder={optionsLoading ? "Loading detachments..." : "Select detachment"}
                    disabled={saving || optionsLoading}
                  />
                </Field>
                <Field label="Position">
                  <Input
                    value={form.position ?? ""}
                    onChange={(event) => updateField("position", event.target.value || null)}
                  />
                </Field>
                <Field label="Primary MOS">
                  <Input
                    value={form.primaryMOS ?? ""}
                    onChange={(event) => updateField("primaryMOS", event.target.value || null)}
                  />
                </Field>
                <Field label="Unit">
                  <Input
                    value={form.unit ?? ""}
                    onChange={(event) => updateField("unit", event.target.value || null)}
                  />
                </Field>
                <Field label="Timezone">
                  <Input
                    value={form.timezone ?? ""}
                    onChange={(event) => updateField("timezone", event.target.value || null)}
                  />
                </Field>
                <Field label="Specialties">
                  <Input
                    value={form.specialties ?? ""}
                    onChange={(event) => updateField("specialties", event.target.value || null)}
                  />
                </Field>
                <Field label="Avatar URL">
                  <Input
                    value={form.avatarUrl ?? ""}
                    onChange={(event) => updateField("avatarUrl", event.target.value || null)}
                  />
                </Field>
              </div>
            </section>

            <section className="space-y-3">
              <h3 className="text-sm font-semibold">Status</h3>
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Operations logged">
                  <Input
                    type="number"
                    min={0}
                    value={form.operationCount}
                    onChange={(event) =>
                      updateField("operationCount", Number(event.target.value) || 0)
                    }
                  />
                </Field>
                <Field label="Cooldown">
                  <Input
                    type="number"
                    min={0}
                    value={form.coolDown}
                    onChange={(event) => updateField("coolDown", Number(event.target.value) || 0)}
                  />
                </Field>
                <Field label="Date promoted">
                  <DatePicker04
                    id="date-promoted"
                    value={form.datePromoted ?? ""}
                    onValueChange={(value) => updateField("datePromoted", value || null)}
                  />
                </Field>
                <Field label="Date joined">
                  <DatePicker04
                    id="date-joined"
                    value={form.dateJoined ?? ""}
                    onValueChange={(value) => updateField("dateJoined", value || null)}
                  />
                </Field>
              </div>
              <label className="flex items-center justify-between rounded-lg border border-border/70 p-3">
                <span className="space-y-1">
                  <span className="block text-sm font-medium">Public profile</span>
                  <span className="block text-xs text-muted-foreground">
                    When enabled, this record appears in the public profile directory.
                  </span>
                </span>
                <Switch
                  checked={form.isProfilePublic}
                  onCheckedChange={(checked) => updateField("isProfilePublic", checked)}
                />
              </label>
            </section>

            <section className="space-y-3">
              <h3 className="text-sm font-semibold">Bio</h3>
              <Textarea
                value={form.bio ?? ""}
                onChange={(event) => updateField("bio", event.target.value || null)}
                rows={4}
              />
            </section>

            <section className="space-y-3">
              <h3 className="text-sm font-semibold">Structured data</h3>
              <Field label="Awards (JSON array of [slug, YYYY-MM-DD])">
                <Textarea
                  value={awardsJson}
                  onChange={(event) => setAwardsJson(event.target.value)}
                  rows={4}
                  className="font-mono text-xs"
                />
              </Field>
              <Field label="Trainings (JSON array of slugs)">
                <Textarea
                  value={trainingsJson}
                  onChange={(event) => setTrainingsJson(event.target.value)}
                  rows={4}
                  className="font-mono text-xs"
                />
              </Field>
              <Field label="Campaign ribbons (JSON array of [slug, YYYY-MM-DD])">
                <Textarea
                  value={campaignRibJson}
                  onChange={(event) => setCampaignRibJson(event.target.value)}
                  rows={4}
                  className="font-mono text-xs"
                />
              </Field>
            </section>
          </div>
        )}

        <DialogFooter className="gap-2 sm:justify-between">
          {canDeleteRecord ? (
            <Button
              type="button"
              variant="destructive"
              onClick={() => setDeleteDialogOpen(true)}
              disabled={busy || loading || !form}
            >
              Delete record
            </Button>
          ) : (
            <span />
          )}
          <div className="flex flex-wrap justify-end gap-2">
            <Button type="button" variant="outline" onClick={onClose} disabled={busy}>
              Cancel
            </Button>
            <Button
              type="button"
              onClick={() => void handleSave()}
              disabled={busy || loading || !form}
              className="bg-orange-500 text-white hover:bg-orange-600"
            >
              {saving ? "Saving..." : "Save changes"}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    <AlertDialog
      open={deleteDialogOpen}
      onOpenChange={(open) => !deleting && setDeleteDialogOpen(open)}
    >
      <AlertDialogContent size="default" className="sm:max-w-md">
        <AlertDialogHeader>
          <AlertDialogTitle>Delete service record?</AlertDialogTitle>
          <AlertDialogDescription className="text-left">
            This permanently deletes the service record for{" "}
            <span className="font-medium text-foreground">{displayName}</span>, including profile
            activity logs, operation attendance links, and panel roles tied to this Discord ID. This
            cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            variant="destructive"
            disabled={deleting}
            onClick={(event) => {
              event.preventDefault();
              void confirmDelete();
            }}
          >
            {deleting ? "Deleting..." : "Delete record"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
    </>
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

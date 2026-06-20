"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "@/lib/toast";
import { OpsMarkdown } from "@/components/ops/ops-markdown";
import { OpsShell } from "@/components/ops/ops-shell";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
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
import { Spinner } from "@/components/ui/spinner";
import { requestJson } from "@/lib/client/request-json";
import type { OrbatSettings } from "@/lib/orbat/types";
import type { LegacyOperation, OpsCapabilities } from "@/lib/ops/types";
import type { PublicProfileRow } from "@/lib/profile/types";

type OperationResponse = { ok: boolean; operation?: LegacyOperation; message?: string };
type ProfilesResponse = { ok: boolean; rows?: PublicProfileRow[] };
type AttendeeCandidatesResponse = {
  ok: boolean;
  users?: Array<{
    id: string;
    displayName: string;
    firstName: string;
    lastName: string;
    rank: string;
  }>;
  orbatSettings?: OrbatSettings;
};

function composeAttendeeLabel(row: {
  id: string;
  displayName: string;
  firstName: string;
  lastName: string;
}) {
  const firstInitialSource = row.firstName || row.displayName;
  const firstInitial = firstInitialSource
    ? `${firstInitialSource.charAt(0).toUpperCase()}.`
    : "";
  const nickname = row.displayName ? `"${row.displayName}"` : "";
  const parts = [firstInitial, nickname, row.lastName].filter(Boolean);
  return parts.length ? parts.join(" ") : row.id;
}

export function OperationDetailBoard({ slug }: { slug: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [operation, setOperation] = useState<LegacyOperation | null>(null);
  const [capabilities, setCapabilities] = useState<OpsCapabilities | null>(null);
  const [profileNames, setProfileNames] = useState<Map<string, string>>(new Map());
  const [attendeeDialogOpen, setAttendeeDialogOpen] = useState(false);
  const [attendeeSearch, setAttendeeSearch] = useState("");
  const [orbatFilter, setOrbatFilter] = useState("");
  const [candidateUsers, setCandidateUsers] = useState<AttendeeCandidatesResponse["users"]>([]);
  const [orbatSettings, setOrbatSettings] = useState<OrbatSettings | null>(null);
  const [pickedAttendees, setPickedAttendees] = useState<Set<string>>(new Set());
  const [savingAttendees, setSavingAttendees] = useState(false);

  const canManage = Boolean(capabilities?.canManageOps);

  const loadOperation = useCallback(async () => {
    const [opData, capData, profilesData] = await Promise.all([
      requestJson<OperationResponse>(`/api/ops/${encodeURIComponent(slug)}`),
      requestJson<OpsCapabilities & { ok: boolean }>("/api/ops/capabilities").catch(() => null),
      requestJson<ProfilesResponse>("/api/profiles").catch(() => null),
    ]);

    setOperation(opData.operation ?? null);
    if (capData) setCapabilities(capData);

    const nameMap = new Map<string, string>();
    for (const row of profilesData?.rows ?? []) {
      const label =
        row.profileDisplayName ||
        [row.firstName, row.lastName].filter(Boolean).join(" ") ||
        row.displayName ||
        row.id;
      nameMap.set(row.id, label);
    }
    setProfileNames(nameMap);
  }, [slug]);

  useEffect(() => {
    loadOperation()
      .catch((error) => {
        toast.error(error instanceof Error ? error.message : "Failed to load operation");
      })
      .finally(() => setLoading(false));
  }, [loadOperation]);

  const attendeeLabels = useMemo(() => {
    const ids = operation?.attendees ?? [];
    return ids.map((id) => profileNames.get(id) || id);
  }, [operation, profileNames]);

  const orbatSections = useMemo(() => {
    const sections: Array<{ key: string; label: string; memberIds: Set<string> }> = [];
    for (const [catIndex, category] of (orbatSettings?.categories ?? []).entries()) {
      for (const [groupIndex, group] of (category.groups ?? []).entries()) {
        const memberIds = new Set<string>();
        for (const row of group.rows ?? []) {
          const userId = String(row.assignedUserId ?? "").trim();
          if (userId && userId !== "__orbat_open__") memberIds.add(userId);
        }
        if (!memberIds.size) continue;
        const label =
          category.title && group.title
            ? `${category.title} / ${group.title}`
            : group.title || category.title || `Section ${catIndex + 1}-${groupIndex + 1}`;
        sections.push({
          key: `${category.id}|${group.id}|${catIndex}|${groupIndex}`,
          label,
          memberIds,
        });
      }
    }
    return sections.sort((a, b) => a.label.localeCompare(b.label));
  }, [orbatSettings]);

  const filteredCandidates = useMemo(() => {
    const query = attendeeSearch.trim().toLowerCase();
    const filterSet = orbatFilter
      ? orbatSections.find((section) => section.key === orbatFilter)?.memberIds
      : null;

    return (candidateUsers ?? []).filter((user) => {
      if (filterSet && !filterSet.has(user.id)) return false;
      if (!query) return true;
      const composed = composeAttendeeLabel(user).toLowerCase();
      return (
        user.id.toLowerCase().includes(query) ||
        user.displayName.toLowerCase().includes(query) ||
        user.firstName.toLowerCase().includes(query) ||
        user.lastName.toLowerCase().includes(query) ||
        composed.includes(query)
      );
    });
  }, [attendeeSearch, candidateUsers, orbatFilter, orbatSections]);

  async function openAttendeeDialog() {
    try {
      const data = await requestJson<AttendeeCandidatesResponse>("/api/ops/attendee-candidates");
      setCandidateUsers(data.users ?? []);
      setOrbatSettings(data.orbatSettings ?? null);
      setPickedAttendees(new Set(operation?.attendees ?? []));
      setAttendeeDialogOpen(true);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to load attendees");
    }
  }

  async function saveAttendees() {
    if (!operation) return;
    setSavingAttendees(true);
    try {
      await requestJson("/api/ops/edit-attendees", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          opfreindlyname: operation.opfreindlyname,
          attendees: [...pickedAttendees],
        }),
      });
      toast.success("Attendees updated");
      setAttendeeDialogOpen(false);
      await loadOperation();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to save attendees");
    } finally {
      setSavingAttendees(false);
    }
  }

  if (loading) {
    return (
      <OpsShell orbitron>
        <div className="flex items-center gap-2 py-10">
          <Spinner />
          <span>Loading operation…</span>
        </div>
      </OpsShell>
    );
  }

  if (!operation) {
    return (
      <OpsShell orbitron>
        <div className="ops-card">
          <p className="ops-desc">Operation not found.</p>
          <Link href="/ops" className="ops-btn mt-4 inline-flex">
            Back to Ops Dashboard
          </Link>
        </div>
      </OpsShell>
    );
  }

  const terrain = operation.terrainConditions;
  const optional = operation.optionalobjectives ?? [];

  return (
    <OpsShell orbitron className="max-w-4xl">
      <h1 className="ops-title text-center text-xl">{operation.Operationtitle}</h1>

      {operation.campaign ? (
        <div className="mb-4 text-center">
          <Link
            href={`/ops?campaign=${encodeURIComponent(operation.campaign.slug)}#campaign-${operation.campaign.slug}`}
            className="ops-btn"
          >
            {operation.campaign.title}
          </Link>
        </div>
      ) : null}

      <div className="ops-panel">
        <table>
          <tbody>
            <tr>
              <th>Lore date</th>
              <td>{operation.loreDate || operation.date || "—"}</td>
            </tr>
            <tr>
              <th>Post date</th>
              <td>{operation.postDate || "—"}</td>
            </tr>
            <tr>
              <th>Planet</th>
              <td>{operation.planet}</td>
            </tr>
            <tr>
              <th>Sector</th>
              <td>{operation.sector}</td>
            </tr>
            <tr>
              <th>Opposing force</th>
              <td>{operation.opposingforce}</td>
            </tr>
          </tbody>
        </table>

        <div className="ops-section">
          <h2>Directive</h2>
          <OpsMarkdown text={operation.missionstatement} className="ops-desc" />
        </div>

        <div className="ops-section">
          <h2>Briefing</h2>
          <OpsMarkdown text={operation.opdescription} className="ops-desc" />
        </div>

        <div className="ops-section">
          <h2>Objectives</h2>
          <table>
            <tbody>
              <tr>
                <th>Primary</th>
                <td>
                  <OpsMarkdown text={operation.mainobjective} />
                </td>
              </tr>
              <tr>
                <th>Secondary</th>
                <td>
                  <OpsMarkdown text={operation.secondaryobjective} />
                </td>
              </tr>
              <tr>
                <th>Optional</th>
                <td>
                  {optional.length ? (
                    <ul className="m-0 list-disc pl-5">
                      {optional.map((item) => (
                        <li key={item}>
                          <OpsMarkdown text={item} />
                        </li>
                      ))}
                    </ul>
                  ) : (
                    "None"
                  )}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <div className="ops-section">
          <h2>Conditions</h2>
          <table>
            <tbody>
              <tr>
                <th>Environment</th>
                <td>{terrain.environmentalElements}</td>
              </tr>
              <tr>
                <th>Time</th>
                <td>{terrain.timeOfDay}</td>
              </tr>
              <tr>
                <th>Terrain</th>
                <td>{terrain.terrain}</td>
              </tr>
              <tr>
                <th>Civilian presence</th>
                <td>{terrain.localsPresence}</td>
              </tr>
              <tr>
                <th>Command link</th>
                <td>{terrain.planopsLink}</td>
              </tr>
              <tr>
                <th>Timeline</th>
                <td>
                  <table>
                    <tbody>
                      {(terrain.operationTimeTable ?? []).map((row) => (
                        <tr key={row.label}>
                          <td>{row.label}</td>
                          <td>
                            {row.bstTime} / {row.estTime}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <div className="ops-section">
          <div className="mb-2 flex items-center justify-between gap-2">
            <h2 className="m-0">Attendees</h2>
            {canManage ? (
              <button type="button" className="ops-btn" onClick={openAttendeeDialog}>
                Edit attendees
              </button>
            ) : null}
          </div>
          <p className="ops-desc">
            {attendeeLabels.length
              ? `Attendees (${attendeeLabels.length}): ${attendeeLabels.join(", ")}`
              : "No attendees recorded yet."}
          </p>
        </div>

        <div className="mt-6 flex flex-wrap gap-2">
          <Link href="/ops" className="ops-btn">
            ← Back to Ops Dashboard
          </Link>
          {canManage ? (
            <button
              type="button"
              className="ops-btn"
              onClick={() => router.push(`/ops?edit=${encodeURIComponent(operation.opfreindlyname)}`)}
            >
              Edit operation
            </button>
          ) : null}
        </div>
      </div>

      <Dialog open={attendeeDialogOpen} onOpenChange={setAttendeeDialogOpen}>
        <DialogContent className="max-h-[85vh] max-w-[calc(100%-2rem)] gap-5 overflow-y-auto p-6 sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit attendees</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Update who appears on this operation&apos;s attendee list. This does not change
            anyone&apos;s operation count.
          </p>
          <div className="space-y-3">
            <div className="space-y-2">
              <Label htmlFor="attendee-search">User search</Label>
              <Input
                id="attendee-search"
                value={attendeeSearch}
                onChange={(event) => setAttendeeSearch(event.target.value)}
                placeholder="Search name or ID…"
              />
            </div>
            <div className="space-y-2">
              <Label>ORBAT section filter</Label>
              <Select value={orbatFilter || "__all__"} onValueChange={(value) => setOrbatFilter(!value || value === "__all__" ? "" : value)}>
                <SelectTrigger>
                  <SelectValue placeholder="All sections" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all__">All sections</SelectItem>
                  {orbatSections.map((section) => (
                    <SelectItem key={section.key} value={section.key}>
                      {section.label} ({section.memberIds.size})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="max-h-72 space-y-2 overflow-y-auto rounded-md border p-2">
              {filteredCandidates.map((user) => (
                <label key={user.id} className="flex items-center gap-2 text-sm">
                  <Checkbox
                    checked={pickedAttendees.has(user.id)}
                    onCheckedChange={(checked) => {
                      setPickedAttendees((current) => {
                        const next = new Set(current);
                        if (checked) next.add(user.id);
                        else next.delete(user.id);
                        return next;
                      });
                    }}
                  />
                  <span>{composeAttendeeLabel(user)}</span>
                </label>
              ))}
            </div>
            <p className="text-sm text-muted-foreground">
              {pickedAttendees.size
                ? `${pickedAttendees.size} attendee${pickedAttendees.size === 1 ? "" : "s"} selected.`
                : "No attendees selected."}
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAttendeeDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={saveAttendees} disabled={savingAttendees}>
              {savingAttendees ? "Saving…" : "Save attendees"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </OpsShell>
  );
}

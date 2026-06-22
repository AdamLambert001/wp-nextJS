"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "@/lib/toast";
import { AnimatedCollapse, AnimatedCollapseChevron } from "@/components/ui/animated-collapse";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Spinner } from "@/components/ui/spinner";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { loadOrbatEditDataAction } from "@/app/actions/orbat";
import { loadSrSettingsAction, saveSrSettingsAction } from "@/app/actions/sr-settings";
import { requestJson } from "@/lib/client/request-json";
import { unwrapActionResult } from "@/lib/client/unwrap-action-result";
import { composeProfileHeaderDisplayName } from "@/lib/profile/formatting";
import type { RankCategoryDefinition } from "@/lib/profile/types";
import type { OrbatMemberOption } from "@/lib/orbat/types";
import { slugifyInput } from "@/lib/sr-settings/slug";
import type {
  AdminDepartment,
  AdminDepartmentUserSummary,
  SrCapabilities,
  SrSettings,
} from "@/lib/sr-settings/types";

type AdminDepartmentsResponse = {
  ok: boolean;
  adminDepartments?: AdminDepartment[];
  usersById?: Record<string, AdminDepartmentUserSummary>;
  message?: string;
};

type CapabilitiesResponse = SrCapabilities & { ok: boolean };
type TrainingsResponse = { ok: boolean; rankCategories?: RankCategoryDefinition[] };

type DragState =
  | { type: "section"; fromSection: number }
  | { type: "position"; fromSection: number; fromSub: number; fromPos: number }
  | null;

function normalizeSlug(value: string): string {
  return slugifyInput(value);
}

function userLabelFor(
  id: string,
  usersById: Record<string, AdminDepartmentUserSummary>,
  members: OrbatMemberOption[],
  rankCategories: RankCategoryDefinition[],
): string {
  const sid = String(id ?? "").trim();
  if (!sid) return "-";
  const fromMembers = members.find((user) => user.id === sid);
  if (fromMembers) {
    return composeProfileHeaderDisplayName(fromMembers, rankCategories);
  }
  const cached = usersById[sid];
  if (cached) {
    return composeProfileHeaderDisplayName(cached, rankCategories);
  }
  return sid;
}

export function AdminDepartmentsBoard() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [capabilities, setCapabilities] = useState<SrCapabilities | null>(null);
  const [departments, setDepartments] = useState<AdminDepartment[]>([]);
  const [usersById, setUsersById] = useState<Record<string, AdminDepartmentUserSummary>>({});
  const [members, setMembers] = useState<OrbatMemberOption[]>([]);
  const [rankCategories, setRankCategories] = useState<RankCategoryDefinition[]>([]);
  const [fullSettings, setFullSettings] = useState<SrSettings | null>(null);
  const [drag, setDrag] = useState<DragState>(null);
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});

  const loadData = useCallback(async () => {
    const [deptData, capData, trainingsData] = await Promise.all([
      requestJson<AdminDepartmentsResponse>("/api/admin-departments"),
      requestJson<CapabilitiesResponse>("/api/sr-settings/capabilities").catch(() => null),
      requestJson<TrainingsResponse>("/api/sr-settings/trainings").catch(() => ({
        rankCategories: [],
      })),
    ]);
    setDepartments(deptData.adminDepartments ?? []);
    setUsersById(deptData.usersById ?? {});
    setRankCategories(trainingsData.rankCategories ?? []);
    if (capData) setCapabilities(capData);
  }, []);

  useEffect(() => {
    loadData()
      .catch((error) => {
        toast.error(error instanceof Error ? error.message : "Failed to load departments");
      })
      .finally(() => setLoading(false));
  }, [loadData]);

  async function handleEnterEditMode() {
    const [settings, editData] = await Promise.all([
      loadSrSettingsAction().then(unwrapActionResult),
      loadOrbatEditDataAction().then(unwrapActionResult),
    ]);
    setFullSettings(settings);
    setDepartments(settings.adminDepartments ?? []);
    setMembers(editData.users ?? []);
    setRankCategories(settings.rankCategories ?? []);
    setEditMode(true);
  }

  async function handleCancelEdit() {
    setEditMode(false);
    setFullSettings(null);
    setMembers([]);
    setDrag(null);
    await loadData();
  }

  async function handleSave() {
    if (!fullSettings) return;
    setSaving(true);
    try {
      const payload = {
        trainingCategories: fullSettings.trainingCategories,
        rankCategories: fullSettings.rankCategories,
        medals: fullSettings.medals,
        campaignRibbons: fullSettings.campaignRibbons,
        assignments: fullSettings.assignments,
        assignmentPositions: fullSettings.assignmentPositions,
        adminDepartments: departments.map((section) => ({
          id: normalizeSlug(String(section.id || section.title)),
          title: String(section.title ?? "").trim() || "Section",
          subcategories: (section.subcategories ?? []).map((subcategory) => ({
            id: normalizeSlug(String(subcategory.id || subcategory.title)),
            title: String(subcategory.title ?? "").trim() || "Subcategory",
            positions: (subcategory.positions ?? []).map((position) => ({
              id: normalizeSlug(String(position.id || position.name)),
              name: String(position.name ?? "").trim() || "Position",
              assignedUserId: String(position.assignedUserId ?? "").trim(),
              status:
                String(position.status ?? "").toLowerCase() === "closed" ? "closed" : "open",
            })),
          })),
        })),
      };
      unwrapActionResult(await saveSrSettingsAction(payload));
      setEditMode(false);
      setFullSettings(null);
      setMembers([]);
      setDrag(null);
      await loadData();
      toast.success("Admin departments saved.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to save departments");
    } finally {
      setSaving(false);
    }
  }

  const canEdit = Boolean(capabilities?.canEditAdminDepartments);
  const showEdit = canEdit && !editMode;
  const showEditing = canEdit && editMode;

  if (loading) {
    return (
      <div className="flex items-center gap-3 text-muted-foreground">
        <Spinner />
        Loading departments...
      </div>
    );
  }

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">Unit admin departments</p>
        <div className="flex flex-wrap gap-2">
          {showEdit ? (
            <Button variant="secondary" onClick={() => handleEnterEditMode().catch((error) => toast.error(error.message))}>
              Edit
            </Button>
          ) : null}
          {showEditing ? (
            <>
              <Button
                variant="secondary"
                onClick={() =>
                  setDepartments((prev) => [
                    ...prev,
                    { id: "", title: "New Section", subcategories: [] },
                  ])
                }
              >
                Add Section
              </Button>
              <Button variant="secondary" onClick={() => handleCancelEdit().catch(() => undefined)}>
                Cancel
              </Button>
              <Button onClick={handleSave} disabled={saving}>
                {saving ? "Saving..." : "Save"}
              </Button>
            </>
          ) : null}
        </div>
      </div>

      {!departments.length ? (
        <p className="text-muted-foreground">No admin departments configured.</p>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {departments.map((section, sectionIdx) => {
            const sectionKey =
              normalizeSlug(String(section.id || section.title)) || `section_${sectionIdx}`;
            const isCollapsed = Boolean(collapsed[sectionKey]);

            return (
            <section
              key={`${section.id}-${sectionIdx}`}
              className="overflow-hidden rounded-lg border border-border bg-card/40"
              onDragOver={
                editMode && drag?.type === "section"
                  ? (event) => event.preventDefault()
                  : undefined
              }
              onDrop={
                editMode && drag?.type === "section"
                  ? (event) => {
                      event.preventDefault();
                      if (drag.type !== "section" || drag.fromSection === sectionIdx) return;
                      setDepartments((prev) => {
                        const next = [...prev];
                        const [moved] = next.splice(drag.fromSection, 1);
                        next.splice(sectionIdx, 0, moved);
                        return next;
                      });
                      setDrag(null);
                    }
                  : undefined
              }
            >
              <div className="flex items-center justify-between gap-2 border-b border-border bg-muted/30 px-3 py-2 font-semibold">
                <div className="flex min-w-0 items-center gap-2">
                  <button
                    type="button"
                    className="rounded border border-border px-2 py-0.5"
                    onClick={() =>
                      setCollapsed((prev) => ({
                        ...prev,
                        [sectionKey]: !prev[sectionKey],
                      }))
                    }
                    aria-label={isCollapsed ? "Expand section" : "Collapse section"}
                  >
                    <AnimatedCollapseChevron open={!isCollapsed} />
                  </button>
                  <span className="truncate">{section.title || "Section"}</span>
                </div>
                {editMode ? (
                  <span
                    draggable
                    className="cursor-grab text-xs text-sky-300"
                    onDragStart={() => setDrag({ type: "section", fromSection: sectionIdx })}
                    onDragEnd={() => setDrag(null)}
                  >
                    Drag
                  </span>
                ) : null}
              </div>

              <AnimatedCollapse open={!isCollapsed}>
                <>
              {(section.subcategories ?? []).map((subcategory, subIdx) => (
                <div key={`${subcategory.id}-${subIdx}`} className="p-2">
                  <div className="mb-2 text-sm font-medium text-sky-300">
                    {subcategory.title || "Subcategory"}
                  </div>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Position</TableHead>
                        <TableHead>Assigned</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {(subcategory.positions ?? []).map((position, posIdx) => (
                        <TableRow
                          key={`${position.id}-${posIdx}`}
                          onDragOver={
                            editMode && drag?.type === "position"
                              ? (event) => event.preventDefault()
                              : undefined
                          }
                          onDrop={
                            editMode && drag?.type === "position"
                              ? (event) => {
                                  event.preventDefault();
                                  if (drag.type !== "position") return;
                                  setDepartments((prev) => {
                                    const next = structuredClone(prev);
                                    const fromList =
                                      next[drag.fromSection].subcategories[drag.fromSub].positions;
                                    const [moved] = fromList.splice(drag.fromPos, 1);
                                    if (!moved) return prev;
                                    next[sectionIdx].subcategories[subIdx].positions.push(moved);
                                    return next;
                                  });
                                  setDrag(null);
                                }
                              : undefined
                          }
                        >
                          <TableCell>
                            {editMode ? (
                              <div className="flex items-center gap-2">
                                <span
                                  draggable
                                  className="cursor-grab text-xs text-sky-300"
                                  onDragStart={() =>
                                    setDrag({
                                      type: "position",
                                      fromSection: sectionIdx,
                                      fromSub: subIdx,
                                      fromPos: posIdx,
                                    })
                                  }
                                  onDragEnd={() => setDrag(null)}
                                >
                                  ::
                                </span>
                                <Input
                                  value={position.name}
                                  onChange={(event) =>
                                    setDepartments((prev) => {
                                      const next = structuredClone(prev);
                                      next[sectionIdx].subcategories[subIdx].positions[posIdx].name =
                                        event.target.value;
                                      return next;
                                    })
                                  }
                                />
                              </div>
                            ) : (
                              position.name
                            )}
                          </TableCell>
                          <TableCell>
                            {editMode ? (
                              <Select
                                value={position.assignedUserId || "__none__"}
                                onValueChange={(value) => {
                                  if (!value) return;
                                  setDepartments((prev) => {
                                    const next = structuredClone(prev);
                                    next[sectionIdx].subcategories[subIdx].positions[posIdx].assignedUserId =
                                      value === "__none__" ? "" : value;
                                    return next;
                                  });
                                }}
                              >
                                <SelectTrigger>
                                  <SelectValue placeholder="Unassigned" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="__none__">Unassigned</SelectItem>
                                  {members.map((member) => (
                                    <SelectItem key={member.id} value={member.id}>
                                      {composeProfileHeaderDisplayName(member, rankCategories)}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            ) : (
                              userLabelFor(
                                position.assignedUserId,
                                usersById,
                                members,
                                rankCategories,
                              )
                            )}
                          </TableCell>
                          <TableCell>
                            {editMode ? (
                              <Select
                                value={position.status}
                                onValueChange={(value) => {
                                  if (!value) return;
                                  setDepartments((prev) => {
                                    const next = structuredClone(prev);
                                    next[sectionIdx].subcategories[subIdx].positions[posIdx].status =
                                      value;
                                    return next;
                                  });
                                }}
                              >
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="open">Open</SelectItem>
                                  <SelectItem value="closed">Closed</SelectItem>
                                </SelectContent>
                              </Select>
                            ) : (
                              <span
                                className={
                                  position.status === "closed"
                                    ? "font-semibold text-red-400"
                                    : "font-semibold text-sky-400"
                                }
                              >
                                {position.status === "closed" ? "Closed" : "Open"}
                              </span>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                  {editMode ? (
                    <div className="mt-2 flex flex-wrap gap-2">
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() =>
                          setDepartments((prev) => {
                            const next = structuredClone(prev);
                            next[sectionIdx].subcategories[subIdx].positions.push({
                              id: "",
                              name: "New Position",
                              assignedUserId: "",
                              status: "open",
                            });
                            return next;
                          })
                        }
                      >
                        Add Position
                      </Button>
                    </div>
                  ) : null}
                </div>
              ))}

              {editMode ? (
                <div className="border-t border-border p-2">
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() =>
                      setDepartments((prev) => prev.filter((_, index) => index !== sectionIdx))
                    }
                  >
                    Remove Section
                  </Button>
                </div>
              ) : null}
                </>
              </AnimatedCollapse>
            </section>
            );
          })}
        </div>
      )}
    </div>
  );
}

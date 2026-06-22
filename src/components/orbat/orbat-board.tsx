"use client";

import { useCallback, useEffect, useState } from "react";
import { loadOrbatEditDataAction, saveOrbatAction } from "@/app/actions/orbat";
import { unwrapActionResult } from "@/lib/client/unwrap-action-result";
import { toast } from "@/lib/toast";
import { Button } from "@/components/ui/button";
import { AnimatedCollapse, AnimatedCollapseChevron } from "@/components/ui/animated-collapse";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { OrbatGroupTable } from "@/components/orbat/orbat-group-table";
import type { OrbatDragState } from "@/components/orbat/types";
import { DEFAULT_GROUP_TRAINING_CATEGORY } from "@/lib/orbat/constants";
import {
  ensureOrbatSettings,
  prepareOrbatForSave,
  slugifyInput,
} from "@/lib/orbat/normalize";
import type {
  OrbatCapabilities,
  OrbatCategory,
  OrbatMemberOption,
  OrbatSettings,
  OrbatUserSummary,
  TrainingCategorySummary,
} from "@/lib/orbat/types";

type OrbatBoardProps = {
  initialCapabilities: OrbatCapabilities;
};

type PublicOrbatResponse = {
  ok: boolean;
  orbatSettings?: OrbatSettings;
  usersById?: Record<string, OrbatUserSummary>;
  trainingCategories?: TrainingCategorySummary[];
  message?: string;
};

async function requestJson<T>(url: string, options?: RequestInit): Promise<T> {
  const response = await fetch(url, options);
  const data = (await response.json().catch(() => ({}))) as T & { message?: string };
  if (!response.ok) {
    throw new Error(
      typeof data.message === "string" ? data.message : "Request failed",
    );
  }
  return data;
}

export function OrbatBoard({ initialCapabilities }: OrbatBoardProps) {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [capabilities, setCapabilities] = useState(initialCapabilities);
  const [orbatSettings, setOrbatSettings] = useState<OrbatSettings>({ categories: [] });
  const [usersById, setUsersById] = useState<Record<string, OrbatUserSummary>>({});
  const [trainingCategories, setTrainingCategories] = useState<TrainingCategorySummary[]>([]);
  const [members, setMembers] = useState<OrbatMemberOption[]>([]);
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const [drag, setDrag] = useState<OrbatDragState>(null);

  const loadData = useCallback(async () => {
    const [orbatData, capData] = await Promise.all([
      requestJson<PublicOrbatResponse>("/api/orbat"),
      requestJson<OrbatCapabilities & { ok: boolean }>("/api/orbat/capabilities").catch(
        () => initialCapabilities,
      ),
    ]);

    setOrbatSettings(ensureOrbatSettings(orbatData.orbatSettings));
    setUsersById(orbatData.usersById ?? {});
    setTrainingCategories(orbatData.trainingCategories ?? []);
    setCapabilities({
      canEditStructure: Boolean(capData.canEditStructure),
      canAssignPositions: Boolean(capData.canAssignPositions),
      canEdit: Boolean(capData.canEdit),
    });
  }, [initialCapabilities]);

  useEffect(() => {
    loadData()
      .catch((error) => {
        toast.error(error instanceof Error ? error.message : "Failed to load ORBAT");
      })
      .finally(() => setLoading(false));
  }, [loadData]);

  async function handleRefresh() {
    setRefreshing(true);
    try {
      await loadData();
      toast.success("ORBAT refreshed.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to refresh ORBAT");
    } finally {
      setRefreshing(false);
    }
  }

  async function handleEnterEditMode() {
    try {
      const editData = unwrapActionResult(await loadOrbatEditDataAction());
      setMembers(editData.users ?? []);
      if (editData.trainingCategories?.length) {
        setTrainingCategories(editData.trainingCategories);
      }
      setEditMode(true);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to enter edit mode",
      );
    }
  }

  async function handleCancelEdit() {
    setEditMode(false);
    setMembers([]);
    setDrag(null);
    setRefreshing(true);
    try {
      await loadData();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to reload ORBAT");
    } finally {
      setRefreshing(false);
    }
  }

  async function handleSave() {
    setSaving(true);
    try {
      const payload = prepareOrbatForSave(orbatSettings);
      unwrapActionResult(await saveOrbatAction(payload));
      setEditMode(false);
      setMembers([]);
      setDrag(null);
      await loadData();
      toast.success("ORBAT saved.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to save ORBAT");
    } finally {
      setSaving(false);
    }
  }

  function updateCategory(categoryIndex: number, category: OrbatCategory) {
    setOrbatSettings((current) => ({
      categories: current.categories.map((entry, index) =>
        index === categoryIndex ? category : entry,
      ),
    }));
  }

  function handleCategoryDrop(targetIndex: number) {
    if (drag?.type !== "category") return;
    const from = drag.catIdx;
    if (from === targetIndex) {
      setDrag(null);
      return;
    }

    setOrbatSettings((current) => {
      const categories = [...current.categories];
      const [moved] = categories.splice(from, 1);
      categories.splice(targetIndex, 0, moved);
      return { categories };
    });
    setDrag(null);
  }

  function handleRowDrop(
    categoryIndex: number,
    groupIndex: number,
    targetRowIndex: number,
  ) {
    if (drag?.type !== "row") return;

    const from = drag;
    setOrbatSettings((current) => {
      const categories = structuredClone(current.categories);
      const moved = categories[from.catIdx].groups[from.groupIdx].rows.splice(
        from.rowIdx,
        1,
      )[0];
      const targetRows = categories[categoryIndex].groups[groupIndex].rows;
      let insertAt = targetRowIndex;
      if (
        from.catIdx === categoryIndex &&
        from.groupIdx === groupIndex &&
        from.rowIdx < targetRowIndex
      ) {
        insertAt -= 1;
      }
      targetRows.splice(Math.max(0, insertAt), 0, moved);
      return { categories };
    });
    setDrag(null);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center gap-3 py-20 text-muted-foreground">
        <Spinner />
        <span>Loading ORBAT...</span>
      </div>
    );
  }

  const showEdit = capabilities.canEdit && !editMode;
  const showEditing = capabilities.canEdit && editMode;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          {showEdit ? (
            <Button type="button" variant="secondary" onClick={handleEnterEditMode}>
              Edit
            </Button>
          ) : null}
          {showEditing && capabilities.canEditStructure ? (
            <Button
              type="button"
              variant="secondary"
              onClick={() =>
                setOrbatSettings((current) => ({
                  categories: [
                    ...current.categories,
                    { id: "", title: "New Category", groups: [] },
                  ],
                }))
              }
            >
              Add Category
            </Button>
          ) : null}
          {showEditing ? (
            <>
              <Button type="button" variant="secondary" onClick={handleCancelEdit}>
                Cancel
              </Button>
              <Button type="button" onClick={handleSave} disabled={saving}>
                {saving ? "Saving..." : "Save"}
              </Button>
            </>
          ) : null}
        </div>
        <Button
          type="button"
          variant="secondary"
          onClick={handleRefresh}
          disabled={refreshing || saving}
        >
          {refreshing ? "Refreshing..." : "Refresh"}
        </Button>
      </div>

      {!orbatSettings.categories.length ? (
        <p className="py-10 text-center text-muted-foreground">
          No ORBAT categories configured.
        </p>
      ) : (
        <div className="space-y-4">
          {orbatSettings.categories.map((category, categoryIndex) => {
            const categoryKey =
              slugifyInput(category.id || category.title || `cat_${categoryIndex}`) ||
              `cat_${categoryIndex}`;
            const isCollapsed = Boolean(collapsed[categoryKey]);
            const structEdit = editMode && capabilities.canEditStructure;

            return (
              <section
                key={`${categoryKey}:${categoryIndex}`}
                className={`overflow-visible rounded-lg border border-border/80 bg-card/30 ${
                  drag?.type === "category" ? "ring-1 ring-sky-400/60" : ""
                }`}
                onDragOver={(event) => {
                  if (drag?.type !== "category") return;
                  event.preventDefault();
                }}
                onDrop={(event) => {
                  if (drag?.type !== "category") return;
                  event.preventDefault();
                  handleCategoryDrop(categoryIndex);
                }}
              >
                <div className="flex items-center justify-between gap-3 border-b border-border/80 bg-muted/20 px-3 py-2">
                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-7 px-2"
                      onClick={() =>
                        setCollapsed((current) => ({
                          ...current,
                          [categoryKey]: !isCollapsed,
                        }))
                      }
                      aria-label={isCollapsed ? "Expand category" : "Collapse category"}
                    >
                      <AnimatedCollapseChevron open={!isCollapsed} />
                    </Button>
                    {structEdit ? (
                      <Input
                        value={category.title}
                        onChange={(event) =>
                          updateCategory(categoryIndex, {
                            ...category,
                            title: event.target.value,
                          })
                        }
                        placeholder="Category title"
                        className="h-8 max-w-sm"
                      />
                    ) : (
                      <h2 className="font-semibold">{category.title || "Category"}</h2>
                    )}
                  </div>
                  {structEdit ? (
                    <button
                      type="button"
                      draggable
                      className="cursor-grab rounded border border-dashed border-border px-2 py-0.5 text-xs text-sky-300"
                      onDragStart={() =>
                        setDrag({ type: "category", catIdx: categoryIndex })
                      }
                      onDragEnd={() => setDrag(null)}
                    >
                      Drag
                    </button>
                  ) : null}
                </div>

                <AnimatedCollapse open={!isCollapsed}>
                  <div className="space-y-3 p-3">
                    {category.groups.map((group, groupIndex) => (
                      <OrbatGroupTable
                        key={`${group.id}:${groupIndex}`}
                        category={category}
                        categoryIndex={categoryIndex}
                        group={group}
                        groupIndex={groupIndex}
                        editMode={editMode}
                        canEditStructure={capabilities.canEditStructure}
                        canAssignPositions={capabilities.canAssignPositions}
                        usersById={usersById}
                        members={members}
                        trainingCategories={trainingCategories}
                        drag={drag}
                        onDragChange={setDrag}
                        onGroupChange={(nextGroup) =>
                          updateCategory(categoryIndex, {
                            ...category,
                            groups: category.groups.map((entry, index) =>
                              index === groupIndex ? nextGroup : entry,
                            ),
                          })
                        }
                        onRemoveGroup={() =>
                          updateCategory(categoryIndex, {
                            ...category,
                            groups: category.groups.filter(
                              (_, index) => index !== groupIndex,
                            ),
                          })
                        }
                        onRowDrop={(targetRowIndex) =>
                          handleRowDrop(categoryIndex, groupIndex, targetRowIndex)
                        }
                      />
                    ))}

                    {structEdit ? (
                      <div className="flex flex-wrap gap-2">
                        <Button
                          type="button"
                          variant="secondary"
                          size="sm"
                          onClick={() =>
                            updateCategory(categoryIndex, {
                              ...category,
                              groups: [
                                ...category.groups,
                                {
                                  id: "",
                                  title: "New Group",
                                  color: "",
                                  backgroundImage: "",
                                  trainingCategoryId: DEFAULT_GROUP_TRAINING_CATEGORY,
                                  rows: [],
                                },
                              ],
                            })
                          }
                        >
                          Add Group
                        </Button>
                        <Button
                          type="button"
                          variant="destructive"
                          size="sm"
                          onClick={() =>
                            setOrbatSettings((current) => ({
                              categories: current.categories.filter(
                                (_, index) => index !== categoryIndex,
                              ),
                            }))
                          }
                        >
                          Remove Category
                        </Button>
                      </div>
                    ) : null}
                  </div>
                </AnimatedCollapse>
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}

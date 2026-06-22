"use client";

import { useCallback, useEffect, useState } from "react";
import Image from "next/image";
import { toast } from "@/lib/toast";
import { Button } from "@/components/ui/button";
import { AnimatedCollapse, AnimatedCollapseChevron } from "@/components/ui/animated-collapse";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { Textarea } from "@/components/ui/textarea";
import { loadSrSettingsAction, saveSrSettingsAction } from "@/app/actions/sr-settings";
import { requestJson } from "@/lib/client/request-json";
import { unwrapActionResult } from "@/lib/client/unwrap-action-result";
import { RankIconFileInput } from "@/components/ranks/rank-icon-file-input";
import type { RankCategoryDefinition } from "@/lib/profile/types";
import { slugifyInput } from "@/lib/sr-settings/slug";
import type { SrCapabilities, SrSettings } from "@/lib/sr-settings/types";

type RanksResponse = {
  ok: boolean;
  rankCategories?: RankCategoryDefinition[];
  message?: string;
};

type CapabilitiesResponse = SrCapabilities & { ok: boolean };
type DragState =
  | { type: "category"; fromCat: number }
  | { type: "rank"; fromCat: number; fromRank: number }
  | null;

function normalizeSlug(value: string): string {
  return slugifyInput(value);
}

function RankCardView({ rank }: { rank: RankCategoryDefinition["items"][number] }) {
  const name = String(rank.label ?? "").trim() || "Unnamed rank";
  const cooldown = Number.isFinite(Number(rank.cooldown))
    ? Math.max(0, Number(rank.cooldown))
    : 0;
  const desc = String(rank.description ?? "").trim();
  const iconUrl = String(rank.iconUrl ?? "").trim();

  return (
    <div className="grid gap-2">
      <div className="grid grid-cols-[1fr_auto] items-start gap-2">
        <div className="font-semibold">{name}</div>
        <div className="flex h-8 w-8 items-center justify-center overflow-hidden rounded-md border border-dashed border-border bg-background">
          {iconUrl ? (
            <Image
              src={iconUrl}
              alt={`${name} icon`}
              width={32}
              height={32}
              className="h-full w-full object-cover"
              unoptimized
            />
          ) : null}
        </div>
      </div>
      <div className="text-sm text-sky-300">
        Abbreviation: {String(rank.abbr ?? "").trim() || "-"}
      </div>
      <div className="text-sm text-sky-300">Cool-Down Period: {cooldown}</div>
      <div className="min-h-5 whitespace-pre-wrap text-sm text-foreground">
        {desc || "-"}
      </div>
    </div>
  );
}

export function RanksBoard() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [capabilities, setCapabilities] = useState<SrCapabilities | null>(null);
  const [rankCategories, setRankCategories] = useState<RankCategoryDefinition[]>([]);
  const [fullSettings, setFullSettings] = useState<SrSettings | null>(null);
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const [drag, setDrag] = useState<DragState>(null);

  const loadData = useCallback(async () => {
    const [ranksData, capData] = await Promise.all([
      requestJson<RanksResponse>("/api/ranks"),
      requestJson<CapabilitiesResponse>("/api/sr-settings/capabilities").catch(() => null),
    ]);
    setRankCategories(ranksData.rankCategories ?? []);
    if (capData) setCapabilities(capData);
  }, []);

  useEffect(() => {
    loadData()
      .catch((error) => {
        toast.error(error instanceof Error ? error.message : "Failed to load ranks");
      })
      .finally(() => setLoading(false));
  }, [loadData]);

  async function handleEnterEditMode() {
    const settings = unwrapActionResult(await loadSrSettingsAction());
    setFullSettings(settings);
    setRankCategories(settings.rankCategories ?? []);
    setEditMode(true);
  }

  async function handleCancelEdit() {
    setEditMode(false);
    setFullSettings(null);
    setDrag(null);
    await loadData();
  }

  async function handleSave() {
    if (!fullSettings) return;
    setSaving(true);
    try {
      const payload = {
        trainingCategories: fullSettings.trainingCategories,
        rankCategories: rankCategories.map((category) => ({
          id: normalizeSlug(String(category.id || category.title)),
          title: String(category.title ?? "").trim() || "Category",
          items: (category.items ?? []).map((item) => ({
            slug: normalizeSlug(String(item.slug || item.label)),
            label: String(item.label ?? "").trim() || "Rank",
            abbr: String(item.abbr ?? "").trim(),
            cooldown: Math.max(0, Number(item.cooldown ?? 0) || 0),
            description: String(item.description ?? "").trim(),
            iconUrl: String(item.iconUrl ?? "").trim(),
          })),
        })),
        medals: fullSettings.medals,
        campaignRibbons: fullSettings.campaignRibbons,
        assignments: fullSettings.assignments,
        assignmentPositions: fullSettings.assignmentPositions,
        adminDepartments: fullSettings.adminDepartments,
      };
      unwrapActionResult(await saveSrSettingsAction(payload));
      setEditMode(false);
      setFullSettings(null);
      setDrag(null);
      await loadData();
      toast.success("Rank settings saved.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to save ranks");
    } finally {
      setSaving(false);
    }
  }

  function moveRank(fromCat: number, fromRank: number, toCat: number, toRank: number) {
    setRankCategories((prev) => {
      const next = structuredClone(prev);
      const fromList = next[fromCat]?.items ?? [];
      const [moved] = fromList.splice(fromRank, 1);
      if (!moved) return prev;
      const toList = next[toCat]?.items ?? [];
      let insertAt = toRank;
      if (fromCat === toCat && fromRank < toRank) insertAt -= 1;
      toList.splice(Math.max(0, insertAt), 0, moved);
      next[fromCat].items = fromList;
      next[toCat].items = toList;
      return next;
    });
  }

  function moveCategory(from: number, to: number) {
    if (from === to) return;
    setRankCategories((prev) => {
      const next = [...prev];
      const [moved] = next.splice(from, 1);
      next.splice(to, 0, moved);
      return next;
    });
  }

  const canEdit = Boolean(capabilities?.canEditRankBoard);
  const showEdit = canEdit && !editMode;
  const showEditing = canEdit && editMode;

  if (loading) {
    return (
      <div className="flex items-center gap-3 text-muted-foreground">
        <Spinner />
        Loading ranks...
      </div>
    );
  }

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">Public ranks board</p>
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
                  setRankCategories((prev) => [
                    ...prev,
                    { id: "", title: "New Category", items: [] },
                  ])
                }
              >
                Add Category
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

      {!rankCategories.length ? (
        <p className="text-muted-foreground">No rank categories configured.</p>
      ) : (
        <div className="space-y-4">
          {rankCategories.map((category, catIdx) => {
            const categoryKey =
              normalizeSlug(String(category.id || category.title)) || `category_${catIdx}`;
            const isCollapsed = Boolean(collapsed[categoryKey]);

            return (
              <section
                key={`${categoryKey}-${catIdx}`}
                className="rounded-lg border border-border bg-card/40 p-4"
                onDragOver={
                  editMode && drag?.type === "category"
                    ? (event) => event.preventDefault()
                    : undefined
                }
                onDrop={
                  editMode && drag?.type === "category"
                    ? (event) => {
                        event.preventDefault();
                        if (drag.type !== "category") return;
                        moveCategory(drag.fromCat, catIdx);
                        setDrag(null);
                      }
                    : undefined
                }
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex min-w-0 items-center gap-2">
                    <button
                      type="button"
                      className="rounded border border-border px-2 py-0.5 text-xs"
                      onClick={() =>
                        setCollapsed((prev) => ({
                          ...prev,
                          [categoryKey]: !prev[categoryKey],
                        }))
                      }
                    >
                      <AnimatedCollapseChevron open={!isCollapsed} />
                    </button>
                    <h2 className="text-lg font-semibold">{category.title || "Category"}</h2>
                  </div>
                  {editMode ? (
                    <span
                      draggable
                      className="cursor-grab text-xs text-sky-300"
                      onDragStart={() => setDrag({ type: "category", fromCat: catIdx })}
                      onDragEnd={() => setDrag(null)}
                    >
                      Drag category
                    </span>
                  ) : null}
                </div>

                <AnimatedCollapse open={!isCollapsed}>
                  <>
                    <hr className="my-3 border-border" />
                    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                      {(category.items ?? []).map((rank, rankIdx) => (
                        <article
                          key={`${rank.slug || rank.label}-${rankIdx}`}
                          className="rounded-lg border border-border bg-background p-3"
                          onDragOver={
                            editMode && drag?.type === "rank"
                              ? (event) => event.preventDefault()
                              : undefined
                          }
                          onDrop={
                            editMode && drag?.type === "rank"
                              ? (event) => {
                                  event.preventDefault();
                                  if (drag.type !== "rank") return;
                                  moveRank(drag.fromCat, drag.fromRank, catIdx, rankIdx);
                                  setDrag(null);
                                }
                              : undefined
                          }
                        >
                          <RankCardView rank={rank} />
                          {editMode ? (
                            <>
                              <div className="mt-3 flex flex-wrap gap-2">
                                <span
                                  draggable
                                  className="cursor-grab text-xs text-sky-300"
                                  onDragStart={() =>
                                    setDrag({ type: "rank", fromCat: catIdx, fromRank: rankIdx })
                                  }
                                  onDragEnd={() => setDrag(null)}
                                >
                                  Drag rank
                                </span>
                                <Button
                                  variant="destructive"
                                  size="sm"
                                  onClick={() =>
                                    setRankCategories((prev) => {
                                      const next = structuredClone(prev);
                                      next[catIdx].items.splice(rankIdx, 1);
                                      return next;
                                    })
                                  }
                                >
                                  Remove Rank
                                </Button>
                              </div>
                              <div className="mt-3 grid gap-2 rounded-md border border-border bg-card/30 p-3">
                                <label className="grid gap-1 text-xs uppercase tracking-wide text-muted-foreground">
                                  Rank Name
                                  <Input
                                    value={rank.label}
                                    onChange={(event) =>
                                      setRankCategories((prev) => {
                                        const next = structuredClone(prev);
                                        next[catIdx].items[rankIdx].label = event.target.value;
                                        return next;
                                      })
                                    }
                                  />
                                </label>
                                <label className="grid gap-1 text-xs uppercase tracking-wide text-muted-foreground">
                                  Abbreviation
                                  <Input
                                    value={rank.abbr}
                                    onChange={(event) =>
                                      setRankCategories((prev) => {
                                        const next = structuredClone(prev);
                                        next[catIdx].items[rankIdx].abbr = event.target.value;
                                        return next;
                                      })
                                    }
                                  />
                                </label>
                                <label className="grid gap-1 text-xs uppercase tracking-wide text-muted-foreground">
                                  Cool-Down
                                  <Input
                                    type="number"
                                    min={0}
                                    value={rank.cooldown}
                                    onChange={(event) =>
                                      setRankCategories((prev) => {
                                        const next = structuredClone(prev);
                                        next[catIdx].items[rankIdx].cooldown = Math.max(
                                          0,
                                          Number(event.target.value) || 0,
                                        );
                                        return next;
                                      })
                                    }
                                  />
                                </label>
                                <label className="grid gap-1 text-xs uppercase tracking-wide text-muted-foreground">
                                  Description
                                  <Textarea
                                    rows={3}
                                    value={rank.description}
                                    onChange={(event) =>
                                      setRankCategories((prev) => {
                                        const next = structuredClone(prev);
                                        next[catIdx].items[rankIdx].description = event.target.value;
                                        return next;
                                      })
                                    }
                                  />
                                </label>
                                <label className="grid gap-1 text-xs uppercase tracking-wide text-muted-foreground">
                                  Icon URL
                                  <Input
                                    value={rank.iconUrl}
                                    onChange={(event) =>
                                      setRankCategories((prev) => {
                                        const next = structuredClone(prev);
                                        next[catIdx].items[rankIdx].iconUrl = event.target.value;
                                        return next;
                                      })
                                    }
                                  />
                                </label>
                                <label className="grid gap-1 text-xs uppercase tracking-wide text-muted-foreground">
                                  Upload Icon
                                  <RankIconFileInput
                                    onUploaded={(url) =>
                                      setRankCategories((prev) => {
                                        const next = structuredClone(prev);
                                        next[catIdx].items[rankIdx].iconUrl = url;
                                        return next;
                                      })
                                    }
                                  />
                                </label>
                                <label className="grid gap-1 text-xs uppercase tracking-wide text-muted-foreground">
                                  Slug
                                  <Input
                                    value={rank.slug}
                                    onChange={(event) =>
                                      setRankCategories((prev) => {
                                        const next = structuredClone(prev);
                                        next[catIdx].items[rankIdx].slug = normalizeSlug(
                                          event.target.value || rank.label,
                                        );
                                        return next;
                                      })
                                    }
                                  />
                                </label>
                              </div>
                            </>
                          ) : null}
                        </article>
                      ))}
                    </div>
                    {editMode ? (
                      <div className="mt-3 flex flex-wrap gap-2">
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() =>
                            setRankCategories((prev) => {
                              const next = structuredClone(prev);
                              next[catIdx].items.push({
                                slug: "",
                                label: "",
                                abbr: "",
                                cooldown: 0,
                                description: "",
                                iconUrl: "",
                              });
                              return next;
                            })
                          }
                        >
                          Add Rank
                        </Button>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() =>
                            setRankCategories((prev) => prev.filter((_, index) => index !== catIdx))
                          }
                        >
                          Remove Category
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

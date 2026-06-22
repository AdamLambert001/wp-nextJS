"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { toast } from "@/lib/toast";
import { LoreCampaignTimeline } from "@/components/lore/lore-campaign-timeline";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Spinner } from "@/components/ui/spinner";
import { Textarea } from "@/components/ui/textarea";
import { saveLoreAction } from "@/app/actions/lore";
import { requestJson } from "@/lib/client/request-json";
import { unwrapActionResult } from "@/lib/client/unwrap-action-result";
import { ImageUrlOrUpload } from "@/components/edgestore/image-url-or-upload";
import type { LoreAsset, UnitLore } from "@/lib/lore/types";
import type { SrCapabilities } from "@/lib/sr-settings/types";

type LoreResponse = { ok: boolean; lore?: UnitLore; message?: string };
type CapabilitiesResponse = SrCapabilities & { ok: boolean };

function groupAssetsByCategory(lore: UnitLore) {
  const groups = new Map<string, LoreAsset[]>();
  for (const category of lore.assetCategories) {
    groups.set(category, []);
  }
  for (const asset of lore.assets) {
    const list = groups.get(asset.category) ?? [];
    list.push(asset);
    groups.set(asset.category, list);
  }
  return groups;
}

export function LoreBoard() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [lore, setLore] = useState<UnitLore | null>(null);
  const [draft, setDraft] = useState<UnitLore | null>(null);
  const [editMode, setEditMode] = useState(false);
  const [capabilities, setCapabilities] = useState<SrCapabilities | null>(null);
  const [selectedAsset, setSelectedAsset] = useState<LoreAsset | null>(null);

  const loadData = useCallback(async () => {
    const [loreData, capData] = await Promise.all([
      requestJson<LoreResponse>("/api/lore"),
      requestJson<CapabilitiesResponse>("/api/sr-settings/capabilities").catch(() => null),
    ]);
    setLore(loreData.lore ?? null);
    if (capData) setCapabilities(capData);
  }, []);

  useEffect(() => {
    loadData()
      .catch((error) => {
        toast.error(error instanceof Error ? error.message : "Failed to load lore");
      })
      .finally(() => setLoading(false));
  }, [loadData]);

  const activeLore = editMode ? draft : lore;
  const groupedAssets = useMemo(
    () => (activeLore ? groupAssetsByCategory(activeLore) : new Map()),
    [activeLore],
  );

  async function handleSave() {
    if (!draft) return;
    setSaving(true);
    try {
      const saved = unwrapActionResult(await saveLoreAction(draft));
      setLore(saved);
      setEditMode(false);
      setDraft(null);
      toast.success("Unit lore saved.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to save lore");
    } finally {
      setSaving(false);
    }
  }

  const canEdit = Boolean(capabilities?.canEditLore);

  if (loading) {
    return (
      <div className="flex items-center gap-3 text-muted-foreground">
        <Spinner />
        Loading unit lore...
      </div>
    );
  }

  if (!activeLore) {
    return <p className="text-muted-foreground">Failed to load unit lore.</p>;
  }

  return (
    <div>
      <div className="mb-4 rounded-lg border border-border bg-card/40 p-4">
        <h2 className="text-lg font-semibold">Campaign timeline</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Large dots: campaigns. Small dots: unassigned operations (lore date, else post date).
        </p>
        <LoreCampaignTimeline />
      </div>

      <div className="rounded-lg border border-border bg-card/40 p-4">
        <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold">Unit Lore</h1>
            <p className="text-sm text-muted-foreground">Background and unit assets.</p>
          </div>
          {canEdit && !editMode ? (
            <Button
              variant="secondary"
              onClick={() => {
                setDraft(structuredClone(lore));
                setEditMode(true);
              }}
            >
              Edit
            </Button>
          ) : null}
          {editMode ? (
            <div className="flex flex-wrap gap-2">
              <Button
                variant="secondary"
                onClick={() => {
                  setEditMode(false);
                  setDraft(null);
                }}
              >
                Cancel
              </Button>
              <Button onClick={handleSave} disabled={saving}>
                {saving ? "Saving..." : "Save"}
              </Button>
            </div>
          ) : null}
        </div>

        {editMode && draft ? (
          <div className="space-y-6">
            <label className="grid gap-2">
              <span className="text-xs uppercase tracking-wide text-muted-foreground">
                Background lore
              </span>
              <Textarea
                rows={10}
                value={draft.backgroundLore}
                onChange={(event) =>
                  setDraft((prev) =>
                    prev ? { ...prev, backgroundLore: event.target.value } : prev,
                  )
                }
              />
            </label>

            <div>
              <div className="mb-2 flex items-center justify-between gap-2">
                <h3 className="font-medium">Asset categories</h3>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() =>
                    setDraft((prev) =>
                      prev
                        ? {
                            ...prev,
                            assetCategories: [...prev.assetCategories, "New Category"],
                          }
                        : prev,
                    )
                  }
                >
                  Add category
                </Button>
              </div>
              <div className="space-y-2">
                {draft.assetCategories.map((category, index) => (
                  <div key={`${category}-${index}`} className="flex gap-2">
                    <Input
                      value={category}
                      onChange={(event) =>
                        setDraft((prev) => {
                          if (!prev) return prev;
                          const nextCategories = [...prev.assetCategories];
                          const oldLabel = nextCategories[index];
                          nextCategories[index] = event.target.value;
                          const nextAssets = prev.assets.map((asset) =>
                            asset.category === oldLabel
                              ? { ...asset, category: event.target.value }
                              : asset,
                          );
                          return {
                            ...prev,
                            assetCategories: nextCategories,
                            assets: nextAssets,
                          };
                        })
                      }
                    />
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() =>
                        setDraft((prev) => {
                          if (!prev) return prev;
                          const label = prev.assetCategories[index];
                          return {
                            ...prev,
                            assetCategories: prev.assetCategories.filter((_, i) => i !== index),
                            assets: prev.assets.filter((asset) => asset.category !== label),
                          };
                        })
                      }
                    >
                      Remove
                    </Button>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <div className="mb-2 flex items-center justify-between gap-2">
                <h3 className="font-medium">Assets</h3>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() =>
                    setDraft((prev) =>
                      prev
                        ? {
                            ...prev,
                            assets: [
                              ...prev.assets,
                              {
                                id: crypto.randomUUID(),
                                title: "New Asset",
                                category: prev.assetCategories[0] ?? "Ship",
                                description: "",
                                pictureUrl: "",
                              },
                            ],
                          }
                        : prev,
                    )
                  }
                >
                  Add asset
                </Button>
              </div>
              <div className="space-y-3">
                {draft.assets.map((asset, index) => (
                  <div key={asset.id} className="rounded-md border border-border bg-background p-3">
                    <div className="grid gap-2 md:grid-cols-2">
                      <label className="grid gap-1 text-xs uppercase tracking-wide text-muted-foreground">
                        Title
                        <Input
                          value={asset.title}
                          onChange={(event) =>
                            setDraft((prev) => {
                              if (!prev) return prev;
                              const assets = [...prev.assets];
                              assets[index] = { ...assets[index], title: event.target.value };
                              return { ...prev, assets };
                            })
                          }
                        />
                      </label>
                      <label className="grid gap-1 text-xs uppercase tracking-wide text-muted-foreground">
                        Category
                        <Select
                          value={asset.category}
                          onValueChange={(value) => {
                            if (!value) return;
                            setDraft((prev) => {
                              if (!prev) return prev;
                              const assets = [...prev.assets];
                              assets[index] = { ...assets[index], category: value };
                              return { ...prev, assets };
                            });
                          }}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {draft.assetCategories.map((category) => (
                              <SelectItem key={category} value={category}>
                                {category}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </label>
                      <ImageUrlOrUpload
                        className="md:col-span-2"
                        label="Picture"
                        folder="lore"
                        value={asset.pictureUrl}
                        onChange={(pictureUrl) =>
                          setDraft((prev) => {
                            if (!prev) return prev;
                            const assets = [...prev.assets];
                            assets[index] = { ...assets[index], pictureUrl };
                            return { ...prev, assets };
                          })
                        }
                      />
                      <label className="grid gap-1 text-xs uppercase tracking-wide text-muted-foreground md:col-span-2">
                        Description
                        <Textarea
                          rows={4}
                          value={asset.description}
                          onChange={(event) =>
                            setDraft((prev) => {
                              if (!prev) return prev;
                              const assets = [...prev.assets];
                              assets[index] = { ...assets[index], description: event.target.value };
                              return { ...prev, assets };
                            })
                          }
                        />
                      </label>
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <Button
                        variant="secondary"
                        size="sm"
                        disabled={index === 0}
                        onClick={() =>
                          setDraft((prev) => {
                            if (!prev || index === 0) return prev;
                            const assets = [...prev.assets];
                            [assets[index - 1], assets[index]] = [assets[index], assets[index - 1]];
                            return { ...prev, assets };
                          })
                        }
                      >
                        Move up
                      </Button>
                      <Button
                        variant="secondary"
                        size="sm"
                        disabled={index >= draft.assets.length - 1}
                        onClick={() =>
                          setDraft((prev) => {
                            if (!prev || index >= prev.assets.length - 1) return prev;
                            const assets = [...prev.assets];
                            [assets[index + 1], assets[index]] = [assets[index], assets[index + 1]];
                            return { ...prev, assets };
                          })
                        }
                      >
                        Move down
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() =>
                          setDraft((prev) =>
                            prev
                              ? {
                                  ...prev,
                                  assets: prev.assets.filter((_, assetIndex) => assetIndex !== index),
                                }
                              : prev,
                          )
                        }
                      >
                        Delete asset
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <>
            {activeLore.backgroundLore ? (
              <div className="mb-6 whitespace-pre-wrap leading-relaxed text-foreground">
                {activeLore.backgroundLore}
              </div>
            ) : (
              <p className="mb-6 text-muted-foreground">No background lore entered yet.</p>
            )}

            <div className="space-y-6">
              {[...groupedAssets.entries()].map(([category, assets]) => (
                <section key={category}>
                  <h3 className="mb-3 text-lg font-semibold">{category}</h3>
                  {assets.length ? (
                    <div className="grid gap-3 md:grid-cols-2">
                      {assets.map((asset: LoreAsset) => (
                        <button
                          key={asset.id}
                          type="button"
                          className="grid grid-cols-[1fr_100px] gap-3 rounded-lg border border-border bg-background p-3 text-left transition-colors hover:border-muted-foreground/40"
                          onClick={() => setSelectedAsset(asset)}
                        >
                          <div className="min-w-0">
                            <p className="font-semibold">{asset.title}</p>
                            <div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                              <Badge variant="outline">{asset.category}</Badge>
                            </div>
                          </div>
                          {asset.pictureUrl ? (
                            <Image
                              src={asset.pictureUrl}
                              alt={asset.title}
                              width={100}
                              height={100}
                              className="h-[100px] w-[100px] rounded-md border border-border object-cover"
                              unoptimized
                            />
                          ) : (
                            <div className="flex h-[100px] w-[100px] items-center justify-center rounded-md border border-border bg-muted/30 text-xs text-muted-foreground">
                              No image
                            </div>
                          )}
                        </button>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">No assets in this category.</p>
                  )}
                </section>
              ))}
            </div>
          </>
        )}
      </div>

      <Dialog open={Boolean(selectedAsset)} onOpenChange={(open) => !open && setSelectedAsset(null)}>
        <DialogContent className="max-w-3xl gap-5 p-6 sm:max-w-3xl">
          {selectedAsset ? (
            <>
              <DialogHeader>
                <DialogTitle className="text-xl">{selectedAsset.title}</DialogTitle>
              </DialogHeader>
              {selectedAsset.pictureUrl ? (
                <Image
                  src={selectedAsset.pictureUrl}
                  alt={selectedAsset.title}
                  width={720}
                  height={420}
                  className="max-h-[420px] w-full rounded-md border border-border object-contain"
                  unoptimized
                />
              ) : null}
              <Badge variant="outline">{selectedAsset.category}</Badge>
              <p className="whitespace-pre-wrap text-base leading-relaxed">
                {selectedAsset.description || "No description provided."}
              </p>
            </>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}

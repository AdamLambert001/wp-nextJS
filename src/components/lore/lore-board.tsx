"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ClipboardEvent as ReactClipboardEvent,
  type KeyboardEvent as ReactKeyboardEvent,
} from "react";
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
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Spinner } from "@/components/ui/spinner";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { requestJson } from "@/lib/client/request-json";
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

const allowedRichTextTags = new Set([
  "b",
  "blockquote",
  "br",
  "div",
  "em",
  "h3",
  "h4",
  "hr",
  "i",
  "li",
  "ol",
  "p",
  "s",
  "strong",
  "u",
  "ul",
]);

const selfClosingRichTextTags = new Set(["br", "hr"]);
const richTextClassName =
  "[&_blockquote]:my-3 [&_blockquote]:border-l-2 [&_blockquote]:border-border [&_blockquote]:pl-3 [&_blockquote]:text-muted-foreground [&_h3]:mb-2 [&_h3]:mt-4 [&_h3]:text-lg [&_h3]:font-semibold [&_h4]:mb-2 [&_h4]:mt-3 [&_h4]:font-semibold [&_hr]:my-4 [&_hr]:border-border [&_li]:mt-1 [&_ol]:my-3 [&_ol]:list-decimal [&_ol]:pl-6 [&_p]:my-2 [&_strong]:font-semibold [&_ul]:my-3 [&_ul]:list-disc [&_ul]:pl-6";

function escapeHtml(value: string) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function escapeRichTextSegment(value: string) {
  return String(value || "").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function sanitizeRichTextMarkup(value: string) {
  const raw = String(value || "");

  if (!/<\/?[a-z][\s\S]*>/i.test(raw)) {
    return escapeHtml(raw).replace(/\r?\n/g, "<br />");
  }

  const tagPattern = /<\/?([a-z][a-z0-9]*)(?:\s[^>]*)?\/?>/gi;
  let clean = "";
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = tagPattern.exec(raw)) !== null) {
    const tag = match[1]?.toLowerCase() ?? "";
    clean += escapeRichTextSegment(raw.slice(lastIndex, match.index));

    if (allowedRichTextTags.has(tag)) {
      const closing = match[0].startsWith("</");
      clean += closing && !selfClosingRichTextTags.has(tag) ? `</${tag}>` : `<${tag}>`;
    }

    lastIndex = match.index + match[0].length;
  }

  clean += escapeRichTextSegment(raw.slice(lastIndex));
  return clean;
}

function normalizeEditorHtml(value: string) {
  return sanitizeRichTextMarkup(value)
    .replace(/^(<br\s*\/?>|\s|&nbsp;)*$/i, "")
    .trim();
}

function RichTextContent({
  value,
  className,
}: {
  value: string;
  className?: string;
}) {
  return (
    <div
      className={className}
      dangerouslySetInnerHTML={{
        __html: sanitizeRichTextMarkup(value || "No description provided."),
      }}
    />
  );
}

type ActiveFormats = {
  bold: boolean;
  italic: boolean;
  orderedList: boolean;
  strikeThrough: boolean;
  underline: boolean;
  unorderedList: boolean;
  block: string;
};

const emptyActiveFormats: ActiveFormats = {
  bold: false,
  italic: false,
  orderedList: false,
  strikeThrough: false,
  underline: false,
  unorderedList: false,
  block: "p",
};

function RichTextEditor({
  value,
  onChange,
  minHeightClassName = "min-h-40",
}: {
  value: string;
  onChange: (value: string) => void;
  minHeightClassName?: string;
}) {
  const editorRef = useRef<HTMLDivElement | null>(null);
  const [activeFormats, setActiveFormats] = useState<ActiveFormats>(emptyActiveFormats);

  const updateActiveFormats = useCallback(() => {
    if (typeof document === "undefined") return;

    const block = String(document.queryCommandValue("formatBlock") || "p")
      .replace(/[<>]/g, "")
      .toLowerCase();

    setActiveFormats({
      bold: document.queryCommandState("bold"),
      italic: document.queryCommandState("italic"),
      orderedList: document.queryCommandState("insertOrderedList"),
      strikeThrough: document.queryCommandState("strikeThrough"),
      underline: document.queryCommandState("underline"),
      unorderedList: document.queryCommandState("insertUnorderedList"),
      block,
    });
  }, []);

  const emitChange = useCallback(() => {
    const nextValue = normalizeEditorHtml(editorRef.current?.innerHTML ?? "");
    onChange(nextValue);
    updateActiveFormats();
  }, [onChange, updateActiveFormats]);

  const runCommand = useCallback(
    (command: string, commandValue?: string) => {
      editorRef.current?.focus();
      document.execCommand(command, false, commandValue);
      emitChange();
    },
    [emitChange],
  );

  useEffect(() => {
    const editor = editorRef.current;
    if (!editor) return;

    const nextHtml = sanitizeRichTextMarkup(value);
    if (editor.innerHTML !== nextHtml && document.activeElement !== editor) {
      editor.innerHTML = nextHtml;
    }
  }, [value]);

  useEffect(() => {
    document.addEventListener("selectionchange", updateActiveFormats);
    return () => document.removeEventListener("selectionchange", updateActiveFormats);
  }, [updateActiveFormats]);

  function handleKeyDown(event: ReactKeyboardEvent<HTMLDivElement>) {
    const modifier = event.ctrlKey || event.metaKey;
    if (!modifier) return;

    const key = event.key.toLowerCase();
    const shifted = event.shiftKey;

    if (key === "b" || key === "i" || key === "u") {
      event.preventDefault();
      runCommand(key === "b" ? "bold" : key === "i" ? "italic" : "underline");
      return;
    }

    if (shifted && key === "7") {
      event.preventDefault();
      runCommand("insertOrderedList");
      return;
    }

    if (shifted && key === "8") {
      event.preventDefault();
      runCommand("insertUnorderedList");
    }
  }

  function handlePaste(event: ReactClipboardEvent<HTMLDivElement>) {
    event.preventDefault();
    const html = event.clipboardData.getData("text/html");
    const text = event.clipboardData.getData("text/plain");
    const nextHtml = html
      ? sanitizeRichTextMarkup(html)
      : escapeHtml(text).replace(/\r?\n/g, "<br />");
    document.execCommand("insertHTML", false, nextHtml);
    emitChange();
  }

  return (
    <div className="rounded-md border border-input bg-background">
      <div className="flex flex-wrap items-center gap-2 border-b border-border p-2">
        <ToggleGroup variant="outline" size="sm" spacing={0} className="flex-wrap">
          <ToggleGroupItem
            aria-label="Bold"
            pressed={activeFormats.bold}
            title="Bold (Ctrl+B)"
            onMouseDown={(event) => event.preventDefault()}
            onPressedChange={() => runCommand("bold")}
          >
            <strong>B</strong>
          </ToggleGroupItem>
          <ToggleGroupItem
            aria-label="Italic"
            pressed={activeFormats.italic}
            title="Italic (Ctrl+I)"
            onMouseDown={(event) => event.preventDefault()}
            onPressedChange={() => runCommand("italic")}
          >
            <em>I</em>
          </ToggleGroupItem>
          <ToggleGroupItem
            aria-label="Underline"
            pressed={activeFormats.underline}
            title="Underline (Ctrl+U)"
            onMouseDown={(event) => event.preventDefault()}
            onPressedChange={() => runCommand("underline")}
          >
            <span className="underline">U</span>
          </ToggleGroupItem>
          <ToggleGroupItem
            aria-label="Strikethrough"
            pressed={activeFormats.strikeThrough}
            title="Strikethrough"
            onMouseDown={(event) => event.preventDefault()}
            onPressedChange={() => runCommand("strikeThrough")}
          >
            <span className="line-through">S</span>
          </ToggleGroupItem>
        </ToggleGroup>

        <Separator orientation="vertical" className="h-7" />

        <ToggleGroup variant="outline" size="sm" spacing={0} className="flex-wrap">
          <ToggleGroupItem
            aria-label="Bulleted list"
            pressed={activeFormats.unorderedList}
            title="Bulleted list (Ctrl+Shift+8)"
            onMouseDown={(event) => event.preventDefault()}
            onPressedChange={() => runCommand("insertUnorderedList")}
          >
            Bullets
          </ToggleGroupItem>
          <ToggleGroupItem
            aria-label="Numbered list"
            pressed={activeFormats.orderedList}
            title="Numbered list (Ctrl+Shift+7)"
            onMouseDown={(event) => event.preventDefault()}
            onPressedChange={() => runCommand("insertOrderedList")}
          >
            1.
          </ToggleGroupItem>
          <ToggleGroupItem
            aria-label="Separator"
            title="Insert separator"
            onMouseDown={(event) => event.preventDefault()}
            onPressedChange={() => runCommand("insertHorizontalRule")}
          >
            Rule
          </ToggleGroupItem>
        </ToggleGroup>

        <Separator orientation="vertical" className="h-7" />

        <ToggleGroup variant="outline" size="sm" spacing={0} className="flex-wrap">
          <ToggleGroupItem
            aria-label="Paragraph"
            pressed={activeFormats.block === "p" || activeFormats.block === "div"}
            title="Paragraph"
            onMouseDown={(event) => event.preventDefault()}
            onPressedChange={() => runCommand("formatBlock", "p")}
          >
            P
          </ToggleGroupItem>
          <ToggleGroupItem
            aria-label="Heading"
            pressed={activeFormats.block === "h3"}
            title="Heading"
            onMouseDown={(event) => event.preventDefault()}
            onPressedChange={() => runCommand("formatBlock", "h3")}
          >
            H
          </ToggleGroupItem>
          <ToggleGroupItem
            aria-label="Quote"
            pressed={activeFormats.block === "blockquote"}
            title="Quote"
            onMouseDown={(event) => event.preventDefault()}
            onPressedChange={() => runCommand("formatBlock", "blockquote")}
          >
            Quote
          </ToggleGroupItem>
        </ToggleGroup>
      </div>
      <div
        ref={editorRef}
        className={`${richTextClassName} max-w-none overflow-y-auto px-3 py-2 text-sm leading-relaxed outline-none ${minHeightClassName} max-h-72 focus-visible:ring-[3px] focus-visible:ring-ring/50`}
        contentEditable
        role="textbox"
        aria-multiline="true"
        suppressContentEditableWarning
        onInput={emitChange}
        onBlur={emitChange}
        onFocus={updateActiveFormats}
        onKeyDown={handleKeyDown}
        onPaste={handlePaste}
      />
    </div>
  );
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
    void Promise.resolve()
      .then(loadData)
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
      const data = await requestJson<LoreResponse>("/api/lore", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(draft),
      });
      setLore(data.lore ?? draft);
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
              <RichTextEditor
                value={draft.backgroundLore}
                minHeightClassName="min-h-56"
                onChange={(value) =>
                  setDraft((prev) =>
                    prev ? { ...prev, backgroundLore: value } : prev,
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
                        <RichTextEditor
                          value={asset.description}
                          onChange={(value) =>
                            setDraft((prev) => {
                              if (!prev) return prev;
                              const assets = [...prev.assets];
                              assets[index] = { ...assets[index], description: value };
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
              <RichTextContent
                value={activeLore.backgroundLore}
                className={`${richTextClassName} mb-6 leading-relaxed text-foreground`}
              />
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
        <DialogContent className="flex h-[85vh] max-w-3xl flex-col gap-4 overflow-hidden p-6 sm:max-w-3xl">
          {selectedAsset ? (
            <>
              <DialogHeader className="shrink-0">
                <DialogTitle className="text-xl">{selectedAsset.title}</DialogTitle>
              </DialogHeader>
              {selectedAsset.pictureUrl ? (
                <Image
                  src={selectedAsset.pictureUrl}
                  alt={selectedAsset.title}
                  width={720}
                  height={420}
                  className="h-[clamp(180px,34vh,360px)] w-full shrink-0 rounded-md border border-border object-contain"
                  unoptimized
                />
              ) : null}
              <div className="shrink-0">
                <Badge variant="outline">{selectedAsset.category}</Badge>
              </div>
              <ScrollArea className="min-h-0 flex-1 rounded-md border border-border bg-background/60">
                <RichTextContent
                  value={selectedAsset.description}
                  className={`${richTextClassName} p-4 text-base leading-relaxed`}
                />
              </ScrollArea>
            </>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}

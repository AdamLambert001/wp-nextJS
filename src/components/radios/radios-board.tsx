"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "@/lib/toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { loadSrSettingsAction, saveSrSettingsAction } from "@/app/actions/sr-settings";
import { requestJson } from "@/lib/client/request-json";
import { unwrapActionResult } from "@/lib/client/unwrap-action-result";
import { slugifyInput } from "@/lib/sr-settings/slug";
import type {
  RadioChannelColumn,
  RadioChannelsSettings,
  SrCapabilities,
  SrSettings,
} from "@/lib/sr-settings/types";

type RadiosResponse = {
  ok: boolean;
  radioChannels?: RadioChannelsSettings;
  message?: string;
};

type CapabilitiesResponse = SrCapabilities & { ok: boolean };
function ensureRadioChannels(value: unknown): RadioChannelsSettings {
  const src =
    value && typeof value === "object" && !Array.isArray(value)
      ? (value as RadioChannelsSettings)
      : ({} as RadioChannelsSettings);
  const columns = Array.isArray(src.columns) ? src.columns : [];
  return {
    shortRangeHeader: String(src.shortRangeHeader || "Short Range Radio (SR)"),
    longRangeHeader: String(src.longRangeHeader || "Long Range Radio (SR)"),
    longRangeFrequencyLabel: String(src.longRangeFrequencyLabel || "LR Frequency"),
    columns: columns.map((column) => ({
      id: String(column.id || ""),
      title: String(column.title || ""),
      squadRadioNet: String(column.squadRadioNet || ""),
      fireteamRadioNetRed: String(column.fireteamRadioNetRed || ""),
      fireteamRadioNetBlue: String(column.fireteamRadioNetBlue || ""),
      longRangeRole: String(column.longRangeRole || ""),
      longRangeFrequency: String(column.longRangeFrequency || ""),
    })),
  };
}

function normalizeSlug(value: string): string {
  return slugifyInput(value);
}

export function RadiosBoard() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [capabilities, setCapabilities] = useState<SrCapabilities | null>(null);
  const [radioChannels, setRadioChannels] = useState<RadioChannelsSettings>(
    ensureRadioChannels(null),
  );
  const [fullSettings, setFullSettings] = useState<SrSettings | null>(null);

  const loadData = useCallback(async () => {
    const [radiosData, capData] = await Promise.all([
      requestJson<RadiosResponse>("/api/radios"),
      requestJson<CapabilitiesResponse>("/api/sr-settings/capabilities").catch(() => null),
    ]);
    setRadioChannels(ensureRadioChannels(radiosData.radioChannels));
    if (capData) setCapabilities(capData);
  }, []);

  useEffect(() => {
    loadData()
      .catch((error) => {
        toast.error(error instanceof Error ? error.message : "Failed to load radios");
      })
      .finally(() => setLoading(false));
  }, [loadData]);

  async function handleEnterEditMode() {
    const settings = unwrapActionResult(await loadSrSettingsAction());
    setFullSettings(settings);
    setRadioChannels(ensureRadioChannels(settings.radioChannels));
    setEditMode(true);
  }

  async function handleCancelEdit() {
    setEditMode(false);
    setFullSettings(null);
    await loadData();
  }

  function updateColumn(index: number, patch: Partial<RadioChannelColumn>) {
    setRadioChannels((prev) => {
      const next = structuredClone(prev);
      next.columns[index] = { ...next.columns[index], ...patch };
      return next;
    });
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
        radioChannels: {
          shortRangeHeader:
            String(radioChannels.shortRangeHeader || "").trim() || "Short Range Radio (SR)",
          longRangeHeader:
            String(radioChannels.longRangeHeader || "").trim() || "Long Range Radio (SR)",
          longRangeFrequencyLabel:
            String(radioChannels.longRangeFrequencyLabel || "").trim() || "LR Frequency",
          columns: radioChannels.columns.map((column, index) => ({
            id: normalizeSlug(column.id || column.title || `radio_${index + 1}`),
            title: String(column.title || "").trim() || `Channel ${index + 1}`,
            squadRadioNet: String(column.squadRadioNet || "").trim(),
            fireteamRadioNetRed: String(column.fireteamRadioNetRed || "").trim(),
            fireteamRadioNetBlue: String(column.fireteamRadioNetBlue || "").trim(),
            longRangeRole: String(column.longRangeRole || "").trim(),
            longRangeFrequency: String(column.longRangeFrequency || "").trim(),
          })),
        },
        assignments: fullSettings.assignments,
        assignmentPositions: fullSettings.assignmentPositions,
        adminDepartments: fullSettings.adminDepartments,
      };
      unwrapActionResult(await saveSrSettingsAction(payload));
      setEditMode(false);
      setFullSettings(null);
      await loadData();
      toast.success("Radio settings saved.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to save radios");
    } finally {
      setSaving(false);
    }
  }

  const canEdit = Boolean(capabilities?.canEditRadiosBoard);
  const showEdit = canEdit && !editMode;
  const showEditing = canEdit && editMode;
  const rc = radioChannels;

  if (loading) {
    return (
      <div className="flex items-center gap-3 text-muted-foreground">
        <Spinner />
        Loading radios...
      </div>
    );
  }

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          {rc.columns.length
            ? "Radio net reference"
            : editMode
              ? "Add columns to build radio plans."
              : "No radio channels configured."}
        </p>
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
                  setRadioChannels((prev) => ({
                    ...prev,
                    columns: [
                      ...prev.columns,
                      {
                        id: "",
                        title: "",
                        squadRadioNet: "",
                        fireteamRadioNetRed: "",
                        fireteamRadioNetBlue: "",
                        longRangeRole: "",
                        longRangeFrequency: "",
                      },
                    ],
                  }))
                }
              >
                Add Column
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

      <div className="overflow-x-auto rounded-lg border border-border bg-card/40 p-4">
        <Table className="min-w-[920px]">
          <TableHeader>
            <TableRow>
              <TableHead className="w-[220px] text-left">
                {editMode ? (
                  <Input
                    value={rc.shortRangeHeader}
                    onChange={(event) =>
                      setRadioChannels((prev) => ({
                        ...prev,
                        shortRangeHeader: event.target.value,
                      }))
                    }
                  />
                ) : (
                  rc.shortRangeHeader
                )}
              </TableHead>
              {rc.columns.map((column, index) => (
                <TableHead key={`${column.id}-${index}`} className="text-center">
                  {editMode ? (
                    <div className="flex items-center gap-2">
                      <Input
                        value={column.title}
                        onChange={(event) => updateColumn(index, { title: event.target.value })}
                      />
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() =>
                          setRadioChannels((prev) => ({
                            ...prev,
                            columns: prev.columns.filter((_, colIndex) => colIndex !== index),
                          }))
                        }
                      >
                        Remove
                      </Button>
                    </div>
                  ) : (
                    column.title || "-"
                  )}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {[
              { key: "squadRadioNet" as const, label: "Squad Radio Net" },
              { key: "fireteamRadioNetRed" as const, label: "Fireteam Radio Net Red" },
              { key: "fireteamRadioNetBlue" as const, label: "Fireteam Radio Net Blue" },
            ].map((row) => (
              <TableRow key={row.key}>
                <TableCell className="font-medium">{row.label}</TableCell>
                {rc.columns.map((column, index) => (
                  <TableCell key={`${row.key}-${index}`} className="text-center">
                    {editMode ? (
                      <Input
                        value={column[row.key]}
                        onChange={(event) => updateColumn(index, { [row.key]: event.target.value })}
                      />
                    ) : (
                      column[row.key] || "-"
                    )}
                  </TableCell>
                ))}
              </TableRow>
            ))}
            <TableRow>
              <TableCell className="bg-muted/40 font-semibold">
                {editMode ? (
                  <Input
                    value={rc.longRangeHeader}
                    onChange={(event) =>
                      setRadioChannels((prev) => ({
                        ...prev,
                        longRangeHeader: event.target.value,
                      }))
                    }
                  />
                ) : (
                  rc.longRangeHeader
                )}
              </TableCell>
              {rc.columns.map((column, index) => (
                <TableCell key={`lr-role-${index}`} className="text-center font-semibold">
                  {editMode ? (
                    <Input
                      value={column.longRangeRole}
                      onChange={(event) =>
                        updateColumn(index, { longRangeRole: event.target.value })
                      }
                    />
                  ) : (
                    column.longRangeRole || "-"
                  )}
                </TableCell>
              ))}
            </TableRow>
            <TableRow>
              <TableCell className="font-medium">
                {editMode ? (
                  <Input
                    value={rc.longRangeFrequencyLabel}
                    onChange={(event) =>
                      setRadioChannels((prev) => ({
                        ...prev,
                        longRangeFrequencyLabel: event.target.value,
                      }))
                    }
                  />
                ) : (
                  rc.longRangeFrequencyLabel
                )}
              </TableCell>
              {rc.columns.map((column, index) => (
                <TableCell key={`lr-freq-${index}`} className="text-center">
                  {editMode ? (
                    <Input
                      value={column.longRangeFrequency}
                      onChange={(event) =>
                        updateColumn(index, { longRangeFrequency: event.target.value })
                      }
                    />
                  ) : (
                    column.longRangeFrequency || "-"
                  )}
                </TableCell>
              ))}
            </TableRow>
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

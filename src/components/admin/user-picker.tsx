"use client";

import { useMemo, useState } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { AdminPickerUser } from "@/lib/admin/load-admin-actions-data";
import type { OrbatFilterSection } from "@/lib/orbat/filter-sections";

type UserPickerProps = {
  users: AdminPickerUser[];
  selectedIds: Set<string>;
  onChange: (next: Set<string>) => void;
  maxSelectable: number;
  idPrefix: string;
  orbatSections?: OrbatFilterSection[];
  orbatFilter?: string;
  onOrbatFilterChange?: (key: string) => void;
};

function matchesSearch(user: AdminPickerUser, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  return (
    user.id.toLowerCase().includes(q) ||
    user.label.toLowerCase().includes(q) ||
    String(user.displayName ?? "").toLowerCase().includes(q) ||
    String(user.firstName ?? "").toLowerCase().includes(q) ||
    String(user.lastName ?? "").toLowerCase().includes(q) ||
    String(user.rank ?? "").toLowerCase().includes(q)
  );
}

export function UserPicker({
  users,
  selectedIds,
  onChange,
  maxSelectable,
  idPrefix,
  orbatSections = [],
  orbatFilter = "",
  onOrbatFilterChange,
}: UserPickerProps) {
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    const filterSet = orbatFilter
      ? orbatSections.find((section) => section.key === orbatFilter)?.memberIds
      : null;

    return users
      .filter((user) => !filterSet || filterSet.has(user.id))
      .filter((user) => matchesSearch(user, search))
      .slice(0, 150);
  }, [users, search, orbatFilter, orbatSections]);

  const selectedLabels = useMemo(
    () =>
      Array.from(selectedIds.values()).map((id) => {
        const user = users.find((entry) => entry.id === id);
        return user ? `${user.label} (${id})` : id;
      }),
    [selectedIds, users],
  );

  function toggleUser(userId: string, checked: boolean) {
    const next = new Set(selectedIds);
    if (checked) {
      if (next.size >= maxSelectable) return;
      next.add(userId);
    } else {
      next.delete(userId);
    }
    onChange(next);
  }

  return (
    <div className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor={`${idPrefix}-search`}>Search members</Label>
          <Input
            id={`${idPrefix}-search`}
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search name or ID…"
          />
        </div>
        {onOrbatFilterChange ? (
          <div className="space-y-2">
            <Label htmlFor={`${idPrefix}-orbat-filter`}>ORBAT section filter</Label>
            <Select
              value={orbatFilter || "__all__"}
              onValueChange={(value) =>
                onOrbatFilterChange(!value || value === "__all__" ? "" : value)
              }
            >
              <SelectTrigger id={`${idPrefix}-orbat-filter`}>
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
        ) : null}
      </div>

      <div className="max-h-80 space-y-1 overflow-y-auto rounded-lg border border-border/70 p-2">
        {filtered.length ? (
          filtered.map((user) => {
            const checked = selectedIds.has(user.id);
            const disabled = !checked && selectedIds.size >= maxSelectable;
            return (
              <label
                key={user.id}
                className="flex cursor-pointer items-center justify-between gap-3 rounded-md px-2 py-1.5 hover:bg-muted/50"
              >
                <span className="text-sm">
                  {user.label} —{" "}
                  <span className="font-mono text-xs text-muted-foreground">{user.id}</span>
                </span>
                <Checkbox
                  checked={checked}
                  disabled={disabled}
                  onCheckedChange={(value) => toggleUser(user.id, value === true)}
                />
              </label>
            );
          })
        ) : (
          <p className="px-2 py-4 text-center text-sm text-muted-foreground">No members match.</p>
        )}
      </div>

      <p className="text-xs text-muted-foreground">
        {selectedLabels.length
          ? `Selected (${selectedLabels.length}/${maxSelectable}): ${selectedLabels.join(", ")}`
          : "No users selected."}
      </p>
    </div>
  );
}

export function formatAttendanceLogOption(log: {
  occurredAt: string;
  note: string;
}): string {
  const occurredIso = String(log.occurredAt ?? "").trim();
  const day = occurredIso ? occurredIso.slice(0, 10) : "";
  const match = /\(Operation:\s*([^)]+)\)/i.exec(String(log.note ?? ""));
  const opLabel = match ? String(match[1] ?? "").trim() : "";
  if (opLabel && day) return `${day} - ${opLabel}`;
  if (opLabel) return opLabel;
  if (day) return day;
  return String(log.note ?? "Attendance log").trim().slice(0, 120) || "Attendance log";
}

export function medalAwardSelectValue(award: { medalSlug: string; awardedAt: string }): string {
  return `${award.medalSlug}|${award.awardedAt}`;
}

export function parseMedalAwardSelectValue(value: string): {
  medalSlug: string;
  awardedAt: string;
} {
  const raw = String(value ?? "").trim();
  const sep = raw.indexOf("|");
  if (sep < 0) return { medalSlug: "", awardedAt: "" };
  return {
    medalSlug: raw.slice(0, sep).trim().toLowerCase(),
    awardedAt: raw.slice(sep + 1).trim(),
  };
}

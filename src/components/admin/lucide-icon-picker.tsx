"use client";

import { useMemo, useState } from "react";
import { DynamicLucideIcon } from "@/components/admin/dynamic-lucide-icon";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  getLucideIconEntry,
  LUCIDE_ICON_ENTRIES,
  searchLucideIcons,
} from "@/lib/lucide-icon-catalog";
import { cn } from "@/lib/utils";

const ICON_RESULTS_LIMIT = 200;

type LucideIconPickerProps = {
  value: string;
  onChange: (icon: string) => void;
};

export function LucideIconPicker({ value, onChange }: LucideIconPickerProps) {
  const [query, setQuery] = useState("");
  const selected = getLucideIconEntry(value);

  const filteredIcons = useMemo(() => searchLucideIcons(query, ICON_RESULTS_LIMIT), [query]);
  const totalMatches = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return LUCIDE_ICON_ENTRIES.length;
    return LUCIDE_ICON_ENTRIES.filter((entry) => entry.searchText.includes(needle)).length;
  }, [query]);

  return (
    <Popover>
      <PopoverTrigger
        className={cn(
          "flex h-9 w-full items-center justify-between rounded-lg border border-input bg-transparent px-2.5 text-sm",
          "hover:bg-muted/50",
        )}
      >
        <span className="inline-flex min-w-0 items-center gap-2 truncate">
          {selected ? (
            <>
              <DynamicLucideIcon name={selected.name} className="size-4 shrink-0" />
              <span className="truncate">{selected.name}</span>
            </>
          ) : (
            <span className="text-muted-foreground">No icon</span>
          )}
        </span>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-[22rem] p-0">
        <div className="space-y-2 border-b border-border/80 p-2">
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search Lucide icons..."
            aria-label="Search Lucide icons"
            autoFocus
          />
          <p className="px-0.5 text-xs text-muted-foreground">
            Showing {filteredIcons.length} of {totalMatches.toLocaleString()} icon
            {totalMatches === 1 ? "" : "s"}
            {totalMatches > ICON_RESULTS_LIMIT ? " (refine search to see more)" : ""}
          </p>
        </div>

        <div className="max-h-72 overflow-y-auto p-2">
          <div className="grid grid-cols-6 gap-1">
            <button
              type="button"
              className={cn(
                "col-span-6 rounded-md px-2 py-2 text-left text-xs text-muted-foreground hover:bg-muted",
                !value && "bg-muted text-foreground",
              )}
              onClick={() => onChange("")}
            >
              No icon
            </button>

            {filteredIcons.map((entry) => (
              <button
                key={entry.name}
                type="button"
                title={entry.name}
                className={cn(
                  "inline-flex items-center justify-center rounded-md p-2 hover:bg-muted",
                  value === entry.name && "bg-muted text-foreground ring-1 ring-border",
                )}
                onClick={() => onChange(entry.name)}
              >
                <DynamicLucideIcon name={entry.name} className="size-4" />
              </button>
            ))}
          </div>

          {!filteredIcons.length ? (
            <p className="py-8 text-center text-sm text-muted-foreground">No icons match your search.</p>
          ) : null}
        </div>
      </PopoverContent>
    </Popover>
  );
}

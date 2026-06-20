"use client";

import { useMemo, useState } from "react";
import { ChevronsUpDown } from "lucide-react";
import type { AdminSearchChoice } from "@/components/admin/admin-select-utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";

type AdminSearchComboboxProps = {
  value: string;
  onChange: (value: string) => void;
  choices: AdminSearchChoice[];
  placeholder?: string;
  searchPlaceholder?: string;
  emptyLabel?: string;
  disabled?: boolean;
  className?: string;
};

function labelForValue(value: string, choices: AdminSearchChoice[]): string {
  const match = choices.find((choice) => choice.value === value);
  return match?.label ?? "";
}

export function AdminSearchCombobox({
  value,
  onChange,
  choices,
  placeholder = "Select an option",
  searchPlaceholder = "Search…",
  emptyLabel = "No matches",
  disabled = false,
  className,
}: AdminSearchComboboxProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return choices;
    return choices.filter((choice) => choice.hay.includes(needle));
  }, [choices, query]);

  const selectedLabel = labelForValue(value, choices);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        render={
          <Button
            type="button"
            variant="outline"
            disabled={disabled}
            className={cn(
              "h-auto min-h-8 w-full max-w-none justify-between py-1.5 font-normal whitespace-normal",
              className,
            )}
          />
        }
      >
        <span className={cn("line-clamp-3 text-left", !selectedLabel && "text-muted-foreground")}>
          {selectedLabel || placeholder}
        </span>
        <ChevronsUpDown className="size-3.5 shrink-0 opacity-60" />
      </PopoverTrigger>
      <PopoverContent
        className="w-[var(--anchor-width)] min-w-[14rem] max-w-[min(36rem,95vw)] p-2"
        align="start"
      >
        <Input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder={searchPlaceholder}
          className="mb-2 h-8"
          autoFocus
        />
        <div className="max-h-64 overflow-y-auto">
          {filtered.length ? (
            filtered.map((choice) => (
              <button
                key={choice.value}
                type="button"
                className="flex w-full rounded-md px-2 py-1.5 text-left text-sm whitespace-normal hover:bg-accent"
                onClick={() => {
                  onChange(choice.value);
                  setOpen(false);
                  setQuery("");
                }}
              >
                {choice.label}
              </button>
            ))
          ) : (
            <p className="px-2 py-1.5 text-sm text-muted-foreground">{emptyLabel}</p>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}

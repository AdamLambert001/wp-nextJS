"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ORBAT_SLOT_OPEN_ID } from "@/lib/orbat/constants";
import { memberSearchHaystack, resolveOrbatDisplayName } from "@/lib/orbat/display";
import type { OrbatMemberOption } from "@/lib/orbat/types";
import { ChevronsUpDown } from "lucide-react";

type MemberChoice = {
  value: string;
  label: string;
  hay: string;
};

type OrbatMemberComboboxProps = {
  value: string;
  members: OrbatMemberOption[];
  onChange: (value: string) => void;
  disabled?: boolean;
};

function buildChoices(
  members: OrbatMemberOption[],
  currentValue: string,
): MemberChoice[] {
  const choices: MemberChoice[] = [
    {
      value: ORBAT_SLOT_OPEN_ID,
      label: "Unassigned (OPEN)",
      hay: "unassigned open vacant",
    },
    { value: "", label: "Closed", hay: "closed empty" },
  ];
  const seen = new Set([ORBAT_SLOT_OPEN_ID, ""]);

  for (const member of members) {
    const id = String(member.id ?? "").trim();
    if (!id || seen.has(id)) continue;
    seen.add(id);
    const label = `${resolveOrbatDisplayName(member)} (${id})`;
    choices.push({
      value: id,
      label,
      hay: `${memberSearchHaystack({
        id,
        displayName: member.displayName,
        firstName: member.firstName,
        lastName: member.lastName,
        rank: member.rank,
      })} ${id}`.toLowerCase(),
    });
  }

  const current = String(currentValue ?? "").trim();
  if (current && current !== ORBAT_SLOT_OPEN_ID && !seen.has(current)) {
    choices.push({ value: current, label: current, hay: current.toLowerCase() });
  }

  return choices;
}

function labelForValue(value: string, choices: MemberChoice[]): string {
  const match = choices.find((choice) => choice.value === value);
  return match?.label ?? value;
}

export function OrbatMemberCombobox({
  value,
  members,
  onChange,
  disabled = false,
}: OrbatMemberComboboxProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");

  const choices = useMemo(
    () => buildChoices(members, value),
    [members, value],
  );

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return choices;
    return choices.filter((choice) => choice.hay.includes(needle));
  }, [choices, query]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        render={
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={disabled}
            className="h-8 w-full min-w-[11rem] max-w-[22rem] justify-between font-normal"
          />
        }
      >
        <span className="truncate">{labelForValue(value, choices)}</span>
        <ChevronsUpDown className="size-3.5 shrink-0 opacity-60" />
      </PopoverTrigger>
      <PopoverContent className="w-[var(--anchor-width)] min-w-[12rem] p-2" align="start">
        <Input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search members…"
          className="mb-2 h-8"
          autoFocus
        />
        <div className="max-h-56 overflow-y-auto">
          {filtered.length ? (
            filtered.map((choice) => (
              <button
                key={`${choice.value}:${choice.label}`}
                type="button"
                className="flex w-full rounded-md px-2 py-1.5 text-left text-sm hover:bg-accent"
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
            <p className="px-2 py-1.5 text-sm text-muted-foreground">No matches</p>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}

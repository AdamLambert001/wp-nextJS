"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { AdminSelectOption } from "@/components/admin/admin-select-utils";
import { cn } from "@/lib/utils";

export const ADMIN_SELECT_TRIGGER_CLASS =
  "h-auto min-h-8 w-full max-w-none justify-between py-1.5 whitespace-normal *:data-[slot=select-value]:line-clamp-3 *:data-[slot=select-value]:whitespace-normal *:data-[slot=select-value]:text-left";

export const ADMIN_SELECT_CONTENT_CLASS =
  "min-w-[var(--anchor-width)] max-w-[min(36rem,95vw)]";

type AdminCatalogSelectProps = {
  value: string;
  onValueChange: (value: string) => void;
  options: AdminSelectOption[];
  placeholder?: string;
  disabled?: boolean;
  className?: string;
};

export function AdminCatalogSelect({
  value,
  onValueChange,
  options,
  placeholder,
  disabled = false,
  className,
}: AdminCatalogSelectProps) {
  const selectedLabel = options.find((option) => option.value === value)?.label ?? "";

  return (
    <Select
      value={value}
      onValueChange={(next) => next && onValueChange(next)}
      disabled={disabled}
    >
      <SelectTrigger
        className={cn(ADMIN_SELECT_TRIGGER_CLASS, className)}
        disabled={disabled}
      >
        <SelectValue placeholder={placeholder}>
          {selectedLabel || undefined}
        </SelectValue>
      </SelectTrigger>
      <SelectContent className={ADMIN_SELECT_CONTENT_CLASS}>
        {options.map((option, index) => (
          <SelectItem
            key={option.key ?? `${index}:${option.value}`}
            value={option.value}
            className="whitespace-normal"
          >
            <span className="line-clamp-3 text-left">{option.label}</span>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

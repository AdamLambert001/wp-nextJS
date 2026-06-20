"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { isValidHexColor } from "@/lib/theme-colors";
import { cn } from "@/lib/utils";

type ThemeColorPickerProps = {
  value: string;
  onChange: (hex: string) => void;
  id?: string;
  className?: string;
  disabled?: boolean;
};

function normalizePickerValue(value: string): string {
  return isValidHexColor(value) ? value : "#dc2626";
}

export function ThemeColorPicker({
  value,
  onChange,
  id = "theme-color",
  className,
  disabled = false,
}: ThemeColorPickerProps) {
  const pickerValue = normalizePickerValue(value);

  return (
    <div className={cn("space-y-2", className)}>
      <Label htmlFor={`${id}-picker`}>Accent colour</Label>
      <div className="flex items-center gap-2">
        <Input
          id={`${id}-picker`}
          type="color"
          value={pickerValue}
          onChange={(event) => onChange(event.target.value)}
          disabled={disabled}
          className="h-9 w-14 shrink-0 cursor-pointer p-1"
        />
        <Input
          id={`${id}-hex`}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          disabled={disabled}
          placeholder="#dc2626"
          className="font-mono text-xs"
        />
      </div>
    </div>
  );
}

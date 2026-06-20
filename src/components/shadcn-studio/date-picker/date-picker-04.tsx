"use client";

import { useEffect, useState } from "react";
import { CalendarIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

function formatDisplayDate(date: Date | undefined) {
  if (!date || Number.isNaN(date.getTime())) {
    return "";
  }

  return date.toLocaleDateString("en-US", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

function isValidDate(date: Date | undefined) {
  return Boolean(date && !Number.isNaN(date.getTime()));
}

function isoToDate(iso: string): Date | undefined {
  const trimmed = iso.trim();
  if (!trimmed) return undefined;

  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    const parsed = new Date(`${trimmed}T00:00:00`);
    return Number.isNaN(parsed.getTime()) ? undefined : parsed;
  }

  const parsed = new Date(trimmed);
  return Number.isNaN(parsed.getTime()) ? undefined : parsed;
}

function dateToIso(date: Date | undefined): string {
  if (!isValidDate(date)) return "";

  return [
    date!.getFullYear(),
    String(date!.getMonth() + 1).padStart(2, "0"),
    String(date!.getDate()).padStart(2, "0"),
  ].join("-");
}

function parseInputDate(value: string): Date | undefined {
  const isoDate = isoToDate(value);
  if (isoDate) return isoDate;

  const parsed = new Date(value);
  return isValidDate(parsed) ? parsed : undefined;
}

export type DatePicker04Props = {
  id?: string;
  value: string;
  onValueChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  inputClassName?: string;
  disabled?: boolean;
};

export function DatePicker04({
  id,
  value,
  onValueChange,
  placeholder = "January 01, 2025",
  className,
  inputClassName,
  disabled = false,
}: DatePicker04Props) {
  const [open, setOpen] = useState(false);
  const selectedDate = isoToDate(value);
  const [month, setMonth] = useState<Date | undefined>(selectedDate);
  const [inputValue, setInputValue] = useState(formatDisplayDate(selectedDate));

  useEffect(() => {
    const nextDate = isoToDate(value);
    setInputValue(formatDisplayDate(nextDate));
    if (nextDate) {
      setMonth(nextDate);
    }
  }, [value]);

  return (
    <div className={cn("relative flex gap-2", className)}>
      <Input
        id={id}
        value={inputValue}
        placeholder={placeholder}
        disabled={disabled}
        className={cn("bg-background pr-10", inputClassName)}
        onChange={(event) => {
          const nextInput = event.target.value;
          setInputValue(nextInput);

          const parsed = parseInputDate(nextInput);
          if (parsed) {
            onValueChange(dateToIso(parsed));
            setMonth(parsed);
            return;
          }

          if (!nextInput.trim()) {
            onValueChange("");
          }
        }}
        onKeyDown={(event) => {
          if (event.key === "ArrowDown") {
            event.preventDefault();
            setOpen(true);
          }
        }}
      />
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger
          render={<Button id={id ? `${id}-picker` : undefined} variant="ghost" disabled={disabled} />}
          className="absolute top-1/2 right-2 size-6 -translate-y-1/2 active:-translate-y-1/2"
        >
          <CalendarIcon className="size-3.5" />
          <span className="sr-only">Pick a date</span>
        </PopoverTrigger>
        <PopoverContent
          className="w-auto overflow-hidden p-0"
          align="end"
          alignOffset={-8}
          sideOffset={10}
        >
          <Calendar
            mode="single"
            selected={selectedDate}
            month={month}
            onMonthChange={setMonth}
            onSelect={(date) => {
              if (!date) return;
              onValueChange(dateToIso(date));
              setInputValue(formatDisplayDate(date));
              setOpen(false);
            }}
          />
        </PopoverContent>
      </Popover>
    </div>
  );
}

export default DatePicker04;

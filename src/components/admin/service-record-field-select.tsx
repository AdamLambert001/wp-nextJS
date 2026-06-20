"use client";

import { useMemo } from "react";
import { AdminSearchCombobox } from "@/components/admin/admin-search-combobox";
import { buildAdminSearchChoices } from "@/components/admin/admin-select-utils";
import type { AdminSelectOption } from "@/components/admin/admin-select-utils";
import {
  buildOptionalSelectOptions,
  fromSelectValue,
  toSelectValue,
} from "@/lib/admin/service-record-form-options";

type ServiceRecordFieldSelectProps = {
  value: string | null | undefined;
  onValueChange: (value: string | null) => void;
  options: AdminSelectOption[];
  placeholder: string;
  searchPlaceholder?: string;
  disabled?: boolean;
};

export function ServiceRecordFieldSelect({
  value,
  onValueChange,
  options,
  placeholder,
  searchPlaceholder = "Search…",
  disabled = false,
}: ServiceRecordFieldSelectProps) {
  const choices = useMemo(() => {
    const selectOptions = buildOptionalSelectOptions(options, value);
    return buildAdminSearchChoices(selectOptions);
  }, [options, value]);

  return (
    <AdminSearchCombobox
      value={toSelectValue(value)}
      onChange={(next) => onValueChange(fromSelectValue(next))}
      choices={choices}
      placeholder={placeholder}
      searchPlaceholder={searchPlaceholder}
      emptyLabel="No matches"
      disabled={disabled}
    />
  );
}

"use client";

import { useEffect, useState } from "react";
import type { AdminSelectOption } from "@/components/admin/admin-select-utils";
import {
  buildDetachmentSelectOptions,
  buildRankSelectOptions,
} from "@/lib/admin/service-record-form-options";
import { requestJson } from "@/lib/client/request-json";
import type { OrbatSettings } from "@/lib/orbat/types";
import type { RankCategoryDefinition } from "@/lib/profile/types";

type RanksResponse = {
  ok: boolean;
  rankCategories?: RankCategoryDefinition[];
};

type OrbatResponse = {
  ok: boolean;
  orbatSettings?: OrbatSettings;
};

export function useServiceRecordFormOptions(enabled: boolean) {
  const [rankOptions, setRankOptions] = useState<AdminSelectOption[]>([]);
  const [detachmentOptions, setDetachmentOptions] = useState<AdminSelectOption[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!enabled) {
      return;
    }

    let cancelled = false;
    setLoading(true);

    void (async () => {
      try {
        const [ranksData, orbatData] = await Promise.all([
          requestJson<RanksResponse>("/api/ranks"),
          requestJson<OrbatResponse>("/api/orbat"),
        ]);

        if (cancelled) {
          return;
        }

        setRankOptions(buildRankSelectOptions(ranksData.rankCategories ?? []));
        setDetachmentOptions(buildDetachmentSelectOptions(orbatData.orbatSettings));
      } catch {
        if (!cancelled) {
          setRankOptions([]);
          setDetachmentOptions([]);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [enabled]);

  return { rankOptions, detachmentOptions, loading };
}

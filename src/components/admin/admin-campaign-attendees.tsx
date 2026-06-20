"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  awardCampaignRibbonBulkAction,
  listCampaignQualifiedAttendeesAction,
} from "@/app/admin/actions/campaign-attendees";
import { AdminCollapsibleSection } from "@/components/admin/admin-collapsible-section";
import { AdminCatalogSelect } from "@/components/admin/admin-catalog-select";
import { DatePicker04 } from "@/components/shadcn-studio/date-picker/date-picker-04";
import { AnimatedCollapse, AnimatedCollapseChevron } from "@/components/ui/animated-collapse";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { toast } from "@/lib/toast";
import type { CampaignQualifiedGroup } from "@/lib/admin/campaign-qualified-attendees";
import { todayIsoDate, catalogDisplayName } from "@/lib/admin/service-record-actions/display-utils";
import type { CampaignRibbonSettings } from "@/lib/sr-settings/types";

type AdminCampaignAttendeesProps = {
  ribbons: CampaignRibbonSettings[];
  showSeparatorBefore?: boolean;
};

type CampaignBundle = {
  thresholdNote: string;
  ribbons: Array<{ slug: string; displayName: string }>;
  campaigns: CampaignQualifiedGroup[];
};

function attendeeHasRibbon(
  attendee: CampaignQualifiedGroup["qualifiedAttendees"][number],
  ribbonSlug: string,
): boolean {
  const slug = String(ribbonSlug ?? "").trim().toLowerCase();
  return attendee.existingRibbonSlugs.some((existing) => existing === slug);
}

function CampaignCard({
  campaign,
  ribbons,
  onAwarded,
}: {
  campaign: CampaignQualifiedGroup;
  ribbons: Array<{ slug: string; displayName: string }>;
  onAwarded: () => Promise<void>;
}) {
  const [open, setOpen] = useState(false);
  const [listOpen, setListOpen] = useState(false);
  const [ribbonSlug, setRibbonSlug] = useState(campaign.suggestedRibbonSlug);
  const [awardedAt, setAwardedAt] = useState(todayIsoDate());
  const [saving, setSaving] = useState(false);

  const ribbonOptions = useMemo(
    () =>
      ribbons.map((ribbon) => ({
        value: ribbon.slug,
        label: catalogDisplayName(ribbon.displayName, ribbon.slug),
      })),
    [ribbons],
  );

  const eligibleCount = useMemo(
    () =>
      campaign.qualifiedAttendees.filter((attendee) => !attendeeHasRibbon(attendee, ribbonSlug))
        .length,
    [campaign.qualifiedAttendees, ribbonSlug],
  );

  async function handleAward() {
    if (!ribbonSlug) {
      toast.error("Select a campaign ribbon.");
      return;
    }
    if (!awardedAt) {
      toast.error("Select an award date.");
      return;
    }

    const userIds = campaign.qualifiedAttendees
      .filter((attendee) => !attendeeHasRibbon(attendee, ribbonSlug))
      .map((attendee) => attendee.serviceRecordId)
      .filter(Boolean);

    if (!userIds.length) {
      toast.error("All qualified members already have this ribbon, or none qualify.");
      return;
    }

    const confirmed = window.confirm(
      `Award "${ribbonSlug}" to ${userIds.length} qualified member(s) for ${campaign.campaignTitle} on ${awardedAt}?`,
    );
    if (!confirmed) return;

    setSaving(true);
    try {
      const result = await awardCampaignRibbonBulkAction({
        ribbonSlug,
        awardedAt,
        userIds,
      });
      if (!result.ok) throw new Error(result.message);
      toast.success(
        `Awarded ribbon to ${result.data.awarded} member(s)${
          result.data.skipped ? ` (${result.data.skipped} skipped).` : "."
        }`,
      );
      await onAwarded();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to award ribbons");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="rounded-lg border bg-card">
      <button
        type="button"
        className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left"
        onClick={() => setOpen((current) => !current)}
        aria-expanded={open}
      >
        <div className="flex flex-wrap items-center gap-2">
          <AnimatedCollapseChevron open={open} />
          <span className="font-medium">{campaign.campaignTitle}</span>
          <Badge variant="secondary">{campaign.qualifiedCount} qualified</Badge>
        </div>
        <span className="text-sm text-muted-foreground">
          {campaign.totalOps} operation{campaign.totalOps === 1 ? "" : "s"}
        </span>
      </button>

      <AnimatedCollapse open={open}>
        <div className="space-y-4 border-t px-4 py-4">
          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <Label>Campaign ribbon</Label>
              <AdminCatalogSelect
                value={ribbonSlug}
                onValueChange={setRibbonSlug}
                options={ribbonOptions}
                placeholder="Select ribbon"
              />
            </div>
            <div className="space-y-2">
              <Label>Date awarded</Label>
              <DatePicker04 value={awardedAt} onValueChange={setAwardedAt} />
            </div>
            <div className="flex items-end">
              <Button
                type="button"
                onClick={() => void handleAward()}
                disabled={saving || eligibleCount === 0}
              >
                {saving ? "Awarding…" : `Award to ${eligibleCount} member(s)`}
              </Button>
            </div>
          </div>

          <div className="rounded-md border">
            <button
              type="button"
              className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm font-medium"
              onClick={() => setListOpen((current) => !current)}
              aria-expanded={listOpen}
            >
              <AnimatedCollapseChevron open={listOpen} />
              Qualified members ({campaign.qualifiedAttendees.length})
            </button>
            <AnimatedCollapse open={listOpen}>
              {campaign.qualifiedAttendees.length ? (
                <ul className="space-y-2 border-t px-3 py-3">
                  {campaign.qualifiedAttendees.map((attendee) => {
                    const hasRibbon = attendeeHasRibbon(attendee, ribbonSlug);
                    return (
                      <li
                        key={attendee.serviceRecordId}
                        className="rounded-md border px-3 py-2 text-sm"
                      >
                        <div className={hasRibbon ? "text-muted-foreground" : undefined}>
                          {attendee.memberLabel}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {attendee.attendedOps}/{attendee.totalOps} ops ({attendee.ratioPercent}%)
                          {attendee.thresholdReachedByRounding ? " · rounded to 75%" : ""}
                          {hasRibbon ? " · already has ribbon" : ""}
                        </div>
                      </li>
                    );
                  })}
                </ul>
              ) : (
                <p className="border-t px-3 py-3 text-sm text-muted-foreground">
                  No members reached the campaign attendance threshold yet.
                </p>
              )}
            </AnimatedCollapse>
          </div>
        </div>
      </AnimatedCollapse>
    </div>
  );
}

export function AdminCampaignAttendees({
  ribbons,
  showSeparatorBefore = false,
}: AdminCampaignAttendeesProps) {
  const [open, setOpen] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [loading, setLoading] = useState(false);
  const [bundle, setBundle] = useState<CampaignBundle | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const result = await listCampaignQualifiedAttendeesAction();
      if (!result.ok) throw new Error(result.message);
      setBundle({
        thresholdNote: result.data.thresholdNote,
        ribbons: result.data.ribbons.length ? result.data.ribbons : ribbons,
        campaigns: result.data.campaigns,
      });
      setLoaded(true);
    } finally {
      setLoading(false);
    }
  }, [ribbons]);

  useEffect(() => {
    if (open && !loaded && !loading) {
      void refresh();
    }
  }, [open, loaded, loading, refresh]);

  return (
    <AdminCollapsibleSection
      id="campaign-attendees"
      title="Campaign attendees"
      description="Review members who qualify for campaign ribbons and award ribbons in bulk."
      open={open}
      onToggle={() => setOpen((current) => !current)}
      showSeparatorBefore={showSeparatorBefore}
    >
      <div className="space-y-4 rounded-lg border bg-card p-4">
        <p className="text-sm text-muted-foreground">
          {bundle?.thresholdNote ??
            "Qualified main attendees use the same 75% campaign operation threshold as public profiles (60–74% attendance is rounded up)."}
        </p>

        <Button type="button" onClick={() => void refresh()} disabled={loading}>
          {loading ? "Loading…" : "Refresh campaigns"}
        </Button>

        {loading && !bundle ? (
          <p className="text-sm text-muted-foreground">Loading campaigns…</p>
        ) : null}

        {bundle && !bundle.campaigns.length ? (
          <p className="text-sm text-muted-foreground">
            No campaigns with linked operations found.
          </p>
        ) : null}

        <div className="space-y-3">
          {bundle?.campaigns.map((campaign) => (
            <CampaignCard
              key={campaign.campaignId}
              campaign={campaign}
              ribbons={bundle.ribbons}
              onAwarded={refresh}
            />
          ))}
        </div>
      </div>
    </AdminCollapsibleSection>
  );
}

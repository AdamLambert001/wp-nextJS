"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { requestJson } from "@/lib/client/request-json";
import type {
  PublicCampaignSummary,
  PublicOperationSummary,
} from "@/lib/ops/load";

type OpsBundle = {
  campaigns: PublicCampaignSummary[];
  operations: PublicOperationSummary[];
};

type TimelineMarker =
  | {
      kind: "campaign";
      id: string;
      ms: number;
      campaign: PublicCampaignSummary;
    }
  | {
      kind: "operation";
      id: string;
      ms: number;
      operation: PublicOperationSummary;
    };

type PlacedMarker = TimelineMarker & {
  x: number;
};

const MARKER_SLOT_PX = 116;
const TRACK_PADDING_PX = 48;
const TRACK_MIN_WIDTH_PX = 720;
const TRACK_HEIGHT_PX = 96;
const MS_PER_DAY = 86_400_000;

function ymdToUtcMs(iso: string): number {
  const value = String(iso ?? "").trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return 0;
  const year = Number(value.slice(0, 4));
  const month = Number(value.slice(5, 7)) - 1;
  const day = Number(value.slice(8, 10));
  return Date.UTC(year, month, day);
}

function campaignPlotMs(campaign: PublicCampaignSummary): number {
  return Math.max(
    ymdToUtcMs(campaign.loreDate),
    ymdToUtcMs(campaign.startDate),
    ymdToUtcMs(campaign.endDate),
  );
}

function operationPlotMs(operation: PublicOperationSummary): number {
  return ymdToUtcMs(operation.loreDate) || ymdToUtcMs(operation.postDate);
}

function formatPlotDotLabel(ms: number): string {
  if (!ms) return "";
  const date = new Date(ms);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString(undefined, { year: "numeric", month: "short" });
}

function formatMsAsLocalDate(ms: number): string {
  if (!ms) return "";
  const date = new Date(ms);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function formatCampaignTimelineTooltipDate(
  campaign: PublicCampaignSummary,
  ms: number,
): string {
  if (ymdToUtcMs(campaign.loreDate)) return formatPlotDotLabel(ms);
  return formatMsAsLocalDate(ms);
}

function overviewToPlainSnippet(value: string, maxLen: number): string {
  const text = String(value ?? "")
    .replace(/\[([^\]]*)\]\([^)]+\)/g, "$1")
    .replace(/\r?\n/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (text.length <= maxLen) return text;
  return `${text.slice(0, Math.max(0, maxLen - 1)).trimEnd()}…`;
}

function buildMarkers(bundle: OpsBundle, showCampaigns: boolean, showOps: boolean): TimelineMarker[] {
  const markers: TimelineMarker[] = [];

  if (showCampaigns) {
    for (const campaign of bundle.campaigns) {
      const ms = campaignPlotMs(campaign);
      if (ms <= 0) continue;
      markers.push({
        kind: "campaign",
        id: campaign.id,
        ms,
        campaign,
      });
    }
  }

  if (showOps) {
    for (const operation of bundle.operations) {
      if (String(operation.campaignId ?? "").trim()) continue;
      const ms = operationPlotMs(operation);
      if (ms <= 0) continue;
      markers.push({
        kind: "operation",
        id: operation.opfreindlyname,
        ms,
        operation,
      });
    }
  }

  return markers.sort((a, b) => {
    if (a.ms !== b.ms) return a.ms - b.ms;
    if (a.kind !== b.kind) return a.kind === "operation" ? -1 : 1;
    const titleA =
      a.kind === "campaign"
        ? a.campaign.title
        : a.operation.title || a.operation.opfreindlyname;
    const titleB =
      b.kind === "campaign"
        ? b.campaign.title
        : b.operation.title || b.operation.opfreindlyname;
    return String(titleA).localeCompare(String(titleB));
  });
}

function placeMarkers(markers: TimelineMarker[]): { placed: PlacedMarker[]; trackWidth: number } {
  if (!markers.length) {
    return { placed: [], trackWidth: TRACK_MIN_WIDTH_PX };
  }

  const minMs = markers[0].ms;
  const maxMs = markers[markers.length - 1].ms;
  const innerWidth = Math.max(
    TRACK_MIN_WIDTH_PX - TRACK_PADDING_PX * 2,
    markers.length * MARKER_SLOT_PX,
  );
  const trackWidth = innerWidth + TRACK_PADDING_PX * 2;

  const xs = new Array<number>(markers.length).fill(TRACK_PADDING_PX);

  const msGroups = new Map<number, number[]>();
  markers.forEach((marker, index) => {
    const group = msGroups.get(marker.ms) ?? [];
    group.push(index);
    msGroups.set(marker.ms, group);
  });

  for (const [ms, indices] of msGroups) {
    const ratio = maxMs === minMs ? 0.5 : (ms - minMs) / (maxMs - minMs);
    const anchorX = TRACK_PADDING_PX + ratio * innerWidth;
    const clusterWidth = (indices.length - 1) * MARKER_SLOT_PX;
    const startX = anchorX - clusterWidth / 2;

    indices.forEach((markerIndex, offset) => {
      xs[markerIndex] = startX + offset * MARKER_SLOT_PX;
    });
  }

  const order = markers.map((_, index) => index).sort((a, b) => xs[a] - xs[b]);
  for (let position = 1; position < order.length; position += 1) {
    const previous = order[position - 1];
    const current = order[position];
    if (xs[current] < xs[previous] + MARKER_SLOT_PX) {
      xs[current] = xs[previous] + MARKER_SLOT_PX;
    }
  }

  const finalTrackWidth = Math.max(
    trackWidth,
    Math.max(...xs) + TRACK_PADDING_PX,
  );

  return {
    placed: markers.map((marker, index) => ({
      ...marker,
      x: xs[index],
    })),
    trackWidth: finalTrackWidth,
  };
}

function MarkerTooltip({
  kind,
  title,
  date,
  overview,
}: {
  kind: "campaign" | "operation";
  title: string;
  date: string;
  overview?: string;
}) {
  return (
    <div className="pointer-events-none absolute bottom-full left-1/2 z-20 mb-2 w-max max-w-[min(320px,70vw)] -translate-x-1/2 rounded-lg border border-sky-400/40 bg-background/98 p-3 text-left opacity-0 shadow-lg transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100">
      <p className="text-[0.65rem] font-semibold tracking-wide text-muted-foreground uppercase">
        {kind === "campaign" ? "Campaign" : "Unassigned operation"}
      </p>
      <p className="text-sm font-medium text-sky-300">{title}</p>
      <p className="mt-1 text-xs text-sky-200">{date || "—"}</p>
      {overview ? (
        <p className="mt-2 line-clamp-5 text-sm text-foreground">{overview}</p>
      ) : null}
    </div>
  );
}

function TimelineMarkerNode({
  href,
  ariaLabel,
  shortDate,
  kind,
  title,
  date,
  overview,
}: {
  href: string;
  ariaLabel: string;
  shortDate: string;
  kind: "campaign" | "operation";
  title: string;
  date: string;
  overview?: string;
}) {
  return (
    <Link
      href={href}
      className="group absolute top-1/2 -translate-x-1/2 -translate-y-1/2 focus-visible:outline-none"
      role="listitem"
      aria-label={ariaLabel}
    >
      <MarkerTooltip kind={kind} title={title} date={date} overview={overview} />
      <div className="flex w-[104px] flex-col items-center gap-1.5">
        <span
          className={`w-full truncate text-center text-[0.68rem] leading-none ${
            kind === "campaign" ? "text-sky-300" : "text-muted-foreground"
          }`}
        >
          {shortDate}
        </span>
        {kind === "campaign" ? (
          <span className="block h-3.5 w-3.5 shrink-0 rounded-full bg-sky-400 shadow-[0_0_10px_rgba(56,189,248,0.65)]" />
        ) : (
          <span className="block h-2 w-2 shrink-0 rounded-full border border-slate-500 bg-slate-900" />
        )}
      </div>
    </Link>
  );
}

export function LoreCampaignTimeline() {
  const [bundle, setBundle] = useState<OpsBundle | null>(null);
  const [showCampaigns, setShowCampaigns] = useState(true);
  const [showOps, setShowOps] = useState(true);

  useEffect(() => {
    requestJson<{ campaigns: PublicCampaignSummary[]; operations: PublicOperationSummary[] }>(
      "/api/ops",
    )
      .then((data) =>
        setBundle({
          campaigns: data.campaigns ?? [],
          operations: data.operations ?? [],
        }),
      )
      .catch(() => setBundle({ campaigns: [], operations: [] }));
  }, []);

  const markers = useMemo(() => {
    if (!bundle) return [];
    return buildMarkers(bundle, showCampaigns, showOps);
  }, [bundle, showCampaigns, showOps]);

  const layout = useMemo(() => placeMarkers(markers), [markers]);

  const hasRawData = Boolean(
    bundle &&
      (bundle.campaigns.some((campaign) => campaignPlotMs(campaign) > 0) ||
        bundle.operations.some(
          (operation) =>
            !String(operation.campaignId ?? "").trim() && operationPlotMs(operation) > 0,
        )),
  );

  if (!bundle) {
    return <p className="text-sm text-muted-foreground">Loading campaign timeline…</p>;
  }

  if (!hasRawData) {
    return (
      <p className="text-sm text-muted-foreground">
        No dated campaigns or unassigned operations to show yet. Add dates to campaigns or set
        lore/post dates on operations.
      </p>
    );
  }

  if (!markers.length) {
    return (
      <div>
        <p className="text-sm text-muted-foreground">
          Select at least one option to show markers on the timeline.
        </p>
        <div className="mt-3 border-t border-border/40 pt-3">
          <TimelineFilters
            showCampaigns={showCampaigns}
            showOps={showOps}
            onShowCampaignsChange={setShowCampaigns}
            onShowOpsChange={setShowOps}
          />
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="mt-2 overflow-x-auto overflow-y-hidden rounded-md border border-border/50 bg-background/30">
        <div
          className="relative"
          style={{ width: `${layout.trackWidth}px`, height: `${TRACK_HEIGHT_PX}px` }}
          role="list"
          aria-label="Campaigns and unassigned operations by date"
        >
          <div
            className="pointer-events-none absolute top-[calc(50%+10px)] h-0.5 -translate-y-1/2 bg-gradient-to-r from-transparent via-sky-400/60 to-transparent"
            style={{
              left: `${TRACK_PADDING_PX / 2}px`,
              right: `${TRACK_PADDING_PX / 2}px`,
            }}
          />

          {layout.placed.map((marker) => {
            const style = { left: `${marker.x}px` };

            if (marker.kind === "campaign") {
              const campaign = marker.campaign;
              return (
                <div key={`camp-${marker.id}`} className="absolute" style={style}>
                  <TimelineMarkerNode
                    href={`/ops?campaign=${encodeURIComponent(campaign.slug || campaign.id)}`}
                    ariaLabel={`${campaign.title || "Campaign"}, ${formatCampaignTimelineTooltipDate(campaign, marker.ms)}`}
                    shortDate={formatPlotDotLabel(marker.ms)}
                    kind="campaign"
                    title={campaign.title || "Campaign"}
                    date={formatCampaignTimelineTooltipDate(campaign, marker.ms)}
                    overview={overviewToPlainSnippet(campaign.overview, 260)}
                  />
                </div>
              );
            }

            const operation = marker.operation;
            return (
              <div key={`op-${marker.id}`} className="absolute" style={style}>
                <TimelineMarkerNode
                  href={`/ops/${encodeURIComponent(operation.opfreindlyname)}`}
                  ariaLabel={`${operation.title || operation.opfreindlyname || "Operation"}, unassigned operation, ${formatMsAsLocalDate(marker.ms)}`}
                  shortDate={formatPlotDotLabel(marker.ms)}
                  kind="operation"
                  title={operation.title || operation.opfreindlyname || "Operation"}
                  date={formatMsAsLocalDate(marker.ms)}
                  overview={overviewToPlainSnippet(
                    operation.missionStatement || operation.title,
                    220,
                  )}
                />
              </div>
            );
          })}
        </div>
      </div>

      <p className="mt-2 text-xs text-muted-foreground">
        Scroll horizontally to explore the full timeline. Hover a marker for details.
      </p>

      <div className="mt-3 border-t border-border/40 pt-3">
        <TimelineFilters
          showCampaigns={showCampaigns}
          showOps={showOps}
          onShowCampaignsChange={setShowCampaigns}
          onShowOpsChange={setShowOps}
        />
      </div>
    </div>
  );
}

function TimelineFilters({
  showCampaigns,
  showOps,
  onShowCampaignsChange,
  onShowOpsChange,
}: {
  showCampaigns: boolean;
  showOps: boolean;
  onShowCampaignsChange: (value: boolean) => void;
  onShowOpsChange: (value: boolean) => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-4">
      <span className="text-sm text-muted-foreground">Show</span>
      <Label className="flex items-center gap-2 text-sm">
        <Checkbox
          checked={showCampaigns}
          onCheckedChange={(value) => onShowCampaignsChange(Boolean(value))}
        />
        Campaigns
      </Label>
      <Label className="flex items-center gap-2 text-sm">
        <Checkbox
          checked={showOps}
          onCheckedChange={(value) => onShowOpsChange(Boolean(value))}
        />
        Operations
      </Label>
    </div>
  );
}

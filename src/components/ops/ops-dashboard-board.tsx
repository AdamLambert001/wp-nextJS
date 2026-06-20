"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { toast } from "@/lib/toast";
import { CampaignFormDialog } from "@/components/ops/campaign-form-dialog";
import { OperationFormDialog } from "@/components/ops/operation-form-dialog";
import { OpsMarkdown } from "@/components/ops/ops-markdown";
import { OpsShell } from "@/components/ops/ops-shell";
import {
  buildMonthGroups,
  chipClassForStatus,
  formatCampaignIsoDate,
  formatCampaignLoreMonthYear,
  formatPostDateYmd,
  monthHeadingFromYyyymm,
  progressBadgeClass,
  sortMonthEntries,
  truncateText,
  type MonthEntry,
} from "@/components/ops/ops-utils";
import { Spinner } from "@/components/ui/spinner";
import { ListPagination } from "@/components/ui/list-pagination";
import { requestJson } from "@/lib/client/request-json";
import type { UnitLore } from "@/lib/lore/types";
import type { LegacyCampaign, LegacyOperation, OpsCapabilities } from "@/lib/ops/types";

type OpsBundleResponse = {
  ok: boolean;
  campaigns?: LegacyCampaign[];
  operations?: LegacyOperation[];
  message?: string;
};

type LoreResponse = { ok: boolean; lore?: UnitLore };

const OPS_PER_PAGE = 10;

function matchesSearch(text: string, query: string): boolean {
  if (!query) return true;
  return text.toLowerCase().includes(query.toLowerCase());
}

function OperationCard({
  op,
  canManage,
  onEdit,
  onDelete,
}: {
  op: LegacyOperation;
  canManage: boolean;
  onEdit: (op: LegacyOperation) => void;
  onDelete: (op: LegacyOperation) => void;
}) {
  const postLabel = formatPostDateYmd(op.postDate);
  const loreLabel = op.loreDate ? formatCampaignIsoDate(op.loreDate) : "";

  return (
    <div className="ops-op-card">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h3 className="m-0 text-sm font-bold uppercase tracking-wide text-[#d7f2d0]">
          {op.Operationtitle}
        </h3>
        <div className="flex flex-wrap gap-2">
          <Link className="ops-btn" href={`/ops/${encodeURIComponent(op.opfreindlyname)}`}>
            View
          </Link>
          {canManage ? (
            <>
              <button type="button" className="ops-btn" onClick={() => onEdit(op)}>
                Edit
              </button>
              <button
                type="button"
                className="ops-btn ops-btn--danger"
                onClick={() => onDelete(op)}
              >
                Delete
              </button>
            </>
          ) : null}
        </div>
      </div>
      <div className="ops-meta mt-2">
        {postLabel ? `Posted: ${postLabel}` : null}
        {loreLabel ? `\nLore: ${loreLabel}` : null}
        {op.planet ? `\nPlanet: ${op.planet}` : null}
      </div>
      {op.missionstatement ? (
        <div className="ops-desc mt-2">{truncateText(op.missionstatement, 220)}</div>
      ) : null}
    </div>
  );
}

function CampaignShell({
  camp,
  nested,
  loreTitles,
  collapsed,
  onToggle,
  canManage,
  onEditCampaign,
  onDeleteCampaign,
  onEditOp,
  onDeleteOp,
  searchQuery,
}: {
  camp: LegacyCampaign;
  nested: LegacyOperation[];
  loreTitles: Map<string, string>;
  collapsed: boolean;
  onToggle: () => void;
  canManage: boolean;
  onEditCampaign: (camp: LegacyCampaign) => void;
  onDeleteCampaign: (camp: LegacyCampaign) => void;
  onEditOp: (op: LegacyOperation) => void;
  onDeleteOp: (op: LegacyOperation) => void;
  searchQuery: string;
}) {
  const campSearchText = [
    camp.title,
    camp.overview,
    camp.sector,
    camp.slug,
    ...nested.map((op) => `${op.Operationtitle} ${op.missionstatement}`),
  ].join(" ");
  const visible = matchesSearch(campSearchText, searchQuery);
  const [operationPage, setOperationPage] = useState(1);
  const totalOpPages = Math.max(1, Math.ceil(nested.length / OPS_PER_PAGE));

  useEffect(() => {
    setOperationPage(1);
  }, [nested.length, searchQuery, camp.id]);

  useEffect(() => {
    if (operationPage > totalOpPages) {
      setOperationPage(totalOpPages);
    }
  }, [operationPage, totalOpPages]);

  const paginatedOps = useMemo(() => {
    const startIndex = (operationPage - 1) * OPS_PER_PAGE;
    return nested.slice(startIndex, startIndex + OPS_PER_PAGE);
  }, [nested, operationPage]);

  if (!visible) {
    return null;
  }

  const start = camp.startDate ? formatCampaignIsoDate(camp.startDate) : "Unknown";
  const end = camp.endDate ? formatCampaignIsoDate(camp.endDate) : "Unknown";
  const lore = camp.loreDate ? formatCampaignLoreMonthYear(camp.loreDate) : "";

  return (
    <div
      className={`ops-card ops-campaign-shell${collapsed ? " is-collapsed" : ""}`}
      id={`campaign-${camp.slug}`}
    >
      <div className="ops-campaign-head">
        <button type="button" className="ops-campaign-toggle" onClick={onToggle}>
          <span className="ops-campaign-caret" aria-hidden>
            ▾
          </span>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="m-0 text-sm font-bold">{camp.title}</h2>
              <span className={`ops-progress ${progressBadgeClass(camp.progress)}`}>
                {camp.progress || "Planned"}
              </span>
            </div>
            <div className="ops-meta mt-1">
              {`Start: ${start} · End: ${end}`}
              {lore ? ` · Lore: ${lore}` : ""}
            </div>
          </div>
        </button>
        <div className="flex flex-wrap gap-2">
          {canManage ? (
            <>
              <button type="button" className="ops-btn" onClick={() => onEditCampaign(camp)}>
                Edit
              </button>
              <button
                type="button"
                className="ops-btn ops-btn--danger"
                onClick={() => onDeleteCampaign(camp)}
              >
                Delete
              </button>
            </>
          ) : null}
        </div>
      </div>

      <div className={`ops-campaign-collapse${collapsed ? "" : " is-open"}`}>
        <div className="ops-campaign-collapse-inner">
          <div className="ops-campaign-body">
            <div>
              {camp.linkedAssets?.length ? (
                <div className="mb-4">
                  <h3 className="mb-2 text-xs uppercase tracking-wide">Linked assets</h3>
                  {camp.linkedAssets.map((asset) => (
                    <div key={`${asset.assetId}-${asset.status}`} className="ops-asset-pill">
                      <span className={`ops-chip ${chipClassForStatus(asset.status)}`}>
                        {asset.status}
                      </span>
                      <Link href="/lore" className="ops-chip ops-chip--asset">
                        {loreTitles.get(asset.assetId) || asset.assetId}
                      </Link>
                    </div>
                  ))}
                </div>
              ) : null}
              {camp.additionalIntel?.length ? (
                <div className="mb-4">
                  <h3 className="mb-2 text-xs uppercase tracking-wide">Intel</h3>
                  {camp.additionalIntel.map((row, index) => (
                    <div key={`${row.label}-${index}`} className="ops-meta mb-1">
                      <strong>{row.label}:</strong> {row.value}
                    </div>
                  ))}
                </div>
              ) : null}
              {camp.hostileStrengthLevel ? (
                <div className="ops-meta mb-2">Hostile strength: {camp.hostileStrengthLevel}</div>
              ) : null}
              {camp.sector ? <div className="ops-meta mb-2">Sector: {camp.sector}</div> : null}
            </div>
            <div>
              {camp.overview ? (
                <div className="ops-desc mb-3">
                  <OpsMarkdown text={camp.overview} />
                </div>
              ) : null}
              {camp.hostileAssets ? (
                <div className="ops-desc mb-3">
                  <h3 className="mb-1 text-xs uppercase">Hostile assets</h3>
                  <OpsMarkdown text={camp.hostileAssets} />
                </div>
              ) : null}
              {camp.environmentalThreats ? (
                <div className="ops-desc mb-3">
                  <h3 className="mb-1 text-xs uppercase">Environmental threats</h3>
                  <OpsMarkdown text={camp.environmentalThreats} />
                </div>
              ) : null}
              {paginatedOps.map((op) => (
                <OperationCard
                  key={op.opfreindlyname}
                  op={op}
                  canManage={canManage}
                  onEdit={onEditOp}
                  onDelete={onDeleteOp}
                />
              ))}
              <ListPagination
                currentPage={operationPage}
                totalPages={totalOpPages}
                totalItems={nested.length}
                pageSize={OPS_PER_PAGE}
                onPageChange={setOperationPage}
                selectId={`campaign-ops-page-${camp.id}`}
                className="mt-4 flex flex-col items-center gap-2 sm:flex-row sm:justify-end"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function OpsDashboardBoard() {
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [campaigns, setCampaigns] = useState<LegacyCampaign[]>([]);
  const [operations, setOperations] = useState<LegacyOperation[]>([]);
  const [capabilities, setCapabilities] = useState<OpsCapabilities | null>(null);
  const [loreAssets, setLoreAssets] = useState<UnitLore["assets"]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [collapsedCampaigns, setCollapsedCampaigns] = useState<Record<string, boolean>>({});
  const [opDialogOpen, setOpDialogOpen] = useState(false);
  const [campDialogOpen, setCampDialogOpen] = useState(false);
  const [editingOp, setEditingOp] = useState<LegacyOperation | null>(null);
  const [editingCampaign, setEditingCampaign] = useState<LegacyCampaign | null>(null);

  const canManage = Boolean(capabilities?.canManageOps);

  const loreTitles = useMemo(() => {
    const map = new Map<string, string>();
    for (const asset of loreAssets) {
      map.set(asset.id, asset.title);
    }
    return map;
  }, [loreAssets]);

  const loadData = useCallback(async () => {
    const [opsData, capData, loreData] = await Promise.all([
      requestJson<OpsBundleResponse>(`/api/ops?_=${Date.now()}`),
      requestJson<OpsCapabilities & { ok: boolean }>("/api/ops/capabilities").catch(() => null),
      requestJson<LoreResponse>("/api/lore").catch(() => null),
    ]);

    setCampaigns(opsData.campaigns ?? []);
    setOperations(opsData.operations ?? []);
    if (capData) setCapabilities(capData);
    if (loreData?.lore) setLoreAssets(loreData.lore.assets);
  }, []);

  useEffect(() => {
    loadData()
      .catch((error) => {
        toast.error(error instanceof Error ? error.message : "Failed to load operations");
      })
      .finally(() => setLoading(false));
  }, [loadData]);

  useEffect(() => {
    const editSlug = searchParams.get("edit");
    if (!editSlug || !canManage || loading) return;

    const slug = decodeURIComponent(editSlug.trim());
    requestJson<{ ok: boolean; operation?: LegacyOperation }>(
      `/api/ops/${encodeURIComponent(slug)}`,
    )
      .then((data) => {
        if (data.operation) {
          setEditingOp(data.operation);
          setOpDialogOpen(true);
        }
      })
      .catch(() => {
        toast.error("Could not load operation to edit");
      });
  }, [searchParams, canManage, loading]);

  useEffect(() => {
    const campaignSlug = searchParams.get("campaign");
    if (!campaignSlug) return;
    const element = document.getElementById(`campaign-${campaignSlug}`);
    if (element) {
      element.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [searchParams, campaigns]);

  const monthGroups = useMemo(() => {
    const groups = buildMonthGroups(campaigns, operations);
    const monthKeys = Array.from(groups.keys()).sort((a, b) => {
      if (a === "0000-00") return 1;
      if (b === "0000-00") return -1;
      return b.localeCompare(a);
    });
    return monthKeys.map((key) => ({
      key,
      entries: sortMonthEntries(groups.get(key) ?? []),
    }));
  }, [campaigns, operations]);

  async function handleDeleteOp(op: LegacyOperation) {
    const label = op.Operationtitle || op.opfreindlyname;
    if (!window.confirm(`Delete operation “${label}”? This cannot be undone.`)) return;
    try {
      await requestJson(`/api/ops/${encodeURIComponent(op.opfreindlyname)}`, {
        method: "DELETE",
      });
      toast.success("Operation deleted");
      await loadData();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Delete failed");
    }
  }

  async function handleDeleteCampaign(camp: LegacyCampaign) {
    if (!window.confirm(`Delete campaign “${camp.title}”? Operations will be unlinked.`)) return;
    try {
      await requestJson(`/api/ops/campaigns/${encodeURIComponent(camp.id)}`, {
        method: "DELETE",
      });
      toast.success("Campaign deleted");
      await loadData();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Delete failed");
    }
  }

  function renderEntry(entry: MonthEntry) {
    if (entry.kind === "op") {
      const op = entry.op;
      const text = `${op.Operationtitle} ${op.missionstatement} ${op.opfreindlyname}`;
      if (!matchesSearch(text, searchQuery)) return null;
      return (
        <OperationCard
          key={op.opfreindlyname}
          op={op}
          canManage={canManage}
          onEdit={(value) => {
            setEditingOp(value);
            setOpDialogOpen(true);
          }}
          onDelete={handleDeleteOp}
        />
      );
    }

    return (
      <CampaignShell
        key={entry.camp.id}
        camp={entry.camp}
        nested={entry.nested}
        loreTitles={loreTitles}
        collapsed={Boolean(collapsedCampaigns[entry.camp.id])}
        onToggle={() =>
          setCollapsedCampaigns((current) => ({
            ...current,
            [entry.camp.id]: !current[entry.camp.id],
          }))
        }
        canManage={canManage}
        onEditCampaign={(value) => {
          setEditingCampaign(value);
          setCampDialogOpen(true);
        }}
        onDeleteCampaign={handleDeleteCampaign}
        onEditOp={(value) => {
          setEditingOp(value);
          setOpDialogOpen(true);
        }}
        onDeleteOp={handleDeleteOp}
        searchQuery={searchQuery}
      />
    );
  }

  return (
    <OpsShell>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h1 className="ops-title">Operations</h1>
        {canManage ? (
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              className="ops-btn"
              onClick={() => {
                setEditingCampaign(null);
                setCampDialogOpen(true);
              }}
            >
              Create campaign
            </button>
            <button
              type="button"
              className="ops-btn"
              onClick={() => {
                setEditingOp(null);
                setOpDialogOpen(true);
              }}
            >
              Create operation
            </button>
          </div>
        ) : null}
      </div>

      <input
        className="ops-search"
        placeholder="Search campaigns and operations…"
        value={searchQuery}
        onChange={(event) => setSearchQuery(event.target.value)}
      />

      {loading ? (
        <div className="flex items-center gap-2 py-10">
          <Spinner />
          <span>Loading operations…</span>
        </div>
      ) : !campaigns.length && !operations.length ? (
        <div className="ops-card">
          <div className="ops-desc">
            {canManage
              ? "No campaigns or operations yet. Create a campaign or operation above."
              : "No campaigns or operations found."}
          </div>
        </div>
      ) : (
        monthGroups.map(({ key, entries }) => {
          const rendered = entries.map((entry) => renderEntry(entry)).filter(Boolean);
          if (!rendered.length) return null;
          return (
            <section key={key}>
              <h2 className="ops-month-heading">{monthHeadingFromYyyymm(key)}</h2>
              <div className="flex flex-col gap-3">{rendered}</div>
            </section>
          );
        })
      )}

      <OperationFormDialog
        open={opDialogOpen}
        onOpenChange={setOpDialogOpen}
        campaigns={campaigns}
        operation={editingOp}
        onSaved={loadData}
      />

      <CampaignFormDialog
        open={campDialogOpen}
        onOpenChange={setCampDialogOpen}
        campaign={editingCampaign}
        loreAssets={loreAssets}
        onSaved={loadData}
      />
    </OpsShell>
  );
}

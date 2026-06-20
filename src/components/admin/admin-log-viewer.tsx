"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { ArrowDown, ArrowUp, ArrowUpDown } from "lucide-react";
import {
  listAdminOperationAttendeesAction,
  listAdminProfileLogsAction,
} from "@/app/admin/actions/log-viewer";
import { AdminCollapsibleSection } from "@/components/admin/admin-collapsible-section";
import { AdminSearchCombobox } from "@/components/admin/admin-search-combobox";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ListPagination } from "@/components/ui/list-pagination";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { AdminPickerUser } from "@/lib/admin/load-admin-actions-data";
import type {
  AdminOperationAttendeeRow,
  AdminProfileLogRow,
} from "@/lib/admin/log-viewer";
import { cn } from "@/lib/utils";

type AdminLogViewerProps = {
  users: AdminPickerUser[];
  showSeparatorBefore?: boolean;
};

type ViewType = "profile-logs" | "operation-attendees";
type SortDirection = "asc" | "desc";

const PAGE_SIZE = 25;

const PROFILE_LOG_COLUMNS = [
  { key: "occurredAt", label: "Date" },
  { key: "categoryLabel", label: "Category" },
  { key: "memberLabel", label: "Member" },
  { key: "serviceRecordId", label: "Member ID" },
  { key: "note", label: "Note" },
] as const;

const OPERATION_ATTENDEE_COLUMNS = [
  { key: "postDate", label: "Post date" },
  { key: "operationTitle", label: "Operation" },
  { key: "operationSlug", label: "Slug" },
  { key: "memberLabel", label: "Member" },
  { key: "serviceRecordId", label: "Member ID" },
] as const;

function formatLogViewerDate(value: string): string {
  const raw = String(value ?? "").trim();
  if (!raw) return "—";
  const timestamp = Date.parse(raw);
  if (Number.isNaN(timestamp)) return raw;
  return new Date(timestamp).toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatPostDate(value: string): string {
  const raw = String(value ?? "").trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw || "—";
  const date = new Date(`${raw}T12:00:00`);
  return Number.isNaN(date.getTime())
    ? raw
    : date.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}

function formatCell(key: string, row: Record<string, string>): string {
  const value = row[key] ?? "";
  if (key === "occurredAt") return formatLogViewerDate(value);
  if (key === "postDate") return formatPostDate(value);
  return String(value).trim() || "—";
}

function rowHaystack(row: Record<string, string>): string {
  return Object.values(row)
    .map((value) => String(value ?? ""))
    .join(" ")
    .toLowerCase();
}

function compareRows(
  a: Record<string, string>,
  b: Record<string, string>,
  key: string,
  direction: SortDirection,
): number {
  const dir = direction === "asc" ? 1 : -1;
  const left = String(a[key] ?? "");
  const right = String(b[key] ?? "");

  if (key === "occurredAt" || key === "postDate") {
    const leftTime = Date.parse(left);
    const rightTime = Date.parse(right);
    if (!Number.isNaN(leftTime) && !Number.isNaN(rightTime)) {
      return (leftTime - rightTime) * dir;
    }
  }

  return left.localeCompare(right, undefined, { sensitivity: "base" }) * dir;
}

export function AdminLogViewer({ users, showSeparatorBefore = false }: AdminLogViewerProps) {
  const [open, setOpen] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [loading, setLoading] = useState(false);
  const [viewType, setViewType] = useState<ViewType>("profile-logs");
  const [category, setCategory] = useState("");
  const [memberFilter, setMemberFilter] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [profileLogs, setProfileLogs] = useState<AdminProfileLogRow[]>([]);
  const [operationAttendees, setOperationAttendees] = useState<AdminOperationAttendeeRow[]>([]);
  const [sortKey, setSortKey] = useState("occurredAt");
  const [sortDir, setSortDir] = useState<SortDirection>("desc");
  const [page, setPage] = useState(1);

  const memberChoices = useMemo(
    () =>
      users.map((user) => ({
        value: user.id,
        label: user.label,
        hay: `${user.id} ${user.label}`.toLowerCase(),
      })),
    [users],
  );

  const columns =
    viewType === "profile-logs" ? PROFILE_LOG_COLUMNS : OPERATION_ATTENDEE_COLUMNS;

  const activeRows = useMemo(() => {
    const source =
      viewType === "profile-logs"
        ? profileLogs.map((row) => ({
            occurredAt: row.occurredAt,
            categoryLabel: row.categoryLabel,
            memberLabel: row.memberLabel,
            serviceRecordId: row.serviceRecordId,
            note: row.note,
          }))
        : operationAttendees.map((row) => ({
            postDate: row.postDate,
            operationTitle: row.operationTitle,
            operationSlug: row.operationSlug,
            memberLabel: row.memberLabel,
            serviceRecordId: row.serviceRecordId,
          }));

    const needle = searchQuery.trim().toLowerCase();
    const filtered = needle ? source.filter((row) => rowHaystack(row).includes(needle)) : source;

    return [...filtered].sort((a, b) => compareRows(a, b, sortKey, sortDir));
  }, [viewType, profileLogs, operationAttendees, searchQuery, sortKey, sortDir]);

  const totalPages = Math.max(1, Math.ceil(activeRows.length / PAGE_SIZE));
  const pageRows = activeRows.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      if (viewType === "profile-logs") {
        const result = await listAdminProfileLogsAction({
          category: category || undefined,
          userFilter: memberFilter || undefined,
        });
        if (!result.ok) throw new Error(result.message);
        setProfileLogs(result.data);
      } else {
        const result = await listAdminOperationAttendeesAction({
          userFilter: memberFilter || undefined,
        });
        if (!result.ok) throw new Error(result.message);
        setOperationAttendees(result.data);
      }
      setLoaded(true);
      setPage(1);
    } finally {
      setLoading(false);
    }
  }, [viewType, category, memberFilter]);

  useEffect(() => {
    if (open && !loaded && !loading) {
      void refresh();
    }
  }, [open, loaded, loading, refresh]);

  useEffect(() => {
    setPage(1);
  }, [searchQuery, sortKey, sortDir, viewType]);

  function toggleSection() {
    setOpen((current) => !current);
  }

  function handleViewTypeChange(next: ViewType) {
    setViewType(next);
    setLoaded(false);
    setSortKey(next === "profile-logs" ? "occurredAt" : "postDate");
    setSortDir("desc");
  }

  function handleSort(key: string) {
    if (sortKey === key) {
      setSortDir((current) => (current === "asc" ? "desc" : "asc"));
      return;
    }
    setSortKey(key);
    setSortDir(key === "occurredAt" || key === "postDate" ? "desc" : "asc");
  }

  function sortIcon(key: string) {
    if (sortKey !== key) return <ArrowUpDown className="ml-1 inline size-3.5 opacity-50" />;
    return sortDir === "asc" ? (
      <ArrowUp className="ml-1 inline size-3.5" />
    ) : (
      <ArrowDown className="ml-1 inline size-3.5" />
    );
  }

  return (
    <AdminCollapsibleSection
      id="log-viewer"
      title="Log viewer"
      description="Browse profile activity logs and operation attendee records across all members."
      open={open}
      onToggle={toggleSection}
      showSeparatorBefore={showSeparatorBefore}
    >
      <div className="space-y-4 rounded-lg border bg-card p-4">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <div className="space-y-2">
            <Label htmlFor="log-viewer-view-type">View</Label>
            <Select
              value={viewType}
              onValueChange={(value) => handleViewTypeChange(value as ViewType)}
            >
              <SelectTrigger id="log-viewer-view-type" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="profile-logs">Profile logs</SelectItem>
                <SelectItem value="operation-attendees">Operation attendees</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {viewType === "profile-logs" ? (
            <div className="space-y-2">
              <Label htmlFor="log-viewer-category">Log category</Label>
              <Select
                value={category || "__all__"}
                onValueChange={(value) => setCategory(value === "__all__" || value == null ? "" : value)}
              >
                <SelectTrigger id="log-viewer-category" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all__">All categories</SelectItem>
                  <SelectItem value="ATTENDANCE">Attendance</SelectItem>
                  <SelectItem value="TRAINING">Training</SelectItem>
                  <SelectItem value="RANK">Promotions</SelectItem>
                  <SelectItem value="MEDAL">Medals</SelectItem>
                  <SelectItem value="RIBBON">Ribbons</SelectItem>
                </SelectContent>
              </Select>
            </div>
          ) : null}

          <div className="space-y-2">
            <Label htmlFor="log-viewer-member">Member filter</Label>
            <AdminSearchCombobox
              value={memberFilter}
              onChange={setMemberFilter}
              choices={memberChoices}
              placeholder="All members"
              searchPlaceholder="Search name or ID…"
              emptyLabel="No members found"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="log-viewer-search">Search all columns</Label>
            <Input
              id="log-viewer-search"
              type="search"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="Filter loaded rows…"
            />
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            variant="secondary"
            onClick={() => setMemberFilter("")}
            disabled={!memberFilter}
          >
            Clear member
          </Button>
          <Button type="button" onClick={() => void refresh()} disabled={loading}>
            {loading ? "Loading…" : "Refresh"}
          </Button>
          <p className="text-sm text-muted-foreground">
            {loading
              ? "Loading records…"
              : loaded
                ? `${activeRows.length} row${activeRows.length === 1 ? "" : "s"} shown`
                : "Expand and refresh to load records."}
          </p>
        </div>

        <div className="overflow-x-auto rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                {columns.map((column) => (
                  <TableHead key={column.key}>
                    <button
                      type="button"
                      className="inline-flex items-center font-medium"
                      onClick={() => handleSort(column.key)}
                    >
                      {column.label}
                      {sortIcon(column.key)}
                    </button>
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {pageRows.length ? (
                pageRows.map((row, index) => (
                  <TableRow key={`${row.serviceRecordId}-${index}`}>
                    {columns.map((column) => (
                      <TableCell
                        key={column.key}
                        className={cn(column.key === "note" && "max-w-md whitespace-normal")}
                      >
                        {formatCell(column.key, row)}
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={columns.length} className="text-muted-foreground">
                    {loading ? "Loading…" : "No records match the current filters."}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>

        <ListPagination
          currentPage={page}
          totalPages={totalPages}
          totalItems={activeRows.length}
          pageSize={PAGE_SIZE}
          onPageChange={setPage}
          selectId="log-viewer-page"
        />
      </div>
    </AdminCollapsibleSection>
  );
}

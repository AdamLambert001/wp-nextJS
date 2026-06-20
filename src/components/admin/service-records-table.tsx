"use client";

import { useEffect, useMemo, useState } from "react";
import { ArrowDown, ArrowUp, ArrowUpDown, ChevronDown, Tags } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "@/lib/toast";
import { saveDiscordRolesAction } from "@/app/admin/actions/discord-roles";
import { DetachmentTagBadge } from "@/components/admin/detachment-tag-badge";
import { DetachmentTagsDialog } from "@/components/admin/detachment-tags-dialog";
import { ServiceRecordCreateDialog } from "@/components/admin/service-record-create-dialog";
import { ServiceRecordEditDialog } from "@/components/admin/service-record-edit-dialog";
import { ServiceRecordMemberBadge } from "@/components/admin/service-record-member-badge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
import {
  type DetachmentTagLookup,
  resolveDetachmentTagForAssignment,
} from "@/lib/admin/detachment-tags.shared";
import type { ServiceRecordRow } from "@/lib/admin/service-records";
import {
  formatPanelRoles,
  isDiscordSnowflake,
  PANEL_ROLE_OPTIONS,
  type PanelRole,
} from "@/lib/rbac/panel-roles";
import { cn } from "@/lib/utils";

type ServiceRecordsTableProps = {
  rows: ServiceRecordRow[];
  detachmentTags: DetachmentTagLookup;
  canEditMemberList: boolean;
  canDeleteRecords: boolean;
  canManageRoles: boolean;
  canEditTags: boolean;
};

type SortColumn =
  | "displayName"
  | "rank"
  | "assignment"
  | "lastOperationAttended"
  | "discordId"
  | "panelRoles";

type SortDirection = "asc" | "desc";

const PAGE_SIZE_OPTIONS = [10, 20, 50] as const;
type PageSize = (typeof PAGE_SIZE_OPTIONS)[number];

function rowHaystack(row: ServiceRecordRow): string {
  return [
    row.displayName,
    row.id,
    row.rank,
    row.assignment,
    row.unit,
    row.lastOperationAttended,
    row.discordId,
    row.discordName,
    formatPanelRoles(row.panelRoles),
  ]
    .map((part) => String(part ?? "").trim().toLowerCase())
    .join(" ");
}

function compareNullableStrings(a: string | null | undefined, b: string | null | undefined) {
  const left = String(a ?? "").trim().toLowerCase();
  const right = String(b ?? "").trim().toLowerCase();
  if (!left && !right) return 0;
  if (!left) return 1;
  if (!right) return -1;
  return left.localeCompare(right, undefined, { sensitivity: "base" });
}

function sortRows(
  rows: ServiceRecordRow[],
  column: SortColumn,
  direction: SortDirection,
): ServiceRecordRow[] {
  const factor = direction === "asc" ? 1 : -1;

  return [...rows].sort((a, b) => {
    let result = 0;

    switch (column) {
      case "displayName":
        result = compareNullableStrings(a.displayName, b.displayName);
        break;
      case "rank":
        result = compareNullableStrings(a.rank, b.rank);
        break;
      case "assignment":
        result = compareNullableStrings(a.assignment ?? a.unit, b.assignment ?? b.unit);
        break;
      case "lastOperationAttended":
        result = compareNullableStrings(a.lastOperationAttendedAt, b.lastOperationAttendedAt);
        break;
      case "discordId":
        result = compareNullableStrings(a.discordId, b.discordId);
        break;
      case "panelRoles":
        result = compareNullableStrings(
          formatPanelRoles(a.panelRoles),
          formatPanelRoles(b.panelRoles),
        );
        break;
    }

    if (result !== 0) {
      return result * factor;
    }

    return compareNullableStrings(a.displayName, b.displayName) * factor;
  });
}

function SortableHeader({
  label,
  column,
  activeColumn,
  direction,
  onSort,
  className,
}: {
  label: string;
  column: SortColumn;
  activeColumn: SortColumn;
  direction: SortDirection;
  onSort: (column: SortColumn) => void;
  className?: string;
}) {
  const active = activeColumn === column;
  const Icon = active ? (direction === "asc" ? ArrowUp : ArrowDown) : ArrowUpDown;

  return (
    <TableHead className={className}>
      <button
        type="button"
        className="inline-flex items-center gap-1 font-medium hover:text-foreground"
        onClick={() => onSort(column)}
      >
        {label}
        <Icon className={cn("size-3.5", active ? "text-foreground" : "text-muted-foreground")} />
      </button>
    </TableHead>
  );
}

export function ServiceRecordsTable({
  rows,
  detachmentTags,
  canEditMemberList,
  canDeleteRecords,
  canManageRoles,
  canEditTags,
}: ServiceRecordsTableProps) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [sortColumn, setSortColumn] = useState<SortColumn>("rank");
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");
  const [pageSize, setPageSize] = useState<PageSize>(20);
  const [currentPage, setCurrentPage] = useState(1);
  const [tagsDialogOpen, setTagsDialogOpen] = useState(false);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [rolesTarget, setRolesTarget] = useState<ServiceRecordRow | null>(null);
  const [editTarget, setEditTarget] = useState<ServiceRecordRow | null>(null);
  const [discordId, setDiscordId] = useState("");
  const [discordName, setDiscordName] = useState("");
  const [roles, setRoles] = useState<PanelRole[]>([]);
  const [saving, setSaving] = useState(false);

  const filteredRows = useMemo(() => {
    const needle = query.trim().toLowerCase();
    const matched = needle ? rows.filter((row) => rowHaystack(row).includes(needle)) : rows;
    return sortRows(matched, sortColumn, sortDirection);
  }, [query, rows, sortColumn, sortDirection]);

  const totalPages = Math.max(1, Math.ceil(filteredRows.length / pageSize));
  const safePage = Math.min(currentPage, totalPages);

  const paginatedRows = useMemo(() => {
    const start = (safePage - 1) * pageSize;
    return filteredRows.slice(start, start + pageSize);
  }, [filteredRows, pageSize, safePage]);

  useEffect(() => {
    setCurrentPage(1);
  }, [query, pageSize, sortColumn, sortDirection]);

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  const rangeStart = filteredRows.length ? (safePage - 1) * pageSize + 1 : 0;
  const rangeEnd = filteredRows.length ? Math.min(safePage * pageSize, filteredRows.length) : 0;

  function handleSort(column: SortColumn) {
    if (sortColumn === column) {
      setSortDirection((current) => (current === "asc" ? "desc" : "asc"));
      return;
    }

    setSortColumn(column);
    setSortDirection("asc");
  }

  function openRolesDialog(row: ServiceRecordRow) {
    setRolesTarget(row);
    setDiscordId(row.discordId ?? "");
    setDiscordName(row.discordName ?? row.displayName);
    setRoles(row.panelRoles);
  }

  function closeRolesDialog() {
    setRolesTarget(null);
    setDiscordId("");
    setDiscordName("");
    setRoles([]);
  }

  function toggleRole(role: PanelRole, checked: boolean) {
    setRoles((current) => {
      if (checked) {
        return current.includes(role) ? current : [...current, role];
      }
      return current.filter((item) => item !== role);
    });
  }

  async function handleSaveRoles() {
    if (!rolesTarget) {
      return;
    }

    if (!isDiscordSnowflake(discordId)) {
      toast.error("Enter a valid Discord numeric ID before saving roles.");
      return;
    }

    setSaving(true);
    try {
      const result = await saveDiscordRolesAction({
        discordId,
        serviceRecordId: rolesTarget.id,
        discordName,
        roles,
      });

      if (!result.ok) {
        throw new Error(result.message);
      }

      toast.success(`Roles updated for ${rolesTarget.displayName}`);
      closeRolesDialog();
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to save roles");
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <div className="space-y-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div className="flex-1 space-y-1">
            <Input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search by name, rank, detachment, Discord ID, roles, or last op..."
              aria-label="Search service records"
            />
            <p className="text-xs text-muted-foreground">
              {filteredRows.length
                ? `Showing ${rangeStart}-${rangeEnd} of ${filteredRows.length} filtered member${filteredRows.length === 1 ? "" : "s"} (${rows.length} total)`
                : `No members match your search (${rows.length} total)`}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {canEditMemberList ? (
              <Button type="button" onClick={() => setCreateDialogOpen(true)}>
                Create record
              </Button>
            ) : null}

            <div className="flex items-center gap-2">
              <Label htmlFor="service-records-page-size" className="text-xs text-muted-foreground">
                Rows
              </Label>
              <Select
                value={String(pageSize)}
                onValueChange={(value) => {
                  if (value) setPageSize(Number(value) as PageSize);
                }}
              >
                <SelectTrigger id="service-records-page-size" className="w-20">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PAGE_SIZE_OPTIONS.map((size) => (
                    <SelectItem key={size} value={String(size)}>
                      {size}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {canEditTags ? (
            <DropdownMenu>
            <DropdownMenuTrigger
              className={cn(
                "inline-flex h-9 shrink-0 items-center justify-center gap-1.5 rounded-lg border border-secondary/70 bg-secondary px-3 text-sm font-medium whitespace-nowrap text-secondary-foreground transition-all hover:bg-[color-mix(in_oklch,var(--secondary),var(--foreground)_5%)]",
              )}
            >
              Other actions
              <ChevronDown className="size-4" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem onClick={() => setTagsDialogOpen(true)}>
                <Tags className="size-4" />
                Edit Tags
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
            ) : null}
          </div>
        </div>

        <div className="overflow-hidden rounded-xl border border-border/80 bg-card/20">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/40 hover:bg-muted/40">
                <SortableHeader
                  label="Rank"
                  column="rank"
                  activeColumn={sortColumn}
                  direction={sortDirection}
                  onSort={handleSort}
                />
                <SortableHeader
                  label="Name"
                  column="displayName"
                  activeColumn={sortColumn}
                  direction={sortDirection}
                  onSort={handleSort}
                />
                <SortableHeader
                  label="Detachment"
                  column="assignment"
                  activeColumn={sortColumn}
                  direction={sortDirection}
                  onSort={handleSort}
                />
                <SortableHeader
                  label="Last op attended"
                  column="lastOperationAttended"
                  activeColumn={sortColumn}
                  direction={sortDirection}
                  onSort={handleSort}
                />
                <SortableHeader
                  label="Discord ID"
                  column="discordId"
                  activeColumn={sortColumn}
                  direction={sortDirection}
                  onSort={handleSort}
                />
                <SortableHeader
                  label="Panel roles"
                  column="panelRoles"
                  activeColumn={sortColumn}
                  direction={sortDirection}
                  onSort={handleSort}
                />
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedRows.length ? (
                paginatedRows.map((row, index) => {
                  const detachment =
                    resolveDetachmentTagForAssignment(row.assignment, detachmentTags) ??
                    resolveDetachmentTagForAssignment(row.unit, detachmentTags);
                  const assignmentLabel = row.assignment ?? row.unit ?? null;

                  return (
                  <TableRow
                    key={row.id}
                    className={cn(
                      "transition-colors hover:bg-muted/30",
                      index % 2 === 1 && "bg-muted/10",
                    )}
                  >
                    <TableCell>{row.rank ?? "—"}</TableCell>
                    <TableCell>
                      <ServiceRecordMemberBadge
                        name={row.displayName}
                        avatarUrl={row.avatarUrl}
                        profileId={row.id}
                      />
                    </TableCell>
                    <TableCell>
                      {detachment ? (
                        <DetachmentTagBadge
                          title={detachment.title}
                          color={detachment.color}
                          icon={detachment.icon}
                        />
                      ) : assignmentLabel ? (
                        <span className="text-sm text-muted-foreground">{assignmentLabel}</span>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell>{row.lastOperationAttended ?? "—"}</TableCell>
                    <TableCell className="font-mono text-xs">
                      {row.discordLinked ? (
                        row.discordId
                      ) : (
                        <span className="text-muted-foreground">Not linked</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {row.panelRoles.length ? (
                        <div className="flex flex-wrap gap-1">
                          {row.panelRoles.map((role) => (
                            <Badge key={role} variant="secondary">
                              {PANEL_ROLE_OPTIONS.find((option) => option.id === role)?.label ??
                                role}
                            </Badge>
                          ))}
                        </div>
                      ) : (
                        <span className="text-muted-foreground">No roles</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        {canEditMemberList ? (
                          <Button
                            type="button"
                            size="sm"
                            onClick={() => setEditTarget(row)}
                            className="bg-orange-500 text-white hover:bg-orange-600"
                          >
                            Edit
                          </Button>
                        ) : null}
                        {canManageRoles ? (
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={() => openRolesDialog(row)}
                          >
                            Manage roles
                          </Button>
                        ) : null}
                      </div>
                    </TableCell>
                  </TableRow>
                  );
                })
              ) : (
                <TableRow>
                  <TableCell colSpan={7} className="h-24 text-center text-muted-foreground">
                    {query.trim() ? "No service records match your search." : "No service records found."}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>

        <ListPagination
          currentPage={safePage}
          totalPages={totalPages}
          totalItems={filteredRows.length}
          pageSize={pageSize}
          onPageChange={setCurrentPage}
          selectId="service-records-page"
        />
      </div>

      <DetachmentTagsDialog open={tagsDialogOpen} onClose={() => setTagsDialogOpen(false)} />

      {canEditMemberList ? (
        <>
          <ServiceRecordCreateDialog
            open={createDialogOpen}
            onClose={() => setCreateDialogOpen(false)}
          />

          <ServiceRecordEditDialog
            recordId={editTarget?.id ?? null}
            displayName={editTarget?.displayName ?? ""}
            canDeleteRecord={canDeleteRecords}
            onClose={() => setEditTarget(null)}
          />
        </>
      ) : null}

      <Dialog open={Boolean(rolesTarget)} onOpenChange={(open) => !open && closeRolesDialog()}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Manage panel roles</DialogTitle>
            <DialogDescription>
              Assign panel roles for{" "}
              <span className="font-medium text-foreground">{rolesTarget?.displayName}</span>.
              Roles are stored in the shared <code>discord_roles</code> table.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="discord-id">Discord ID</Label>
              <Input
                id="discord-id"
                value={discordId}
                onChange={(event) => setDiscordId(event.target.value)}
                placeholder="Discord snowflake ID"
                className="font-mono"
              />
              {rolesTarget && !isDiscordSnowflake(rolesTarget.id) ? (
                <p className="text-xs text-muted-foreground">
                  Service record ID is not a Discord snowflake — enter the user&apos;s Discord ID
                  manually.
                </p>
              ) : null}
            </div>

            <div className="space-y-2">
              <Label htmlFor="discord-name">Discord name (optional)</Label>
              <Input
                id="discord-name"
                value={discordName}
                onChange={(event) => setDiscordName(event.target.value)}
                placeholder="Display label in admin tables"
              />
            </div>

            <div className="space-y-3">
              <Label>Roles</Label>
              {PANEL_ROLE_OPTIONS.map((option) => (
                <label
                  key={option.id}
                  className="flex items-start gap-3 rounded-lg border border-border/70 p-3"
                >
                  <Checkbox
                    checked={roles.includes(option.id)}
                    onCheckedChange={(checked) => toggleRole(option.id, checked === true)}
                  />
                  <span className="space-y-1">
                    <span className="block text-sm font-medium">{option.label}</span>
                    <span className="block text-xs text-muted-foreground">{option.description}</span>
                  </span>
                </label>
              ))}
            </div>

            <p className="text-xs text-muted-foreground">
              Current selection: {formatPanelRoles(roles)}
            </p>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={closeRolesDialog} disabled={saving}>
              Cancel
            </Button>
            <Button type="button" onClick={() => void handleSaveRoles()} disabled={saving}>
              {saving ? "Saving..." : "Save roles"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

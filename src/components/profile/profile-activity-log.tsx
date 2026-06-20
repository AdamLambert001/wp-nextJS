"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "@/lib/toast";
import { Trash2 } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { ListPagination } from "@/components/ui/list-pagination";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Spinner } from "@/components/ui/spinner";
import {
  formatBritishOrdinalDayMonthYear,
  logCategoryClassName,
  PROFILE_LOG_CATEGORY_LABELS,
} from "@/lib/profile/formatting";
import type { ProfileLogEntry } from "@/lib/profile/types";

const LOGS_PER_PAGE = 10;

type ProfileActivityLogProps = {
  profileId: string;
  canDeleteLogs: boolean;
  logs: ProfileLogEntry[];
  loading: boolean;
  categoryFilter: string;
  onCategoryFilterChange: (value: string) => void;
  onLogsChanged: () => void;
};

export function ProfileActivityLog({
  profileId,
  canDeleteLogs,
  logs,
  loading,
  categoryFilter,
  onCategoryFilterChange,
  onLogsChanged,
}: ProfileActivityLogProps) {
  const [pendingLog, setPendingLog] = useState<ProfileLogEntry | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);

  const totalPages = Math.max(1, Math.ceil(logs.length / LOGS_PER_PAGE));

  useEffect(() => {
    setCurrentPage(1);
  }, [categoryFilter, logs.length]);

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  const paginatedLogs = useMemo(() => {
    const start = (currentPage - 1) * LOGS_PER_PAGE;
    return logs.slice(start, start + LOGS_PER_PAGE);
  }, [currentPage, logs]);

  async function confirmDelete() {
    if (!pendingLog) return;
    setDeleting(true);
    try {
      const response = await fetch(
        `/api/profiles/${encodeURIComponent(profileId)}/logs/${encodeURIComponent(pendingLog.id)}`,
        { method: "DELETE" },
      );
      const data = (await response.json().catch(() => ({}))) as { message?: string };
      if (!response.ok) {
        throw new Error(data.message || "Failed to delete log");
      }
      toast.success("Log entry deleted.");
      setPendingLog(null);
      onLogsChanged();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to delete log");
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="rounded-xl border border-border/80 bg-card/40 p-4">
      <h3 className="text-lg font-semibold">Activity log</h3>
      <p className="mt-1 text-sm text-muted-foreground">
        Attendance, trainings, promotions, medals, and ribbons recorded from the SR admin tools.
      </p>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <label htmlFor="activity-log-filter" className="text-xs text-muted-foreground">
          Filter
        </label>
        <Select
          value={categoryFilter || "__all__"}
          onValueChange={(value) =>
            onCategoryFilterChange(!value || value === "__all__" ? "" : value)
          }
        >
          <SelectTrigger id="activity-log-filter" size="sm" className="w-[11rem]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__">All</SelectItem>
            {Object.entries(PROFILE_LOG_CATEGORY_LABELS).map(([value, label]) => (
              <SelectItem key={value} value={value}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <div className="mt-4 flex items-center gap-2 text-sm text-muted-foreground">
          <Spinner />
          <span>Loading...</span>
        </div>
      ) : !logs.length ? (
        <p className="mt-4 text-sm text-muted-foreground">No activity log entries yet.</p>
      ) : (
        <>
          <ul className="mt-4 space-y-2">
            {paginatedLogs.map((log) => (
              <li
                key={log.id}
                className={`rounded-r-md border-l-4 bg-muted/20 px-3 py-2 ${logCategoryClassName(log.category)}`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="text-xs text-sky-300">
                      {formatBritishOrdinalDayMonthYear(
                        log.occurredAt.slice(0, 10),
                      ) || new Date(log.occurredAt).toLocaleDateString("en-GB")}
                    </div>
                    <div className="mt-1 text-sm leading-relaxed">{log.note}</div>
                  </div>
                  {canDeleteLogs ? (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      className="shrink-0 text-muted-foreground hover:text-destructive"
                      aria-label="Delete log entry"
                      onClick={() => setPendingLog(log)}
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  ) : null}
                </div>
              </li>
            ))}
          </ul>

          <ListPagination
            currentPage={currentPage}
            totalPages={totalPages}
            totalItems={logs.length}
            pageSize={LOGS_PER_PAGE}
            onPageChange={setCurrentPage}
            selectId="activity-log-page"
          />
        </>
      )}

      <AlertDialog open={Boolean(pendingLog)} onOpenChange={(open) => !open && setPendingLog(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete log entry?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this log? This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              disabled={deleting}
              onClick={(event) => {
                event.preventDefault();
                void confirmDelete();
              }}
            >
              {deleting ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

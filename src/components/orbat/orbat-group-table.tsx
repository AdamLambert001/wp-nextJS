"use client";

import Link from "next/link";
import { useState } from "react";
import { ImageIcon } from "lucide-react";
import { OrbatGroupBackgroundDialog } from "@/components/orbat/orbat-group-background-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import { OrbatMemberCombobox } from "@/components/orbat/orbat-member-combobox";
import { OrbatTrainingBadges } from "@/components/orbat/orbat-training-badges";
import {
  DEFAULT_GROUP_TRAINING_CATEGORY,
  ORBAT_SLOT_OPEN_ID,
  TRAINING_CATEGORY_ANYONE,
} from "@/lib/orbat/constants";
import {
  applyGroupBackgroundStyle,
  applyGroupGradientStyle,
  formatLastOp,
  resolveOrbatDisplayName,
} from "@/lib/orbat/display";
import { slugifyInput } from "@/lib/orbat/normalize";
import {
  effectiveTrainingCategoryId,
  shouldHideTrainingsColumn,
} from "@/lib/orbat/training";
import type {
  OrbatCategory,
  OrbatGroup,
  OrbatMemberOption,
  OrbatRow,
  OrbatUserSummary,
  TrainingCategorySummary,
} from "@/lib/orbat/types";
import type { OrbatDragState } from "@/components/orbat/types";
import { cn } from "@/lib/utils";

type OrbatGroupTableProps = {
  category: OrbatCategory;
  categoryIndex: number;
  group: OrbatGroup;
  groupIndex: number;
  editMode: boolean;
  canEditStructure: boolean;
  canAssignPositions: boolean;
  usersById: Record<string, OrbatUserSummary>;
  members: OrbatMemberOption[];
  trainingCategories: TrainingCategorySummary[];
  drag: OrbatDragState;
  onDragChange: (drag: OrbatDragState) => void;
  onGroupChange: (group: OrbatGroup) => void;
  onRemoveGroup: () => void;
  onRowDrop: (targetRowIndex: number) => void;
};

function userFor(
  assignedUserId: string,
  usersById: Record<string, OrbatUserSummary>,
  members: OrbatMemberOption[],
): OrbatUserSummary | null {
  const key = String(assignedUserId ?? "").trim();
  if (!key || key === ORBAT_SLOT_OPEN_ID) return null;
  if (usersById[key]) return usersById[key];

  const member = members.find((entry) => entry.id === key);
  if (!member) return null;

  return {
    id: member.id,
    displayName: member.displayName,
    firstName: String(member.firstName ?? "").trim(),
    lastName: String(member.lastName ?? "").trim(),
    rank: String(member.rank ?? "").trim(),
    operationCount: 0,
    coolDown: 0,
    trainings: [],
    lastOperationAttended: null,
  };
}

function NameCellRead({
  assignedUserId,
  usersById,
  members,
}: {
  assignedUserId: string;
  usersById: Record<string, OrbatUserSummary>;
  members: OrbatMemberOption[];
}) {
  const value = String(assignedUserId ?? "").trim();

  if (value === ORBAT_SLOT_OPEN_ID) {
    return <span className="font-semibold text-green-400">OPEN</span>;
  }

  if (!value) {
    return <span className="font-semibold text-red-400">CLOSED</span>;
  }

  const user = userFor(value, usersById, members);
  if (!user) {
    return <span>{value}</span>;
  }

  return (
    <Link href={`/profile/${encodeURIComponent(user.id)}`} className="font-medium text-sky-300 hover:underline">
      {resolveOrbatDisplayName(user)}
    </Link>
  );
}

export function OrbatGroupTable({
  category,
  categoryIndex,
  group,
  groupIndex,
  editMode,
  canEditStructure,
  canAssignPositions,
  usersById,
  members,
  trainingCategories,
  drag,
  onDragChange,
  onGroupChange,
  onRemoveGroup,
  onRowDrop,
}: OrbatGroupTableProps) {
  const [backgroundDialogOpen, setBackgroundDialogOpen] = useState(false);
  const structEdit = editMode && canEditStructure;
  const assignEdit = editMode && (canAssignPositions || canEditStructure);
  const trainingCategoryId = effectiveTrainingCategoryId(category, group);
  const hideTrainings = shouldHideTrainingsColumn(trainingCategoryId);
  const hasBackgroundImage = Boolean(String(group.backgroundImage ?? "").trim());

  function updateRow(rowIndex: number, patch: Partial<OrbatRow>) {
    const rows = group.rows.map((row, index) =>
      index === rowIndex ? { ...row, ...patch } : row,
    );
    onGroupChange({ ...group, rows });
  }

  function addRow() {
    onGroupChange({
      ...group,
      rows: [
        ...group.rows,
        {
          id: "",
          position: "",
          assignedUserId: ORBAT_SLOT_OPEN_ID,
          lastEditedAt: "",
        },
      ],
    });
  }

  function removeRow(rowIndex: number) {
    onGroupChange({
      ...group,
      rows: group.rows.filter((_, index) => index !== rowIndex),
    });
  }

  return (
    <div className="mb-3 overflow-visible rounded-lg border border-border/80 bg-card/40">
      <div
        className="flex items-center justify-between gap-2 border-b border-border/80 px-3 py-2"
        style={applyGroupGradientStyle(group.color)}
      >
        {structEdit ? (
          <div className="flex flex-wrap items-center gap-2">
            <Input
              value={group.title}
              onChange={(event) =>
                onGroupChange({ ...group, title: event.target.value })
              }
              placeholder="Group title"
              className="h-8 max-w-xs"
            />
            <span className="text-xs text-muted-foreground">Trainings</span>
            <Select
              value={group.trainingCategoryId || "__auto__"}
              onValueChange={(value) =>
                onGroupChange({
                  ...group,
                  trainingCategoryId:
                    !value || value === "__auto__" ? "" : value,
                })
              }
            >
              <SelectTrigger size="sm" className="h-8 w-[11rem]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__auto__">Auto (legacy)</SelectItem>
                <SelectItem value={TRAINING_CATEGORY_ANYONE}>
                  Anyone (no badges)
                </SelectItem>
                {trainingCategories.map((entry) => (
                  <SelectItem key={entry.id} value={entry.id}>
                    {entry.title || entry.id}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <span className="text-xs text-muted-foreground">Color</span>
            <input
              type="color"
              value={/^#[0-9a-fA-F]{6}$/.test(group.color) ? group.color : "#334155"}
              onChange={(event) =>
                onGroupChange({ ...group, color: event.target.value })
              }
              className="h-8 w-9 rounded border border-border bg-background p-0.5"
              aria-label="Group color"
            />
            <Button
              type="button"
              variant={hasBackgroundImage ? "default" : "outline"}
              size="sm"
              className="h-8"
              onClick={() => setBackgroundDialogOpen(true)}
            >
              <ImageIcon className="size-3.5" />
              Background
            </Button>
            <OrbatGroupBackgroundDialog
              open={backgroundDialogOpen}
              onOpenChange={setBackgroundDialogOpen}
              value={group.backgroundImage}
              groupTitle={group.title}
              onChange={(backgroundImage) => onGroupChange({ ...group, backgroundImage })}
            />
          </div>
        ) : (
          <span className="font-semibold">{group.title || "Group"}</span>
        )}
        {structEdit ? (
          <Button type="button" variant="destructive" size="sm" onClick={onRemoveGroup}>
            Remove Group
          </Button>
        ) : null}
      </div>

      <div
        className={cn(
          "relative overflow-x-auto",
          hasBackgroundImage && "p-5 md:p-6",
        )}
      >
        {hasBackgroundImage ? (
          <>
            <div
              aria-hidden
              className="pointer-events-none absolute inset-5 rounded-lg opacity-35 md:inset-6"
              style={applyGroupBackgroundStyle(group.backgroundImage)}
            />
            <div
              aria-hidden
              className="pointer-events-none absolute inset-5 rounded-lg bg-background/75 md:inset-6"
            />
          </>
        ) : null}
        <Table className="relative min-w-[960px]">
          <TableHeader>
            <TableRow>
              <TableHead>Position</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Rank</TableHead>
              {!hideTrainings ? <TableHead>Trainings</TableHead> : null}
              <TableHead className="text-center">Main Ops</TableHead>
              <TableHead className="text-center">Cool Down</TableHead>
              <TableHead className="text-center">Last Op</TableHead>
              {structEdit ? <TableHead className="text-center">Actions</TableHead> : null}
            </TableRow>
          </TableHeader>
          <TableBody>
            {group.rows.map((row, rowIndex) => {
              const user = userFor(row.assignedUserId, usersById, members);
              const isDropTarget =
                drag?.type === "row" &&
                drag.catIdx === categoryIndex &&
                drag.groupIdx === groupIndex;

              return (
                <TableRow
                  key={`${row.id}:${rowIndex}`}
                  className={isDropTarget ? "ring-1 ring-sky-400/60" : undefined}
                  onDragOver={(event) => {
                    if (drag?.type !== "row") return;
                    event.preventDefault();
                  }}
                  onDrop={(event) => {
                    if (drag?.type !== "row") return;
                    event.preventDefault();
                    onRowDrop(rowIndex);
                  }}
                >
                  <TableCell>
                    {structEdit ? (
                      <Input
                        value={row.position}
                        onChange={(event) =>
                          updateRow(rowIndex, {
                            position: event.target.value,
                            lastEditedAt: new Date().toISOString(),
                          })
                        }
                        placeholder="Position"
                        className="h-8"
                      />
                    ) : (
                      row.position || "-"
                    )}
                  </TableCell>
                  <TableCell>
                    {assignEdit ? (
                      <OrbatMemberCombobox
                        value={row.assignedUserId}
                        members={members}
                        onChange={(assignedUserId) =>
                          updateRow(rowIndex, {
                            assignedUserId,
                            lastEditedAt: new Date().toISOString(),
                          })
                        }
                      />
                    ) : (
                      <NameCellRead
                        assignedUserId={row.assignedUserId}
                        usersById={usersById}
                        members={members}
                      />
                    )}
                  </TableCell>
                  <TableCell>{user?.rank || "-"}</TableCell>
                  {!hideTrainings ? (
                    <TableCell>
                      <OrbatTrainingBadges
                        user={user}
                        trainingCategoryId={trainingCategoryId}
                        trainingCategories={trainingCategories}
                      />
                    </TableCell>
                  ) : null}
                  <TableCell className="text-center">
                    {user?.operationCount ?? 0}
                  </TableCell>
                  <TableCell className="text-center">{user?.coolDown ?? 0}</TableCell>
                  <TableCell className="text-center">
                    {user ? formatLastOp(user.lastOperationAttended) : "-"}
                  </TableCell>
                  {structEdit ? (
                    <TableCell className="text-center">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          type="button"
                          draggable
                          className="cursor-grab rounded border border-dashed border-border px-2 py-0.5 text-xs text-sky-300"
                          onDragStart={() =>
                            onDragChange({
                              type: "row",
                              catIdx: categoryIndex,
                              groupIdx: groupIndex,
                              rowIdx: rowIndex,
                            })
                          }
                          onDragEnd={() => onDragChange(null)}
                        >
                          Drag
                        </button>
                        <Button
                          type="button"
                          variant="destructive"
                          size="sm"
                          onClick={() => removeRow(rowIndex)}
                        >
                          Remove
                        </Button>
                      </div>
                    </TableCell>
                  ) : null}
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      {structEdit ? (
        <div className="border-t border-border/80 px-3 py-2">
          <Button type="button" variant="secondary" size="sm" onClick={addRow}>
            Add Row
          </Button>
        </div>
      ) : null}
    </div>
  );
}

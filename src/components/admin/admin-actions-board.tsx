"use client";

import { GradientSeparator } from "@/components/shadcn-studio/separator/separator-06";
import { DatePicker04 } from "@/components/shadcn-studio/date-picker/date-picker-04";
import { AnimatedCollapse, AnimatedCollapseChevron } from "@/components/ui/animated-collapse";
import { useMemo, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { toast } from "@/lib/toast";
import { addMedalAction } from "@/app/admin/actions/add-medal";
import { addRibbonAction } from "@/app/admin/actions/add-ribbon";
import { editMedalAction } from "@/app/admin/actions/edit-medal";
import { editRibbonAction } from "@/app/admin/actions/edit-ribbon";
import { awardMedalAction } from "@/app/admin/actions/award-medal";
import { awardRibbonAction } from "@/app/admin/actions/award-ribbon";
import { changeRankAction } from "@/app/admin/actions/change-rank";
import { deleteMedalAction } from "@/app/admin/actions/delete-medal";
import { markAttendanceAction } from "@/app/admin/actions/mark-attendance";
import { markTrainingAction } from "@/app/admin/actions/mark-training";
import {
  listAttendanceLogsAction,
  listMedalAwardsAction,
} from "@/app/admin/actions/queries";
import { removeAttendanceAction } from "@/app/admin/actions/remove-attendance";
import { removeMedalAction } from "@/app/admin/actions/remove-medal";
import {
  formatAttendanceLogOption,
  medalAwardSelectValue,
  parseMedalAwardSelectValue,
  UserPicker,
} from "@/components/admin/user-picker";
import { AdminCatalogSelect } from "@/components/admin/admin-catalog-select";
import { AdminSearchCombobox } from "@/components/admin/admin-search-combobox";
import {
  buildAttendanceLogSearchChoices,
  buildOperationSearchChoices,
} from "@/components/admin/admin-select-utils";
import { ImageUrlOrUpload } from "@/components/edgestore/image-url-or-upload";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { todayIsoDate, catalogDisplayName } from "@/lib/admin/service-record-actions/display-utils";
import type { AdminActionsData } from "@/lib/admin/load-admin-actions-data";
import { slugifyInput } from "@/lib/sr-settings/slug";
import { SiteSecondaryColorDialog } from "@/components/admin/site-secondary-color-dialog";
import { HomePageEditorDialog } from "@/components/admin/home-page-editor-dialog";

type AdminActionsBoardProps = {
  data: AdminActionsData;
};


type DialogKey =
  | "markAttendance"
  | "removeAttendance"
  | "markTraining"
  | "changeRank"
  | "awardMedal"
  | "awardRibbon"
  | "removeMedal"
  | "deleteMedal"
  | "addMedal"
  | "addRibbon"
  | "editMedal"
  | "editRibbon"
  | null;

const MEMBER_ACTION_DIALOG_CLASS =
  "flex max-h-[min(92vh,920px)] w-[min(96vw,48rem)] max-w-[48rem] flex-col gap-0 overflow-hidden p-0 sm:max-w-[48rem]";
const FORM_ACTION_DIALOG_CLASS = "sm:max-w-xl";
const UPLOAD_FORM_DIALOG_CLASS =
  "flex max-h-[min(92vh,820px)] flex-col gap-0 overflow-hidden p-0 sm:max-w-xl";

function ActionCard({
  title,
  description,
  buttonLabel,
  onOpen,
  variant = "default",
}: {
  title: string;
  description: string;
  buttonLabel: string;
  onOpen: () => void;
  variant?: "default" | "secondary" | "destructive";
}) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        <Button type="button" variant={variant} onClick={onOpen}>
          {buttonLabel}
        </Button>
      </CardContent>
    </Card>
  );
}

function ActionCategorySection({
  id,
  title,
  open,
  onToggle,
  showSeparatorBefore = false,
  children,
}: {
  id: string;
  title: string;
  open: boolean;
  onToggle: (id: string) => void;
  showSeparatorBefore?: boolean;
  children: ReactNode;
}) {
  return (
    <section className="space-y-4">
      {showSeparatorBefore ? <GradientSeparator /> : null}
      <button
        type="button"
        className="flex w-full items-center gap-2 rounded-md text-left transition-colors hover:text-foreground/80"
        onClick={() => onToggle(id)}
        aria-expanded={open}
      >
        <AnimatedCollapseChevron open={open} />
        <h2 className="text-lg font-semibold">{title}</h2>
      </button>
      <AnimatedCollapse open={open}>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{children}</div>
      </AnimatedCollapse>
    </section>
  );
}

export function AdminActionsBoard({ data }: AdminActionsBoardProps) {
  const router = useRouter();
  const { capabilities, users, settings, operations, orbatSections, secondaryColorHex } = data;
  const [openDialog, setOpenDialog] = useState<DialogKey>(null);
  const [siteColorDialogOpen, setSiteColorDialogOpen] = useState(false);
  const [homePageDialogOpen, setHomePageDialogOpen] = useState(false);
  const [siteSecondaryColorHex, setSiteSecondaryColorHex] = useState(secondaryColorHex);
  const [saving, setSaving] = useState(false);
  const [orbatFilterKey, setOrbatFilterKey] = useState("");
  const [collapsedCategories, setCollapsedCategories] = useState<Record<string, boolean>>({});

  const [pickedIds, setPickedIds] = useState<Set<string>>(new Set());
  const [trainingSlug, setTrainingSlug] = useState("");
  const [operationDate, setOperationDate] = useState(todayIsoDate());
  const [opSlug, setOpSlug] = useState("");
  const [rankDirection, setRankDirection] = useState<"promote" | "demote">("promote");
  const [rankCategoryId, setRankCategoryId] = useState("");
  const [medalSlug, setMedalSlug] = useState("");
  const [ribbonSlug, setRibbonSlug] = useState("");
  const [awardDate, setAwardDate] = useState(todayIsoDate());
  const [attendanceLogs, setAttendanceLogs] = useState<
    Array<{ id: string; occurredAt: string; note: string }>
  >([]);
  const [selectedLogId, setSelectedLogId] = useState("");
  const [medalAwards, setMedalAwards] = useState<
    Array<{ medalSlug: string; awardedAt: string; displayName: string }>
  >([]);
  const [selectedMedalAward, setSelectedMedalAward] = useState("");
  const [deleteMedalSlug, setDeleteMedalSlug] = useState("");
  const [addMedalSlug, setAddMedalSlug] = useState("");
  const [addMedalName, setAddMedalName] = useState("");
  const [addMedalUrl, setAddMedalUrl] = useState("");
  const [addMedalDescription, setAddMedalDescription] = useState("");
  const [addRibbonSlug, setAddRibbonSlug] = useState("");
  const [addRibbonName, setAddRibbonName] = useState("");
  const [addRibbonUrl, setAddRibbonUrl] = useState("");
  const [addRibbonDescription, setAddRibbonDescription] = useState("");
  const [editMedalSlug, setEditMedalSlug] = useState("");
  const [editMedalName, setEditMedalName] = useState("");
  const [editMedalUrl, setEditMedalUrl] = useState("");
  const [editMedalDescription, setEditMedalDescription] = useState("");
  const [editRibbonSlug, setEditRibbonSlug] = useState("");
  const [editRibbonName, setEditRibbonName] = useState("");
  const [editRibbonUrl, setEditRibbonUrl] = useState("");
  const [editRibbonDescription, setEditRibbonDescription] = useState("");

  const trainingOptions = useMemo(
    () =>
      settings.trainingCategories.flatMap((category) =>
        category.items.map((item) => ({
          slug: item.slug,
          label: catalogDisplayName(item.label, item.slug),
          key: `${category.id}:${item.slug}`,
        })),
      ),
    [settings.trainingCategories],
  );

  const trainingSelectOptions = useMemo(
    () =>
      trainingOptions.map((option) => ({
        value: option.slug,
        label: option.label,
        key: option.key,
      })),
    [trainingOptions],
  );

  const medalSelectOptions = useMemo(
    () =>
      settings.medals.map((medal) => ({
        value: medal.slug,
        label: catalogDisplayName(medal.displayName, medal.slug),
      })),
    [settings.medals],
  );

  const ribbonSelectOptions = useMemo(
    () =>
      settings.campaignRibbons.map((ribbon) => ({
        value: ribbon.slug,
        label: catalogDisplayName(ribbon.displayName, ribbon.slug),
      })),
    [settings.campaignRibbons],
  );

  const rankCategorySelectOptions = useMemo(
    () => [
      { value: "__same__", label: "Same route (current)" },
      ...settings.rankCategories.map((category) => ({
        value: category.id,
        label: catalogDisplayName(category.title, category.id),
      })),
    ],
    [settings.rankCategories],
  );

  const rankDirectionOptions = useMemo(
    () => [
      { value: "promote", label: "Promote" },
      { value: "demote", label: "Demote" },
    ],
    [],
  );

  const operationSearchChoices = useMemo(
    () => buildOperationSearchChoices(operations),
    [operations],
  );

  const attendanceLogSearchChoices = useMemo(
    () => buildAttendanceLogSearchChoices(attendanceLogs, formatAttendanceLogOption),
    [attendanceLogs],
  );

  const medalAwardSelectOptions = useMemo(
    () =>
      medalAwards.map((award) => ({
        value: medalAwardSelectValue(award),
        label: `${catalogDisplayName(award.displayName, award.medalSlug)} — ${award.awardedAt}`,
      })),
    [medalAwards],
  );

  const attendanceCap = capabilities.effectiveSrAdmin ? 20 : 5;
  const canBulk = capabilities.effectiveSrAdmin || capabilities.srSquadLeader;
  const canTrain = capabilities.effectiveSrAdmin || capabilities.srTrainer;
  const isPanelAdmin = capabilities.canManageServer;

  function populateEditMedal(slug: string) {
    const medal = settings.medals.find((entry) => entry.slug === slug);
    if (!medal) return;
    setEditMedalSlug(slug);
    setEditMedalName(medal.displayName);
    setEditMedalUrl(medal.pictureUrl);
    setEditMedalDescription(medal.description);
  }

  function populateEditRibbon(slug: string) {
    const ribbon = settings.campaignRibbons.find((entry) => entry.slug === slug);
    if (!ribbon) return;
    setEditRibbonSlug(slug);
    setEditRibbonName(ribbon.displayName);
    setEditRibbonUrl(ribbon.pictureUrl);
    setEditRibbonDescription(ribbon.description);
  }

  function resetPicker() {
    setPickedIds(new Set());
  }

  function closeDialog() {
    setOpenDialog(null);
    resetPicker();
    setOrbatFilterKey("");
    setSelectedLogId("");
    setSelectedMedalAward("");
    setAttendanceLogs([]);
    setMedalAwards([]);
  }

  function openDialogWithDefaults(key: DialogKey) {
    resetPicker();
    setOrbatFilterKey("");
    setOperationDate(todayIsoDate());
    setAwardDate(todayIsoDate());
    setTrainingSlug(trainingOptions[0]?.slug ?? "");
    setMedalSlug(settings.medals[0]?.slug ?? "");
    setRibbonSlug(settings.campaignRibbons[0]?.slug ?? "");
    setDeleteMedalSlug(settings.medals[0]?.slug ?? "");
    setRankCategoryId("");
    setRankDirection("promote");
    setOpSlug(operations[0]?.slug ?? "");
    setOpenDialog(key);
  }

  const userPickerProps = {
    users,
    selectedIds: pickedIds,
    onChange: setPickedIds,
    orbatSections,
    orbatFilter: orbatFilterKey,
    onOrbatFilterChange: setOrbatFilterKey,
  } as const;

  async function syncAttendanceLogs(userId: string) {
    const result = await listAttendanceLogsAction(userId);
    if (!result.ok) {
      toast.error(result.message);
      setAttendanceLogs([]);
      return;
    }
    setAttendanceLogs(result.data);
    setSelectedLogId("");
  }

  async function syncMedalAwards(userId: string) {
    const result = await listMedalAwardsAction(userId);
    if (!result.ok) {
      toast.error(result.message);
      setMedalAwards([]);
      return;
    }
    setMedalAwards(result.data);
    setSelectedMedalAward("");
  }

  async function handleMarkTraining() {
    setSaving(true);
    try {
      const result = await markTrainingAction({
        trainingSlug,
        userIds: Array.from(pickedIds),
      });
      if (!result.ok) throw new Error(result.message);
      toast.success("Training marked successfully.");
      closeDialog();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to mark training");
    } finally {
      setSaving(false);
    }
  }

  async function handleMarkAttendance() {
    setSaving(true);
    try {
      const result = await markAttendanceAction({
        userIds: Array.from(pickedIds),
        operationDate,
        opSlug,
      });
      if (!result.ok) throw new Error(result.message);
      const changed = result.data.results.filter((row) => row.ok).length;
      toast.success(`Attendance marked. ${changed}/${pickedIds.size} updated.`);
      closeDialog();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to mark attendance");
    } finally {
      setSaving(false);
    }
  }

  async function handleRemoveAttendance() {
    const userId = Array.from(pickedIds)[0];
    if (!userId || !selectedLogId) {
      toast.error("Select one member and an attendance log.");
      return;
    }
    setSaving(true);
    try {
      const result = await removeAttendanceAction({ userId, logId: selectedLogId });
      if (!result.ok) throw new Error(result.message);
      if (result.data.warning) toast.info(result.data.warning);
      toast.success(
        `Attendance removed. Ops: ${result.data.operationCount} | Cooldown: ${result.data.coolDown}.`,
      );
      closeDialog();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to remove attendance");
    } finally {
      setSaving(false);
    }
  }

  async function handleChangeRank() {
    setSaving(true);
    try {
      const result = await changeRankAction({
        direction: rankDirection,
        userIds: Array.from(pickedIds),
        ...(rankCategoryId ? { targetCategoryId: rankCategoryId } : {}),
      });
      if (!result.ok) throw new Error(result.message);
      const changed = result.data.results.filter((row) => row.ok).length;
      toast.success(`Rank update done. ${changed}/${pickedIds.size} changed.`);
      closeDialog();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to change rank");
    } finally {
      setSaving(false);
    }
  }

  async function handleAwardMedal() {
    setSaving(true);
    try {
      const result = await awardMedalAction({
        medalSlug,
        awardedAt: awardDate,
        userIds: Array.from(pickedIds),
      });
      if (!result.ok) throw new Error(result.message);
      toast.success("Medal awarded successfully.");
      closeDialog();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to award medal");
    } finally {
      setSaving(false);
    }
  }

  async function handleAwardRibbon() {
    setSaving(true);
    try {
      const result = await awardRibbonAction({
        ribbonSlug,
        awardedAt: awardDate,
        userIds: Array.from(pickedIds),
      });
      if (!result.ok) throw new Error(result.message);
      toast.success("Ribbon awarded successfully.");
      closeDialog();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to award ribbon");
    } finally {
      setSaving(false);
    }
  }

  async function handleRemoveMedal() {
    const userId = Array.from(pickedIds)[0];
    const { medalSlug: slug, awardedAt } = parseMedalAwardSelectValue(selectedMedalAward);
    if (!userId || !slug || !awardedAt) {
      toast.error("Select one member and a medal award.");
      return;
    }
    setSaving(true);
    try {
      const result = await removeMedalAction({ userId, medalSlug: slug, awardedAt });
      if (!result.ok) throw new Error(result.message);
      toast.success(`Removed ${result.data.medalName} (${awardedAt}) from member.`);
      closeDialog();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to remove medal");
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteMedal() {
    if (!deleteMedalSlug) {
      toast.error("Select a medal to delete.");
      return;
    }
    const label =
      settings.medals.find((medal) => medal.slug === deleteMedalSlug)?.displayName ??
      deleteMedalSlug;
    if (
      !window.confirm(
        `Delete "${label}" permanently?\n\nThis removes the medal from settings and strips it from every profile. This cannot be undone.`,
      )
    ) {
      return;
    }
    setSaving(true);
    try {
      const result = await deleteMedalAction({ medalSlug: deleteMedalSlug });
      if (!result.ok) throw new Error(result.message);
      toast.success(
        `Deleted medal. Updated ${result.data.profilesUpdated} profile(s), removed ${result.data.awardsRemoved} award(s).`,
      );
      closeDialog();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to delete medal");
    } finally {
      setSaving(false);
    }
  }

  async function handleAddMedal() {
    setSaving(true);
    try {
      const result = await addMedalAction({
        slug: slugifyInput(addMedalSlug),
        displayName: addMedalName,
        pictureUrl: addMedalUrl,
        description: addMedalDescription,
      });
      if (!result.ok) throw new Error(result.message);
      toast.success("Medal created.");
      router.refresh();
      closeDialog();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to add medal");
    } finally {
      setSaving(false);
    }
  }

  async function handleAddRibbon() {
    setSaving(true);
    try {
      const result = await addRibbonAction({
        slug: slugifyInput(addRibbonSlug),
        displayName: addRibbonName,
        pictureUrl: addRibbonUrl,
        description: addRibbonDescription,
      });
      if (!result.ok) throw new Error(result.message);
      toast.success("Ribbon created.");
      router.refresh();
      closeDialog();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to add ribbon");
    } finally {
      setSaving(false);
    }
  }

  async function handleEditMedal() {
    if (!editMedalSlug) {
      toast.error("Select a medal to edit.");
      return;
    }
    setSaving(true);
    try {
      const result = await editMedalAction({
        slug: editMedalSlug,
        displayName: editMedalName,
        pictureUrl: editMedalUrl,
        description: editMedalDescription,
      });
      if (!result.ok) throw new Error(result.message);
      toast.success("Medal updated.");
      router.refresh();
      closeDialog();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to update medal");
    } finally {
      setSaving(false);
    }
  }

  async function handleEditRibbon() {
    if (!editRibbonSlug) {
      toast.error("Select a ribbon to edit.");
      return;
    }
    setSaving(true);
    try {
      const result = await editRibbonAction({
        slug: editRibbonSlug,
        displayName: editRibbonName,
        pictureUrl: editRibbonUrl,
        description: editRibbonDescription,
      });
      if (!result.ok) throw new Error(result.message);
      toast.success("Ribbon updated.");
      router.refresh();
      closeDialog();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to update ribbon");
    } finally {
      setSaving(false);
    }
  }

  const attendanceTrainingRankActions = (
    <>
      {canBulk ? (
        <ActionCard
          title="Mark Attendance"
          description="Increment operations by 1 and reduce cooldown by 1 for up to 5 users (20 for SR admin)."
          buttonLabel="Mark Attendance"
          onOpen={() => openDialogWithDefaults("markAttendance")}
        />
      ) : null}

      {isPanelAdmin ? (
        <ActionCard
          title="Remove Operation Attendance"
          description="Remove one recorded attendance event and revert the member operation/cooldown values."
          buttonLabel="Remove Operation Attendance"
          variant="secondary"
          onOpen={() => openDialogWithDefaults("removeAttendance")}
        />
      ) : null}

      {canTrain ? (
        <ActionCard
          title="Mark Training"
          description="Select one training and mark up to 5 users in one action."
          buttonLabel="Mark Training"
          onOpen={() => openDialogWithDefaults("markTraining")}
        />
      ) : null}

      {canBulk ? (
        <ActionCard
          title="Change Rank"
          description="Promote or demote up to 5 selected users using configured rank ordering."
          buttonLabel="Change Rank"
          variant="secondary"
          onOpen={() => openDialogWithDefaults("changeRank")}
        />
      ) : null}
    </>
  );

  const medalActions = (
    <>
      {isPanelAdmin ? (
        <ActionCard
          title="Award Medal"
          description="Select a medal, date, and up to 5 users to award in one action."
          buttonLabel="Award Medal"
          variant="secondary"
          onOpen={() => openDialogWithDefaults("awardMedal")}
        />
      ) : null}

      {isPanelAdmin ? (
        <ActionCard
          title="Award Ribbon"
          description="Select a campaign ribbon, date, and up to 5 users to award in one action."
          buttonLabel="Award Ribbon"
          variant="secondary"
          onOpen={() => openDialogWithDefaults("awardRibbon")}
        />
      ) : null}

      {isPanelAdmin ? (
        <ActionCard
          title="Remove Medal"
          description="Select a member and one of their medal awards to remove from their profile."
          buttonLabel="Remove Medal"
          variant="secondary"
          onOpen={() => openDialogWithDefaults("removeMedal")}
        />
      ) : null}

      {isPanelAdmin ? (
        <ActionCard
          title="Delete Medal"
          description="Permanently delete a medal from the catalog and remove all awards of it from every profile."
          buttonLabel="Delete Medal"
          variant="destructive"
          onOpen={() => openDialogWithDefaults("deleteMedal")}
        />
      ) : null}

      {isPanelAdmin ? (
        <ActionCard
          title="Add Medal"
          description="Create a new medal entry with slug, title, image, and description."
          buttonLabel="Add Medal"
          variant="secondary"
          onOpen={() => {
            setAddMedalSlug("");
            setAddMedalName("");
            setAddMedalUrl("");
            setAddMedalDescription("");
            openDialogWithDefaults("addMedal");
          }}
        />
      ) : null}

      {isPanelAdmin ? (
        <ActionCard
          title="Edit Medal"
          description="Update an existing medal's title, image, and description."
          buttonLabel="Edit Medal"
          variant="secondary"
          onOpen={() => {
            const first = settings.medals[0];
            if (first) populateEditMedal(first.slug);
            else {
              setEditMedalSlug("");
              setEditMedalName("");
              setEditMedalUrl("");
              setEditMedalDescription("");
            }
            openDialogWithDefaults("editMedal");
          }}
        />
      ) : null}

      {isPanelAdmin ? (
        <ActionCard
          title="Add Ribbon"
          description="Create a campaign ribbon entry with slug, title, image, and description."
          buttonLabel="Add Ribbon"
          variant="secondary"
          onOpen={() => {
            setAddRibbonSlug("");
            setAddRibbonName("");
            setAddRibbonUrl("");
            setAddRibbonDescription("");
            openDialogWithDefaults("addRibbon");
          }}
        />
      ) : null}

      {isPanelAdmin ? (
        <ActionCard
          title="Edit Ribbon"
          description="Update an existing ribbon's title, image, and description."
          buttonLabel="Edit Ribbon"
          variant="secondary"
          onOpen={() => {
            const first = settings.campaignRibbons[0];
            if (first) populateEditRibbon(first.slug);
            else {
              setEditRibbonSlug("");
              setEditRibbonName("");
              setEditRibbonUrl("");
              setEditRibbonDescription("");
            }
            openDialogWithDefaults("editRibbon");
          }}
        />
      ) : null}
    </>
  );

  const siteAppearanceActions = isPanelAdmin ? (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Site accent colour</CardTitle>
          <CardDescription>
            Set the global secondary accent used across the site. Users can still override this for
            their own browser from the account menu.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button type="button" variant="secondary" onClick={() => setSiteColorDialogOpen(true)}>
            Change accent colour
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Home page</CardTitle>
          <CardDescription>
            Edit the public landing page hero copy, slideshow images, and scroll sections. Images
            can be uploaded via EdgeStore.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button type="button" variant="secondary" onClick={() => setHomePageDialogOpen(true)}>
            Edit home page
          </Button>
        </CardContent>
      </Card>
    </div>
  ) : null;

  const actionCategories = [
    {
      id: "attendance-training-ranks",
      title: "Attendance, Training & Ranks",
      content: attendanceTrainingRankActions,
      hasContent: canBulk || canTrain || isPanelAdmin,
    },
    {
      id: "medals",
      title: "Medals",
      content: medalActions,
      hasContent: isPanelAdmin,
    },
    {
      id: "site-appearance",
      title: "Site appearance",
      content: siteAppearanceActions,
      hasContent: Boolean(siteAppearanceActions),
    },
  ].filter((category) => category.hasContent);

  function toggleCategory(id: string) {
    setCollapsedCategories((prev) => ({ ...prev, [id]: !prev[id] }));
  }

  function isCategoryOpen(id: string) {
    return !(collapsedCategories[id] ?? false);
  }

  return (
    <>
      <div className="space-y-8">
        {actionCategories.map((category, index) => (
          <ActionCategorySection
            key={category.id}
            id={category.id}
            title={category.title}
            open={isCategoryOpen(category.id)}
            onToggle={toggleCategory}
            showSeparatorBefore={index > 0}
          >
            {category.content}
          </ActionCategorySection>
        ))}
      </div>

      <Dialog open={openDialog === "markTraining"} onOpenChange={(open) => !open && closeDialog()}>
        <DialogContent className={MEMBER_ACTION_DIALOG_CLASS}>
          <DialogHeader className="px-6 pt-6">
            <DialogTitle>Mark Training</DialogTitle>
            <DialogDescription>Select one training and up to 5 users.</DialogDescription>
          </DialogHeader>
          <div className="flex-1 space-y-4 overflow-y-auto px-6">
            <div className="space-y-2">
              <Label>Training</Label>
              <AdminCatalogSelect
                value={trainingSlug}
                onValueChange={setTrainingSlug}
                options={trainingSelectOptions}
                placeholder="Select training"
              />
            </div>
            <UserPicker {...userPickerProps} maxSelectable={5} idPrefix="mark-training" />
          </div>
          <DialogFooter className="px-6 pb-6">
            <Button type="button" variant="outline" onClick={closeDialog} disabled={saving}>Cancel</Button>
            <Button type="button" onClick={handleMarkTraining} disabled={saving}>
              {saving ? "Saving..." : "Mark Selected Users"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={openDialog === "markAttendance"} onOpenChange={(open) => !open && closeDialog()}>
        <DialogContent className={MEMBER_ACTION_DIALOG_CLASS}>
          <DialogHeader className="px-6 pt-6">
            <DialogTitle>Mark Attendance</DialogTitle>
            <DialogDescription>Select up to {attendanceCap} users and an operation.</DialogDescription>
          </DialogHeader>
          <div className="flex-1 space-y-4 overflow-y-auto px-6">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="mark-attendance-date">Operation date</Label>
                <DatePicker04
                  id="mark-attendance-date"
                  value={operationDate}
                  onValueChange={setOperationDate}
                />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label>Operation</Label>
                <AdminSearchCombobox
                  value={opSlug}
                  onChange={setOpSlug}
                  choices={operationSearchChoices}
                  placeholder="Select operation"
                  searchPlaceholder="Search operations…"
                  emptyLabel="No operations found"
                />
              </div>
            </div>
            <UserPicker {...userPickerProps} maxSelectable={attendanceCap} idPrefix="mark-attendance" />
          </div>
          <DialogFooter className="px-6 pb-6">
            <Button type="button" variant="outline" onClick={closeDialog} disabled={saving}>Cancel</Button>
            <Button type="button" onClick={handleMarkAttendance} disabled={saving}>
              {saving ? "Saving..." : "Mark Attendance"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={openDialog === "removeAttendance"} onOpenChange={(open) => !open && closeDialog()}>
        <DialogContent className={MEMBER_ACTION_DIALOG_CLASS}>
          <DialogHeader className="px-6 pt-6">
            <DialogTitle>Remove Operation Attendance</DialogTitle>
            <DialogDescription>Select one member and one attendance log to remove.</DialogDescription>
          </DialogHeader>
          <div className="flex-1 space-y-4 overflow-y-auto px-6">
            <UserPicker
              {...userPickerProps}
              onChange={(next) => {
                setPickedIds(next.size > 1 ? new Set([Array.from(next).pop()!]) : next);
                const userId = Array.from(next)[0];
                if (userId) void syncAttendanceLogs(userId);
                else {
                  setAttendanceLogs([]);
                  setSelectedLogId("");
                }
              }}
              maxSelectable={1}
              idPrefix="remove-attendance"
            />
            <div className="space-y-2">
              <Label>Attendance log</Label>
              <AdminSearchCombobox
                value={selectedLogId}
                onChange={setSelectedLogId}
                choices={attendanceLogSearchChoices}
                placeholder="Select attendance log"
                searchPlaceholder="Search attendance logs…"
                emptyLabel="No attendance logs found"
                disabled={!attendanceLogs.length}
              />
            </div>
          </div>
          <DialogFooter className="px-6 pb-6">
            <Button type="button" variant="outline" onClick={closeDialog} disabled={saving}>Cancel</Button>
            <Button type="button" variant="destructive" onClick={handleRemoveAttendance} disabled={saving}>
              {saving ? "Saving..." : "Confirm Remove Attendance"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={openDialog === "changeRank"} onOpenChange={(open) => !open && closeDialog()}>
        <DialogContent className={MEMBER_ACTION_DIALOG_CLASS}>
          <DialogHeader className="px-6 pt-6">
            <DialogTitle>Change Rank</DialogTitle>
            <DialogDescription>Promote or demote up to 5 users.</DialogDescription>
          </DialogHeader>
          <div className="flex-1 space-y-4 overflow-y-auto px-6">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Direction</Label>
                <AdminCatalogSelect
                  value={rankDirection}
                  onValueChange={(value) => setRankDirection(value as "promote" | "demote")}
                  options={rankDirectionOptions}
                />
              </div>
              <div className="space-y-2">
                <Label>Target route (optional)</Label>
                <AdminCatalogSelect
                  value={rankCategoryId || "__same__"}
                  onValueChange={(value) =>
                    setRankCategoryId(value === "__same__" ? "" : value)
                  }
                  options={rankCategorySelectOptions}
                  placeholder="Same route"
                />
              </div>
            </div>
            <UserPicker {...userPickerProps} maxSelectable={5} idPrefix="change-rank" />
          </div>
          <DialogFooter className="px-6 pb-6">
            <Button type="button" variant="outline" onClick={closeDialog} disabled={saving}>Cancel</Button>
            <Button type="button" onClick={handleChangeRank} disabled={saving}>
              {saving ? "Saving..." : "Apply Rank Change"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={openDialog === "awardMedal"} onOpenChange={(open) => !open && closeDialog()}>
        <DialogContent className={MEMBER_ACTION_DIALOG_CLASS}>
          <DialogHeader className="px-6 pt-6">
            <DialogTitle>Award Medal</DialogTitle>
            <DialogDescription>Select a medal, date, and up to 5 users.</DialogDescription>
          </DialogHeader>
          <div className="flex-1 space-y-4 overflow-y-auto px-6">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Medal</Label>
                <AdminCatalogSelect
                  value={medalSlug}
                  onValueChange={setMedalSlug}
                  options={medalSelectOptions}
                  placeholder="Select medal"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="award-medal-date">Award date</Label>
                <DatePicker04
                  id="award-medal-date"
                  value={awardDate}
                  onValueChange={setAwardDate}
                />
              </div>
            </div>
            <UserPicker {...userPickerProps} maxSelectable={5} idPrefix="award-medal" />
          </div>
          <DialogFooter className="px-6 pb-6">
            <Button type="button" variant="outline" onClick={closeDialog} disabled={saving}>Cancel</Button>
            <Button type="button" onClick={handleAwardMedal} disabled={saving}>
              {saving ? "Saving..." : "Award Medal"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={openDialog === "awardRibbon"} onOpenChange={(open) => !open && closeDialog()}>
        <DialogContent className={MEMBER_ACTION_DIALOG_CLASS}>
          <DialogHeader className="px-6 pt-6">
            <DialogTitle>Award Ribbon</DialogTitle>
            <DialogDescription>Select a ribbon, date, and up to 5 users.</DialogDescription>
          </DialogHeader>
          <div className="flex-1 space-y-4 overflow-y-auto px-6">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Ribbon</Label>
                <AdminCatalogSelect
                  value={ribbonSlug}
                  onValueChange={setRibbonSlug}
                  options={ribbonSelectOptions}
                  placeholder="Select ribbon"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="award-ribbon-date">Award date</Label>
                <DatePicker04
                  id="award-ribbon-date"
                  value={awardDate}
                  onValueChange={setAwardDate}
                />
              </div>
            </div>
            <UserPicker {...userPickerProps} maxSelectable={5} idPrefix="award-ribbon" />
          </div>
          <DialogFooter className="px-6 pb-6">
            <Button type="button" variant="outline" onClick={closeDialog} disabled={saving}>Cancel</Button>
            <Button type="button" onClick={handleAwardRibbon} disabled={saving}>
              {saving ? "Saving..." : "Award Ribbon"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={openDialog === "removeMedal"} onOpenChange={(open) => !open && closeDialog()}>
        <DialogContent className={MEMBER_ACTION_DIALOG_CLASS}>
          <DialogHeader className="px-6 pt-6">
            <DialogTitle>Remove Medal</DialogTitle>
            <DialogDescription>Select one member and one medal award to remove.</DialogDescription>
          </DialogHeader>
          <div className="flex-1 space-y-4 overflow-y-auto px-6">
            <UserPicker
              {...userPickerProps}
              onChange={(next) => {
                setPickedIds(next.size > 1 ? new Set([Array.from(next).pop()!]) : next);
                const userId = Array.from(next)[0];
                if (userId) void syncMedalAwards(userId);
                else {
                  setMedalAwards([]);
                  setSelectedMedalAward("");
                }
              }}
              maxSelectable={1}
              idPrefix="remove-medal"
            />
            <div className="space-y-2">
              <Label>Medal award</Label>
              <AdminCatalogSelect
                value={selectedMedalAward}
                onValueChange={setSelectedMedalAward}
                options={medalAwardSelectOptions}
                placeholder="Select medal award"
                disabled={!medalAwardSelectOptions.length}
              />
            </div>
          </div>
          <DialogFooter className="px-6 pb-6">
            <Button type="button" variant="outline" onClick={closeDialog} disabled={saving}>Cancel</Button>
            <Button type="button" variant="destructive" onClick={handleRemoveMedal} disabled={saving}>
              {saving ? "Saving..." : "Confirm Remove Medal"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={openDialog === "deleteMedal"} onOpenChange={(open) => !open && closeDialog()}>
        <DialogContent className={FORM_ACTION_DIALOG_CLASS}>
          <DialogHeader>
            <DialogTitle>Delete Medal</DialogTitle>
            <DialogDescription>
              Permanently delete a medal from the catalog and remove all awards from every profile.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label>Medal</Label>
            <AdminCatalogSelect
              value={deleteMedalSlug}
              onValueChange={setDeleteMedalSlug}
              options={medalSelectOptions}
              placeholder="Select medal"
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={closeDialog} disabled={saving}>Cancel</Button>
            <Button type="button" variant="destructive" onClick={handleDeleteMedal} disabled={saving}>
              {saving ? "Deleting..." : "Delete Medal Permanently"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={openDialog === "addMedal"} onOpenChange={(open) => !open && closeDialog()}>
        <DialogContent className={UPLOAD_FORM_DIALOG_CLASS}>
          <DialogHeader className="px-6 pt-6">
            <DialogTitle>Add Medal</DialogTitle>
            <DialogDescription>Create a new medal catalog entry.</DialogDescription>
          </DialogHeader>
          <div className="flex-1 space-y-3 overflow-y-auto px-6">
            <div className="space-y-2">
              <Label htmlFor="add-medal-slug">Slug</Label>
              <Input id="add-medal-slug" value={addMedalSlug} onChange={(e) => setAddMedalSlug(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="add-medal-name">Display name</Label>
              <Input id="add-medal-name" value={addMedalName} onChange={(e) => setAddMedalName(e.target.value)} />
            </div>
            <ImageUrlOrUpload
              label="Picture"
              folder="medals"
              value={addMedalUrl}
              onChange={setAddMedalUrl}
            />
            <div className="space-y-2">
              <Label htmlFor="add-medal-description">Description</Label>
              <Textarea id="add-medal-description" value={addMedalDescription} onChange={(e) => setAddMedalDescription(e.target.value)} />
            </div>
          </div>
          <DialogFooter className="px-6 pb-6">
            <Button type="button" variant="outline" onClick={closeDialog} disabled={saving}>Cancel</Button>
            <Button type="button" onClick={handleAddMedal} disabled={saving}>
              {saving ? "Saving..." : "Create Medal"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={openDialog === "editMedal"} onOpenChange={(open) => !open && closeDialog()}>
        <DialogContent className={UPLOAD_FORM_DIALOG_CLASS}>
          <DialogHeader className="px-6 pt-6">
            <DialogTitle>Edit Medal</DialogTitle>
            <DialogDescription>Update an existing medal catalog entry.</DialogDescription>
          </DialogHeader>
          <div className="flex-1 space-y-3 overflow-y-auto px-6">
            <div className="space-y-2">
              <Label>Medal</Label>
              <AdminCatalogSelect
                value={editMedalSlug}
                onValueChange={populateEditMedal}
                options={medalSelectOptions}
                placeholder="Select medal"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-medal-slug">Slug</Label>
              <Input id="edit-medal-slug" value={editMedalSlug} readOnly disabled />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-medal-name">Display name</Label>
              <Input id="edit-medal-name" value={editMedalName} onChange={(e) => setEditMedalName(e.target.value)} />
            </div>
            <ImageUrlOrUpload
              label="Picture"
              folder="medals"
              value={editMedalUrl}
              onChange={setEditMedalUrl}
            />
            <div className="space-y-2">
              <Label htmlFor="edit-medal-description">Description</Label>
              <Textarea id="edit-medal-description" value={editMedalDescription} onChange={(e) => setEditMedalDescription(e.target.value)} />
            </div>
          </div>
          <DialogFooter className="px-6 pb-6">
            <Button type="button" variant="outline" onClick={closeDialog} disabled={saving}>Cancel</Button>
            <Button type="button" onClick={handleEditMedal} disabled={saving || !editMedalSlug}>
              {saving ? "Saving..." : "Save Medal"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={openDialog === "addRibbon"} onOpenChange={(open) => !open && closeDialog()}>
        <DialogContent className={UPLOAD_FORM_DIALOG_CLASS}>
          <DialogHeader className="px-6 pt-6">
            <DialogTitle>Add Ribbon</DialogTitle>
            <DialogDescription>Create a new campaign ribbon catalog entry.</DialogDescription>
          </DialogHeader>
          <div className="flex-1 space-y-3 overflow-y-auto px-6">
            <div className="space-y-2">
              <Label htmlFor="add-ribbon-slug">Slug</Label>
              <Input id="add-ribbon-slug" value={addRibbonSlug} onChange={(e) => setAddRibbonSlug(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="add-ribbon-name">Display name</Label>
              <Input id="add-ribbon-name" value={addRibbonName} onChange={(e) => setAddRibbonName(e.target.value)} />
            </div>
            <ImageUrlOrUpload
              label="Picture"
              folder="medals"
              value={addRibbonUrl}
              onChange={setAddRibbonUrl}
            />
            <div className="space-y-2">
              <Label htmlFor="add-ribbon-description">Description</Label>
              <Textarea id="add-ribbon-description" value={addRibbonDescription} onChange={(e) => setAddRibbonDescription(e.target.value)} />
            </div>
          </div>
          <DialogFooter className="px-6 pb-6">
            <Button type="button" variant="outline" onClick={closeDialog} disabled={saving}>Cancel</Button>
            <Button type="button" onClick={handleAddRibbon} disabled={saving}>
              {saving ? "Saving..." : "Create Ribbon"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={openDialog === "editRibbon"} onOpenChange={(open) => !open && closeDialog()}>
        <DialogContent className={UPLOAD_FORM_DIALOG_CLASS}>
          <DialogHeader className="px-6 pt-6">
            <DialogTitle>Edit Ribbon</DialogTitle>
            <DialogDescription>Update an existing campaign ribbon catalog entry.</DialogDescription>
          </DialogHeader>
          <div className="flex-1 space-y-3 overflow-y-auto px-6">
            <div className="space-y-2">
              <Label>Ribbon</Label>
              <AdminCatalogSelect
                value={editRibbonSlug}
                onValueChange={populateEditRibbon}
                options={ribbonSelectOptions}
                placeholder="Select ribbon"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-ribbon-slug">Slug</Label>
              <Input id="edit-ribbon-slug" value={editRibbonSlug} readOnly disabled />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-ribbon-name">Display name</Label>
              <Input id="edit-ribbon-name" value={editRibbonName} onChange={(e) => setEditRibbonName(e.target.value)} />
            </div>
            <ImageUrlOrUpload
              label="Picture"
              folder="medals"
              value={editRibbonUrl}
              onChange={setEditRibbonUrl}
            />
            <div className="space-y-2">
              <Label htmlFor="edit-ribbon-description">Description</Label>
              <Textarea id="edit-ribbon-description" value={editRibbonDescription} onChange={(e) => setEditRibbonDescription(e.target.value)} />
            </div>
          </div>
          <DialogFooter className="px-6 pb-6">
            <Button type="button" variant="outline" onClick={closeDialog} disabled={saving}>Cancel</Button>
            <Button type="button" onClick={handleEditRibbon} disabled={saving || !editRibbonSlug}>
              {saving ? "Saving..." : "Save Ribbon"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <SiteSecondaryColorDialog
        open={siteColorDialogOpen}
        onOpenChange={setSiteColorDialogOpen}
        initialHex={siteSecondaryColorHex}
        onSaved={(hex) => {
          setSiteSecondaryColorHex(hex);
          router.refresh();
        }}
      />

      <HomePageEditorDialog
        open={homePageDialogOpen}
        onClose={() => setHomePageDialogOpen(false)}
      />
    </>
  );
}

"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { ChevronDown } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Tabs,
  TabsContent,
  TabsContents,
  TabsList,
  TabsTrigger,
} from "@/components/ui/motion-tabs";
import { Spinner } from "@/components/ui/spinner";
import { ProfileActivityLog } from "@/components/profile/profile-activity-log";
import {
  composeOverviewName,
  formatDisplayDate,
  formatTimeInUnit,
} from "@/lib/profile/formatting";
import type {
  AwardTuple,
  MedalDefinition,
  ProfileLogEntry,
  ProfileSettings,
  PublicProfile,
  RibbonDefinition,
  TrainingCategoryDefinition,
} from "@/lib/profile/types";

type ProfileViewProps = {
  profileId: string;
  canDeleteLogs: boolean;
};

type AggregatedAward = {
  slug: string;
  count: number;
  latestDate: string;
};

function aggregateAwardTuples(value: AwardTuple[]): Map<string, AggregatedAward> {
  const aggregated = new Map<string, AggregatedAward>();
  for (const tuple of value) {
    const slug = tuple[0];
    const date = tuple[1];
    const current = aggregated.get(slug);
    if (!current) {
      aggregated.set(slug, { slug, count: 1, latestDate: date });
      continue;
    }
    current.count += 1;
    if (date > current.latestDate) current.latestDate = date;
  }
  return aggregated;
}

async function requestJson<T>(url: string): Promise<T> {
  const response = await fetch(url);
  const data = (await response.json().catch(() => ({}))) as T & { message?: string };
  if (!response.ok) {
    throw new Error(typeof data.message === "string" ? data.message : "Request failed");
  }
  return data;
}

export function ProfileView({ profileId, canDeleteLogs }: ProfileViewProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [profile, setProfile] = useState<PublicProfile | null>(null);
  const [settings, setSettings] = useState<ProfileSettings | null>(null);
  const [avatarUrl, setAvatarUrl] = useState("/favicon.ico");
  const [logs, setLogs] = useState<ProfileLogEntry[]>([]);
  const [logsLoading, setLogsLoading] = useState(true);
  const [categoryFilter, setCategoryFilter] = useState("");
  const [medalModal, setMedalModal] = useState<{
    displayName: string;
    date: string;
    pictureUrl: string;
    description: string;
  } | null>(null);

  const loadProfile = useCallback(async () => {
    const [profileData, settingsData, avatarData] = await Promise.all([
      requestJson<{ ok: boolean; profile: PublicProfile }>(
        `/api/profiles/${encodeURIComponent(profileId)}`,
      ),
      requestJson<ProfileSettings & { ok: boolean }>("/api/profiles/settings"),
      requestJson<{ ok: boolean; avatarUrl: string }>(
        `/api/profiles/${encodeURIComponent(profileId)}/avatar`,
      ).catch(() => ({ ok: true, avatarUrl: "/favicon.ico" })),
    ]);

    setProfile(profileData.profile);
    setSettings({
      medals: settingsData.medals,
      campaignRibbons: settingsData.campaignRibbons,
      trainingCategories: settingsData.trainingCategories,
      rankCategories: settingsData.rankCategories,
    });
    setAvatarUrl(avatarData.avatarUrl || "/favicon.ico");
  }, [profileId]);

  const loadLogs = useCallback(async () => {
    setLogsLoading(true);
    try {
      const query = categoryFilter
        ? `?category=${encodeURIComponent(categoryFilter)}`
        : "";
      const data = await requestJson<{ ok: boolean; logs: ProfileLogEntry[] }>(
        `/api/profiles/${encodeURIComponent(profileId)}/logs${query}`,
      );
      setLogs(data.logs ?? []);
    } catch {
      setLogs([]);
    } finally {
      setLogsLoading(false);
    }
  }, [categoryFilter, profileId]);

  useEffect(() => {
    loadProfile()
      .catch((err) => setError(err instanceof Error ? err.message : "Failed to load profile"))
      .finally(() => setLoading(false));
  }, [loadProfile]);

  useEffect(() => {
    if (!loading && !error) {
      void loadLogs();
    }
  }, [loadLogs, loading, error]);

  if (loading) {
    return (
      <div className="flex items-center justify-center gap-3 py-20 text-muted-foreground">
        <Spinner />
        <span>Loading profile...</span>
      </div>
    );
  }

  if (error || !profile) {
    return (
      <p className="py-20 text-center text-muted-foreground">
        {error || "Profile not found."}
      </p>
    );
  }

  const awards = aggregateAwardTuples(profile.awards);
  const ribbons = aggregateAwardTuples(profile.campaignRib);

  return (
    <div className="space-y-4">
      <section className="rounded-xl border border-border/80 bg-card/40 p-4">
        <div className="flex flex-wrap items-center gap-4">
          <Image
            src={avatarUrl}
            alt="Profile avatar"
            width={120}
            height={120}
            className="size-[120px] rounded-full border border-border object-cover bg-muted"
            unoptimized
          />
          <div>
            <h1 className="text-3xl font-semibold">{profile.profileDisplayName}</h1>
            <p className="mt-1 text-muted-foreground">
              {profile.rank || "-"}
              {profile.assignment ? ` · ${profile.assignment}` : ""}
            </p>
            <p className="mt-1 text-sm text-muted-foreground">@{profile.id}</p>
          </div>
        </div>
      </section>

      <div className="grid gap-4 lg:grid-cols-2">
        <OverviewCard title="Service Overview">
          <OverviewRow label="Name" value={composeOverviewName(profile)} />
          <OverviewRow label="Rank" value={profile.rank || "-"} />
          <OverviewRow label="Assignment" value={profile.assignment || "-"} />
          <OverviewRow label="Position" value={profile.position || "-"} />
          <OverviewRow label="Primary MOS" value={profile.primaryMOS || "-"} />
        </OverviewCard>

        <OverviewCard title="Status">
          <OverviewRow label="Operations Logged" value={String(profile.operationCount)} />
          <OverviewRow
            label="Last Operation Attended"
            value={profile.lastOperationAttended || "-"}
          />
          <OverviewRow label="Cooldown Timer" value={String(profile.coolDown)} />
          <OverviewRow label="Date Promoted" value={formatDisplayDate(profile.datePromoted)} />
          <OverviewRow label="Date Joined" value={formatDisplayDate(profile.dateJoined)} />
          <OverviewRow label="Time in Unit" value={formatTimeInUnit(profile.dateJoined)} />
        </OverviewCard>
      </div>

      <AwardsTabsSection
        awards={awards}
        ribbons={ribbons}
        medalDefinitions={settings?.medals ?? []}
        ribbonDefinitions={settings?.campaignRibbons ?? []}
        onOpen={(medal) => setMedalModal(medal)}
      />

      <CampaignsAttendedSection attendance={profile.campaignAttendance} />

      <TrainingsSection
        categories={settings?.trainingCategories ?? []}
        completedTrainings={profile.trainings}
      />

      <ProfileActivityLog
        profileId={profileId}
        canDeleteLogs={canDeleteLogs}
        logs={logs}
        loading={logsLoading}
        categoryFilter={categoryFilter}
        onCategoryFilterChange={setCategoryFilter}
        onLogsChanged={() => {
          void loadLogs();
          void loadProfile();
        }}
      />

      <Dialog open={Boolean(medalModal)} onOpenChange={(open) => !open && setMedalModal(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{medalModal?.displayName}</DialogTitle>
          </DialogHeader>
          {medalModal ? (
            <div className="space-y-3">
              <Image
                src={medalModal.pictureUrl || "/favicon.ico"}
                alt={medalModal.displayName}
                width={400}
                height={400}
                className="mx-auto max-h-80 w-full object-contain"
                unoptimized
              />
              {medalModal.date ? (
                <p className="text-sm text-sky-300">Awarded: {medalModal.date}</p>
              ) : null}
              {medalModal.description ? (
                <p className="whitespace-pre-wrap text-sm">{medalModal.description}</p>
              ) : null}
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function OverviewCard({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-xl border border-border/80 bg-card/40 p-4">
      <h3 className="text-lg font-semibold">{title}</h3>
      <div className="mt-3 space-y-3">{children}</div>
    </section>
  );
}

function OverviewRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-xs uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="mt-0.5 font-medium">{value}</div>
    </div>
  );
}

function AwardsTabsSection({
  awards,
  ribbons,
  medalDefinitions,
  ribbonDefinitions,
  onOpen,
}: {
  awards: Map<string, AggregatedAward>;
  ribbons: Map<string, AggregatedAward>;
  medalDefinitions: MedalDefinition[];
  ribbonDefinitions: RibbonDefinition[];
  onOpen: (payload: {
    displayName: string;
    date: string;
    pictureUrl: string;
    description: string;
  }) => void;
}) {
  return (
    <section className="rounded-xl border border-border/80 bg-card/40 p-4">
      <Tabs defaultValue="awards" className="gap-4">
        <TabsList className="w-full sm:w-fit">
          <TabsTrigger value="awards" className="min-w-28">
            Awards
          </TabsTrigger>
          <TabsTrigger value="ribbons" className="min-w-36">
            Campaign Ribbons
          </TabsTrigger>
        </TabsList>

        <TabsContents>
          <TabsContent value="awards">
            <AwardGrid awards={awards} definitions={medalDefinitions} onOpen={onOpen} />
          </TabsContent>
          <TabsContent value="ribbons">
            <AwardGrid awards={ribbons} definitions={ribbonDefinitions} onOpen={onOpen} />
          </TabsContent>
        </TabsContents>
      </Tabs>
    </section>
  );
}

function CampaignsAttendedSection({
  attendance,
}: {
  attendance: PublicProfile["campaignAttendance"];
}) {
  const [open, setOpen] = useState(false);
  const count = attendance.length;

  return (
    <section className="rounded-xl border border-border/80 bg-card/40 p-4">
      <button
        type="button"
        className="flex w-full items-center justify-between gap-3 text-left"
        onClick={() => setOpen((current) => !current)}
        aria-expanded={open}
      >
        <div>
          <h3 className="text-lg font-semibold">Campaigns Attended</h3>
          <p className="mt-0.5 text-sm text-muted-foreground">
            {count
              ? `${count} campaign${count === 1 ? "" : "s"} reached attendance threshold`
              : "No campaign attendance threshold reached yet"}
          </p>
        </div>
        <motion.span
          animate={{ rotate: open ? 180 : 0 }}
          transition={{ type: "spring", stiffness: 260, damping: 22 }}
          className="text-muted-foreground"
        >
          <ChevronDown className="size-5" />
        </motion.span>
      </button>

      <AnimatePresence initial={false}>
        {open && count > 0 ? (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ type: "spring", stiffness: 280, damping: 28 }}
            className="overflow-hidden"
          >
            <ul className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              {attendance.map((entry) => (
                <motion.li
                  key={entry.campaignId}
                  initial={{ y: 8, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ type: "spring", stiffness: 320, damping: 26 }}
                  className="rounded-r-md border-l-4 border-l-green-800 bg-green-950/20 px-3 py-2"
                >
                  {entry.campaignSlug ? (
                    <Link
                      href={`/ops?campaign=${encodeURIComponent(entry.campaignSlug)}#campaign=${encodeURIComponent(entry.campaignSlug)}`}
                      className="font-medium underline"
                    >
                      {entry.campaignTitle}
                    </Link>
                  ) : (
                    <div className="font-medium">{entry.campaignTitle}</div>
                  )}
                  <div className="mt-1 text-xs text-muted-foreground">
                    {entry.attendedOps}/{entry.totalOps} operations ({entry.ratioPercent}%)
                    {entry.thresholdReachedByRounding ? " · rounded to threshold" : ""}
                  </div>
                </motion.li>
              ))}
            </ul>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </section>
  );
}

function TrainingsSection({
  categories,
  completedTrainings,
}: {
  categories: TrainingCategoryDefinition[];
  completedTrainings: string[];
}) {
  const [open, setOpen] = useState(false);
  const defaultTab = categories[0]?.id ?? "";
  const totalCount = categories.reduce((sum, category) => sum + category.items.length, 0);
  const passedCount = categories.reduce(
    (sum, category) =>
      sum +
      category.items.filter((item) =>
        completedTrainings.includes(item.slug.toLowerCase()),
      ).length,
    0,
  );

  return (
    <section className="rounded-xl border border-border/80 bg-card/40 p-4">
      <button
        type="button"
        className="flex w-full items-center justify-between gap-3 text-left"
        onClick={() => setOpen((current) => !current)}
        aria-expanded={open}
      >
        <div>
          <h3 className="text-lg font-semibold">Trainings</h3>
          <p className="mt-0.5 text-sm text-muted-foreground">
            {totalCount
              ? `${passedCount} of ${totalCount} trainings completed`
              : "No training categories configured"}
          </p>
        </div>
        <motion.span
          animate={{ rotate: open ? 180 : 0 }}
          transition={{ type: "spring", stiffness: 260, damping: 22 }}
          className="text-muted-foreground"
        >
          <ChevronDown className="size-5" />
        </motion.span>
      </button>

      <AnimatePresence initial={false}>
        {open ? (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ type: "spring", stiffness: 280, damping: 28 }}
            className="overflow-hidden"
          >
            {!categories.length ? (
              <p className="mt-3 text-sm text-muted-foreground">No training categories configured.</p>
            ) : (
              <div className="mt-4">
                <Tabs defaultValue={defaultTab} className="gap-4">
                  <TabsList className="w-full max-w-full flex-row flex-nowrap overflow-x-auto sm:w-fit">
                    {categories.map((category) => (
                      <TabsTrigger
                        key={category.id}
                        value={category.id}
                        className="h-8 !w-auto shrink-0 px-3"
                      >
                        {category.title}
                      </TabsTrigger>
                    ))}
                  </TabsList>

                  <TabsContents>
                    {categories.map((category) => (
                      <TabsContent key={category.id} value={category.id}>
                        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                          {category.items.map((item) => {
                            const passed = completedTrainings.includes(item.slug.toLowerCase());
                            return (
                              <motion.div
                                key={item.slug}
                                initial={{ y: 8, opacity: 0 }}
                                animate={{ y: 0, opacity: 1 }}
                                transition={{ type: "spring", stiffness: 320, damping: 26 }}
                                className={`rounded-md border px-3 py-2 text-sm ${
                                  passed
                                    ? "border-green-800/60 bg-green-950/30 text-green-100"
                                    : "border-red-900/60 bg-red-950/20 text-red-100"
                                }`}
                              >
                                {item.label || item.slug}
                              </motion.div>
                            );
                          })}
                        </div>
                      </TabsContent>
                    ))}
                  </TabsContents>
                </Tabs>
              </div>
            )}
          </motion.div>
        ) : null}
      </AnimatePresence>
    </section>
  );
}

function AwardGrid({
  awards,
  definitions,
  onOpen,
}: {
  awards: Map<string, AggregatedAward>;
  definitions: (MedalDefinition | RibbonDefinition)[];
  onOpen: (payload: {
    displayName: string;
    date: string;
    pictureUrl: string;
    description: string;
  }) => void;
}) {
  const defMap = new Map(definitions.map((item) => [item.slug, item]));

  if (!awards.size) {
    return <p className="text-sm text-muted-foreground">-</p>;
  }

  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      {[...awards.values()].map((entry) => {
        const definition = defMap.get(entry.slug) ?? {
          slug: entry.slug,
          displayName: entry.slug,
          pictureUrl: "",
          description: "",
        };
        return (
          <button
            key={entry.slug}
            type="button"
            className="relative rounded-lg border border-border/80 bg-card p-3 text-left transition hover:border-border"
            onClick={() =>
              onOpen({
                displayName: definition.displayName || entry.slug,
                date: entry.latestDate,
                pictureUrl: definition.pictureUrl,
                description: definition.description,
              })
            }
          >
            <Image
              src={definition.pictureUrl || "/favicon.ico"}
              alt={definition.displayName || entry.slug}
              width={180}
              height={180}
              className="aspect-square w-full rounded-md border border-border bg-muted object-contain"
              unoptimized
            />
            <div className="mt-2 font-semibold">{definition.displayName || entry.slug}</div>
            <div className="text-xs text-muted-foreground">{entry.latestDate}</div>
            <div className="absolute right-2 bottom-2 rounded border border-border bg-background px-2 py-0.5 text-xs">
              Awarded: {entry.count}
            </div>
          </button>
        );
      })}
    </div>
  );
}

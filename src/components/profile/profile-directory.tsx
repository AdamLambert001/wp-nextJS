"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { GradientSeparator } from "@/components/shadcn-studio/separator/separator-06";
import { AnimatedCollapse, AnimatedCollapseChevron } from "@/components/ui/animated-collapse";
import { Input } from "@/components/ui/input";
import { LinkButton } from "@/components/ui/link-button";
import { Spinner } from "@/components/ui/spinner";
import { findRankCategoryIndex } from "@/lib/profile/formatting";
import type { PublicProfileRow, RankCategoryDefinition } from "@/lib/profile/types";

const UNASSIGNED_CATEGORY_ID = "__unassigned__";

async function requestJson<T>(url: string): Promise<T> {
  const response = await fetch(url);
  const data = (await response.json().catch(() => ({}))) as T & { message?: string };
  if (!response.ok) {
    throw new Error(typeof data.message === "string" ? data.message : "Request failed");
  }
  return data;
}

function memberHaystack(row: PublicProfileRow): string {
  return [
    row.profileDisplayName,
    row.displayName,
    row.id,
    row.firstName,
    row.lastName,
    row.rank,
    row.assignment,
    row.position,
    row.lastOperationAttended,
  ]
    .map((part) => String(part ?? "").trim().toLowerCase())
    .join(" ");
}

function ProfileMemberCard({ row }: { row: PublicProfileRow }) {
  const legal = [row.firstName, row.lastName].filter(Boolean).join(" ").trim();
  const displayName = row.profileDisplayName || row.displayName || row.id;
  const profileHref = `/profile/${encodeURIComponent(row.id)}`;

  return (
    <article className="rounded-xl border border-border/80 bg-card/40 p-4">
      <div className="flex items-start gap-3">
        <Link
          href={profileHref}
          className="shrink-0 rounded-full transition-opacity hover:opacity-80"
          aria-label={`Open ${displayName}'s profile`}
        >
          <Image
            src={row.avatarUrl}
            alt=""
            width={40}
            height={40}
            className="size-10 rounded-full border border-border object-cover bg-muted"
            unoptimized
          />
        </Link>
        <div className="min-w-0 flex-1">
          <div className="font-semibold">{displayName}</div>
          <div className="mt-1 text-sm text-muted-foreground">
            {row.rank || "-"}
            {row.assignment ? ` / ${row.assignment}` : ""}
          </div>
          <div className="mt-1 text-sm text-muted-foreground">{legal || "-"}</div>
          <div className="mt-1 text-sm text-muted-foreground">
            Last operation attended: {row.lastOperationAttended || "—"}
          </div>
        </div>
      </div>
      <div className="mt-4">
        <LinkButton href={profileHref} size="sm" variant="secondary">
          Open Profile
        </LinkButton>
      </div>
    </article>
  );
}

function RankCategorySection({
  id,
  title,
  count,
  open,
  onToggle,
  showSeparatorBefore = false,
  children,
}: {
  id: string;
  title: string;
  count: number;
  open: boolean;
  onToggle: (id: string) => void;
  showSeparatorBefore?: boolean;
  children: React.ReactNode;
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
        <span className="text-sm text-muted-foreground">({count})</span>
      </button>
      <AnimatedCollapse open={open}>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{children}</div>
      </AnimatedCollapse>
    </section>
  );
}

export function ProfileDirectory() {
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<PublicProfileRow[]>([]);
  const [rankCategories, setRankCategories] = useState<RankCategoryDefinition[]>([]);
  const [query, setQuery] = useState("");
  const [collapsedCategories, setCollapsedCategories] = useState<Record<string, boolean>>({});

  useEffect(() => {
    Promise.all([
      requestJson<{ ok: boolean; rows: PublicProfileRow[] }>("/api/profiles"),
      requestJson<{ ok: boolean; rankCategories?: RankCategoryDefinition[] }>("/api/ranks"),
    ])
      .then(([profilesData, ranksData]) => {
        setRows(profilesData.rows ?? []);
        setRankCategories(ranksData.rankCategories ?? []);
      })
      .catch(() => {
        setRows([]);
        setRankCategories([]);
      })
      .finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return rows;
    return rows.filter((row) => memberHaystack(row).includes(needle));
  }, [query, rows]);

  const groupedSections = useMemo(() => {
    const buckets = new Map<string, { title: string; rows: PublicProfileRow[] }>();

    for (const category of rankCategories) {
      const key = String(category.id || category.title).trim() || category.title;
      buckets.set(key, { title: category.title || "Category", rows: [] });
    }

    const unassigned: PublicProfileRow[] = [];

    for (const row of filtered) {
      const categoryIdx = findRankCategoryIndex(rankCategories, row.rank ?? "");
      if (categoryIdx < 0) {
        unassigned.push(row);
        continue;
      }

      const category = rankCategories[categoryIdx];
      const key = String(category.id || category.title).trim() || category.title;
      const bucket = buckets.get(key);
      if (bucket) {
        bucket.rows.push(row);
      } else {
        unassigned.push(row);
      }
    }

    const sections = rankCategories
      .map((category) => {
        const key = String(category.id || category.title).trim() || category.title;
        return {
          id: key,
          title: category.title || "Category",
          rows: buckets.get(key)?.rows ?? [],
        };
      })
      .filter((section) => section.rows.length > 0);

    if (unassigned.length > 0) {
      sections.push({
        id: UNASSIGNED_CATEGORY_ID,
        title: "Unassigned",
        rows: unassigned,
      });
    }

    return sections;
  }, [filtered, rankCategories]);

  function toggleCategory(id: string) {
    setCollapsedCategories((prev) => ({ ...prev, [id]: !prev[id] }));
  }

  function isCategoryOpen(id: string) {
    return !(collapsedCategories[id] ?? false);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center gap-3 py-20 text-muted-foreground">
        <Spinner />
        <span>Loading members...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Input
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder="Search by name, ID, rank, assignment, position, or last op..."
        className="max-w-xl"
      />

      {!filtered.length ? (
        <p className="py-10 text-center text-muted-foreground">
          {rows.length ? "No members match your search." : "No public profiles found."}
        </p>
      ) : groupedSections.length ? (
        <div className="space-y-8">
          {groupedSections.map((section, index) => (
            <RankCategorySection
              key={section.id}
              id={section.id}
              title={section.title}
              count={section.rows.length}
              open={isCategoryOpen(section.id)}
              onToggle={toggleCategory}
              showSeparatorBefore={index > 0}
            >
              {section.rows.map((row) => (
                <ProfileMemberCard key={row.id} row={row} />
              ))}
            </RankCategorySection>
          ))}
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((row) => (
            <ProfileMemberCard key={row.id} row={row} />
          ))}
        </div>
      )}
    </div>
  );
}

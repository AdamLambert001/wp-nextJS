import { ORBAT_SLOT_OPEN_ID } from "@/lib/orbat/constants";
import { buildUsersById, loadOrbatSettingsFromDb } from "@/lib/orbat/load";
import type { ServerPlayer, ServerPlayerGroup } from "@/lib/servers/types";

type OrbatPlayerAssignment = {
  assignment: string;
  displayName: string;
  firstName: string;
  lastName: string;
  rank: string;
};

const RANK_PREFIX_PATTERN =
  /^(pvt|pv2|pfc|lcpl|cpl|sgt|ssgt|sgtmaj|wo|cwo|lt|2lt|1lt|capt|maj|col|gen)\.?\s+/i;

function normalizeName(value: string): string {
  return value
    .toLowerCase()
    .replace(RANK_PREFIX_PATTERN, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function initials(value: string): string {
  return value
    .split(/\s+/)
    .map((part) => part[0] ?? "")
    .join("");
}

function scorePlayerMatch(playerName: string, assignment: OrbatPlayerAssignment): number {
  const player = normalizeName(playerName);
  const display = normalizeName(assignment.displayName);
  const first = normalizeName(assignment.firstName);
  const last = normalizeName(assignment.lastName);

  if (!player) return 0;
  if (display && player === display) return 100;
  if (display && (player.includes(display) || display.includes(player))) return 80;
  if (first && last && player.includes(first) && player.includes(last)) return 75;
  if (last && player.includes(last)) return 60;

  const playerParts = player.split(" ");
  const playerInitials = initials(player);
  if (last && first && player.includes(last) && playerInitials.includes(first[0] ?? "")) {
    return 70;
  }

  if (display) {
    const displayParts = display.split(" ");
    const sharedParts = displayParts.filter((part) => part.length > 2 && playerParts.includes(part));
    if (sharedParts.length > 0) return 40 + sharedParts.length * 5;
  }

  return 0;
}

function matchPlayer(
  playerName: string,
  assignments: OrbatPlayerAssignment[],
): ServerPlayer {
  let best: OrbatPlayerAssignment | null = null;
  let bestScore = 0;

  for (const assignment of assignments) {
    const score = scorePlayerMatch(playerName, assignment);
    if (score > bestScore) {
      best = assignment;
      bestScore = score;
    }
  }

  if (!best || bestScore < 55) {
    return {
      name: playerName,
      matchedName: null,
      assignment: null,
    };
  }

  return {
    name: playerName,
    matchedName: best.displayName || [best.firstName, best.lastName].filter(Boolean).join(" ") || null,
    assignment: best.assignment,
  };
}

export async function loadOrbatPlayerAssignments(): Promise<OrbatPlayerAssignment[]> {
  const orbatSettings = await loadOrbatSettingsFromDb();
  const userIds = new Set<string>();

  for (const category of orbatSettings.categories) {
    for (const group of category.groups) {
      for (const row of group.rows) {
        const userId = row.assignedUserId.trim();
        if (userId && userId !== ORBAT_SLOT_OPEN_ID) {
          userIds.add(userId);
        }
      }
    }
  }

  const usersById = await buildUsersById([...userIds]);
  const assignments: OrbatPlayerAssignment[] = [];

  for (const category of orbatSettings.categories) {
    for (const group of category.groups) {
      for (const row of group.rows) {
        const user = usersById[row.assignedUserId];
        if (!user) continue;

        assignments.push({
          assignment: `${group.title} - ${row.position}`,
          displayName: user.displayName || user.id,
          firstName: user.firstName,
          lastName: user.lastName,
          rank: user.rank,
        });
      }
    }
  }

  return assignments;
}

export function groupPlayersByOrbatAssignment(
  playerNames: string[],
  assignments: OrbatPlayerAssignment[],
): ServerPlayerGroup[] {
  const groups = new Map<string, ServerPlayer[]>();

  for (const playerName of playerNames) {
    const player = matchPlayer(playerName, assignments);
    const assignment = player.assignment ?? "Unmatched";
    groups.set(assignment, [...(groups.get(assignment) ?? []), player]);
  }

  return [...groups.entries()]
    .map(([assignment, players]) => ({ assignment, players }))
    .sort((a, b) => {
      if (a.assignment === "Unmatched") return 1;
      if (b.assignment === "Unmatched") return -1;
      return a.assignment.localeCompare(b.assignment);
    });
}

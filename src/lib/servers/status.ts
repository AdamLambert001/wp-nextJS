import { GameDig } from "gamedig";
import {
  groupPlayersByOrbatAssignment,
  loadOrbatPlayerAssignments,
} from "@/lib/servers/orbat-player-match";
import type { PublicGameServer, ServerStatus } from "@/lib/servers/types";

const GAME_TYPE = "arma3";
type OrbatPlayerAssignments = Awaited<ReturnType<typeof loadOrbatPlayerAssignments>>;

function offlineStatus(message: string): ServerStatus {
  return {
    online: false,
    players: null,
    maxPlayers: null,
    playerGroups: [],
    ping: null,
    queryPort: null,
    map: null,
    checkedAt: new Date().toISOString(),
    message,
  };
}

export async function queryServerStatus(
  server: PublicGameServer,
  assignments?: OrbatPlayerAssignments,
): Promise<ServerStatus> {
  if (!server.address) {
    return offlineStatus("No server address has been configured.");
  }

  try {
    const state = await GameDig.query({
      type: GAME_TYPE,
      host: server.address,
      port: server.port,
      maxRetries: 0,
      socketTimeout: 2_500,
      attemptTimeout: 5_000,
      requestPlayers: true,
    });
    const playerNames = (state.players ?? [])
      .map((player) => String(player.name ?? "").trim())
      .filter(Boolean);
    const orbatAssignments = assignments ?? (await loadOrbatPlayerAssignments());

    return {
      online: true,
      players: typeof state.numplayers === "number" ? state.numplayers : null,
      maxPlayers: typeof state.maxplayers === "number" ? state.maxplayers : null,
      playerGroups: groupPlayersByOrbatAssignment(playerNames, orbatAssignments),
      ping: typeof state.ping === "number" ? Math.round(state.ping) : null,
      queryPort: typeof state.queryPort === "number" ? state.queryPort : null,
      map: state.map?.trim() || null,
      checkedAt: new Date().toISOString(),
      message: null,
    };
  } catch (error) {
    const message = error instanceof Error && error.message ? error.message : "Server did not respond.";
    return offlineStatus(message);
  }
}

import { GameDig } from "gamedig";
import type { PublicGameServer, ServerStatus } from "@/lib/servers/types";

const GAME_TYPE = "arma3";

function offlineStatus(message: string): ServerStatus {
  return {
    online: false,
    players: null,
    maxPlayers: null,
    ping: null,
    queryPort: null,
    map: null,
    checkedAt: new Date().toISOString(),
    message,
  };
}

export async function queryServerStatus(server: PublicGameServer): Promise<ServerStatus> {
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
      requestPlayers: false,
    });

    return {
      online: true,
      players: typeof state.numplayers === "number" ? state.numplayers : null,
      maxPlayers: typeof state.maxplayers === "number" ? state.maxplayers : null,
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

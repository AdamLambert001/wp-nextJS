export type PublicGameServer = {
  id: string;
  name: string;
  address: string;
  port: number;
  category: string;
  description: string;
};

export type ServerStatus = {
  online: boolean;
  players: number | null;
  maxPlayers: number | null;
  playerGroups: ServerPlayerGroup[];
  ping: number | null;
  queryPort: number | null;
  map: string | null;
  checkedAt: string;
  message: string | null;
};

export type ServerPlayer = {
  name: string;
  matchedName: string | null;
  assignment: string | null;
};

export type ServerPlayerGroup = {
  assignment: string;
  players: ServerPlayer[];
};

export type ServerCardData = PublicGameServer & {
  status: ServerStatus;
};

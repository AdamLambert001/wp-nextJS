declare module "gamedig" {
  export type GameDigQueryOptions = {
    type: string;
    host: string;
    port?: number;
    maxRetries?: number;
    socketTimeout?: number;
    attemptTimeout?: number;
    givenPortOnly?: boolean;
    requestPlayers?: boolean;
  };

  export type GameDigQueryResult = {
    name?: string;
    map?: string;
    numplayers?: number;
    maxplayers?: number;
    ping?: number;
    connect?: string;
    queryPort?: number;
  };

  export const GameDig: {
    query(options: GameDigQueryOptions): Promise<GameDigQueryResult>;
  };
}

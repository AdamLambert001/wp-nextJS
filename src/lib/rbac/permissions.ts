export const Permission = {
  UPLOAD: "upload",
  CONTROL_SERVERS: "control_servers",
  CONTROL_MAIN: "control_main",
  CONTROL_GAMES: "control_games",
  CONTROL_FUN_OPS: "control_fun_ops",
  CONTROL_OTHER: "control_other",
  MANAGE_SERVER: "manage_server",
  DELETE_SERVERS: "delete_servers",
  MANAGE_MODS: "manage_mods",
  DELETE_MISSIONS: "delete_missions",
  VIEW_CONSOLE: "view_console",
  SR_ADMIN: "sr_admin",
  SR_SQUAD_LEADER: "sr_squad_leader",
  SR_TRAINER: "sr_trainer",
  SR_RECRUITER: "sr_recruiter",
  SR_ZEUS: "sr_zeus",
  ACCESS_ADMIN: "access_admin",
  ACCESS_DASHBOARD: "access_dashboard",
  VIEW_SERVICE_RECORDS: "view_service_records",
  EDIT_SERVICE_RECORDS: "edit_service_records",
  MANAGE_OPS: "manage_ops",
} as const;

export type Permission = (typeof Permission)[keyof typeof Permission];

export const ALL_PERMISSIONS = Object.values(Permission);

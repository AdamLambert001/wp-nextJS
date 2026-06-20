export type AdminActionResult<T = void> =
  | { ok: true; data: T }
  | { ok: false; message: string };

export function actionError(error: unknown): AdminActionResult<never> {
  if (error instanceof Error) {
    return { ok: false, message: error.message };
  }
  return { ok: false, message: "Action failed" };
}

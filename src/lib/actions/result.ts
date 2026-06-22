export type ActionResult<T = void> =
  | { ok: true; data: T }
  | { ok: false; message: string };

export function actionError(error: unknown): ActionResult<never> {
  if (error instanceof Error) {
    return { ok: false, message: error.message };
  }
  return { ok: false, message: "Action failed" };
}

export function actionOk<T>(data: T): ActionResult<T> {
  return { ok: true, data };
}

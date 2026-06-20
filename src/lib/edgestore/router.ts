import { initEdgeStore } from "@edgestore/server";
import {
  type CreateContextOptions,
  createEdgeStoreNextHandler,
} from "@edgestore/server/adapters/next/app";
import { z } from "zod";
import { getAccessFromHeaders } from "@/lib/rbac/get-access";
import { canEditLore, effectiveSrAdmin } from "@/lib/sr-settings/permissions";

export type EdgeStoreUploadTier = "full" | "lore" | "guest";

export type EdgeStoreContext = {
  userId: string;
  uploadTier: EdgeStoreUploadTier;
};

function resolveUploadTier(flags: Parameters<typeof canEditLore>[0]): EdgeStoreUploadTier {
  if (effectiveSrAdmin(flags)) {
    return "full";
  }
  if (canEditLore(flags)) {
    return "lore";
  }
  return "guest";
}

async function createContext({
  req,
}: CreateContextOptions): Promise<EdgeStoreContext> {
  const access = await getAccessFromHeaders(req.headers);

  return {
    userId: access.userId ?? "guest",
    uploadTier: resolveUploadTier(access.flags),
  };
}

const es = initEdgeStore.context<EdgeStoreContext>().create();

export const edgeStoreRouter = es.router({
  images: es
    .imageBucket({
      maxSize: 1024 * 1024 * 10,
      accept: ["image/jpeg", "image/png", "image/webp", "image/gif"],
    })
    .input(
      z.object({
        folder: z.enum(["lore", "medals", "ranks", "home", "orbat"]),
      }),
    )
    .path(({ input }) => [{ folder: input.folder }])
    .beforeUpload(({ ctx, input }) => {
      if (input.folder === "lore") {
        return ctx.uploadTier === "full" || ctx.uploadTier === "lore";
      }
      return ctx.uploadTier === "full";
    })
    .beforeDelete(({ ctx, fileInfo }) => {
      if (fileInfo.path.folder === "lore") {
        return ctx.uploadTier === "full" || ctx.uploadTier === "lore";
      }
      return ctx.uploadTier === "full";
    }),
});

export type EdgeStoreRouter = typeof edgeStoreRouter;

export const edgeStoreHandler = createEdgeStoreNextHandler({
  router: edgeStoreRouter,
  createContext,
});

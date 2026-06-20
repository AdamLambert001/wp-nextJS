"use server";

import { revalidatePath } from "next/cache";
import { assertMemberListEditAccess } from "@/lib/admin/admin-auth";
import {
  createServiceRecordDetail,
  deleteServiceRecordDetail,
  loadServiceRecordDetail,
  updateServiceRecordDetail,
  type ServiceRecordCreateInput,
  type ServiceRecordDetail,
  type ServiceRecordDetailUpdate,
} from "@/lib/admin/service-record-detail";
import { assertEffectiveSrAdminAccess } from "@/lib/admin/service-record-actions/auth";
import { sanitizeServiceRecordUpdate } from "@/lib/admin/service-record-actions/sanitize-update";
import { getAccess } from "@/lib/rbac/get-access";
import { actionError, type AdminActionResult } from "@/app/admin/actions/shared";

export async function loadServiceRecordDetailAction(
  id: string,
): Promise<AdminActionResult<ServiceRecordDetail>> {
  try {
    await assertMemberListEditAccess();
    const record = await loadServiceRecordDetail(id);
    if (!record) {
      return { ok: false, message: "Service record not found." };
    }
    return { ok: true, data: record };
  } catch (error) {
    return actionError(error);
  }
}

export async function createServiceRecordAction(
  input: ServiceRecordCreateInput,
): Promise<AdminActionResult<ServiceRecordDetail>> {
  try {
    await assertMemberListEditAccess();
    const id = String(input.id ?? "").trim();
    if (!id) {
      return { ok: false, message: "Service record ID is required." };
    }
    const record = await createServiceRecordDetail({ ...input, id });
    revalidatePath("/admin");
    return { ok: true, data: record };
  } catch (error) {
    return actionError(error);
  }
}

export async function updateServiceRecordAction(
  id: string,
  input: ServiceRecordDetailUpdate,
): Promise<AdminActionResult<ServiceRecordDetail>> {
  try {
    await assertMemberListEditAccess();
    const access = await getAccess();
    const existing = await loadServiceRecordDetail(id);
    if (!existing) {
      return { ok: false, message: "Service record not found." };
    }
    const sanitized = sanitizeServiceRecordUpdate(input, existing, access.flags);
    const record = await updateServiceRecordDetail(id, sanitized);
    revalidatePath("/admin");
    return { ok: true, data: record };
  } catch (error) {
    return actionError(error);
  }
}

export async function deleteServiceRecordAction(
  id: string,
): Promise<AdminActionResult<void>> {
  try {
    await assertEffectiveSrAdminAccess();
    const key = String(id ?? "").trim();
    if (!key) {
      return { ok: false, message: "Service record ID is required." };
    }
    await deleteServiceRecordDetail(key);
    revalidatePath("/admin");
    revalidatePath("/profile");
    revalidatePath("/profiles");
    revalidatePath("/orbat");
    return { ok: true, data: undefined };
  } catch (error) {
    return actionError(error);
  }
}

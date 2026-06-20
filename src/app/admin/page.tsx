import { AdminActionsBoard } from "@/components/admin/admin-actions-board";
import { AdminCampaignAttendees } from "@/components/admin/admin-campaign-attendees";
import { AdminLogViewer } from "@/components/admin/admin-log-viewer";
import { ServiceRecordsTable } from "@/components/admin/service-records-table";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { loadAdminActionsData } from "@/lib/admin/load-admin-actions-data";
import { loadDetachmentTagLookup } from "@/lib/admin/detachment-tags";
import { loadServiceRecordRows } from "@/lib/admin/service-records";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Admin — Zeta Company",
};

export default async function AdminPage() {
  const [serviceRecords, adminActionsData, detachmentTags] = await Promise.all([
    loadServiceRecordRows(),
    loadAdminActionsData(),
    loadDetachmentTagLookup(),
  ]);

  return (
    <main className="mx-auto max-w-6xl space-y-6 px-4 py-14 sm:px-6 sm:py-16">
      <div className="space-y-2">
        <Badge variant="secondary">RBAC protected</Badge>
        <h1 className="text-3xl font-semibold tracking-tight">Admin</h1>
        <p className="text-muted-foreground">
          Manage personnel service records, run SR studio bulk actions, and assign panel roles.
          Role changes write to the shared{" "}
          <code className="rounded bg-muted px-1 py-0.5 text-sm">discord_roles</code> table used by
          the legacy panel.
        </p>
      </div>

      {adminActionsData.capabilities.canOpenSrStudio ? (
        <section className="space-y-8">
          <div className="space-y-1">
            <h2 className="text-xl font-semibold tracking-tight">Service record actions</h2>
            <p className="text-sm text-muted-foreground">
              Bulk attendance, training, rank, medal, and ribbon tools from the legacy SR admin
              studio.
            </p>
          </div>
          <AdminActionsBoard data={adminActionsData} />

          {adminActionsData.capabilities.effectiveSrAdmin ? (
            <>
              <AdminLogViewer users={adminActionsData.users} showSeparatorBefore />
              <AdminCampaignAttendees
                ribbons={adminActionsData.settings.campaignRibbons}
                showSeparatorBefore
              />
            </>
          ) : null}
        </section>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>Service records</CardTitle>
          <CardDescription>
            {serviceRecords.length} personnel record{serviceRecords.length === 1 ? "" : "s"}.
            Detachment badges reflect ORBAT assignments. Use <strong>Create record</strong> to add
            a new member, <strong>Edit</strong> to update a service record,{" "}
            <strong>Manage roles</strong> for panel access, or{" "}
            <strong>Edit Tags</strong> to style detachment badges. Home page content is managed
            under <strong>Site appearance → Edit home page</strong> in the SR admin studio.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ServiceRecordsTable
            rows={serviceRecords}
            detachmentTags={detachmentTags}
            canEditMemberList={adminActionsData.capabilities.canEditMemberList}
            canDeleteRecords={adminActionsData.capabilities.effectiveSrAdmin}
            canManageRoles={adminActionsData.capabilities.canManageServer}
            canEditTags={adminActionsData.capabilities.canManageServer}
          />
        </CardContent>
      </Card>
    </main>
  );
}

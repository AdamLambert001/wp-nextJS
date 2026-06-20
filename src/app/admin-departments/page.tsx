import { AdminDepartmentsBoard } from "@/components/admin-departments/admin-departments-board";

export default function AdminDepartmentsPage() {
  return (
    <main className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
      <div className="mb-6">
        <h1 className="text-3xl font-semibold tracking-tight">Admin Departments</h1>
        <p className="mt-2 text-muted-foreground">
          Unit admin positions, assignments, and vacancy status.
        </p>
      </div>
      <AdminDepartmentsBoard />
    </main>
  );
}

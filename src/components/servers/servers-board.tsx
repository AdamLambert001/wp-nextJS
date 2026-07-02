"use client";

import { type FormEvent, useMemo, useState, useTransition } from "react";
import {
  ChevronDownIcon,
  CopyIcon,
  GlobeIcon,
  PencilIcon,
  PlusIcon,
  UsersIcon,
} from "lucide-react";
import {
  addServerAction,
  editServerAction,
  refreshServerStatusAction,
} from "@/app/servers/actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/lib/toast";
import type { ServerCardData, ServerStatus } from "@/lib/servers/types";
import { cn } from "@/lib/utils";

type ServersBoardProps = {
  initialServers: ServerCardData[];
  canAddServers: boolean;
};

type AddServerForm = {
  name: string;
  address: string;
  port: string;
  category: string;
  description: string;
};

type ServerFormState = AddServerForm;

function checkedAtLabel(value: string): string {
  return `${new Date(value).toISOString().slice(11, 19)} UTC`;
}

function playerLabel(status: ServerStatus): string {
  if (status.players === null) {
    return "Unknown";
  }

  if (status.maxPlayers === null) {
    return String(status.players);
  }

  return `${status.players}/${status.maxPlayers}`;
}

function fullAddress(server: ServerCardData): string {
  return `${server.address}:${server.port}`;
}

async function copyAddress(address: string) {
  try {
    await navigator.clipboard.writeText(address);
    toast.success("Server IP copied.");
  } catch {
    toast.error("Failed to copy server IP.");
  }
}

function serverToForm(server: ServerCardData): ServerFormState {
  return {
    name: server.name,
    address: server.address,
    port: String(server.port),
    category: server.category,
    description: server.description,
  };
}

function CategoryInput({
  value,
  onChange,
  disabled,
  categories,
  id,
}: {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  categories: string[];
  id: string;
}) {
  const listId = `${id}-options`;

  return (
    <div className="space-y-2">
      <Label htmlFor={id}>Category</Label>
      <Input
        id={id}
        list={listId}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder="Main"
        disabled={disabled}
      />
      <datalist id={listId}>
        {categories.map((category) => (
          <option key={category} value={category} />
        ))}
      </datalist>
    </div>
  );
}

function ServerCard({
  server,
  canEdit,
  categories,
  onSaved,
  onStatusChange,
}: {
  server: ServerCardData;
  canEdit: boolean;
  categories: string[];
  onSaved: (server: ServerCardData) => void;
  onStatusChange: (status: ServerStatus) => void;
}) {
  const [refreshing, startRefresh] = useTransition();
  const [editing, setEditing] = useState(false);
  const [playersOpen, setPlayersOpen] = useState(false);
  const status = server.status;
  const address = fullAddress(server);
  const hasPlayerGroups = status.playerGroups.length > 0;

  function handleRefresh() {
    startRefresh(async () => {
      const result = await refreshServerStatusAction(server.id);
      if (!result.ok) {
        toast.error(result.message);
        return;
      }

      onStatusChange(result.data);
    });
  }

  return (
    <Card
      className={cn(
        "bg-background/95",
        status.online
          ? "bg-[linear-gradient(90deg,rgba(34,197,94,0.18),rgba(34,197,94,0.05)_38%,transparent)]"
          : "bg-[linear-gradient(90deg,rgba(239,68,68,0.18),rgba(239,68,68,0.05)_38%,transparent)]",
      )}
    >
      <CardHeader>
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 space-y-1">
            <CardTitle className="truncate">{server.name}</CardTitle>
            <div className="flex flex-wrap items-center gap-2">
              <CardDescription>{address}</CardDescription>
              <Button
                type="button"
                variant="ghost"
                size="icon-xs"
                onClick={() => void copyAddress(address)}
                aria-label={`Copy ${address}`}
              >
                <CopyIcon />
              </Button>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <Badge
              variant="outline"
              className={cn(
                status.online
                  ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-300"
                  : "border-red-500/40 bg-red-500/10 text-red-300",
              )}
            >
              <GlobeIcon />
              {status.online ? "Online" : "Offline"}
            </Badge>
            {canEdit ? (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setEditing(true)}
              >
                <PencilIcon />
                Edit
              </Button>
            ) : null}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {server.description ? (
          <p className="text-sm leading-relaxed text-muted-foreground">{server.description}</p>
        ) : null}

        <div className="grid grid-cols-2 gap-3 text-sm">
          <div className="rounded-lg bg-muted/40 p-3">
            <p className="text-muted-foreground">Players</p>
            <p className="mt-1 text-lg font-semibold">{playerLabel(status)}</p>
          </div>
          <div className="rounded-lg bg-muted/40 p-3">
            <p className="text-muted-foreground">Ping</p>
            <p className="mt-1 text-lg font-semibold">
              {status.ping === null ? "Unknown" : `${status.ping} ms`}
            </p>
          </div>
        </div>

        {status.map ? (
          <p className="text-sm text-muted-foreground">Map: {status.map}</p>
        ) : null}
        {status.queryPort ? (
          <p className="text-sm text-muted-foreground">Query port: {status.queryPort}</p>
        ) : null}
        {!status.online && status.message ? (
          <p className="text-sm text-muted-foreground">{status.message}</p>
        ) : null}

        <div className="rounded-lg border border-border/70 bg-background/40">
          <button
            type="button"
            className="flex w-full items-center justify-between gap-3 px-3 py-2 text-left text-sm"
            onClick={() => setPlayersOpen((current) => !current)}
          >
            <span className="flex items-center gap-2 font-medium">
              <UsersIcon className="size-4" />
              Current players
            </span>
            <ChevronDownIcon
              className={cn("size-4 transition-transform duration-300", playersOpen && "rotate-180")}
            />
          </button>
          <div
            className={cn(
              "grid transition-[grid-template-rows,opacity] duration-300 ease-out",
              playersOpen ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0",
            )}
          >
            <div className="min-h-0 overflow-hidden">
              <div className="grid gap-3 border-t border-border/70 p-3 sm:grid-cols-2 lg:grid-cols-3">
                {hasPlayerGroups ? (
                  status.playerGroups.map((group) => (
                    <div key={group.assignment} className="rounded-lg bg-muted/35 p-3">
                      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        {group.assignment}
                      </p>
                      <div className="mt-2 space-y-1">
                        {group.players.map((player) => (
                          <div key={`${group.assignment}:${player.name}`} className="text-sm">
                            <p className="font-medium">{player.name}</p>
                            {player.matchedName && player.matchedName !== player.name ? (
                              <p className="text-xs text-muted-foreground">
                                Matched: {player.matchedName}
                              </p>
                            ) : null}
                          </div>
                        ))}
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground">
                    {status.online
                      ? "No player names returned by the server."
                      : "Player list unavailable while the server is offline."}
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between gap-3">
          <p className="text-xs text-muted-foreground">Checked {checkedAtLabel(status.checkedAt)}</p>
          <Button type="button" variant="outline" size="sm" onClick={handleRefresh} disabled={refreshing}>
            {refreshing ? "Checking..." : "Refresh"}
          </Button>
        </div>
      </CardContent>
      {canEdit && editing ? (
        <EditServerDialog
          server={server}
          categories={categories}
          open={editing}
          onOpenChange={setEditing}
          onSaved={onSaved}
        />
      ) : null}
    </Card>
  );
}

function EditServerDialog({
  server,
  categories,
  open,
  onOpenChange,
  onSaved,
}: {
  server: ServerCardData;
  categories: string[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved: (server: ServerCardData) => void;
}) {
  const [saving, startSave] = useTransition();
  const [form, setForm] = useState<ServerFormState>(() => serverToForm(server));

  function updateField(field: keyof ServerFormState, value: string) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    startSave(async () => {
      const result = await editServerAction(server.id, {
        name: form.name,
        address: form.address,
        port: Number(form.port),
        category: form.category,
        description: form.description,
      });

      if (!result.ok) {
        toast.error(result.message);
        return;
      }

      toast.success("Server updated.");
      onSaved(result.data);
      onOpenChange(false);
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit server</DialogTitle>
          <DialogDescription>
            Update the displayed card name, address, port, or category.
          </DialogDescription>
        </DialogHeader>
        <ServerDetailsForm
          form={form}
          categories={categories}
          disabled={saving}
          submitLabel={saving ? "Saving..." : "Save changes"}
          onSubmit={handleSubmit}
          onFieldChange={updateField}
        />
      </DialogContent>
    </Dialog>
  );
}

function ServerDetailsForm({
  form,
  categories,
  disabled,
  submitLabel,
  onSubmit,
  onFieldChange,
}: {
  form: ServerFormState;
  categories: string[];
  disabled: boolean;
  submitLabel: string;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onFieldChange: (field: keyof ServerFormState, value: string) => void;
}) {
  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="server-name">Server card name</Label>
        <Input
          id="server-name"
          value={form.name}
          onChange={(event) => onFieldChange("name", event.target.value)}
          placeholder="Main Operations"
          disabled={disabled}
          required
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="server-address">IP or hostname</Label>
        <Input
          id="server-address"
          value={form.address}
          onChange={(event) => onFieldChange("address", event.target.value)}
          placeholder="123.45.67.89"
          disabled={disabled}
          required
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="server-port">Port</Label>
        <Input
          id="server-port"
          type="number"
          min={1}
          max={65535}
          value={form.port}
          onChange={(event) => onFieldChange("port", event.target.value)}
          placeholder="2302"
          disabled={disabled}
          required
        />
      </div>
      <CategoryInput
        id="server-category"
        value={form.category}
        onChange={(value) => onFieldChange("category", value)}
        categories={categories}
        disabled={disabled}
      />
      <div className="space-y-2">
        <Label htmlFor="server-description">Description <span className="text-muted-foreground">(optional)</span></Label>
        <Textarea
          id="server-description"
          value={form.description}
          onChange={(event) => onFieldChange("description", event.target.value)}
          placeholder="Short note about this server, modset, or purpose."
          disabled={disabled}
          rows={3}
        />
      </div>
      <DialogFooter className="-mx-0 -mb-0 rounded-none border-t-0 bg-transparent p-0">
        <Button type="submit" disabled={disabled}>
          {submitLabel}
        </Button>
      </DialogFooter>
    </form>
  );
}

function AddServerDialog({
  categories,
  onAdded,
}: {
  categories: string[];
  onAdded: (server: ServerCardData) => void;
}) {
  const [saving, startSave] = useTransition();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<ServerFormState>({
    name: "",
    address: "",
    port: "",
    category: "Main",
    description: "",
  });

  function updateField(field: keyof ServerFormState, value: string) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    startSave(async () => {
      const result = await addServerAction({
        name: form.name,
        address: form.address,
        port: Number(form.port),
        category: form.category,
        description: form.description,
      });

      if (!result.ok) {
        toast.error(result.message);
        return;
      }

      toast.success("Server added.");
      setForm({
        name: "",
        address: "",
        port: "",
        category: form.category || "Main",
        description: "",
      });
      onAdded(result.data);
      setOpen(false);
    });
  }

  return (
    <>
      <div className="flex justify-end">
        <Button type="button" onClick={() => setOpen(true)}>
          <PlusIcon />
          Add Server
        </Button>
      </div>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Server</DialogTitle>
            <DialogDescription>
              Add an Arma 3 server card. GameDig will check the configured port and Arma query port.
            </DialogDescription>
          </DialogHeader>
        <ServerDetailsForm
          form={form}
          categories={categories}
          disabled={saving}
          submitLabel={saving ? "Adding..." : "Add Server"}
          onSubmit={handleSubmit}
          onFieldChange={updateField}
        />
        </DialogContent>
      </Dialog>
    </>
  );
}

export function ServersBoard({ initialServers, canAddServers }: ServersBoardProps) {
  const [servers, setServers] = useState(initialServers);
  const [openCategories, setOpenCategories] = useState<Set<string>>(
    () => new Set(initialServers.map((server) => server.category || "Other")),
  );

  const categories = useMemo(() => {
    const values = new Set(servers.map((server) => server.category || "Other"));
    values.add("Main");
    values.add("Other");
    return [...values].sort((a, b) => a.localeCompare(b));
  }, [servers]);

  const groupedServers = useMemo(
    () =>
      categories
        .map((category) => ({
          category,
          servers: servers.filter((server) => (server.category || "Other") === category),
        }))
        .filter((group) => group.servers.length > 0),
    [categories, servers],
  );

  function addServer(server: ServerCardData) {
    setServers((current) => [...current, server]);
    setOpenCategories((current) => new Set(current).add(server.category || "Other"));
  }

  function saveServer(savedServer: ServerCardData) {
    setServers((current) =>
      current.map((server) => (server.id === savedServer.id ? savedServer : server)),
    );
    setOpenCategories((current) => new Set(current).add(savedServer.category || "Other"));
  }

  function updateStatus(id: string, status: ServerStatus) {
    setServers((current) =>
      current.map((server) => (server.id === id ? { ...server, status } : server)),
    );
  }

  function toggleCategory(category: string) {
    setOpenCategories((current) => {
      const next = new Set(current);
      if (next.has(category)) {
        next.delete(category);
      } else {
        next.add(category);
      }
      return next;
    });
  }

  return (
    <div className="space-y-4">
      {canAddServers ? <AddServerDialog categories={categories} onAdded={addServer} /> : null}

      <div className="space-y-3">
        {groupedServers.map((group) => {
          const open = openCategories.has(group.category);

          return (
            <section key={group.category} className="rounded-xl border border-border/80 bg-card/40">
              <button
                type="button"
                className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left"
                onClick={() => toggleCategory(group.category)}
              >
                <div>
                  <h2 className="text-lg font-semibold tracking-tight">{group.category}</h2>
                  <p className="text-sm text-muted-foreground">
                    {group.servers.length} server{group.servers.length === 1 ? "" : "s"}
                  </p>
                </div>
                <ChevronDownIcon
                  className={cn("size-5 transition-transform duration-300", open && "rotate-180")}
                />
              </button>
              <div
                className={cn(
                  "grid transition-[grid-template-rows,opacity] duration-300 ease-out",
                  open ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0",
                )}
              >
                <div className="min-h-0 overflow-hidden">
                  <div className="space-y-3 p-4 pt-0">
                    {group.servers.map((server) => (
                      <ServerCard
                        key={server.id}
                        server={server}
                        canEdit={canAddServers}
                        categories={categories}
                        onSaved={saveServer}
                        onStatusChange={(status) => updateStatus(server.id, status)}
                      />
                    ))}
                  </div>
                </div>
              </div>
            </section>
          );
        })}
      </div>

      {!canAddServers && servers.length === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>No servers configured</CardTitle>
            <CardDescription>
              An admin with server control access can add the first server card.
            </CardDescription>
          </CardHeader>
        </Card>
      ) : null}
    </div>
  );
}

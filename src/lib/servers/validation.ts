export type ServerFormInput = {
  name: string;
  address: string;
  port: number;
  category: string;
  description: string;
};

function requireString(value: unknown, fieldName: string): string {
  if (typeof value !== "string") {
    throw new Error(`${fieldName} is required.`);
  }

  const trimmed = value.trim();
  if (!trimmed) {
    throw new Error(`${fieldName} is required.`);
  }

  return trimmed;
}

export function parseServerFormInput(input: unknown): ServerFormInput {
  if (!input || typeof input !== "object") {
    throw new Error("Server details are required.");
  }

  const record = input as Record<string, unknown>;
  const name = requireString(record.name, "Server name");
  const address = requireString(record.address, "Server IP or hostname");
  const port = Number(record.port);
  const category =
    typeof record.category === "string" && record.category.trim()
      ? record.category.trim()
      : "Other";
  const description =
    typeof record.description === "string" ? record.description.trim() : "";

  if (name.length > 80) {
    throw new Error("Server name must be 80 characters or fewer.");
  }

  if (address.length > 255 || /[:/\\\s]/.test(address)) {
    throw new Error("Enter an IP address or hostname without a protocol, path, or spaces.");
  }

  if (category.length > 60) {
    throw new Error("Category must be 60 characters or fewer.");
  }

  if (description.length > 500) {
    throw new Error("Description must be 500 characters or fewer.");
  }

  if (!Number.isInteger(port) || port < 1 || port > 65_535) {
    throw new Error("Port must be a number between 1 and 65535.");
  }

  return { name, address, port, category, description };
}

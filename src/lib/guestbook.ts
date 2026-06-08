export const MAX_NAME_LENGTH = 32;
export const MAX_MESSAGE_LENGTH = 280;
export const DEFAULT_NAME = "anonymous";

export type Note = {
  id: string;
  name: string;
  message: string;
  createdAt: number;
};

export type NoteInput = {
  name: string;
  message: string;
};

export type ValidationResult = { ok: true; value: NoteInput } | { ok: false; error: string };

function asString(value: unknown): string {
  return typeof value === "string" ? value : "";
}

export function validateNoteInput(input: unknown): ValidationResult {
  if (typeof input !== "object" || input === null) {
    return { ok: false, error: "Expected a note object." };
  }

  const record = input as Record<string, unknown>;

  // Honeypot: real visitors never fill this hidden field. Bots do.
  if (asString(record.website).trim() !== "") {
    return { ok: false, error: "Rejected." };
  }

  const name = asString(record.name).trim();
  const message = asString(record.message).trim();

  if (message === "") {
    return { ok: false, error: "Message can't be empty." };
  }
  if (message.length > MAX_MESSAGE_LENGTH) {
    return { ok: false, error: `Message can't exceed ${MAX_MESSAGE_LENGTH} characters.` };
  }
  if (name.length > MAX_NAME_LENGTH) {
    return { ok: false, error: `Name can't exceed ${MAX_NAME_LENGTH} characters.` };
  }

  return { ok: true, value: { name: name === "" ? DEFAULT_NAME : name, message } };
}

export const MAX_NAME_LENGTH = 32;
export const MAX_MESSAGE_LENGTH = 280;
export const DEFAULT_NAME = "anonymous";
// 500 KB base64 data-URL ceiling (roughly 375 KB raw image)
export const MAX_IMAGE_BYTES = 500_000;
export const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/gif", "image/webp"] as const;
export const VALID_COLORS = ["yellow", "pink", "blue", "green", "orange", "purple"] as const;
export type NoteColor = typeof VALID_COLORS[number];

export type Note = {
  id: string;
  name: string;
  message: string;
  createdAt: number;
  x?: number;
  y?: number;
  color?: NoteColor;
  imageUrl?: string;
};

export type NoteInput = {
  name: string;
  message: string;
  x?: number;
  y?: number;
  color?: NoteColor;
  imageUrl?: string;
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

  // Validate coordinates (if provided)
  let x: number | undefined;
  if (record.x !== undefined && record.x !== null) {
    const parsedX = Number(record.x);
    if (!isNaN(parsedX)) {
      x = Math.max(0, Math.min(100, parsedX));
    }
  }

  let y: number | undefined;
  if (record.y !== undefined && record.y !== null) {
    const parsedY = Number(record.y);
    if (!isNaN(parsedY)) {
      y = Math.max(0, Math.min(100, parsedY));
    }
  }

  // Validate color (if provided)
  let color: NoteColor | undefined;
  if (typeof record.color === "string") {
    const parsedColor = record.color.trim().toLowerCase() as NoteColor;
    if (VALID_COLORS.includes(parsedColor)) {
      color = parsedColor;
    }
  }

  if (message === "" && !imageUrl) {
    return { ok: false, error: "Message can't be empty." };
  }
  if (message.length > MAX_MESSAGE_LENGTH) {
    return { ok: false, error: `Message can't exceed ${MAX_MESSAGE_LENGTH} characters.` };
  }
  if (name.length > MAX_NAME_LENGTH) {
    return { ok: false, error: `Name can't exceed ${MAX_NAME_LENGTH} characters.` };
  }

  // Validate image (if provided)
  let imageUrl: string | undefined;
  if (typeof record.imageUrl === "string" && record.imageUrl.trim() !== "") {
    const img = record.imageUrl.trim();
    // Must be a data URL with an allowed image MIME type
    const dataUrlMatch = img.match(/^data:(image\/\w+);base64,/);
    if (!dataUrlMatch) {
      return { ok: false, error: "Image must be a base64 data URL." };
    }
    const mime = dataUrlMatch[1];
    if (!ALLOWED_IMAGE_TYPES.includes(mime as typeof ALLOWED_IMAGE_TYPES[number])) {
      return { ok: false, error: "Only JPEG, PNG, GIF, and WebP images are allowed." };
    }
    if (img.length > MAX_IMAGE_BYTES) {
      return { ok: false, error: "Image is too large. Please use a smaller image (under ~375 KB)." };
    }
    imageUrl = img;
  }

  return {
    ok: true,
    value: {
      name: name === "" ? DEFAULT_NAME : name,
      message,
      ...(x !== undefined ? { x } : {}),
      ...(y !== undefined ? { y } : {}),
      ...(color ? { color } : {}),
      ...(imageUrl ? { imageUrl } : {}),
    },
  };
}

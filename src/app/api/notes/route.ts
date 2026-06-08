import { NextResponse } from "next/server";

import { validateNoteInput } from "@/lib/wall";
import { addNote, getNotes, isRateLimited } from "@/lib/wall-store";

export const dynamic = "force-dynamic";

function getClientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    return forwarded.split(",")[0].trim();
  }
  return request.headers.get("x-real-ip") ?? "unknown";
}

export async function GET() {
  const notes = await getNotes();
  return NextResponse.json({ notes });
}

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const result = validateNoteInput(body);
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  if (await isRateLimited(getClientIp(request))) {
    return NextResponse.json(
      { error: "You're posting too fast. Give it a minute." },
      { status: 429 },
    );
  }

  const note = await addNote(result.value);
  return NextResponse.json({ note }, { status: 201 });
}

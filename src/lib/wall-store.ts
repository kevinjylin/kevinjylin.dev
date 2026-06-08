import type { Firestore } from "firebase-admin/firestore";

import { getFirestoreDb } from "@/lib/firebase-admin";
import type { Note, NoteInput } from "@/lib/wall";

const NOTES_COLLECTION = "wall_notes";
const RATE_LIMITS_COLLECTION = "wall_rate_limits";
const MAX_STORED = 500;
const MAX_VISIBLE = 100;
const RATE_LIMIT_MAX = 5;
const RATE_LIMIT_WINDOW_SECONDS = 600;

// Local-dev fallback: when Firebase credentials are missing, keep notes in memory
// so the page still works. This is single-process only and resets on restart.
const memoryNotes: Note[] = [];
const memoryRates = new Map<string, { count: number; resetAt: number }>();

let warnedAboutFallback = false;

function getDb(): Firestore | null {
  const db = getFirestoreDb();
  if (!db && !warnedAboutFallback) {
    console.warn("[wall] Firebase Admin SDK not configured — using in-memory store (dev only).");
    warnedAboutFallback = true;
  }
  return db;
}

function createNote(input: NoteInput): Note {
  return {
    id: crypto.randomUUID(),
    name: input.name,
    message: input.message,
    createdAt: Date.now(),
    ...(input.x !== undefined ? { x: input.x } : {}),
    ...(input.y !== undefined ? { y: input.y } : {}),
    ...(input.color ? { color: input.color } : {}),
    ...(input.imageUrl ? { imageUrl: input.imageUrl } : {}),
  };
}

function rateLimitDocId(ip: string): string {
  return Buffer.from(ip).toString("base64url");
}

async function trimOldNotes(db: Firestore): Promise<void> {
  const excess = await db
    .collection(NOTES_COLLECTION)
    .orderBy("createdAt", "desc")
    .offset(MAX_STORED)
    .limit(100)
    .get();

  if (excess.empty) {
    return;
  }

  const batch = db.batch();
  for (const doc of excess.docs) {
    batch.delete(doc.ref);
  }
  await batch.commit();
}

export async function getNotes(): Promise<Note[]> {
  const db = getDb();
  if (!db) {
    return memoryNotes.slice(0, MAX_VISIBLE);
  }

  const snapshot = await db
    .collection(NOTES_COLLECTION)
    .orderBy("createdAt", "desc")
    .limit(MAX_VISIBLE)
    .get();

  return snapshot.docs.map((doc) => doc.data() as Note);
}

export async function addNote(input: NoteInput): Promise<Note> {
  const note = createNote(input);
  const db = getDb();

  if (!db) {
    memoryNotes.unshift(note);
    memoryNotes.length = Math.min(memoryNotes.length, MAX_STORED);
    return note;
  }

  await db.collection(NOTES_COLLECTION).doc(note.id).set(note);
  await trimOldNotes(db);
  return note;
}

export async function isRateLimited(ip: string): Promise<boolean> {
  const db = getDb();

  if (!db) {
    const key = `wall:rate:${ip}`;
    const now = Date.now();
    const entry = memoryRates.get(key);
    if (!entry || entry.resetAt < now) {
      memoryRates.set(key, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_SECONDS * 1000 });
      return false;
    }
    entry.count += 1;
    return entry.count > RATE_LIMIT_MAX;
  }

  const ref = db.collection(RATE_LIMITS_COLLECTION).doc(rateLimitDocId(ip));

  return db.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    const now = Date.now();

    if (!snap.exists) {
      tx.set(ref, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_SECONDS * 1000 });
      return false;
    }

    const data = snap.data() as { count: number; resetAt: number };
    if (data.resetAt < now) {
      tx.set(ref, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_SECONDS * 1000 });
      return false;
    }

    const newCount = data.count + 1;
    tx.update(ref, { count: newCount });
    return newCount > RATE_LIMIT_MAX;
  });
}

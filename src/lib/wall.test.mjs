import assert from "node:assert/strict";
import test from "node:test";

import { DEFAULT_NAME, MAX_MESSAGE_LENGTH, validateNoteInput } from "./wall.ts";

test("accepts a note and trims whitespace", () => {
  const result = validateNoteInput({ name: "  Ada  ", message: "  hello world  " });

  assert.deepEqual(result, { ok: true, value: { name: "Ada", message: "hello world" } });
});

test("falls back to anonymous when name is blank", () => {
  const result = validateNoteInput({ name: "   ", message: "hi" });

  assert.ok(result.ok);
  assert.equal(result.value.name, DEFAULT_NAME);
});

test("rejects an empty message", () => {
  const result = validateNoteInput({ name: "Ada", message: "   " });

  assert.deepEqual(result, { ok: false, error: "Message can't be empty." });
});

test("rejects a message over the length cap", () => {
  const result = validateNoteInput({ message: "x".repeat(MAX_MESSAGE_LENGTH + 1) });

  assert.equal(result.ok, false);
});

test("rejects when the honeypot field is filled", () => {
  const result = validateNoteInput({ message: "hi", website: "http://spam.example" });

  assert.deepEqual(result, { ok: false, error: "Rejected." });
});

test("rejects non-object input", () => {
  assert.equal(validateNoteInput(null).ok, false);
  assert.equal(validateNoteInput("nope").ok, false);
});

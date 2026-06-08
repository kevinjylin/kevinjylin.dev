"use client";

import { useRouter } from "next/navigation";
import { type FormEvent, useEffect, useRef, useState } from "react";

import {
  MAX_MESSAGE_LENGTH,
  MAX_NAME_LENGTH,
  type Note,
} from "@/lib/wall";

interface WallProps {
  initialNotes: Note[];
}

const dateFormatter = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
});

// Deterministic position generator for legacy notes lacking coordinates
function getDeterministicPosition(id: string) {
  let hash1 = 0;
  let hash2 = 0;
  for (let i = 0; i < id.length; i++) {
    const char = id.charCodeAt(i);
    hash1 = (hash1 * 31 + char) % 10000;
    hash2 = (hash2 * 37 + char) % 10000;
  }
  const x = 3 + (hash1 % 90); // Range: 3% to 93%
  const y = 3 + (hash2 % 88); // Range: 3% to 91%
  return { x, y };
}

export function Wall({ initialNotes }: WallProps) {
  const router = useRouter();
  const canvasRef = useRef<HTMLDivElement>(null);

  const [activeFormCoords, setActiveFormCoords] = useState<{ x: number; y: number } | null>(null);
  const [name, setName] = useState("");
  const [message, setMessage] = useState("");
  const [website, setWebsite] = useState(""); // Honeypot
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Auto-focus the message field when the form opens
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  useEffect(() => {
    if (activeFormCoords && textareaRef.current) {
      textareaRef.current.focus();
    }
  }, [activeFormCoords]);

  // Close form on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        handleCancel();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const handleCanvasClick = (e: React.MouseEvent<HTMLDivElement>) => {
    // Check if the click occurred inside an interactive element, note, or form
    const target = e.target as HTMLElement;
    if (
      target.closest(".wall-note") ||
      target.closest(".wall-compose") ||
      target.closest("button") ||
      target.closest("a")
    ) {
      return;
    }

    if (submitting || !canvasRef.current) return;

    const rect = canvasRef.current.getBoundingClientRect();
    const xPercentage = ((e.clientX - rect.left) / rect.width) * 100;
    const yPercentage = ((e.clientY - rect.top) / rect.height) * 100;

    // Clamp to keep the form/note visible with a little breathing room
    const xClamped = Math.max(4, Math.min(96, xPercentage));
    const yClamped = Math.max(3, Math.min(94, yPercentage));

    setError(null);
    setMessage("");
    setActiveFormCoords({ x: xClamped, y: yClamped });
  };

  const handleCancel = () => {
    setActiveFormCoords(null);
    setMessage("");
    setError(null);
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (submitting || !activeFormCoords) return;
    setError(null);
    setSubmitting(true);

    try {
      const response = await fetch("/api/notes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          message,
          website,
          x: activeFormCoords.x,
          y: activeFormCoords.y,
        }),
      });

      if (!response.ok) {
        const data = (await response.json().catch(() => null)) as { error?: string } | null;
        setError(data?.error ?? "Something went wrong. Try again.");
        return;
      }

      // Success: reset form inputs and state
      setMessage("");
      setActiveFormCoords(null);
      router.refresh();
    } catch {
      setError("Couldn't reach the server. Try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="wall-canvas-area">
      {/* Open canvas — full width, no borders */}
      <div
        ref={canvasRef}
        className="wall-canvas"
        onClick={handleCanvasClick}
      >
        {initialNotes.length === 0 && !activeFormCoords && (
          <div className="wall-empty">
            <p>No notes yet — be the first.</p>
          </div>
        )}

        {/* Existing notes */}
        {initialNotes.map((note) => {
          const x = note.x ?? getDeterministicPosition(note.id).x;
          const y = note.y ?? getDeterministicPosition(note.id).y;

          return (
            <div
              key={note.id}
              className="wall-note"
              style={{
                left: `${x}%`,
                top: `${y}%`,
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <p className="wall-note__msg">{note.message}</p>
              <div className="wall-note__footer">
                <span className="wall-note__author">{note.name}</span>
                <time dateTime={new Date(note.createdAt).toISOString()}>
                  {dateFormatter.format(note.createdAt)}
                </time>
              </div>
            </div>
          );
        })}

        {/* Compose form */}
        {activeFormCoords && (
          <form
            className="wall-compose"
            style={{
              left: `${activeFormCoords.x}%`,
              top: `${activeFormCoords.y}%`,
            }}
            onSubmit={handleSubmit}
            onClick={(e) => e.stopPropagation()}
          >
            <input
              className="wall-compose__name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="your name"
              maxLength={MAX_NAME_LENGTH}
              autoComplete="name"
              disabled={submitting}
            />

            <textarea
              ref={textareaRef}
              className="wall-compose__msg"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="leave your mark…"
              maxLength={MAX_MESSAGE_LENGTH}
              rows={3}
              required
              disabled={submitting}
            />

            {/* Honeypot field */}
            <div className="wall-form__honeypot" aria-hidden="true">
              <input
                type="text"
                tabIndex={-1}
                autoComplete="off"
                value={website}
                onChange={(e) => setWebsite(e.target.value)}
              />
            </div>

            <div className="wall-compose__bar">
              <span className="wall-compose__count">
                {message.length}/{MAX_MESSAGE_LENGTH}
              </span>
              <div className="wall-compose__actions">
                <button
                  type="button"
                  className="wall-compose__btn wall-compose__btn--ghost"
                  onClick={handleCancel}
                  disabled={submitting}
                >
                  cancel
                </button>
                <button
                  type="submit"
                  className="wall-compose__btn wall-compose__btn--submit"
                  disabled={submitting || message.trim().length === 0}
                >
                  {submitting ? "posting…" : "post"}
                </button>
              </div>
            </div>

            {error && (
              <p className="wall-compose__error" role="alert">
                {error}
              </p>
            )}
          </form>
        )}
      </div>
    </div>
  );
}

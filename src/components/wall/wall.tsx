"use client";

import { useRouter } from "next/navigation";
import { type FormEvent, useEffect, useRef, useState } from "react";

import {
  MAX_IMAGE_BYTES,
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

// A small, stable tilt per note so the wall feels hand-placed rather than gridded
function getDeterministicRotation(id: string) {
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = (hash * 41 + id.charCodeAt(i)) % 10000;
  }
  return (hash % 45) / 10 - 2.2; // Range: -2.2deg to 2.3deg
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
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

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
    setImagePreview(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  /** Resize image on canvas to stay under size limit */
  function resizeImage(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const img = new Image();
        img.onload = () => {
          const MAX_DIM = 400;
          let { width, height } = img;
          if (width > MAX_DIM || height > MAX_DIM) {
            const scale = Math.min(MAX_DIM / width, MAX_DIM / height);
            width = Math.round(width * scale);
            height = Math.round(height * scale);
          }
          const canvas = document.createElement("canvas");
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext("2d")!;
          ctx.drawImage(img, 0, 0, width, height);
          // Try JPEG at decreasing quality until under limit
          let quality = 0.85;
          let dataUrl = canvas.toDataURL("image/jpeg", quality);
          while (dataUrl.length > MAX_IMAGE_BYTES && quality > 0.2) {
            quality -= 0.1;
            dataUrl = canvas.toDataURL("image/jpeg", quality);
          }
          if (dataUrl.length > MAX_IMAGE_BYTES) {
            reject(new Error("Image is still too large after compression."));
          } else {
            resolve(dataUrl);
          }
        };
        img.onerror = () => reject(new Error("Failed to load image."));
        img.src = reader.result as string;
      };
      reader.onerror = () => reject(new Error("Failed to read file."));
      reader.readAsDataURL(file);
    });
  }

  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(null);
    try {
      const dataUrl = await resizeImage(file);
      setImagePreview(dataUrl);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Image processing failed.");
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
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
          ...(imagePreview ? { imageUrl: imagePreview } : {}),
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
      setImagePreview(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
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

          const rotation = getDeterministicRotation(note.id);

          return (
            <div
              key={note.id}
              className={`wall-note${note.imageUrl ? " wall-note--has-image" : ""}`}
              style={{
                left: `${x}%`,
                top: `${y}%`,
                ["--note-rot" as string]: `${rotation}deg`,
              }}
              onClick={(e) => e.stopPropagation()}
            >
              {note.imageUrl && (
                <div className="wall-note__image-wrap">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={note.imageUrl}
                    alt=""
                    className="wall-note__image"
                    loading="lazy"
                  />
                </div>
              )}
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
                  disabled={submitting || (message.trim().length === 0 && !imagePreview)}
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

            {/* Image upload */}
            <div className="wall-compose__image-row">
              <label className="wall-compose__btn wall-compose__btn--ghost wall-compose__image-label">
                📷 photo
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/gif,image/webp"
                  className="wall-compose__image-input"
                  onChange={handleImageChange}
                  disabled={submitting}
                />
              </label>
              {imagePreview && (
                <button
                  type="button"
                  className="wall-compose__btn wall-compose__btn--ghost"
                  onClick={() => {
                    setImagePreview(null);
                    if (fileInputRef.current) fileInputRef.current.value = "";
                  }}
                  disabled={submitting}
                >
                  remove
                </button>
              )}
            </div>

            {imagePreview && (
              <div className="wall-compose__preview">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={imagePreview} alt="Preview" className="wall-compose__preview-img" />
              </div>
            )}
          </form>
        )}
      </div>
    </div>
  );
}

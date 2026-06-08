"use client";

import { useRouter } from "next/navigation";
import { type FormEvent, useState } from "react";

import { MAX_MESSAGE_LENGTH, MAX_NAME_LENGTH } from "@/lib/wall";

export function WallForm() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [message, setMessage] = useState("");
  const [website, setWebsite] = useState(""); // honeypot
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (submitting) return;
    setError(null);
    setSubmitting(true);

    try {
      const response = await fetch("/api/notes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, message, website }),
      });

      if (!response.ok) {
        const data = (await response.json().catch(() => null)) as { error?: string } | null;
        setError(data?.error ?? "Something went wrong. Try again.");
        return;
      }

      setName("");
      setMessage("");
      router.refresh();
    } catch {
      setError("Couldn't reach the server. Try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form className="wall-form" onSubmit={handleSubmit}>
      <label htmlFor="wall-name" className="sr-only">
        Your name
      </label>
      <input
        id="wall-name"
        className="wall-form__name"
        type="text"
        value={name}
        onChange={(event) => setName(event.target.value)}
        placeholder="Name (optional)"
        maxLength={MAX_NAME_LENGTH}
        autoComplete="name"
        disabled={submitting}
      />

      <label htmlFor="wall-message" className="sr-only">
        Your note
      </label>
      <textarea
        id="wall-message"
        className="wall-form__message"
        value={message}
        onChange={(event) => setMessage(event.target.value)}
        placeholder="Leave your mark…"
        maxLength={MAX_MESSAGE_LENGTH}
        rows={3}
        required
        disabled={submitting}
      />

      {/* Honeypot: hidden from people, tempting to bots. */}
      <div className="wall-form__honeypot" aria-hidden="true">
        <label htmlFor="wall-website">Website</label>
        <input
          id="wall-website"
          type="text"
          tabIndex={-1}
          autoComplete="off"
          value={website}
          onChange={(event) => setWebsite(event.target.value)}
        />
      </div>

      <div className="wall-form__actions">
        <span className="wall-form__count">
          {message.length}/{MAX_MESSAGE_LENGTH}
        </span>
        <button
          type="submit"
          className="twosum-button twosum-button--primary"
          disabled={submitting}
        >
          {submitting ? "Pinning…" : "Pin it up"}
        </button>
      </div>

      {error ? (
        <p className="wall-form__error" role="alert">
          {error}
        </p>
      ) : null}
    </form>
  );
}

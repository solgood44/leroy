"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type {
  MemoriesPayload,
  MemoryMedia,
  MemoryStory,
} from "@/lib/memories";

function excerpt(text: string, max = 200): string {
  const t = text.trim();
  if (t.length <= max) return t;
  return `${t.slice(0, max).trim()}…`;
}

function Lightbox({
  item,
  onClose,
}: {
  item: { url: string; kind: "image" | "video"; label: string };
  onClose: () => void;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [onClose]);

  return (
    <div
      className="leroy-lightbox"
      role="dialog"
      aria-modal="true"
      aria-label="Enlarged media"
      onClick={onClose}
    >
      <button
        type="button"
        className="leroy-lightbox-close"
        onClick={onClose}
        aria-label="Close"
      >
        ×
      </button>
      {item.kind === "video" ? (
        <video
          src={item.url}
          controls
          autoPlay
          playsInline
          onClick={(e) => e.stopPropagation()}
        />
      ) : (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={item.url}
          alt={item.label}
          onClick={(e) => e.stopPropagation()}
        />
      )}
    </div>
  );
}

function MediaCard({
  item,
  onOpen,
}: {
  item: MemoryMedia;
  onOpen: (url: string, kind: "image" | "video", label: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const title = item.matchedName ?? "From friends & family";
  const hasMessage = item.submissions.some((s) => s.message.trim());
  const combined = item.submissions.map((s) => s.message).join("\n\n");

  return (
    <article className="leroy-card">
      <button
        type="button"
        className="leroy-card-media-btn"
        onClick={() => onOpen(item.url, item.kind, `${title} — ${item.fileName}`)}
        aria-label={`Open ${item.fileName}`}
      >
        {item.kind === "video" ? (
          <video
            src={item.url}
            className="leroy-card-video"
            muted
            playsInline
            preload="metadata"
          />
        ) : (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={item.url}
            alt=""
            className="leroy-card-img"
            loading="lazy"
            decoding="async"
          />
        )}
      </button>
      <div className="leroy-card-body">
        <h2 className="leroy-card-name">{title}</h2>
        <p className="leroy-card-file">{item.fileName}</p>
        {hasMessage ? (
          <>
            <button
              type="button"
              className="leroy-toggle"
              onClick={() => setOpen((v) => !v)}
              aria-expanded={open}
            >
              {open ? "Hide note" : "Read note"}
            </button>
            {open ? (
              <div className="leroy-messages">
                {item.submissions.map((s, i) => (
                  <blockquote key={`${s.timestamp}-${i}`} className="leroy-quote">
                    {s.message.trim() ? <p>{s.message}</p> : null}
                    <footer>
                      {s.name.trim() ? `${s.name} · ` : null}
                      {s.timestamp}
                    </footer>
                  </blockquote>
                ))}
              </div>
            ) : (
              <p className="leroy-preview">{excerpt(combined)}</p>
            )}
          </>
        ) : (
          <p className="leroy-hint">
            No matching form name for this file. If you rename it to include
            their first and last name (as on the form), the note will appear
            here.
          </p>
        )}
      </div>
    </article>
  );
}

function LetterCard({ story }: { story: MemoryStory }) {
  const [open, setOpen] = useState(false);
  const combined = story.submissions.map((s) => s.message).join("\n\n");

  return (
    <article className="leroy-letter-card">
      <h3>{story.displayName}</h3>
      <button
        type="button"
        className="leroy-toggle"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
      >
        {open ? "Hide note" : "Read note"}
      </button>
      {open ? (
        <div className="leroy-messages">
          {story.submissions.map((s, i) => (
            <blockquote key={`${s.timestamp}-${i}`} className="leroy-quote">
              {s.message.trim() ? <p>{s.message}</p> : null}
              <footer>{s.timestamp}</footer>
            </blockquote>
          ))}
        </div>
      ) : (
        <p className="leroy-preview">{excerpt(combined)}</p>
      )}
    </article>
  );
}

export function LeroyMemories() {
  const [data, setData] = useState<MemoriesPayload | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [lightbox, setLightbox] = useState<{
    url: string;
    kind: "image" | "video";
    label: string;
  } | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/memories");
        const json: unknown = await res.json();
        if (!res.ok) {
          const msg =
            typeof json === "object" &&
            json !== null &&
            "error" in json &&
            typeof (json as { error: unknown }).error === "string"
              ? (json as { error: string }).error
              : res.statusText;
          throw new Error(msg);
        }
        if (!cancelled) setData(json as MemoriesPayload);
      } catch (e) {
        if (!cancelled)
          setError(e instanceof Error ? e.message : "Something went wrong.");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const filteredItems = useMemo(() => {
    if (!data?.items) return [];
    const q = query.trim().toLowerCase();
    if (!q) return data.items;
    return data.items.filter((p) => {
      const blob = [
        p.matchedName,
        p.fileName,
        ...p.submissions.flatMap((s) => [s.name, s.message]),
      ]
        .join(" ")
        .toLowerCase();
      return blob.includes(q);
    });
  }, [data, query]);

  const filteredLetters = useMemo(() => {
    if (!data?.storiesWithoutMedia) return [];
    const q = query.trim().toLowerCase();
    if (!q) return data.storiesWithoutMedia;
    return data.storiesWithoutMedia.filter((s) => {
      const blob = [
        s.displayName,
        ...s.submissions.flatMap((x) => [x.message, x.name]),
      ]
        .join(" ")
        .toLowerCase();
      return blob.includes(q);
    });
  }, [data, query]);

  const closeLb = useCallback(() => setLightbox(null), []);

  return (
    <div className="leroy-page">
      <header className="leroy-hero">
        <h1>LeRoy Harvey</h1>
        <p className="tag">Memories from people who love you</p>
        <p className="lede">
          Here are the photos and clips folks shared, alongside what they wrote
          on the form—when we could match a name to a file. Below that are
          notes we couldn’t tie to a picture yet.
        </p>
      </header>

      {error ? (
        <p className="leroy-banner leroy-banner--error" role="alert">
          {error}
        </p>
      ) : null}

      {!data && !error ? (
        <p className="leroy-loading">Loading…</p>
      ) : null}

      {data ? (
        <>
          <div className="leroy-search">
            <label htmlFor="q">Search</label>
            <input
              id="q"
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Name or a word from a note"
              autoComplete="off"
            />
          </div>

          {filteredItems.length === 0 ? (
            <p className="leroy-empty">No photos or videos match that search.</p>
          ) : (
            <div className="leroy-grid">
              {filteredItems.map((item) => (
                <MediaCard
                  key={item.id}
                  item={item}
                  onOpen={(url, kind, label) =>
                    setLightbox({ url, kind, label })
                  }
                />
              ))}
            </div>
          )}

          {filteredLetters.length > 0 ? (
            <section className="leroy-letters" aria-label="Notes without media">
              <h2>Notes without a matched photo</h2>
              <p className="sub">
                These messages didn’t match a filename—we still wanted them
                here.
              </p>
              <div className="leroy-letters-grid">
                {filteredLetters.map((s) => (
                  <LetterCard key={s.nameKey} story={s} />
                ))}
              </div>
            </section>
          ) : null}

          <footer className="leroy-footer">
            Made with care ·{" "}
            {new Date(data.generatedAt).toLocaleDateString(undefined, {
              year: "numeric",
              month: "long",
              day: "numeric",
            })}
          </footer>
        </>
      ) : null}

      {lightbox ? (
        <Lightbox
          item={lightbox}
          onClose={closeLb}
        />
      ) : null}
    </div>
  );
}

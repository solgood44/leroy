"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { MemoriesPayload, MemoryPhoto, MemoryStory } from "@/lib/memories";

function excerpt(text: string, max = 220): string {
  const t = text.trim();
  if (t.length <= max) return t;
  return `${t.slice(0, max).trim()}…`;
}

function Lightbox({
  src,
  alt,
  onClose,
}: {
  src: string;
  alt: string;
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
      className="memory-lightbox"
      role="dialog"
      aria-modal="true"
      aria-label="Enlarged photo"
      onClick={onClose}
    >
      <button
        type="button"
        className="memory-lightbox-close"
        onClick={onClose}
        aria-label="Close"
      >
        ×
      </button>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        className="memory-lightbox-img"
        src={src}
        alt={alt}
        onClick={(e) => e.stopPropagation()}
      />
    </div>
  );
}

function PhotoCard({
  photo,
  onOpen,
}: {
  photo: MemoryPhoto;
  onOpen: (src: string, alt: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const title = photo.matchedName ?? "From the shared album";
  const hasMessage = photo.submissions.some((s) => s.message.trim());

  return (
    <article className="memory-card">
      <button
        type="button"
        className="memory-card-image-btn"
        onClick={() =>
          photo.imageUrl
            ? onOpen(photo.imageUrl, `${title} — ${photo.fileName}`)
            : undefined
        }
        disabled={!photo.imageUrl}
        aria-label={`View ${photo.fileName} larger`}
      >
        {photo.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={photo.imageUrl}
            alt=""
            className="memory-card-img"
            loading="lazy"
            decoding="async"
          />
        ) : (
          <div className="memory-card-img-fallback">Could not load this image</div>
        )}
      </button>
      <div className="memory-card-body">
        <h3 className="memory-card-title">{title}</h3>
        <p className="memory-card-file">{photo.fileName}</p>
        {hasMessage ? (
          <>
            <button
              type="button"
              className="memory-card-toggle"
              onClick={() => setOpen((v) => !v)}
              aria-expanded={open}
            >
              {open ? "Hide message" : "Read message"}
            </button>
            {open && (
              <div className="memory-messages">
                {photo.submissions.map((s, i) => (
                  <blockquote key={`${s.timestamp}-${i}`} className="memory-quote">
                    {s.message.trim() ? (
                      <p className="memory-quote-text">{s.message}</p>
                    ) : null}
                    <footer className="memory-quote-meta">
                      {s.name.trim() ? (
                        <span className="memory-quote-name">{s.name}</span>
                      ) : null}
                      {s.timestamp ? (
                        <span className="memory-quote-time">{s.timestamp}</span>
                      ) : null}
                    </footer>
                  </blockquote>
                ))}
              </div>
            )}
            {!open && (
              <p className="memory-card-preview">
                {excerpt(
                  photo.submissions.map((s) => s.message).join("\n\n") || "",
                )}
              </p>
            )}
          </>
        ) : (
          <p className="memory-card-hint">
            No form submission matched this filename yet. Rename the file to
            include the sender&apos;s name (for example{" "}
            <strong>Millie Wibert.jpg</strong>) or add their name on the form.
          </p>
        )}
      </div>
    </article>
  );
}

function StoryCard({ story }: { story: MemoryStory }) {
  const [open, setOpen] = useState(false);
  const preview = excerpt(
    story.submissions.map((s) => s.message).join("\n\n") || "",
  );

  return (
    <article className="memory-story-card">
      <h3 className="memory-story-title">{story.displayName}</h3>
      <button
        type="button"
        className="memory-card-toggle"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
      >
        {open ? "Hide message" : "Read message"}
      </button>
      {open ? (
        <div className="memory-messages">
          {story.submissions.map((s, i) => (
            <blockquote key={`${s.timestamp}-${i}`} className="memory-quote">
              {s.message.trim() ? (
                <p className="memory-quote-text">{s.message}</p>
              ) : null}
              <footer className="memory-quote-meta">
                {s.timestamp ? (
                  <span className="memory-quote-time">{s.timestamp}</span>
                ) : null}
              </footer>
            </blockquote>
          ))}
        </div>
      ) : (
        <p className="memory-card-preview">{preview}</p>
      )}
    </article>
  );
}

export function MemoryGallery() {
  const [data, setData] = useState<MemoriesPayload | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [lightbox, setLightbox] = useState<{ src: string; alt: string } | null>(
    null,
  );

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
          setError(e instanceof Error ? e.message : "Could not load memories.");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const filteredPhotos = useMemo(() => {
    if (!data?.photos) return [];
    const q = query.trim().toLowerCase();
    if (!q) return data.photos;
    return data.photos.filter((p) => {
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

  const filteredStories = useMemo(() => {
    if (!data?.storiesWithoutPhoto) return [];
    const q = query.trim().toLowerCase();
    if (!q) return data.storiesWithoutPhoto;
    return data.storiesWithoutPhoto.filter((s) => {
      const blob = [
        s.displayName,
        ...s.submissions.flatMap((x) => [x.message, x.name]),
      ]
        .join(" ")
        .toLowerCase();
      return blob.includes(q);
    });
  }, [data, query]);

  const closeLightbox = useCallback(() => setLightbox(null), []);

  if (error) {
    return (
      <div className="memory-gallery-root">
        <p className="memory-banner memory-banner-error" role="alert">
          {error}
        </p>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="memory-gallery-root">
        <p className="memory-loading">Loading photos and messages…</p>
      </div>
    );
  }

  return (
    <div className="memory-gallery-root">
      <p className="card-desc memory-intro">
        Photos and form responses are bundled with the site (under{" "}
        <code>public/memories/</code> and <code>data/memories/</code>). When a
        filename is close to someone&apos;s name on the form, their message is
        shown alongside their picture. Run <code>npm run sync:memories</code>{" "}
        to refresh from Google Drive and Dropbox.
      </p>

      <label className="memory-search">
        <span className="memory-search-label">Search names or messages</span>
        <input
          className="memory-search-input"
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Try a first or last name"
          autoComplete="off"
        />
      </label>

      {data.photos.length === 0 ? (
        <p className="memory-empty">
          No images in <code>public/memories/</code> yet. Add files there or run{" "}
          <code>npm run sync:memories</code> with Dropbox configured in{" "}
          <code>.env.local</code>.
        </p>
      ) : null}

      <div className="memory-masonry">
        {filteredPhotos.map((p) => (
          <PhotoCard
            key={p.id}
            photo={p}
            onOpen={(src, alt) => setLightbox({ src, alt })}
          />
        ))}
      </div>

      {filteredStories.length > 0 ? (
        <section className="memory-stories-section" aria-label="Stories without a matched photo">
          <h3 className="memory-stories-heading">Messages without a matched photo</h3>
          <p className="memory-stories-desc">
            These form responses didn&apos;t match an image filename yet — they
            may still be wonderful to read.
          </p>
          <div className="memory-stories-grid">
            {filteredStories.map((s) => (
              <StoryCard key={s.nameKey} story={s} />
            ))}
          </div>
        </section>
      ) : null}

      {lightbox ? (
        <Lightbox
          src={lightbox.src}
          alt={lightbox.alt}
          onClose={closeLightbox}
        />
      ) : null}
    </div>
  );
}

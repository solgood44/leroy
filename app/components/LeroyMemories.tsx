"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type {
  MemoriesPayload,
  MemoryFile,
  MemoryStory,
  PersonAlbum,
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

function Thumb({
  file,
  personLabel,
  onOpen,
}: {
  file: MemoryFile;
  personLabel: string;
  onOpen: (url: string, kind: "image" | "video", label: string) => void;
}) {
  return (
    <button
      type="button"
      className="leroy-album-thumb-btn"
      onClick={() =>
        onOpen(file.url, file.kind, `${personLabel} — ${file.fileName}`)
      }
      aria-label={`Open ${file.fileName}`}
    >
      {file.kind === "video" ? (
        <video
          src={file.url}
          className="leroy-album-thumb"
          muted
          playsInline
          preload="metadata"
        />
      ) : (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={file.url}
          alt=""
          className="leroy-album-thumb"
          loading="lazy"
          decoding="async"
        />
      )}
    </button>
  );
}

function PersonAlbumCard({
  album,
  onOpen,
}: {
  album: PersonAlbum;
  onOpen: (url: string, kind: "image" | "video", label: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const hasMessage = album.submissions.some((s) => s.message.trim());
  const combined = album.submissions.map((s) => s.message).join("\n\n");
  const n = album.media.length;
  const countLabel =
    n === 1 ? "1 photo / clip" : `${n} photos & clips`;

  return (
    <article className="leroy-card leroy-card--album">
      <div className="leroy-card-body leroy-card-body--album-top">
        <h2 className="leroy-card-name">{album.displayName}</h2>
        <p className="leroy-album-count">{countLabel}</p>
      </div>
      <div
        className="leroy-album-media"
        role="list"
        aria-label={`Media from ${album.displayName}`}
      >
        {album.media.map((file) => (
          <Thumb
            key={file.id}
            file={file}
            personLabel={album.displayName}
            onOpen={onOpen}
          />
        ))}
      </div>
      <div className="leroy-card-body">
        {album.fromFilenameOnly ? (
          <p className="leroy-hint">
            No note on the form—we’re only showing the name from the Dropbox
            filename.
          </p>
        ) : hasMessage ? (
          <>
            <button
              type="button"
              className="leroy-toggle"
              onClick={() => setOpen((v) => !v)}
              aria-expanded={open}
            >
              {open ? "Hide notes from the form" : "Read notes from the form"}
            </button>
            {open ? (
              <div className="leroy-messages">
                {album.submissions.map((s, i) => (
                  <blockquote
                    key={`${s.timestamp}-${i}`}
                    className="leroy-quote"
                  >
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
          <p className="leroy-hint">No message text on the form for this person.</p>
        )}
      </div>
    </article>
  );
}

function UnmatchedCard({
  file,
  onOpen,
}: {
  file: MemoryFile;
  onOpen: (url: string, kind: "image" | "video", label: string) => void;
}) {
  return (
    <article className="leroy-card">
      <button
        type="button"
        className="leroy-card-media-btn"
        onClick={() =>
          onOpen(file.url, file.kind, `Unmatched — ${file.fileName}`)
        }
        aria-label={`Open ${file.fileName}`}
      >
        {file.kind === "video" ? (
          <video
            src={file.url}
            className="leroy-card-video"
            muted
            playsInline
            preload="metadata"
          />
        ) : (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={file.url}
            alt=""
            className="leroy-card-img"
            loading="lazy"
            decoding="async"
          />
        )}
      </button>
      <div className="leroy-card-body">
        <h2 className="leroy-card-name">Unmatched file</h2>
        <p className="leroy-card-file">{file.fileName}</p>
        <p className="leroy-hint">
          Add something like <strong>Firstname Lastname</strong> to the filename
          so we can show a &quot;Photos from…&quot; card.
        </p>
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

function albumSearchBlob(a: PersonAlbum): string {
  return [
    a.displayName,
    ...a.media.map((m) => m.fileName),
    ...a.submissions.flatMap((s) => [s.name, s.message]),
  ]
    .join(" ")
    .toLowerCase();
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

  const q = query.trim().toLowerCase();

  const filteredAlbums = useMemo(() => {
    if (!data?.albums) return [];
    if (!q) return data.albums;
    return data.albums.filter((a) => albumSearchBlob(a).includes(q));
  }, [data, q]);

  const filteredUnmatched = useMemo(() => {
    if (!data?.unmatchedMedia) return [];
    if (!q) return data.unmatchedMedia;
    return data.unmatchedMedia.filter((f) =>
      f.fileName.toLowerCase().includes(q),
    );
  }, [data, q]);

  const filteredLetters = useMemo(() => {
    if (!data?.storiesWithoutMedia) return [];
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
  }, [data, q]);

  const closeLb = useCallback(() => setLightbox(null), []);

  const hasResults =
    filteredAlbums.length > 0 ||
    filteredUnmatched.length > 0 ||
    filteredLetters.length > 0;

  return (
    <div className="leroy-page">
      <header className="leroy-hero">
        <h1>LeRoy Harvey</h1>
        <p className="tag">Memories from people who love you</p>
        <p className="lede">
          Photos and clips are grouped by person. When someone wrote on the
          form, you&apos;ll see their notes; otherwise we still show{" "}
          <strong>Photos from…</strong> using the name in the Dropbox filename.
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

          {!hasResults ? (
            <p className="leroy-empty">Nothing matches that search.</p>
          ) : null}

          {filteredAlbums.length > 0 ? (
            <div className="leroy-grid">
              {filteredAlbums.map((album) => (
                <PersonAlbumCard
                  key={album.nameKey}
                  album={album}
                  onOpen={(url, kind, label) =>
                    setLightbox({ url, kind, label })
                  }
                />
              ))}
            </div>
          ) : null}

          {filteredUnmatched.length > 0 ? (
            <section className="leroy-unmatched" aria-label="Unmatched files">
              <h2 className="leroy-section-title">Couldn’t read a name</h2>
              <p className="leroy-section-sub">
                These files don&apos;t match the form and don&apos;t include a
                clear first and last name in the filename—rename if you can.
              </p>
              <div className="leroy-grid">
                {filteredUnmatched.map((file) => (
                  <UnmatchedCard
                    key={file.id}
                    file={file}
                    onOpen={(url, kind, label) =>
                      setLightbox({ url, kind, label })
                    }
                  />
                ))}
              </div>
            </section>
          ) : null}

          {filteredLetters.length > 0 ? (
            <section className="leroy-letters" aria-label="Notes without media">
              <h2>Notes without a matched photo</h2>
              <p className="sub">
                We didn&apos;t find files for these names—only what they wrote.
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
        <Lightbox item={lightbox} onClose={closeLb} />
      ) : null}
    </div>
  );
}

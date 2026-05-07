"use client";

import Image from "next/image";
import { useCallback, useEffect, useState } from "react";
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

const LINKS = {
  messageForm: "https://forms.gle/C2htuJ35AatoW2rh8",
  dropboxUpload: "https://www.dropbox.com/request/s6bnleq9kf4agf37k1bf",
  facebookPost: "https://www.facebook.com/share/p/17HpPURTMR/",
  emailLeRoy: "mailto:harvey48823@gmail.com",
} as const;

function Lightbox({
  item,
  onClose,
}: {
  item: { url: string; label: string };
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
      aria-label="Enlarged photo"
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
      {/* eslint-disable-next-line @next/next/no-img-element -- variable aspect ratio */}
      <img
        src={item.url}
        alt={item.label}
        decoding="async"
        onClick={(e) => e.stopPropagation()}
      />
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
  onOpen: (url: string, label: string) => void;
}) {
  return (
    <button
      type="button"
      className="leroy-album-thumb-btn"
      onClick={() => onOpen(file.url, `${personLabel} — ${file.fileName}`)}
      aria-label={`Open ${file.fileName}`}
    >
      <Image
        src={file.url}
        alt=""
        fill
        className="leroy-album-thumb"
        sizes="(max-width: 480px) 28vw, (max-width: 768px) 22vw, (max-width: 1100px) 18vw, 160px"
        quality={75}
      />
    </button>
  );
}

function PersonAlbumCard({
  album,
  onOpen,
}: {
  album: PersonAlbum;
  onOpen: (url: string, label: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const hasMessage = album.submissions.some((s) => s.message.trim());
  const combined = album.submissions.map((s) => s.message).join("\n\n");
  const n = album.media.length;
  const countLabel = n === 1 ? "1 photo" : `${n} photos`;

  return (
    <article className="leroy-card leroy-card--album">
      <div className="leroy-card-body leroy-card-body--album-top">
        <h2 className="leroy-card-name">{album.displayName}</h2>
        <p className="leroy-album-count">{countLabel}</p>
      </div>
      <div
        className="leroy-album-media"
        role="list"
        aria-label={`Photos from ${album.displayName}`}
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
      {!album.fromFilenameOnly ? (
        <div className="leroy-card-body">
          {hasMessage ? (
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
            <p className="leroy-hint">
              No message text on the form for this person.
            </p>
          )}
        </div>
      ) : null}
    </article>
  );
}

function UnmatchedCard({
  file,
  onOpen,
}: {
  file: MemoryFile;
  onOpen: (url: string, label: string) => void;
}) {
  return (
    <article className="leroy-card">
      <button
        type="button"
        className="leroy-card-media-btn"
        onClick={() => onOpen(file.url, `Unmatched — ${file.fileName}`)}
        aria-label={`Open ${file.fileName}`}
      >
        <Image
          src={file.url}
          alt=""
          fill
          className="leroy-card-img"
          sizes="(max-width: 480px) 100vw, (max-width: 900px) 50vw, 320px"
          quality={75}
        />
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

function FamilyUpdatePanel() {
  const [expanded, setExpanded] = useState(false);

  return (
    <section
      className="leroy-update"
      aria-label="Family update from Molly and Solomon"
    >
      <button
        type="button"
        className="leroy-update-trigger"
        onClick={() => setExpanded((e) => !e)}
        aria-expanded={expanded}
        aria-controls="update-body"
      >
        <span className="leroy-update-trigger-main">
          <span className="leroy-update-badge">Family update</span>
          <span className="leroy-update-trigger-title">
            Updates from Sol &amp; Mol
          </span>
        </span>
        <span className="leroy-update-chevron" aria-hidden>
          {expanded ? "−" : "+"}
        </span>
      </button>
      {!expanded ? (
        <p className="leroy-update-teaser">
          Tap above for a note from Molly &amp; Solomon about Dad—hospice at
          home, how he&apos;s doing, and how to stay in touch. Keep an eye on
          this section; we&apos;ll add more to the letter here when we can.
        </p>
      ) : null}
      <div id="update-body" className="leroy-update-body" hidden={!expanded}>
        <div className="leroy-update-letter">
          <p className="leroy-update-salutation">Dear friends and family,</p>
          <p>
            We wanted to share an update about our dad, LeRoy Harvey. He was
            admitted to the hospital last week after some confusion, and recent
            MRI scans showed changes in his brain that have shifted things more
            quickly than we expected. For now, he has chosen to transition back
            home with hospice comfort care to focus on peace, comfort, and
            quality of life. We want to reiterate that hospice does not
            necessarily mean end of life, but simply a desire to avoid aggressive
            treatments and debilitating side effects.
          </p>
          <p>
            We&apos;re taking things one day at a time and don&apos;t know
            exactly what the coming days will look like. What we do know is that
            he is being cared for by a wonderful team, and we&apos;ve been
            grateful to be by his side. True to who he is, his kindness and
            spirit are shining through in meaningful ways.
          </p>
          <p>
            Over the past year and a half, he&apos;s continued to live fully
            after the previous surgery—staying active, connecting with others,
            playing music, and sharing in community. That sense of connection
            has always meant so much to him, and it continues to now.
          </p>
          <p>
            When we asked what he&apos;d want to share with you all, he simply
            said:{" "}
            <em>
              I&apos;d love to hear what&apos;s going well with everyone, stay
              connected with one another, and keep the conversation going.
            </em>
          </p>
          <p>
            We&apos;re not yet sure what the next steps will be, but for now
            we&apos;re focused on being present with him. We&apos;ll post new
            updates in the family letter at the top of this page as we&apos;re
            able.
          </p>
          <p>
            If you&apos;d like to reach out, he&apos;s open to emails at{" "}
            <a href={LINKS.emailLeRoy}>harvey48823@gmail.com</a>. In the last few
            days there have been improvements in his mental state and he is
            able to have conversations. He is also looking forward to getting
            home and getting back to some sense of normalcy. You can also reach
            out to us directly. We appreciate your patience as we do our best
            to respond.
          </p>
          <p>
            We feel truly blessed for the outpouring of support and love that
            our family has received in the past week—it truly means a lot.
          </p>
          <p className="leroy-update-signoff">
            With love,
            <br />
            Molly and Solomon &lt;3
          </p>
        </div>
      </div>
    </section>
  );
}

function QuickActions() {
  return (
    <nav className="leroy-actions" aria-label="Ways to connect">
      <h2 className="leroy-actions-heading">Ways to reach out</h2>
      <p className="leroy-actions-sub">
        Pick what works for you—each link opens in a new tab.
      </p>
      <ul className="leroy-actions-list">
        <li>
          <a
            className="leroy-action-card"
            href={LINKS.messageForm}
            target="_blank"
            rel="noopener noreferrer"
          >
            <span className="leroy-action-icon" aria-hidden>
              ✉️
            </span>
            <span className="leroy-action-text">
              <span className="leroy-action-title">Leave a message for LeRoy</span>
              <span className="leroy-action-desc">
                Short form—share what&apos;s going well or a note of support
              </span>
            </span>
            <span className="leroy-action-arrow" aria-hidden>
              →
            </span>
          </a>
        </li>
        <li>
          <a
            className="leroy-action-card"
            href={LINKS.dropboxUpload}
            target="_blank"
            rel="noopener noreferrer"
          >
            <span className="leroy-action-icon" aria-hidden>
              🖼️
            </span>
            <span className="leroy-action-text">
              <span className="leroy-action-title">Upload a photo</span>
              <span className="leroy-action-desc">
                Dropbox file request—no account needed (photos only on this page)
              </span>
            </span>
            <span className="leroy-action-arrow" aria-hidden>
              →
            </span>
          </a>
        </li>
        <li>
          <a
            className="leroy-action-card"
            href={LINKS.facebookPost}
            target="_blank"
            rel="noopener noreferrer"
          >
            <span className="leroy-action-icon" aria-hidden>
              💬
            </span>
            <span className="leroy-action-text">
              <span className="leroy-action-title">
                Write on LeRoy&apos;s Facebook post
              </span>
              <span className="leroy-action-desc">
                Join the conversation there if you use Facebook
              </span>
            </span>
            <span className="leroy-action-arrow" aria-hidden>
              →
            </span>
          </a>
        </li>
        <li>
          <a
            className="leroy-action-card"
            href={LINKS.emailLeRoy}
          >
            <span className="leroy-action-icon" aria-hidden>
              📧
            </span>
            <span className="leroy-action-text">
              <span className="leroy-action-title">Email LeRoy</span>
              <span className="leroy-action-desc">
                harvey48823@gmail.com — opens your mail app
              </span>
            </span>
            <span className="leroy-action-arrow" aria-hidden>
              →
            </span>
          </a>
        </li>
      </ul>
    </nav>
  );
}

export function LeroyMemories() {
  const [data, setData] = useState<MemoriesPayload | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [lightbox, setLightbox] = useState<{
    url: string;
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

  const closeLb = useCallback(() => setLightbox(null), []);

  return (
    <div className="leroy-page">
      <header className="leroy-hero">
        <Image
          className="leroy-hero-photo"
          src="/leroy-hero.jpeg"
          alt="LeRoy Harvey"
          width={2048}
          height={1536}
          priority
          sizes="(max-width: 640px) 100vw, 520px"
          quality={85}
        />
        <h1>LeRoy Harvey</h1>
        <p className="tag">A place for memories, photos, and words of love</p>
        <p className="leroy-hero-email">
          You can also reach him by email at{" "}
          <a href={LINKS.emailLeRoy}>harvey48823@gmail.com</a>.
        </p>
      </header>

      <QuickActions />

      <FamilyUpdatePanel />

      {error ? (
        <p className="leroy-banner leroy-banner--error" role="alert">
          {error}
        </p>
      ) : null}

      {!data && !error ? (
        <p className="leroy-loading">Loading photos and messages…</p>
      ) : null}

      {data ? (
        <>
          <section className="leroy-gallery-intro" aria-label="About this gallery">
            <h2 className="leroy-section-title">Photos &amp; messages</h2>
            <p className="leroy-section-sub">
              Below are pictures people have shared, grouped by person.
              When someone used the message form, you&apos;ll see their note;
              otherwise you may see{" "}
              <strong>Photos from…</strong> using the name on the file. For
              news from the family, check{" "}
              <strong>Updates from Sol &amp; Mol</strong> above—we&apos;ll add
              more there when we can.
            </p>
            <p className="leroy-thanks">
              Thank you for all the sweet messages and photos—we&apos;ve been
              touched by every one. We&apos;ll do our best to add more here as
              they come in. Thanks again.
              <span className="leroy-thanks-sign">— Molly &amp; Solomon</span>
            </p>
          </section>

          {data.albums.length > 0 ? (
            <div className="leroy-grid">
              {data.albums.map((album) => (
                <PersonAlbumCard
                  key={album.nameKey}
                  album={album}
                  onOpen={(url, label) => setLightbox({ url, label })}
                />
              ))}
            </div>
          ) : null}

          {data.unmatchedMedia.length > 0 ? (
            <section className="leroy-unmatched" aria-label="Unmatched files">
              <h2 className="leroy-section-title">Couldn’t read a name</h2>
              <p className="leroy-section-sub">
                These files don&apos;t match the form and don&apos;t include a
                clear first and last name in the filename.
              </p>
              <div className="leroy-grid">
                {data.unmatchedMedia.map((file) => (
                  <UnmatchedCard
                    key={file.id}
                    file={file}
                    onOpen={(url, label) => setLightbox({ url, label })}
                  />
                ))}
              </div>
            </section>
          ) : null}

          {data.storiesWithoutMedia.length > 0 ? (
            <section className="leroy-letters" aria-label="Notes without media">
              <h2>Notes without a matched photo</h2>
              <p className="sub">
                We didn&apos;t find files for these names—only what they wrote.
              </p>
              <div className="leroy-letters-grid">
                {data.storiesWithoutMedia.map((s) => (
                  <LetterCard key={s.nameKey} story={s} />
                ))}
              </div>
            </section>
          ) : null}

          <footer className="leroy-footer">
            Page updated ·{" "}
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

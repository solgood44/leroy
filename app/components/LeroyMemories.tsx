"use client";

import Image from "next/image";
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type {
  ChronologicalFormMessage,
  MemoriesPayload,
  MemoryFile,
  PersonAlbum,
} from "@/lib/memories";
/** Split form paste into readable paragraphs; tame odd line breaks from the sheet. */
function formMessageToParagraphs(raw: string): string[] {
  const normalized = raw.trim().replace(/\n{3,}/g, "\n\n");
  return normalized
    .split(/\n\s*\n/)
    .map((p) => p.replace(/\s*\n\s*/g, " ").replace(/[ \t]+/g, " ").trim())
    .filter(Boolean);
}

const LINKS = {
  messageForm: "https://forms.gle/C2htuJ35AatoW2rh8",
  dropboxUpload: "https://www.dropbox.com/request/s6bnleq9kf4agf37k1bf",
  facebookPost: "https://www.facebook.com/share/p/17HpPURTMR/",
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

function PhotoCarousel({
  media,
  whenByFileId,
  albumLabel,
  onOpen,
  firstSlidePriority = false,
}: {
  media: MemoryFile[];
  whenByFileId: Map<string, string>;
  albumLabel: string;
  onOpen: (url: string, label: string) => void;
  /** LCP: set on the hero carousel only */
  firstSlidePriority?: boolean;
}) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [index, setIndex] = useState(0);
  const n = media.length;

  const syncIndex = useCallback(() => {
    const el = trackRef.current;
    if (!el || n <= 0) return;
    const w = el.clientWidth;
    if (w <= 0) return;
    const i = Math.round(el.scrollLeft / w);
    setIndex(Math.max(0, Math.min(n - 1, i)));
  }, [n]);

  useEffect(() => {
    const el = trackRef.current;
    if (!el) return;
    el.addEventListener("scroll", syncIndex, { passive: true });
    return () => el.removeEventListener("scroll", syncIndex);
  }, [syncIndex]);

  useEffect(() => {
    window.addEventListener("resize", syncIndex);
    return () => window.removeEventListener("resize", syncIndex);
  }, [syncIndex]);

  const scrollTo = useCallback(
    (i: number) => {
      const el = trackRef.current;
      if (!el || n <= 0) return;
      const w = el.clientWidth;
      const clamped = Math.max(0, Math.min(n - 1, i));
      el.scrollTo({ left: clamped * w, behavior: "smooth" });
    },
    [n],
  );

  if (n === 0) return null;

  return (
    <div
      className="leroy-photo-carousel"
      role="region"
      aria-roledescription="carousel"
      aria-label={`Photos from ${albumLabel}`}
    >
      <div className="leroy-photo-carousel-viewport">
        {n > 1 ? (
          <>
            <button
              type="button"
              className="leroy-carousel-nav leroy-carousel-nav--prev"
              onClick={() => scrollTo(index - 1)}
              disabled={index <= 0}
              aria-label="Previous photo"
            >
              ‹
            </button>
            <button
              type="button"
              className="leroy-carousel-nav leroy-carousel-nav--next"
              onClick={() => scrollTo(index + 1)}
              disabled={index >= n - 1}
              aria-label="Next photo"
            >
              ›
            </button>
          </>
        ) : null}
        <div ref={trackRef} className="leroy-photo-carousel-track">
          {media.map((file, slideIndex) => {
            const when = whenByFileId.get(file.id) ?? "";
            return (
              <div key={file.id} className="leroy-photo-carousel-slide">
                {when ? (
                  <p className="leroy-carousel-when">{when}</p>
                ) : null}
                <button
                  type="button"
                  className="leroy-carousel-photo-btn"
                  onClick={() =>
                    onOpen(file.url, `${albumLabel} — ${file.fileName}`)
                  }
                  aria-label={when ? `Open photo from ${when}` : "Open photo"}
                >
                  <div className="leroy-carousel-photo-frame">
                    <Image
                      src={file.url}
                      alt=""
                      fill
                      className="leroy-carousel-photo-img"
                      sizes="(max-width: 640px) 100vw, 520px"
                      quality={75}
                      priority={firstSlidePriority && slideIndex === 0}
                    />
                  </div>
                </button>
              </div>
            );
          })}
        </div>
      </div>
      {n > 1 ? (
        <div className="leroy-carousel-meta">
          <p className="leroy-carousel-counter" aria-live="polite">
            {index + 1} / {n}
          </p>
          <div className="leroy-carousel-dots" role="tablist" aria-label="Photo">
            {media.map((file, i) => (
              <button
                key={file.id}
                type="button"
                role="tab"
                aria-selected={i === index}
                aria-label={`Photo ${i + 1} of ${n}`}
                className={
                  i === index
                    ? "leroy-carousel-dot leroy-carousel-dot--active"
                    : "leroy-carousel-dot"
                }
                onClick={() => scrollTo(i)}
              />
            ))}
          </div>
        </div>
      ) : null}
    </div>
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

function formFeedShowAttribution(m: ChronologicalFormMessage): boolean {
  if (!m.signedName.trim()) return false;
  return (
    m.signedName.trim().toLowerCase() !== m.displayName.trim().toLowerCase()
  );
}

function FormMessageParagraphs({ text }: { text: string }) {
  const paras = formMessageToParagraphs(text);
  if (paras.length === 0) {
    return <p className="leroy-form-feed-para">{text.trim()}</p>;
  }
  return paras.map((para, pi) => (
    <p key={pi} className="leroy-form-feed-para">
      {para}
    </p>
  ));
}

function albumPhotoWhenMap(album: PersonAlbum): Map<string, string> {
  const whenByFileId = new Map<string, string>();
  for (const e of album.timeline ?? []) {
    if (e.kind === "photo") whenByFileId.set(e.file.id, e.when);
  }
  return whenByFileId;
}

function albumPhotoLatestMs(album: PersonAlbum): number {
  let x = 0;
  for (const e of album.timeline ?? []) {
    if (e.kind === "photo" && e.sortKeyMs > x) x = e.sortKeyMs;
  }
  return x;
}

function formatFeedWhen(sortKeyMs: number): string {
  if (sortKeyMs <= 0) return "Date unknown";
  return new Date(sortKeyMs).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function FormFeedItem({
  m,
  album,
  onOpenLightbox,
}: {
  m: ChronologicalFormMessage;
  album: PersonAlbum | undefined;
  onOpenLightbox: (url: string, label: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [pendingScroll, setPendingScroll] = useState<
    "message" | "photos" | null
  >(null);
  const messageRef = useRef<HTMLDivElement>(null);
  const photosRef = useRef<HTMLDivElement>(null);
  const dateTime =
    m.sortKeyMs > 0 ? new Date(m.sortKeyMs).toISOString() : undefined;
  const hasPics = Boolean(album && album.media.length > 0);

  const openCard = useCallback(
    (target: "message" | "photos" | "all") => {
      setExpanded(true);
      if (target === "all") setPendingScroll("message");
      else if (target === "photos" && hasPics) setPendingScroll("photos");
      else setPendingScroll("message");
    },
    [hasPics],
  );

  useLayoutEffect(() => {
    if (!expanded || pendingScroll === null) return;
    const el =
      pendingScroll === "photos"
        ? photosRef.current
        : messageRef.current;
    el?.scrollIntoView({ behavior: "smooth", block: "start" });
    queueMicrotask(() => {
      setPendingScroll(null);
    });
  }, [expanded, pendingScroll]);

  const whenByFileId = album ? albumPhotoWhenMap(album) : new Map();

  return (
    <li className="leroy-form-feed-item">
      {!expanded ? (
        <div className="leroy-form-feed-collapsed">
          <div className="leroy-form-feed-collapsed-left">
            <time className="leroy-form-feed-when" dateTime={dateTime}>
              {m.when}
            </time>
            <span className="leroy-form-feed-name leroy-form-feed-name--row">
              {m.displayName}
            </span>
            <div className="leroy-form-feed-pills">
              <button
                type="button"
                className="leroy-form-feed-pill"
                onClick={() => openCard("message")}
              >
                Read post
              </button>
              {hasPics ? (
                <button
                  type="button"
                  className="leroy-form-feed-pill"
                  onClick={() => openCard("photos")}
                >
                  See pics
                </button>
              ) : null}
            </div>
          </div>
          <button
            type="button"
            className="leroy-form-feed-open-all"
            onClick={() => openCard("all")}
            aria-label={`Open everything: ${m.displayName}`}
          >
            +
          </button>
        </div>
      ) : (
        <div className="leroy-form-feed-expanded">
          <div className="leroy-form-feed-expanded-top">
            <div className="leroy-form-feed-expanded-meta">
              <time className="leroy-form-feed-when" dateTime={dateTime}>
                {m.when}
              </time>
              <h3 className="leroy-form-feed-name">{m.displayName}</h3>
            </div>
            <button
              type="button"
              className="leroy-form-feed-collapse-btn"
              onClick={() => setExpanded(false)}
              aria-expanded="true"
              aria-label="Close"
            >
              ×
            </button>
          </div>

          <div ref={messageRef} className="leroy-form-feed-message-block">
            <p className="leroy-form-feed-block-label">Message</p>
            <div className="leroy-form-feed-body">
              <FormMessageParagraphs text={m.message} />
            </div>
            {formFeedShowAttribution(m) ? (
              <p className="leroy-form-feed-signed">— {m.signedName}</p>
            ) : null}
          </div>

          {hasPics && album ? (
            <div ref={photosRef} className="leroy-form-feed-photos-block">
              <p className="leroy-form-feed-block-label">Their photos</p>
              <PhotoCarousel
                media={album.media}
                whenByFileId={whenByFileId}
                albumLabel={album.displayName}
                onOpen={onOpenLightbox}
              />
            </div>
          ) : null}
        </div>
      )}
    </li>
  );
}

type LeroyFeedEntry =
  | {
      kind: "message";
      key: string;
      sortKeyMs: number;
      m: ChronologicalFormMessage;
    }
  | {
      kind: "photosOnly";
      key: string;
      sortKeyMs: number;
      album: PersonAlbum;
      whenLabel: string;
    };

function FormFeedPhotoOnlyItem({
  album,
  whenLabel,
  onOpenLightbox,
}: {
  album: PersonAlbum;
  whenLabel: string;
  onOpenLightbox: (url: string, label: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [pendingScroll, setPendingScroll] = useState(false);
  const photosRef = useRef<HTMLDivElement>(null);
  const sortKeyMs = albumPhotoLatestMs(album);
  const dateTimeAttr =
    sortKeyMs > 0 ? new Date(sortKeyMs).toISOString() : undefined;
  const whenByFileId = albumPhotoWhenMap(album);

  const openToPhotos = useCallback(() => {
    setExpanded(true);
    setPendingScroll(true);
  }, []);

  useLayoutEffect(() => {
    if (!expanded || !pendingScroll) return;
    photosRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    queueMicrotask(() => {
      setPendingScroll(false);
    });
  }, [expanded, pendingScroll]);

  return (
    <li className="leroy-form-feed-item leroy-form-feed-item--photos-only">
      {!expanded ? (
        <div className="leroy-form-feed-collapsed">
          <div className="leroy-form-feed-collapsed-left">
            <time className="leroy-form-feed-when" dateTime={dateTimeAttr}>
              {whenLabel}
            </time>
            <span className="leroy-form-feed-name leroy-form-feed-name--row">
              {album.displayName}
            </span>
            <p className="leroy-form-feed-filename-hint">
              Photos only — we couldn&apos;t match a form row; name comes from
              the filename.
            </p>
            <div className="leroy-form-feed-pills">
              <button
                type="button"
                className="leroy-form-feed-pill"
                onClick={openToPhotos}
              >
                See pics
              </button>
            </div>
          </div>
          <button
            type="button"
            className="leroy-form-feed-open-all"
            onClick={openToPhotos}
            aria-label={`Open photos: ${album.displayName}`}
          >
            +
          </button>
        </div>
      ) : (
        <div className="leroy-form-feed-expanded">
          <div className="leroy-form-feed-expanded-top">
            <div className="leroy-form-feed-expanded-meta">
              <time className="leroy-form-feed-when" dateTime={dateTimeAttr}>
                {whenLabel}
              </time>
              <h3 className="leroy-form-feed-name">{album.displayName}</h3>
            </div>
            <button
              type="button"
              className="leroy-form-feed-collapse-btn"
              onClick={() => setExpanded(false)}
              aria-expanded="true"
              aria-label="Close"
            >
              ×
            </button>
          </div>
          <p className="leroy-form-feed-photos-only-note">
            No form message here—only Dropbox photos where we read the name from
            the file.
          </p>
          <div ref={photosRef} className="leroy-form-feed-photos-block">
            <p className="leroy-form-feed-block-label">Photos</p>
            <PhotoCarousel
              media={album.media}
              whenByFileId={whenByFileId}
              albumLabel={album.displayName}
              onOpen={onOpenLightbox}
            />
          </div>
        </div>
      )}
    </li>
  );
}

function FormMessagesFeed({
  entries,
  albumsByPersonKey,
  onOpenLightbox,
}: {
  entries: LeroyFeedEntry[];
  albumsByPersonKey: Map<string, PersonAlbum>;
  onOpenLightbox: (url: string, label: string) => void;
}) {
  if (entries.length === 0) return null;
  return (
    <section className="leroy-form-feed" aria-label="Posts from friends and family">
      <h2 className="leroy-form-feed-title">Posts</h2>
      <p className="leroy-form-feed-sub">
        <strong>Newest at the top.</strong> Each row is <strong>who</strong> and{" "}
        <strong>when</strong>. Use <strong>Read post</strong> or{" "}
        <strong>See pics</strong> to open that person&apos;s note and photos in
        one card.
      </p>
      <p className="leroy-thanks leroy-thanks--feed">
        Thank you for all the sweet messages and photos—we&apos;ve been
        touched by every one. We&apos;ll do our best to add more here as they
        come in. Thanks again.
        <span className="leroy-thanks-sign">— Molly &amp; Solomon</span>
      </p>
      <ol className="leroy-form-feed-list">
        {entries.map((e) =>
          e.kind === "message" ? (
            <FormFeedItem
              key={e.key}
              m={e.m}
              album={albumsByPersonKey.get(e.m.personKey)}
              onOpenLightbox={onOpenLightbox}
            />
          ) : (
            <FormFeedPhotoOnlyItem
              key={e.key}
              album={e.album}
              whenLabel={e.whenLabel}
              onOpenLightbox={onOpenLightbox}
            />
          ),
        )}
      </ol>
    </section>
  );
}

function FamilyUpdatePanel() {
  const [earlierOpen, setEarlierOpen] = useState(false);

  return (
    <section
      className="leroy-update"
      aria-label="Family updates from Molly and Solomon"
    >
      <div className="leroy-update-header">
        <span className="leroy-update-badge">Family update</span>
        <h2 className="leroy-update-heading">Updates from Sol &amp; Mol</h2>
      </div>

      <article className="leroy-update-entry leroy-update-entry--current">
        <header className="leroy-update-entry-head">
          <h3 className="leroy-update-entry-title">Update 5/12</h3>
          <time className="leroy-update-entry-date" dateTime="2026-05-12">
            May 12, 2026
          </time>
        </header>
        <div className="leroy-update-letter">
          <p>
            We wanted to share a brief update for friends and family who are
            asking. LeRoy is still cozy at home in East Lansing, and is being
            cared for by a hospice team along with his son and daughter. The
            hospice team has been amazing, and we are grateful for their
            support.
          </p>
          <p>
            LeRoy has been very peaceful and still has a great sense of humor.
            He is open to visitors, but we ask that you check in beforehand to
            ensure the timing will work.
          </p>
          <p>
            Thank you to everyone who has reached out with support, food,
            prayers, and more.
          </p>
          <p className="leroy-update-signoff">
            With love,
            <br />
            Molly and Solomon &lt;3
          </p>
        </div>
      </article>

      <div className="leroy-update-archive">
        <button
          type="button"
          className="leroy-update-archive-trigger"
          onClick={() => setEarlierOpen((v) => !v)}
          aria-expanded={earlierOpen}
          aria-controls="family-update-earlier"
        >
          <span className="leroy-update-archive-label">
            Earlier update · May 5, 2026
          </span>
          <span className="leroy-update-chevron" aria-hidden>
            {earlierOpen ? "−" : "+"}
          </span>
        </button>
        <div
          id="family-update-earlier"
          className="leroy-update-body"
          hidden={!earlierOpen}
        >
          <div className="leroy-update-letter">
            <p className="leroy-update-salutation">Dear friends and family,</p>
          <p>
            We wanted to share an update about our dad, LeRoy Harvey III. He was
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
            If you&apos;d like to reach out, please connect with us directly. In
            the last few days there have been improvements in his mental state
            and he is able to have conversations. He is also looking forward to
            getting home and getting back to some sense of normalcy. We
            appreciate your patience as we do our best to respond.
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
      </div>
    </section>
  );
}

function FamilySupportNotice() {
  return (
    <section className="leroy-support" aria-label="How to help the family">
      <p className="leroy-support-intro">
        As we support our dad through end-of-life care, many friends and family
        have asked how they can help. Donations will help with caregiving,
        travel, meals, medical, and memorial expenses during this time. We are
        deeply grateful for the love, prayers, kindness, and support shown to our
        family.
      </p>
      <p className="leroy-support-soft">
        There is absolutely no pressure—sharing a note or a photo is a gift in
        itself. If you’d like to contribute financially, you can use PayPal
        below.
      </p>
      <form
        className="leroy-support-form"
        action="https://www.paypal.com/donate"
        method="post"
        target="_top"
      >
        <input type="hidden" name="business" value="8LL24B2TYM8H4" />
        <input type="hidden" name="no_recurring" value="0" />
        <input
          type="hidden"
          name="item_name"
          value="Supporting our family through our dad's end-of-life care, travel, meals, and memorial expenses. Thank you."
        />
        <input type="hidden" name="currency_code" value="USD" />
        <button type="submit" className="leroy-support-donate-btn">
          Donate with PayPal
        </button>
        {/* eslint-disable-next-line @next/next/no-img-element -- PayPal 1×1 tracking pixel */}
        <img
          src="https://www.paypal.com/en_US/i/scr/pixel.gif"
          alt=""
          width={1}
          height={1}
          className="leroy-support-pixel"
        />
      </form>
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
      </ul>
    </nav>
  );
}

export function LeroyMemories({
  heroCarouselUrls,
}: {
  /** First slide is set in build (see heroCarouselManifest); often a priority image for LCP. */
  heroCarouselUrls: string[];
}) {
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
        const res = await fetch("/memories-payload.json", { cache: "no-store" });
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

  const albumsByPersonKey = useMemo(() => {
    const m = new Map<string, PersonAlbum>();
    for (const a of data?.albums ?? []) {
      if (a.fromFilenameOnly) continue;
      m.set(a.nameKey, a);
    }
    return m;
  }, [data?.albums]);

  const mergedFeed = useMemo((): LeroyFeedEntry[] => {
    if (!data) return [];
    const rows: LeroyFeedEntry[] = [];
    for (const m of data.formMessagesChronological) {
      rows.push({
        kind: "message",
        sortKeyMs: m.sortKeyMs,
        key: `m-${m.personKey}-${m.sourceOrder}`,
        m,
      });
    }
    for (const album of data.albums) {
      if (!album.fromFilenameOnly) continue;
      const sortKeyMs = albumPhotoLatestMs(album);
      rows.push({
        kind: "photosOnly",
        sortKeyMs,
        key: `p-${album.nameKey}`,
        album,
        whenLabel: formatFeedWhen(sortKeyMs),
      });
    }
    rows.sort((a, b) => {
      const aUnknown = a.sortKeyMs <= 0;
      const bUnknown = b.sortKeyMs <= 0;
      if (aUnknown !== bUnknown) return aUnknown ? 1 : -1;
      if (b.sortKeyMs !== a.sortKeyMs) return b.sortKeyMs - a.sortKeyMs;
      if (a.kind !== b.kind) return a.kind === "message" ? -1 : 1;
      return a.key.localeCompare(b.key);
    });
    return rows;
  }, [data]);

  const heroMedia = useMemo((): MemoryFile[] => {
    const urls = heroCarouselUrls.length > 0 ? heroCarouselUrls : ["/leroy-hero.jpeg"];
    return urls.map((url, i) => ({
      id: `hero-${i}`,
      fileName: url.split("/").pop() ?? "photo",
      url,
    }));
  }, [heroCarouselUrls]);

  return (
    <div className="leroy-page">
      <header className="leroy-hero">
        <div className="leroy-hero-carousel-wrap">
          <PhotoCarousel
            media={heroMedia}
            whenByFileId={new Map()}
            albumLabel="LeRoy Harvey III"
            onOpen={(url, label) => setLightbox({ url, label })}
            firstSlidePriority
          />
        </div>
        <h1>LeRoy Harvey III</h1>
        <p className="tag">A place for memories, photos, and words of love</p>
      </header>

      <FamilySupportNotice />

      {error ? (
        <p className="leroy-banner leroy-banner--error" role="alert">
          {error}
        </p>
      ) : null}

      {!data && !error ? (
        <p className="leroy-loading">Loading photos and messages…</p>
      ) : null}

      <QuickActions />

      <FamilyUpdatePanel />

      {data && mergedFeed.length > 0 ? (
        <FormMessagesFeed
          entries={mergedFeed}
          albumsByPersonKey={albumsByPersonKey}
          onOpenLightbox={(url, label) => setLightbox({ url, label })}
        />
      ) : null}

      {data ? (
        <>
          <section className="leroy-gallery-intro" aria-label="About this gallery">
            <h2 className="leroy-section-title">Photos &amp; messages</h2>
            <p className="leroy-section-sub">
              <strong>Posts</strong> are newest first—open a row for the full
              note and any matched photos. Family news and ways to reach out are
              above.
            </p>
          </section>

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

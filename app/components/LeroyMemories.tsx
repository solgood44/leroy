"use client";

import Image from "next/image";
import {
  useCallback,
  useEffect,
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
  venmoDonation: "https://account.venmo.com/u/LeRoy-Harvey-3",
  featuredYoutubeVideo: "https://www.youtube.com/watch?v=qTXN_A8bUyI",
  leroyYoutubeChannel: "https://www.youtube.com/@LeRoyHarveyIII/videos",
} as const;

const FEATURED_YOUTUBE_ID = "qTXN_A8bUyI";

type LightboxSlide = { url: string; label: string };

type OpenLightbox = (
  url: string,
  label: string,
  gallery?: LightboxSlide[],
) => void;

function memoryFilesToSlides(
  media: MemoryFile[],
  labelPrefix: string,
): LightboxSlide[] {
  return media.map((f) => ({
    url: f.url,
    label: `${labelPrefix} — ${f.fileName}`,
  }));
}

const PAGE_JUMP_LINKS = [
  { href: "#top", label: "Home" },
  { href: "#music", label: "Music" },
  { href: "#reach-out", label: "Reach out" },
  { href: "#support", label: "Donate" },
  { href: "#updates", label: "Updates" },
  { href: "#posts", label: "Posts" },
] as const;

function SiteHeader() {
  const links = PAGE_JUMP_LINKS.filter((l) => l.href !== "#top");

  return (
    <header className="leroy-site-header">
      <div className="leroy-site-header-inner">
        <a href="#top" className="leroy-site-header-brand">
          LeRoy Harvey III
        </a>
        <nav
          className="leroy-site-header-nav"
          aria-label="Sections on this page"
        >
          <ul className="leroy-site-header-nav-list">
            {links.map(({ href, label }) => (
              <li key={href}>
                <a href={href}>{label}</a>
              </li>
            ))}
          </ul>
        </nav>
      </div>
    </header>
  );
}

function MemorialAnnouncement() {
  return (
    <section
      className="leroy-memorial"
      aria-label="Obituary for LeRoy Harvey III"
    >
      <span className="leroy-memorial-butterfly" aria-hidden>
        🦋
      </span>
      <h2 className="leroy-memorial-name">
        In Loving Memory of LeRoy Harvey III
      </h2>
      <p className="leroy-memorial-dates">
        <time dateTime="1959-09-12">September 12, 1959</time>
        {" – "}
        <time dateTime="2026-05-19">May 19, 2026</time>
      </p>
      <div className="leroy-memorial-letter">
        <p>
          We celebrate and honor the life of LeRoy Harvey III, who passed away
          peacefully on May 19, 2026 surrounded by his children and loved ones.
        </p>
        <p>
          LeRoy lived a life defined by kindness, strength, humor, and an
          unwavering love for family, friends, and the world around him. He
          touched countless lives through his generous spirit and his ability to
          make people feel seen and valued.
        </p>
        <p>
          He devoted much of his life to environmental education, helping
          students and communities understand the value of natural resources and
          sustainable living. Through Green Team, Urban Options, and renewable
          energy initiatives, he inspired others to care for the Earth and
          future generations.
        </p>
        <p>
          LeRoy also had a passion for physical fitness and the outdoors. He
          loved running, biking, exercising, and spending time in nature.
          Whether on a trail, on his bike, or simply enjoying the fresh air, he
          found joy and peace in being outside.
        </p>
        <p>
          Music was one of LeRoy&apos;s greatest passions. He played guitar for
          most of his life and found tremendous joy in creating and sharing
          music with others. Over the years, he played in many bands, forming
          lasting friendships and memories through rehearsals, performances, and
          jam sessions. Whether on stage, practicing at home, or talking about
          music, it was an important part of who he was. Those who knew him will
          remember not only the songs he played, but also the connection and
          happiness that music brought to his life.
        </p>
        <p>
          He is survived by his children, Solomon Harvey and Amalia Harvey; his
          sister, Emmy Harvey; and his brothers, Felix Harvey and Zach Harvey.
          He was preceded in death by his father, LeRoy Harvey II, and his
          mother, Elise Harvey.
        </p>
        <div className="leroy-memorial-service">
          <p className="leroy-memorial-service-intro">
            Family and friends are invited to celebrate his life on:
          </p>
          <p className="leroy-memorial-service-date">
            <time dateTime="2026-08-15">Saturday, August 15, 2026</time>
          </p>
          <ul className="leroy-memorial-service-details">
            <li>Service: 5:00pm–6:00pm</li>
            <li>Potluck and music: 6:00pm–8:00pm</li>
          </ul>
          <address className="leroy-memorial-service-venue">
            Woldumar Nature Center
            <br />
            5739 Old Lansing Rd
            <br />
            Lansing, Michigan
          </address>
        </div>
        <p>
          We welcome all who knew LeRoy to join us in sharing memories and
          honoring his special life.
        </p>
      </div>
    </section>
  );
}

function Lightbox({
  items,
  index,
  onClose,
  onIndexChange,
}: {
  items: LightboxSlide[];
  index: number;
  onClose: () => void;
  onIndexChange: (index: number) => void;
}) {
  const [rotationDeg, setRotationDeg] = useState(0);
  const item = items[index];
  const canPrev = index > 0;
  const canNext = index < items.length - 1;
  const showNav = items.length > 1;

  const goPrev = useCallback(() => {
    if (canPrev) onIndexChange(index - 1);
  }, [canPrev, index, onIndexChange]);

  const goNext = useCallback(() => {
    if (canNext) onIndexChange(index + 1);
  }, [canNext, index, onIndexChange]);

  useEffect(() => {
    setRotationDeg(0);
  }, [item?.url]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowLeft") {
        e.preventDefault();
        goPrev();
      }
      if (e.key === "ArrowRight") {
        e.preventDefault();
        goNext();
      }
      if (e.key === "[") {
        setRotationDeg((d) => (d - 90 + 360) % 360);
      }
      if (e.key === "]") {
        setRotationDeg((d) => (d + 90) % 360);
      }
    };
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [onClose, goPrev, goNext]);

  if (!item) return null;

  const sideways = rotationDeg % 180 !== 0;

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
      {showNav ? (
        <p className="leroy-lightbox-counter" aria-live="polite">
          {index + 1} / {items.length}
        </p>
      ) : null}
      {showNav ? (
        <>
          <button
            type="button"
            className="leroy-lightbox-nav leroy-lightbox-nav--prev"
            onClick={(e) => {
              e.stopPropagation();
              goPrev();
            }}
            disabled={!canPrev}
            aria-label="Previous photo"
          >
            ‹
          </button>
          <button
            type="button"
            className="leroy-lightbox-nav leroy-lightbox-nav--next"
            onClick={(e) => {
              e.stopPropagation();
              goNext();
            }}
            disabled={!canNext}
            aria-label="Next photo"
          >
            ›
          </button>
        </>
      ) : null}
      <div
        className="leroy-lightbox-toolbar"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          className="leroy-lightbox-tool"
          onClick={() => setRotationDeg((d) => (d - 90 + 360) % 360)}
          aria-label="Rotate left"
        >
          ↺ Left
        </button>
        <button
          type="button"
          className="leroy-lightbox-tool"
          onClick={() => setRotationDeg((d) => (d + 90) % 360)}
          aria-label="Rotate right"
        >
          Right ↻
        </button>
      </div>
      <div
        className="leroy-lightbox-stage"
        onClick={(e) => e.stopPropagation()}
      >
        {/* eslint-disable-next-line @next/next/no-img-element -- variable aspect ratio + client rotate */}
        <img
          className="leroy-lightbox-photo"
          src={item.url}
          alt={item.label}
          decoding="async"
          style={{
            transform: `rotate(${rotationDeg}deg)`,
            maxWidth: sideways ? "min(95vh, 100%)" : undefined,
            maxHeight: sideways ? "min(95vw, 100%)" : undefined,
          }}
        />
      </div>
    </div>
  );
}

function PhotoCarousel({
  media,
  whenByFileId,
  albumLabel,
  onOpen,
  firstSlidePriority = false,
  fitContain = false,
  isHero = false,
}: {
  media: MemoryFile[];
  whenByFileId: Map<string, string>;
  albumLabel: string;
  onOpen: OpenLightbox;
  /** LCP: set on the hero carousel only */
  firstSlidePriority?: boolean;
  /** Show full image without cropping (hero carousel) */
  fitContain?: boolean;
  /** Home hero: larger controls, keyboard arrows, swipe-friendly */
  isHero?: boolean;
}) {
  const trackRef = useRef<HTMLDivElement>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const [index, setIndex] = useState(0);
  const n = media.length;
  const lightboxSlides = useMemo(
    () => memoryFilesToSlides(media, albumLabel),
    [media, albumLabel],
  );

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

  const goPrev = useCallback(() => scrollTo(index - 1), [index, scrollTo]);
  const goNext = useCallback(() => scrollTo(index + 1), [index, scrollTo]);

  useEffect(() => {
    if (!isHero || n <= 1) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;
      const root = rootRef.current;
      if (!root) return;
      const target = e.target;
      if (
        target instanceof HTMLElement &&
        (target.isContentEditable ||
          target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.tagName === "SELECT")
      ) {
        return;
      }
      if (!root.contains(document.activeElement) && document.activeElement !== document.body) {
        return;
      }
      e.preventDefault();
      if (e.key === "ArrowLeft") goPrev();
      else goNext();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isHero, n, goPrev, goNext]);

  if (n === 0) return null;

  const carouselClass = [
    "leroy-photo-carousel",
    fitContain ? "leroy-photo-carousel--contain" : "",
    isHero ? "leroy-photo-carousel--hero" : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div
      ref={rootRef}
      className={carouselClass}
      tabIndex={isHero ? 0 : undefined}
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
              onClick={goPrev}
              disabled={index <= 0}
              aria-label="Previous photo"
            >
              ‹
            </button>
            <button
              type="button"
              className="leroy-carousel-nav leroy-carousel-nav--next"
              onClick={goNext}
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
                  className={
                    fitContain
                      ? "leroy-carousel-photo-btn leroy-carousel-photo-btn--contain"
                      : "leroy-carousel-photo-btn"
                  }
                  onClick={() =>
                    onOpen(
                      file.url,
                      `${albumLabel} — ${file.fileName}`,
                      lightboxSlides,
                    )
                  }
                  aria-label={when ? `Open photo from ${when}` : "Open photo"}
                >
                  {fitContain ? (
                    <Image
                      src={file.url}
                      alt=""
                      width={820}
                      height={1100}
                      className="leroy-carousel-photo-img leroy-carousel-photo-img--contain"
                      sizes="(max-width: 640px) 100vw, 520px"
                      quality={75}
                      priority={firstSlidePriority && slideIndex === 0}
                    />
                  ) : (
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
                  )}
                </button>
              </div>
            );
          })}
        </div>
      </div>
      {n > 1 ? (
        <div
          className={
            isHero
              ? "leroy-carousel-meta leroy-carousel-meta--hero"
              : "leroy-carousel-meta"
          }
        >
          <p className="leroy-carousel-counter" aria-live="polite">
            {index + 1} / {n}
          </p>
          {isHero ? (
            <p className="leroy-carousel-hint">Swipe or tap arrows</p>
          ) : null}
          <div
            className={
              isHero
                ? "leroy-carousel-dots leroy-carousel-dots--hero"
                : "leroy-carousel-dots"
            }
            role="tablist"
            aria-label="Photo"
          >
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
  gallery,
  onOpen,
}: {
  file: MemoryFile;
  gallery: LightboxSlide[];
  onOpen: OpenLightbox;
}) {
  return (
    <article className="leroy-card">
      <button
        type="button"
        className="leroy-card-media-btn"
        onClick={() =>
          onOpen(file.url, `Unmatched — ${file.fileName}`, gallery)
        }
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

type PostMessage = {
  id: string;
  when: string;
  dateTime?: string;
  message: string;
  signedName: string;
  showAttribution: boolean;
};

type PostPhoto = {
  id: string;
  when: string;
  file: MemoryFile;
};

type PostContributor = {
  key: string;
  displayName: string;
  messages: PostMessage[];
  photos: PostPhoto[];
  hasMessage: boolean;
  hasPhotos: boolean;
  photosOnly: boolean;
};

function buildPostContributors(
  messages: ChronologicalFormMessage[],
  albums: PersonAlbum[],
): PostContributor[] {
  const byKey = new Map<
    string,
    {
      displayName: string;
      messages: ChronologicalFormMessage[];
      album?: PersonAlbum;
    }
  >();

  for (const m of messages) {
    if (!m.message.trim()) continue;
    const row = byKey.get(m.personKey) ?? {
      displayName: m.displayName,
      messages: [],
      album: undefined,
    };
    row.messages.push(m);
    byKey.set(m.personKey, row);
  }

  for (const album of albums) {
    const row = byKey.get(album.nameKey) ?? {
      displayName: album.displayName,
      messages: [],
      album: undefined,
    };
    row.album = album;
    if (!row.messages.length) row.displayName = album.displayName;
    byKey.set(album.nameKey, row);
  }

  const contributors: PostContributor[] = [];
  for (const [key, row] of byKey) {
    const album = row.album;
    const hasPhotos = Boolean(album?.media.length);
    const hasMessage = row.messages.length > 0;
    if (!hasMessage && !hasPhotos) continue;

    const sortedMessages = [...row.messages].sort(
      (a, b) => b.sortKeyMs - a.sortKeyMs,
    );
    const messages: PostMessage[] = sortedMessages.map((m) => ({
      id: `msg-${m.sourceOrder}`,
      when: m.when,
      dateTime:
        m.sortKeyMs > 0 ? new Date(m.sortKeyMs).toISOString() : undefined,
      message: m.message,
      signedName: m.signedName,
      showAttribution: formFeedShowAttribution(m),
    }));
    const photos: PostPhoto[] = [];
    if (album) {
      for (const file of album.media) {
        const when =
          album.timeline?.find(
            (e) => e.kind === "photo" && e.file.id === file.id,
          )?.when ?? "";
        photos.push({
          id: `photo-${file.id}`,
          when,
          file,
        });
      }
    }

    contributors.push({
      key,
      displayName: row.displayName,
      messages,
      photos,
      hasMessage,
      hasPhotos,
      photosOnly: !hasMessage && hasPhotos,
    });
  }

  contributors.sort((a, b) =>
    a.displayName.localeCompare(b.displayName, undefined, {
      sensitivity: "base",
    }),
  );
  return contributors;
}

function groupContributorsByLetter(
  contributors: PostContributor[],
): { letter: string; people: PostContributor[] }[] {
  const groups = new Map<string, PostContributor[]>();
  for (const c of contributors) {
    const letter = (c.displayName.trim()[0] ?? "#").toUpperCase();
    const bucket = groups.get(letter) ?? [];
    bucket.push(c);
    groups.set(letter, bucket);
  }
  return [...groups.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([letter, people]) => ({ letter, people }));
}

function useCarouselIndex(count: number, resetKey: string) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [index, setIndex] = useState(0);

  const syncIndex = useCallback(() => {
    const el = trackRef.current;
    if (!el || count <= 0) return;
    const w = el.clientWidth;
    if (w <= 0) return;
    const i = Math.round(el.scrollLeft / w);
    setIndex(Math.max(0, Math.min(count - 1, i)));
  }, [count]);

  useEffect(() => {
    setIndex(0);
    trackRef.current?.scrollTo({ left: 0, behavior: "auto" });
  }, [resetKey]);

  useEffect(() => {
    const el = trackRef.current;
    if (!el) return;
    el.addEventListener("scroll", syncIndex, { passive: true });
    const onScrollEnd = () => syncIndex();
    el.addEventListener("scrollend", onScrollEnd);
    return () => {
      el.removeEventListener("scroll", syncIndex);
      el.removeEventListener("scrollend", onScrollEnd);
    };
  }, [syncIndex]);

  const goTo = useCallback(
    (i: number) => {
      const el = trackRef.current;
      if (!el || count <= 0) return;
      const next = Math.max(0, Math.min(count - 1, i));
      setIndex(next);
      const slide = el.children[next] as HTMLElement | undefined;
      if (slide) {
        slide.scrollIntoView({
          behavior: "smooth",
          block: "nearest",
          inline: "start",
        });
        return;
      }
      const w = el.clientWidth;
      if (w > 0) {
        el.scrollTo({ left: next * w, behavior: "smooth" });
      }
    },
    [count],
  );

  return { trackRef, index, goTo };
}

function PostSlideBar({
  index,
  count,
  subLabel,
  onPrev,
  onNext,
}: {
  index: number;
  count: number;
  subLabel: string;
  onPrev: () => void;
  onNext: () => void;
}) {
  return (
    <footer className="leroy-posts-slide-bar">
      <button
        type="button"
        className="leroy-posts-bar-btn"
        onClick={onPrev}
        disabled={index <= 0}
      >
        Previous
      </button>
      <p className="leroy-posts-slide-status" aria-live="polite">
        <span className="leroy-posts-slide-status-main">
          {index + 1} of {count}
        </span>
        <span className="leroy-posts-slide-status-sub">{subLabel}</span>
      </p>
      <button
        type="button"
        className="leroy-posts-bar-btn"
        onClick={onNext}
        disabled={index >= count - 1}
      >
        Next
      </button>
    </footer>
  );
}

function ContributorPhotosCarousel({
  contributor,
  photos,
  onOpenLightbox,
  onBack,
  showBack,
}: {
  contributor: PostContributor;
  photos: PostPhoto[];
  onOpenLightbox: OpenLightbox;
  onBack?: () => void;
  showBack: boolean;
}) {
  const resetKey = `${contributor.key}-photos`;
  const { trackRef, index, goTo } = useCarouselIndex(photos.length, resetKey);
  const n = photos.length;
  const photo = photos[index];

  const lightboxSlides = useMemo(
    () =>
      photos.map((p) => ({
        url: p.file.url,
        label: `${contributor.displayName} — ${p.file.fileName}`,
      })),
    [photos, contributor.displayName],
  );

  useEffect(() => {
    if (n <= 1) return;
    const onKey = (e: KeyboardEvent) => {
      const target = e.target;
      if (
        target instanceof HTMLElement &&
        (target.isContentEditable ||
          target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.tagName === "SELECT")
      ) {
        return;
      }
      if (e.key === "ArrowLeft") {
        e.preventDefault();
        goTo(index - 1);
      }
      if (e.key === "ArrowRight") {
        e.preventDefault();
        goTo(index + 1);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [n, index, goTo]);

  return (
    <div className="leroy-posts-photos-view">
      {showBack && onBack ? (
        <button
          type="button"
          className="leroy-posts-back-btn"
          onClick={onBack}
        >
          Back to note
        </button>
      ) : null}
      {contributor.photosOnly ? (
        <p className="leroy-posts-photos-only-note">
          Photos only — name from the filename; no form message matched.
        </p>
      ) : null}
      <div className="leroy-posts-carousel-viewport">
        <div ref={trackRef} className="leroy-posts-carousel-track">
          {photos.map((slide) => (
            <div key={slide.id} className="leroy-posts-carousel-slide">
              <div className="leroy-posts-photo-slide">
                {slide.when ? (
                  <p className="leroy-carousel-when">{slide.when}</p>
                ) : null}
                <button
                  type="button"
                  className="leroy-carousel-photo-btn"
                  onClick={() =>
                    onOpenLightbox(
                      slide.file.url,
                      `${contributor.displayName} — ${slide.file.fileName}`,
                      lightboxSlides,
                    )
                  }
                  aria-label="Open photo full screen"
                >
                  <div className="leroy-carousel-photo-frame">
                    <Image
                      src={slide.file.url}
                      alt=""
                      fill
                      className="leroy-carousel-photo-img"
                      sizes="(max-width: 900px) 100vw, 480px"
                      quality={75}
                    />
                  </div>
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
      {n > 1 ? (
        <PostSlideBar
          index={index}
          count={n}
          subLabel="Photo"
          onPrev={() => goTo(index - 1)}
          onNext={() => goTo(index + 1)}
        />
      ) : photo ? (
        <p className="leroy-posts-single-photo-hint">
          Tap the photo to view it larger.
        </p>
      ) : null}
    </div>
  );
}

function ContributorPanelContent({
  contributor,
  onOpenLightbox,
}: {
  contributor: PostContributor;
  onOpenLightbox: OpenLightbox;
}) {
  const { messages, photos, hasMessage, hasPhotos, photosOnly } = contributor;
  const [viewingPhotos, setViewingPhotos] = useState(photosOnly);

  useEffect(() => {
    setViewingPhotos(photosOnly);
  }, [contributor.key, photosOnly]);

  const messageResetKey = `${contributor.key}-msg`;
  const { trackRef, index, goTo } = useCarouselIndex(
    messages.length,
    messageResetKey,
  );
  const messageCount = messages.length;

  useEffect(() => {
    if (messageCount <= 1) return;
    const onKey = (e: KeyboardEvent) => {
      const target = e.target;
      if (
        target instanceof HTMLElement &&
        (target.isContentEditable ||
          target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.tagName === "SELECT")
      ) {
        return;
      }
      if (e.key === "ArrowLeft") {
        e.preventDefault();
        goTo(index - 1);
      }
      if (e.key === "ArrowRight") {
        e.preventDefault();
        goTo(index + 1);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [messageCount, index, goTo]);

  if (!hasMessage && !hasPhotos) {
    return (
      <p className="leroy-posts-panel-empty">Nothing to show for this name.</p>
    );
  }

  if (viewingPhotos && hasPhotos) {
    return (
      <ContributorPhotosCarousel
        contributor={contributor}
        photos={photos}
        onOpenLightbox={onOpenLightbox}
        showBack={hasMessage}
        onBack={() => setViewingPhotos(false)}
      />
    );
  }

  const currentMessage = messages[index];

  return (
    <div className="leroy-posts-note-view">
      {hasMessage && currentMessage ? (
        messageCount > 1 ? (
          <div className="leroy-posts-carousel">
            <div className="leroy-posts-carousel-viewport">
              <div ref={trackRef} className="leroy-posts-carousel-track">
                {messages.map((msg) => (
                  <div key={msg.id} className="leroy-posts-carousel-slide">
                    <article className="leroy-posts-message-slide">
                      <time
                        className="leroy-form-feed-when"
                        dateTime={msg.dateTime}
                      >
                        {msg.when}
                      </time>
                      <div className="leroy-form-feed-body">
                        <FormMessageParagraphs text={msg.message} />
                      </div>
                      {msg.showAttribution ? (
                        <p className="leroy-form-feed-signed">
                          — {msg.signedName}
                        </p>
                      ) : null}
                    </article>
                  </div>
                ))}
              </div>
            </div>
            <PostSlideBar
              index={index}
              count={messageCount}
              subLabel="Message"
              onPrev={() => goTo(index - 1)}
              onNext={() => goTo(index + 1)}
            />
          </div>
        ) : (
          <article className="leroy-posts-message-slide">
            <time
              className="leroy-form-feed-when"
              dateTime={currentMessage.dateTime}
            >
              {currentMessage.when}
            </time>
            <div className="leroy-form-feed-body">
              <FormMessageParagraphs text={currentMessage.message} />
            </div>
            {currentMessage.showAttribution ? (
              <p className="leroy-form-feed-signed">
                — {currentMessage.signedName}
              </p>
            ) : null}
          </article>
        )
      ) : null}
      {hasPhotos ? (
        <button
          type="button"
          className="leroy-posts-view-photos-btn"
          onClick={() => setViewingPhotos(true)}
        >
          View photos ({photos.length})
        </button>
      ) : null}
    </div>
  );
}

function FormMessagesFeed({
  contributors,
  onOpenLightbox,
}: {
  contributors: PostContributor[];
  onOpenLightbox: OpenLightbox;
}) {
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [filter, setFilter] = useState("");

  const filtered = useMemo(() => {
    const q = filter.trim().toLowerCase();
    if (!q) return contributors;
    return contributors.filter((c) =>
      c.displayName.toLowerCase().includes(q),
    );
  }, [contributors, filter]);

  const letterGroups = useMemo(
    () => groupContributorsByLetter(filtered),
    [filtered],
  );

  const selectedIndex = useMemo(
    () => filtered.findIndex((c) => c.key === selectedKey),
    [filtered, selectedKey],
  );
  const selected =
    selectedIndex >= 0 ? filtered[selectedIndex]! : null;

  useEffect(() => {
    if (selectedKey && selectedIndex < 0) setSelectedKey(null);
  }, [selectedKey, selectedIndex]);

  useEffect(() => {
    if (!selected) return;
    const mq = window.matchMedia("(max-width: 899px)");
    if (!mq.matches) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [selected]);

  const goPrevPerson = useCallback(() => {
    if (selectedIndex > 0) {
      setSelectedKey(filtered[selectedIndex - 1]!.key);
    }
  }, [filtered, selectedIndex]);

  const goNextPerson = useCallback(() => {
    if (selectedIndex >= 0 && selectedIndex < filtered.length - 1) {
      setSelectedKey(filtered[selectedIndex + 1]!.key);
    }
  }, [filtered, selectedIndex]);

  if (contributors.length === 0) return null;

  return (
    <section
      id="posts"
      className="leroy-form-feed leroy-jump-target"
      aria-label="Posts from friends and family"
    >
      <h2 className="leroy-form-feed-title">Posts</h2>
      <p className="leroy-form-feed-sub">
        <strong>{contributors.length} contributors</strong>, A–Z. Tap a name to
        read their note, then use <strong>View photos</strong> when they shared
        pictures. Use the arrows in the header to move between people.
      </p>

      <label className="leroy-posts-search">
        <span className="leroy-posts-search-label">Find a name</span>
        <input
          type="search"
          className="leroy-posts-search-input"
          placeholder="Search…"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          aria-label="Search posts by name"
        />
      </label>

      <div
        className={
          selected
            ? "leroy-posts-layout leroy-posts-layout--open"
            : "leroy-posts-layout"
        }
      >
        <nav className="leroy-posts-index" aria-label="Contributors A–Z">
          {letterGroups.map(({ letter, people }) => (
            <div key={letter} className="leroy-posts-letter-group">
              <h3 className="leroy-posts-letter">{letter}</h3>
              <ul className="leroy-posts-name-list">
                {people.map((c) => (
                  <li key={c.key}>
                    <button
                      type="button"
                      className={
                        selectedKey === c.key
                          ? "leroy-posts-name-btn leroy-posts-name-btn--active"
                          : "leroy-posts-name-btn"
                      }
                      onClick={() => setSelectedKey(c.key)}
                      aria-current={selectedKey === c.key ? "true" : undefined}
                    >
                      <span className="leroy-posts-name-btn-text">
                        {c.displayName}
                      </span>
                      <span className="leroy-posts-name-badges">
                        {c.hasMessage ? (
                          <span className="leroy-posts-badge">note</span>
                        ) : null}
                        {c.hasPhotos ? (
                          <span className="leroy-posts-badge">photos</span>
                        ) : null}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          ))}
          {filtered.length === 0 ? (
            <p className="leroy-posts-no-match">No names match your search.</p>
          ) : null}
        </nav>

        <div
          className={
            selected
              ? "leroy-posts-panel leroy-posts-panel--open"
              : "leroy-posts-panel"
          }
          aria-live="polite"
        >
          {selected ? (
            <>
              <header className="leroy-posts-panel-header">
                <button
                  type="button"
                  className="leroy-posts-close-btn"
                  onClick={() => setSelectedKey(null)}
                >
                  Close
                </button>
                <h3 className="leroy-posts-panel-name">{selected.displayName}</h3>
                {filtered.length > 1 ? (
                  <div className="leroy-posts-person-bar">
                    <button
                      type="button"
                      className="leroy-posts-bar-btn leroy-posts-bar-btn--secondary"
                      onClick={goPrevPerson}
                      disabled={selectedIndex <= 0}
                    >
                      Previous person
                    </button>
                    <span className="leroy-posts-person-count">
                      {selectedIndex + 1} of {filtered.length}
                    </span>
                    <button
                      type="button"
                      className="leroy-posts-bar-btn leroy-posts-bar-btn--secondary"
                      onClick={goNextPerson}
                      disabled={
                        selectedIndex < 0 ||
                        selectedIndex >= filtered.length - 1
                      }
                    >
                      Next person
                    </button>
                  </div>
                ) : null}
              </header>
              <div className="leroy-posts-panel-body">
                <ContributorPanelContent
                  contributor={selected}
                  onOpenLightbox={onOpenLightbox}
                />
              </div>
            </>
          ) : (
            <p className="leroy-posts-panel-placeholder">
              Select a name from the list to read their message. If they shared
              photos, you&apos;ll see a View photos button.
            </p>
          )}
        </div>
      </div>
    </section>
  );
}

function FeaturedMusic() {
  return (
    <section
      id="music"
      className="leroy-featured-music leroy-jump-target"
      aria-label="Featured music"
    >
      <h2 className="leroy-featured-music-title">Music from LeRoy</h2>
      <div className="leroy-featured-music-video">
        <iframe
          src={`https://www.youtube.com/embed/${FEATURED_YOUTUBE_ID}`}
          title="Featured video — LeRoy Harvey III on YouTube"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          referrerPolicy="strict-origin-when-cross-origin"
          allowFullScreen
        />
      </div>
      <p className="leroy-featured-music-copy">
        If you want to see more of what LeRoy has been up to with music and his
        new thought dialog series, you can explore his{" "}
        <a
          href={LINKS.leroyYoutubeChannel}
          target="_blank"
          rel="noopener noreferrer"
        >
          YouTube channel
        </a>
        .
      </p>
    </section>
  );
}

function FamilyUpdatePanel() {
  const [earlierOpen, setEarlierOpen] = useState(false);

  return (
    <section
      id="updates"
      className="leroy-update leroy-jump-target"
      aria-label="Family updates from Molly and Solomon"
    >
      <div className="leroy-update-header">
        <span className="leroy-update-badge">Family update</span>
        <h2 className="leroy-update-heading">Updates from Sol &amp; Mol</h2>
      </div>

      <article className="leroy-update-entry leroy-update-entry--current">
        <header className="leroy-update-entry-head">
          <h3 className="leroy-update-entry-title">May 19, 2026</h3>
          <time className="leroy-update-entry-date" dateTime="2026-05-19">
            May 19, 2026
          </time>
        </header>
        <div className="leroy-update-letter">
          <p>
            Thank you for the hundreds of messages, meals, donations, and
            prayers over these past weeks. You can still read notes and see
            photos in the <a href="#posts">Posts</a> section below—they mean
            so much to us.
          </p>
          <p>
            We plan to cremate him and will take some time to process. We will
            share details about a celebration of his life in the coming weeks
            and months.
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
            Earlier updates · May 16, May 12, and May 5, 2026
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
          <article className="leroy-update-entry leroy-update-entry--archived">
            <header className="leroy-update-entry-head">
              <h3 className="leroy-update-entry-title">May 16, 2026</h3>
              <time className="leroy-update-entry-date" dateTime="2026-05-16">
                May 16, 2026
              </time>
            </header>
            <div className="leroy-update-letter">
              <p>
                We wanted to share another update on social media as well, as
                many people have been reaching out and asking how he&apos;s
                doing. Currently, he is still receiving hospice care at home
                after we found out he had a return of brain cancer four weeks
                ago. He has not eaten for over a week and has been mostly in
                bed. With that said, his spirit is still shining bright, he
                still knows who we are, and he is responsive to
                questions—but very low energy and mostly resting peacefully
                with his eyes closed. He is also singing along to lyrics when
                people play him music, and is often smiling and as sweet as
                ever.
              </p>
              <p>
                He is not answering email, calls, or texts, but we are checking
                his phone to convey messages as needed.
              </p>
              <p>
                Throughout the last few weeks we have received hundreds of
                messages, donations, and dinners from all of you, and we have
                tried to ensure he receives them. The hospice nurse informed us
                that hearing is one of the last senses to go during the end of
                life, so please continue to send messages as you feel inspired.
                You can read notes and see photos in the{" "}
                <a href="#posts">Posts</a> section below.
              </p>
              <p className="leroy-update-signoff">
                With love,
                <br />
                Molly and Solomon &lt;3
              </p>
            </div>
          </article>

          <article className="leroy-update-entry leroy-update-entry--archived">
            <header className="leroy-update-entry-head">
              <h3 className="leroy-update-entry-title">May 12, 2026</h3>
              <time
                className="leroy-update-entry-date"
                dateTime="2026-05-12"
              >
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

          <article className="leroy-update-entry leroy-update-entry--archived">
            <header className="leroy-update-entry-head">
              <h3 className="leroy-update-entry-title">Update 5/5</h3>
              <time className="leroy-update-entry-date" dateTime="2026-05-05">
                May 5, 2026
              </time>
            </header>
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
          </article>
        </div>
      </div>
    </section>
  );
}

function FamilySupportNotice() {
  return (
    <section
      id="support"
      className="leroy-support leroy-jump-target"
      aria-label="Memorial contributions"
    >
      <p className="leroy-support-intro">
        Thank you for the incredible generosity, love, and support shown to our
        family during this time. We are deeply grateful to everyone who has
        donated, shared memories, offered prayers, sent cards, or simply kept us
        in their thoughts.
      </p>
      <p className="leroy-support-intro">
        In lieu of flowers, contributions made in LeRoy&apos;s memory will help
        create a lasting tribute to his life, including a memorial bench and
        support for causes, organizations, and communities that were meaningful
        to him.
      </p>
      <p className="leroy-support-soft">
        Your kindness has meant so much to our family. Thank you for helping us
        honor LeRoy&apos;s life and legacy.
      </p>
      <div className="leroy-support-donate-actions">
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
            value="In memory of LeRoy Harvey III — memorial bench and causes meaningful to him. Thank you."
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
        <a
          className="leroy-support-donate-btn leroy-support-donate-btn--venmo"
          href={LINKS.venmoDonation}
          target="_blank"
          rel="noopener noreferrer"
        >
          Donate with Venmo
        </a>
      </div>
    </section>
  );
}

function QuickActions() {
  return (
    <nav
      id="reach-out"
      className="leroy-actions leroy-jump-target"
      aria-label="Ways to connect"
    >
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
    items: LightboxSlide[];
    index: number;
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

  const lightboxGallery = useMemo((): LightboxSlide[] => {
    const seen = new Set<string>();
    const slides: LightboxSlide[] = [];
    const add = (url: string, label: string) => {
      if (seen.has(url)) return;
      seen.add(url);
      slides.push({ url, label });
    };
    for (const url of heroCarouselUrls) {
      add(url, "LeRoy Harvey III");
    }
    if (!heroCarouselUrls.length) {
      add("/leroy-hero.jpeg", "LeRoy Harvey III");
    }
    for (const album of data?.albums ?? []) {
      for (const file of album.media) {
        add(file.url, `${album.displayName} — ${file.fileName}`);
      }
    }
    for (const file of data?.unmatchedMedia ?? []) {
      add(file.url, file.fileName);
    }
    return slides;
  }, [data, heroCarouselUrls]);

  const openLightbox = useCallback<OpenLightbox>(
    (url, label, gallery) => {
      const items =
        gallery && gallery.length > 0
          ? gallery
          : lightboxGallery.length > 0
            ? lightboxGallery
            : [{ url, label }];
      let index = items.findIndex((s) => s.url === url);
      if (index < 0) index = 0;
      setLightbox({ items, index });
    },
    [lightboxGallery],
  );

  const unmatchedSlides = useMemo((): LightboxSlide[] => {
    return (data?.unmatchedMedia ?? []).map((f) => ({
      url: f.url,
      label: `Unmatched — ${f.fileName}`,
    }));
  }, [data?.unmatchedMedia]);

  const postContributors = useMemo((): PostContributor[] => {
    if (!data) return [];
    return buildPostContributors(
      data.formMessagesChronological,
      data.albums,
    );
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
    <>
      <SiteHeader />
      <div className="leroy-page">
      <MemorialAnnouncement />
      <header id="top" className="leroy-hero leroy-jump-target">
        <div className="leroy-hero-carousel-wrap">
          <PhotoCarousel
            media={heroMedia}
            whenByFileId={new Map()}
            albumLabel="LeRoy Harvey III"
            onOpen={openLightbox}
            firstSlidePriority
            fitContain
            isHero
          />
        </div>
        <h1>LeRoy Harvey III</h1>
        <p className="tag">A place for memories, photos, and words of love</p>
      </header>

      <FeaturedMusic />

      {error ? (
        <p className="leroy-banner leroy-banner--error" role="alert">
          {error}
        </p>
      ) : null}

      {!data && !error ? (
        <p className="leroy-loading">Loading photos and messages…</p>
      ) : null}

      <QuickActions />

      <FamilySupportNotice />

      <FamilyUpdatePanel />

      {data && postContributors.length > 0 ? (
        <FormMessagesFeed
          contributors={postContributors}
          onOpenLightbox={openLightbox}
        />
      ) : null}

      {data ? (
        <>
          <section className="leroy-gallery-intro" aria-label="About this gallery">
            <h2 className="leroy-section-title">Photos &amp; messages</h2>
            <p className="leroy-section-sub">
              <strong>Posts</strong> are listed A–Z—tap a name to read their note
              and swipe through photos. Family updates, ways to reach out, and an
              optional contribution link are above.
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
                    gallery={unmatchedSlides}
                    onOpen={openLightbox}
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
        <Lightbox
          items={lightbox.items}
          index={lightbox.index}
          onClose={closeLb}
          onIndexChange={(index) =>
            setLightbox((lb) => (lb ? { ...lb, index } : lb))
          }
        />
      ) : null}
      </div>
    </>
  );
}

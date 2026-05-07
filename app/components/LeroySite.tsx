"use client";

import { useCallback, useEffect, useState } from "react";
import { MemoryGallery } from "./MemoryGallery";

const SECTION_IDS = [
  "green",
  "new-thought",
  "music",
  "social",
  "contact",
  "gallery",
] as const;

type SectionId = (typeof SECTION_IDS)[number];

const NAV: { id: SectionId; label: string }[] = [
  { id: "green", label: "Green & community" },
  { id: "new-thought", label: "Conversations" },
  { id: "music", label: "Music" },
  { id: "social", label: "Find me online" },
  { id: "contact", label: "Contact" },
  { id: "gallery", label: "Photos" },
];

function normalizeSection(hash: string): SectionId {
  const id = hash.replace(/^#/, "");
  if (SECTION_IDS.includes(id as SectionId)) return id as SectionId;
  return "green";
}

export function LeroySite() {
  const [active, setActive] = useState<SectionId>("green");

  const applyBodySection = useCallback((id: SectionId) => {
    document.body.className = `min-h-full flex flex-col antialiased section-${id}`;
  }, []);

  const showSection = useCallback(
    (id: SectionId) => {
      setActive(id);
      applyBodySection(id);
      if (typeof window !== "undefined" && window.history.replaceState) {
        window.history.replaceState(null, "", `#${id}`);
      }
    },
    [applyBodySection],
  );

  useEffect(() => {
    const fromHash = normalizeSection(
      typeof window !== "undefined" ? window.location.hash : "",
    );
    // Hash is unavailable on the server; sync once on mount + on hashchange.
    // eslint-disable-next-line react-hooks/set-state-in-effect -- hash-driven section for static home page
    setActive(fromHash);
    applyBodySection(fromHash);

    const onHashChange = () => {
      const id = normalizeSection(window.location.hash);
      setActive(id);
      applyBodySection(id);
    };
    window.addEventListener("hashchange", onHashChange);
    return () => window.removeEventListener("hashchange", onHashChange);
  }, [applyBodySection]);

  return (
    <>
      <header className="site-header">
        <div className="header-graphic" aria-hidden="true">
          <svg
            viewBox="0 0 120 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.2"
            strokeLinecap="round"
          >
            <path d="M4 20 Q30 4 60 20 T116 20" />
            <path d="M8 14 Q34 8 58 14 T112 14" opacity="0.6" />
          </svg>
        </div>
        <h1>LeRoy Harvey</h1>
        <p className="tagline">Music · Community · Green dialogue</p>
        <p className="memorial-note">
          A small site to gather his work, music, and memories.
        </p>
        <nav className="site-nav" aria-label="Page sections">
          {NAV.map(({ id, label }) => (
            <button
              key={id}
              type="button"
              className={active === id ? "active" : ""}
              aria-current={active === id ? "page" : undefined}
              onClick={() => showSection(id)}
            >
              {label}
            </button>
          ))}
        </nav>
      </header>

      <main className="main-content">
        <section
          id="green"
          className={`card card-with-icon green-group${active === "green" ? " current" : ""}`}
          aria-hidden={active !== "green"}
        >
          <div className="card-icon" aria-hidden="true">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
            </svg>
          </div>
          <div className="card-body">
            <h2>Green & community</h2>
            <p className="card-desc">
              Weekly dialogue and environmental resources in the Meridian area.
            </p>
            <div className="green-subsections">
              <div className="green-sub">
                <strong>Weekly dialogue</strong> — Wed 9am
                <br />
                <a
                  href="https://us02web.zoom.us/j/84913925805?pwd=gD6UfoJWJV7hTSyCZXuDvLthIno42z.1"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Zoom
                </a>{" "}
                ·{" "}
                <a
                  href="https://www.youtube.com/playlist?list=PLA5BcGC1ZqXS2WWaWiKsBnBNu1Ru8utd3"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Playlist
                </a>{" "}
                ·{" "}
                <a
                  href="https://www.facebook.com/groups/greenmeridian/"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Meridian FB
                </a>
              </div>
              <div className="green-sub">
                <strong>Environmental</strong> — Initiatives & news
                <br />
                <a
                  href="https://sites.google.com/view/leroyssitedirectory/home"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Meridian Green initiatives
                </a>{" "}
                ·{" "}
                <a
                  href="http://bit.ly/gg-directory"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Green Gazette
                </a>{" "}
                (archive) ·{" "}
                <a
                  href="https://www.facebook.com/groups/greenmeridian/"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Green on Facebook
                </a>
              </div>
            </div>
          </div>
        </section>

        <section
          id="new-thought"
          className={`card card-with-icon${active === "new-thought" ? " current" : ""}`}
          aria-hidden={active !== "new-thought"}
        >
          <div className="card-icon" aria-hidden="true">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
            </svg>
          </div>
          <div className="card-body">
            <h2>“New Thought” conversations</h2>
            <p className="card-desc">
              Monthly discussion: spiritual traditions, faith & personal
              development. 2nd Saturday, noon.
            </p>
            <ul className="link-list">
              <li>
                <a
                  href="https://sites.google.com/view/dialogue-circles/"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Web
                </a>{" "}
                ·{" "}
                <a
                  href="https://us02web.zoom.us/j/85793734846?pwd=lvInZPPm0bqD2859RfstkchNWZ119a.1"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Zoom
                </a>
              </li>
            </ul>
          </div>
        </section>

        <section
          id="music"
          className={`card card-with-icon${active === "music" ? " current" : ""}`}
          aria-hidden={active !== "music"}
        >
          <div className="card-icon" aria-hidden="true">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M9 18V5l12-2v13" />
              <circle cx="6" cy="18" r="3" />
              <circle cx="18" cy="16" r="3" />
            </svg>
          </div>
          <div className="card-body">
            <h2>Music & recordings</h2>
            <p className="card-desc">Listen, find lyrics, bands & jams.</p>
            <ul className="link-list">
              <li>
                <a
                  href="https://www.facebook.com/LeRoyHarveyMusic"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Music on Facebook
                </a>
              </li>
              <li>
                <a
                  href="https://sites.google.com/view/leroysongs/home"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Recordings, lyrics & chords
                </a>
              </li>
              <li>
                <strong>Bands & channels</strong>
                <br />
                <a
                  href="https://www.facebook.com/whoanelly1/"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Whoa, Nelly!
                </a>{" "}
                ·{" "}
                <a
                  href="https://www.facebook.com/acousticliberty/"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Acoustic Liberty
                </a>{" "}
                ·{" "}
                <a
                  href="https://soundcloud.com/lrh"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Soundcloud
                </a>{" "}
                ·{" "}
                <a
                  href="https://www.youtube.com/@LeRoyHarveyIII"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  YouTube
                </a>
              </li>
              <li>
                <a
                  href="https://www.facebook.com/folkgrass/"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Woldumar Folk & Bluegrass Jam
                </a>
              </li>
            </ul>
          </div>
        </section>

        <section
          id="social"
          className={`card card-with-icon${active === "social" ? " current" : ""}`}
          aria-hidden={active !== "social"}
        >
          <div className="card-icon" aria-hidden="true">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
              <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
            </svg>
          </div>
          <div className="card-body">
            <h2>Find me online</h2>
            <ul className="link-list link-list-inline">
              <li>
                <a
                  href="https://www.facebook.com/leroy.harvey"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Facebook
                </a>
              </li>
              <li>
                <a
                  href="https://www.instagram.com/harveyleroy/"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Instagram
                </a>
              </li>
              <li>
                <a
                  href="https://leroysite.wordpress.com/"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  WordPress
                </a>
              </li>
            </ul>
          </div>
        </section>

        <section
          id="contact"
          className={`card card-with-icon contact-card${active === "contact" ? " current" : ""}`}
          aria-hidden={active !== "contact"}
        >
          <div className="card-icon" aria-hidden="true">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
              <polyline points="22,6 12,13 2,6" />
            </svg>
          </div>
          <div className="card-body">
            <h2>Get in touch</h2>
            <p>
              <a href="mailto:harvey48823@gmail.com">harvey48823@gmail.com</a>
              <br />
              517-five-O-five-2809
            </p>
          </div>
        </section>

        <section
          id="gallery"
          className={`card card-with-icon${active === "gallery" ? " current" : ""}`}
          aria-hidden={active !== "gallery"}
        >
          <div className="card-icon" aria-hidden="true">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
              <circle cx="8.5" cy="8.5" r="1.5" />
              <polyline points="21 15 16 10 5 21" />
            </svg>
          </div>
          <div className="card-body">
            <h2>Photos &amp; messages</h2>
            <MemoryGallery />
          </div>
        </section>
      </main>

      <footer className="site-footer">
        <svg
          className="footer-graphic"
          viewBox="0 0 120 12"
          fill="none"
          stroke="currentColor"
          strokeWidth="1"
          strokeLinecap="round"
          aria-hidden="true"
        >
          <path d="M0 6 Q30 2 60 6 T120 6" />
        </svg>
        <p>LeRoy&apos;s Web</p>
      </footer>
    </>
  );
}

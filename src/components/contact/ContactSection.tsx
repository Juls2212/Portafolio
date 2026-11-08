"use client";

import { useRef, useState } from "react";
import type { FormEvent } from "react";
import { CodeRain } from "@/components/contact/CodeRain";
import { TerminalPanel } from "@/components/contact/TerminalPanel";
import { CONTACT_EMAIL, socialLinks } from "@/data/contact";
import { SiteFooter } from "@/components/SiteFooter";
import { useT } from "@/i18n/language-context";

/**
 * Module 05. The form only opens the visitor's mail client (mailto:); it never claims
 * anything was sent. Until CONTACT_EMAIL is defined the submit stays disabled.
 */
/** Single-color inline icons (no external requests). */
function SocialIcon({ id }: { id: string }) {
  if (id === "mail") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true" className="social__icon">
        <g fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="5" width="18" height="14" rx="2" />
          <path d="M3 7l9 6 9-6" />
        </g>
      </svg>
    );
  }
  if (id === "github") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true" className="social__icon">
        <path
          fill="currentColor"
          d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12"
        />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="social__icon">
      <g fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M16 8a6 6 0 016 6v7h-4v-7a2 2 0 00-2-2 2 2 0 00-2 2v7h-4v-7a6 6 0 016-6z" />
        <rect x="2" y="9" width="4" height="12" />
        <circle cx="4" cy="4" r="2" />
      </g>
    </svg>
  );
}

export function ContactSection() {
  const t = useT();
  const emailPending = CONTACT_EMAIL === "";
  const [copyState, setCopyState] = useState<"idle" | "copied" | "failed">("idle");
  const resetTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  /** Copies the address; falls back to a hidden textarea when the Clipboard API is unavailable. */
  const copyEmail = async () => {
    let ok = false;
    try {
      await navigator.clipboard.writeText(CONTACT_EMAIL);
      ok = true;
    } catch {
      try {
        const area = document.createElement("textarea");
        area.value = CONTACT_EMAIL;
        area.setAttribute("readonly", "");
        area.style.position = "fixed";
        area.style.opacity = "0";
        document.body.appendChild(area);
        area.select();
        ok = document.execCommand("copy");
        area.remove();
      } catch {
        ok = false;
      }
    }
    setCopyState(ok ? "copied" : "failed");
    if (resetTimer.current) clearTimeout(resetTimer.current);
    resetTimer.current = setTimeout(() => setCopyState("idle"), 2200);
  };

  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (emailPending) return;
    const data = new FormData(event.currentTarget);
    const name = String(data.get("name") ?? "");
    const email = String(data.get("email") ?? "");
    const message = String(data.get("message") ?? "");
    const body = `${message}\n\n${name} <${email}>`;
    window.location.href = `mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent(
      t.contact.mailSubject,
    )}&body=${encodeURIComponent(body)}`;
  };

  return (
    <section id="contact" className="contact" aria-labelledby="contact-title">
      <CodeRain />
      <div className="contact__main">
        <div className="contact__grid">
          <TerminalPanel />
          <div className="contact__col">
            <p className="screen__eyebrow">{t.contact.eyebrow}</p>
            <h2 id="contact-title" className="screen__title">
              {t.contact.title}
            </h2>
            <p className="screen__text">{t.contact.intro}</p>

            <form className="contact-form" onSubmit={onSubmit}>
              <label className="field">
                <span>{t.contact.fields.name}</span>
                <input name="name" type="text" autoComplete="name" required />
              </label>
              <label className="field">
                <span>{t.contact.fields.email}</span>
                <input name="email" type="email" autoComplete="email" required />
              </label>
              <label className="field">
                <span>{t.contact.fields.message}</span>
                <textarea name="message" rows={5} required />
              </label>
              <div className="contact-form__actions">
                <button
                  type="submit"
                  className="btn btn--primary"
                  disabled={emailPending}
                  aria-describedby="contact-note"
                >
                  {t.contact.submit}
                </button>
                <p id="contact-note" className="contact-form__note">
                  {emailPending ? t.contact.emailPending : t.contact.mailHint}
                </p>
              </div>
            </form>
          </div>
        </div>

        <h3 className="experience__sub">{t.contact.socialTitle}</h3>
        <ul className="social">
          {!emailPending && (
            <li className="social__item--mail">
              <div className="social__btn social__btn--split">
                <a
                  href={`mailto:${CONTACT_EMAIL}`}
                  className="social__main"
                  aria-label={`${t.contact.emailAria} ${CONTACT_EMAIL}`}
                >
                  <SocialIcon id="mail" />
                  <span className="social__name social__name--mail">{CONTACT_EMAIL}</span>
                </a>
                <button
                  type="button"
                  className="social__copy"
                  aria-label={t.contact.copyAria}
                  onClick={copyEmail}
                >
                  {t.contact.copy}
                </button>
              </div>
              <p className="social__status" role="status" aria-live="polite" data-state={copyState}>
                {copyState === "copied" ? t.contact.copied : copyState === "failed" ? t.contact.copyFailed : ""}
              </p>
            </li>
          )}
          {socialLinks.map((link) => (
            <li key={link.id}>
              <a
                href={link.url}
                target="_blank"
                rel="noopener noreferrer"
                className="social__btn"
                aria-label={`${t.contact.socialAria[link.id as "linkedin" | "github"]} ${t.common.newTab}`}
              >
                <SocialIcon id={link.id} />
                <span className="social__name">{link.name}</span>
                <span className="social__arrow" aria-hidden="true">
                  ↗
                </span>
              </a>
            </li>
          ))}
        </ul>
      </div>
      <SiteFooter />
    </section>
  );
}

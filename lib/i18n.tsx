"use client";

import {
  createContext,
  Fragment,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import { messages, type Lang, type MessageKey } from "@/lib/messages";

export type { Lang, MessageKey };

const STORAGE_KEY = "melchub_lang";

type Vars = Record<string, string | number>;

function interpolate(template: string, vars?: Vars): string {
  if (!vars) return template;
  return template.replace(/\{(\w+)\}/g, (match, name: string) => (name in vars ? String(vars[name]) : match));
}

interface I18nContextValue {
  lang: Lang;
  setLang: (lang: Lang) => void;
  /** Plain-text message with `{name}` placeholders filled in. */
  t: (key: MessageKey, vars?: Vars) => string;
  /**
   * Same as `t`, but each `{name}` placeholder can be any React node — for
   * sentences with a bold amount or a link in the middle, so the word order
   * stays in the translation (Tagalog and English put them in different
   * places) instead of being glued together from fragments in code.
   */
  rich: (key: MessageKey, parts: Record<string, ReactNode>) => ReactNode;
}

const I18nContext = createContext<I18nContextValue | undefined>(undefined);

/**
 * English/Tagalog switch for the whole app. The choice is per device
 * (localStorage), not per account — a borrower's phone and the admin's
 * laptop each remember their own. Everything starts in English for the
 * first, server-rendered frame and switches right after load.
 */
export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>("en");

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      // Syncing external (localStorage) state on mount — same reason as the
      // theme toggle disables this rule.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      if (saved === "en" || saved === "tl") setLangState(saved);
    } catch {
      // Storage blocked — stay in English.
    }
  }, []);

  useEffect(() => {
    document.documentElement.lang = lang === "tl" ? "fil" : "en";
  }, [lang]);

  const setLang = useCallback((next: Lang) => {
    setLangState(next);
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // Not remembered next time, but still switches now.
    }
  }, []);

  const t = useCallback(
    (key: MessageKey, vars?: Vars) => interpolate(messages[lang][key] ?? messages.en[key], vars),
    [lang]
  );

  const rich = useCallback(
    (key: MessageKey, parts: Record<string, ReactNode>) => {
      const pieces = (messages[lang][key] ?? messages.en[key]).split(/\{(\w+)\}/);
      return pieces.map((piece, i) =>
        i % 2 === 1 ? <Fragment key={i}>{piece in parts ? parts[piece] : `{${piece}}`}</Fragment> : piece
      );
    },
    [lang]
  );

  const value = useMemo(() => ({ lang, setLang, t, rich }), [lang, setLang, t, rich]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  const ctx = useContext(I18nContext);
  if (!ctx) {
    throw new Error("useI18n must be used within an I18nProvider");
  }
  return ctx;
}

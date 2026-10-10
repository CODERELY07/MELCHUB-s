import { adminEn, adminTl } from "./admin";
import { authEn, authTl } from "./auth";
import { portalEn, portalTl } from "./portal";
import { shellEn, shellTl } from "./shell";

/** English is the source of truth: every key must exist here first. */
export const en = { ...shellEn, ...authEn, ...portalEn, ...adminEn };

export type MessageKey = keyof typeof en;

/** Typed against `en`, so a missing or misspelled Tagalog key fails the build. */
export const tl: Record<MessageKey, string> = { ...shellTl, ...authTl, ...portalTl, ...adminTl };

export const messages = { en, tl } as const;

export type Lang = keyof typeof messages;

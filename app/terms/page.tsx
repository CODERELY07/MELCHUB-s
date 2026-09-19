import type { Metadata } from "next";

import { TERMS_TEXT } from "@/lib/terms";

export const metadata: Metadata = { title: "Terms & Conditions — MELCHUB" };

export default function TermsPage() {
  return (
    <main className="mx-auto max-w-2xl px-4 py-8">
      <h1 className="mb-4 text-2xl font-bold tracking-tight">Terms &amp; Conditions</h1>
      <pre className="whitespace-pre-wrap font-sans text-sm text-foreground/90">{TERMS_TEXT}</pre>
    </main>
  );
}

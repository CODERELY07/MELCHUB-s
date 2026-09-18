# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

- **Admin/owner-operator**: runs a single informal lending business in the Philippines, single-handedly (confirmed: no separate staff/loan-officer accounts planned). Manages borrowers, records payments, and drives borrower SMS communication from the admin app (`/admin/*`).
- **Borrowers**: individuals who took out a loan and self-serve from the portal (`/portal/*`) to check their balance/ledger, upload GCash payment proof, and manage their own profile. Credentials are created for them by the admin when their loan is set up — there is no self-registration.

## Product Purpose

MELCHUB digitizes a small, single-lender, informal Philippine lending operation that previously ran on manual tracking: daily-interest loan ledgers, GCash-based repayment, and SMS-based borrower communication (reminders, late-fee notices, payment confirmations). Success means the owner-operator can manage every borrower's loan lifecycle (originate, track daily interest/penalties, collect payment, communicate) without manual bookkeeping or spreadsheets, and borrowers can check their own status and pay without calling.

## Positioning

Not a generic loan/CRM SaaS: it is built around one specific mechanism — automatic daily-interest accrual with a ₱15 late fee and automatic due-date extension when a payment is missed, tied to a GCash screenshot-proof workflow and SMS (not email) as the sole borrower communication channel. A neighboring generic invoicing/CRM product could not truthfully claim this exact combination of mechanics without being rebuilt around GCash + SMS Gateway for Android specifically.

## Operating Context

- Two entirely separate authenticated apps sharing one codebase and one Laravel API (`server/`, a sibling repo — no visual UI of its own): Admin/Staff (`/admin/*`, `role:admin` gated) and Borrower Portal (`/portal/*`, borrower-token gated). Separate Sanctum tokens, never shared sessions.
- Staff login is deliberately at an obscure, non-guessable URL (`/M4RK31Y4DM1N`) rather than `/login`, as a supplementary obscurity layer on top of real server-side access control.
- Borrowers accept Terms & Conditions via a mandatory e-signature (typed full name) on first login before accessing the portal.
- The client is an installable PWA, usable offline for previously-loaded reads (never for writes) — built for a market where connectivity can be patchy.
- Local dev and production share one live Supabase database — there is no separate dev/staging DB. Never mutate real records without care; changes here go straight to the same store live borrowers and loans use.

## Capabilities and Constraints

- **Confirmed durable constraint**: GCash is the only payment channel, and SMS Gateway for Android is the only messaging channel — both are permanent, not placeholders to be swapped for bank transfer/cards or Twilio/email later.
- **Confirmed durable scope**: single lending business, single admin/owner-operator — not building toward multi-tenant SaaS for multiple independent lenders.
- Four kinds of outgoing SMS, all through one gateway service and logged to one audit table (`sms_logs`): auto-composed due-date/late-fee reminders, custom admin-typed messages, a one-time welcome SMS, and an admin-facing new-payment-proof alert.
- Deliberately no "forgot password" flow for either account type — evaluated and explicitly deferred, not an oversight.
- Both logins are rate-limited to 6 attempts/minute per IP.

## Brand Commitments

- Product name: MELCHUB. No further naming, voice, or visual identity commitments have been made explicit yet.

## Evidence on Hand

- No real testimonials, case studies, or press exist — this is an internal operational tool for one business, not a marketed product. Future work must not fabricate borrower testimonials or usage statistics.
- Real domain content exists in the codebase itself: actual GCash-flow copy, real SMS message templates (in the sibling `server/` repo's `BorrowerAuthController.php`, `PaymentProofController.php`), and the real Terms & Conditions text (`components/terms-modal.tsx`) — treat these as authentic product content, not placeholders, unless the user says otherwise.

## Product Principles

1. Every external side effect (SMS send, payment recording) fails cleanly and visibly rather than silently — and financial state only changes *after* a triggering SMS actually sends, so a failed send can never silently alter a borrower's numbers.
2. Two audiences, two logins, two tones of risk: staff manage debt, borrowers owe it. Design and copy decisions should account for that asymmetry rather than treating both apps as one generic CRUD surface.
3. Minimal surface area on purpose — 5 admin pages, 3 borrower pages, 2 logins, deliberately not more; every page maps to exactly one job.
4. Real money moves through this app against a shared live database — no destructive or credential-touching action should be treated as low-stakes or reversible by default.

## Accessibility & Inclusion

No formal accessibility standard has been mandated by the user. The existing implementation already does real accessibility work in places (focus management, `inert` on background content, screen-reader-equivalent chart tables) — preserve and extend that bar rather than lowering it.

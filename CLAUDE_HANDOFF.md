# Handoff prompt for Claude Code

Paste the block below as your first message to Claude Code once you've
opened this repo in VS Code. Everything above the divider is context for
you (Harjevan); everything below the divider is the actual prompt.

---

## Context (for you, not Claude Code)

This is the Next.js port of the Vantrel dashboard we prototyped as a
Claude artifact. It has three routes:

- `/report` \u2014 public tenant issue-intake form
- `/ops` \u2014 internal staff kanban board (4 stages: received \u2192 assessing \u2192
  coordinating \u2192 closed)
- `/landlord` \u2014 per-property summary, issue history, add-on service
  requests

Data model, API routes, and all three pages are built and wired to a real
database (SQLite locally, swap to Postgres for prod). `/ops` and
`/landlord` are gated behind a single shared password (`STAFF_PASSWORD` in
`.env`) \u2014 that's a placeholder, not real auth. See the priority list
below for what to tackle next.

I could not run `npm install` / `prisma generate` / `next build` end to
end in the sandbox I built this in \u2014 Prisma's binary download was
blocked by that sandbox's network allowlist, which is a sandbox-specific
restriction, not a code problem. **Your first job with Claude Code is to
actually run the install/build/dev loop for real and fix whatever
surfaces** \u2014 treat this as a solid first draft that hasn't been
compiled yet, not as tested code.

---

## Prompt to paste into Claude Code

I'm continuing work on Vantrel, a property management ops app (Next.js
14 App Router, TypeScript, Prisma/SQLite, Tailwind). This repo is a
first-draft scaffold \u2014 it has never been installed or built. Start by:

1. Running `npm install`, `npx prisma generate`, `npx prisma migrate dev
   --name init`, and `npm run dev`, and fixing any errors that come up
   (dependency versions, Prisma client typing, etc.) until the app runs
   cleanly at `/report`, `/login`, `/ops`, and `/landlord`.
2. Reading through `src/lib/constants.ts` first \u2014 it's the shared
   vocabulary (status stages, urgency tiers, contact methods, service
   types) that every page depends on.
3. Once it's running, here's my priority order for what to build next:

   a. **Real auth.** Replace the shared-password gate in
      `src/lib/auth.ts` / `src/middleware.ts` with per-user accounts.
      I need at least two roles: internal staff (full access to `/ops`
      and `/landlord` for all properties) and landlords (should only
      see their own properties on `/landlord`, and shouldn't be able to
      reach `/ops` at all). Recommend an approach (NextAuth vs
      something lighter) and implement it.

   b. **Landlord-to-property ownership.** Right now `/landlord` shows
      all properties with no ownership concept. Add a `Landlord` model
      and a relation from `Issue.property` (currently a free-text
      string) to a real `Property` model owned by a landlord, so the
      auth layer in (a) can actually scope data correctly.

   c. **Photo upload on the tenant intake form** (`/report`) \u2014 the
      original product doc calls for "photographic evidence" on
      documented issues. Needs file storage (S3-compatible or similar)
      and a field on `Issue`.

   d. **Real tenant contact channels.** `/report` only models the
      "intake form" channel from the product doc. Phone/text and email
      channels currently have no software surface \u2014 decide whether
      those stay manual (staff logs them via `/ops`'s "+ Log issue"
      modal, which already supports all three `contactMethod` values)
      or need their own integration.

   e. **Notifications.** Nothing currently emails or texts anyone when
      an issue is logged, advances stages, or closes. Landlords
      especially will expect a notification when something closes with
      a cost attached.

   f. Deployment: set up for Vercel (or wherever I end up hosting this),
      including moving `DATABASE_URL` to a real Postgres instance
      (Vercel Postgres, Supabase, Neon, etc. \u2014 your call, tell me the
      tradeoffs).

Don't build all of this at once \u2014 confirm the plan with me, then work
through it incrementally, running the app after each change.

# Vantrel

Own property, not problems.

Internal ops board, tenant intake portal, and landlord reporting view for
Vantrel Property Management. Ported from a Claude artifact prototype into a
real Next.js app with a database.

## Stack

- Next.js 14 (App Router) + TypeScript
- Prisma + SQLite for local dev (swap to Postgres for production \u2014 see
  `prisma/schema.prisma`)
- Tailwind CSS
- A minimal password-gated staff session (not real auth \u2014 see
  `CLAUDE_HANDOFF.md`)

## Routes

| Route        | Who               | Auth              |
| ------------ | ----------------- | ------------------|
| `/report`    | Tenants           | Public, no login  |
| `/ops`       | Internal team     | Staff password    |
| `/landlord`  | Landlords         | Staff password (shared for now \u2014 see handoff doc) |
| `/login`     | Staff sign-in     | \u2014                |

## Getting started

```bash
npm install
cp .env.example .env
# edit .env: set STAFF_PASSWORD and generate a SESSION_SECRET
#   openssl rand -base64 32

npx prisma migrate dev --name init
npm run prisma:seed   # optional sample data

npm run dev
```

Visit `http://localhost:3000/report` for the tenant form, or
`http://localhost:3000/login` to sign in as staff and reach `/ops` and
`/landlord`.

## Data model

See `prisma/schema.prisma`. Two models: `Issue` (the 4-step intake \u2192
assess \u2192 coordinate \u2192 close pipeline) and `ServiceRequest` (landlord
add-on bookings: lawn care, window cleaning, deep clean, photography).

## Next steps

See `CLAUDE_HANDOFF.md` for the prioritized list of what's stubbed or
missing and needs real work next.

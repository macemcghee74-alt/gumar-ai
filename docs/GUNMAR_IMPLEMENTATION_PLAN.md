# Gunmar implementation plan

## Completed foundation

- Next.js App Router and responsive dark UI.
- Server-side validated chat endpoint with a replaceable cloud provider boundary.
- Safe mock mode for local development.
- Supabase migration for identity, conversations, messages, memories, indexes, and RLS.
- Supabase SSR client boundary with cookie-safe server access.
- Authenticated conversation/message persistence when Supabase is configured; local mock mode remains available without credentials.
- Passwordless email authentication screen and callback route.
- Environment variable contract and generated-artifact ignores.

## Next milestones

1. Add Supabase browser/server clients and authentication.
2. Persist conversations and messages through authenticated server actions.
3. Add bounded memory extraction, deduplication, vector retrieval, and audit history.
4. Add personality, relationship, journal, and consent-aware settings.
5. Add provider adapters for vision, image generation, speech, and web research.
6. Add a typed permissioned tool registry and bounded autonomy jobs.
7. Add unit, integration, and browser tests; deploy to Vercel and verify a production smoke test.

External provider credentials and a Supabase project are required to verify cloud inference and production persistence.

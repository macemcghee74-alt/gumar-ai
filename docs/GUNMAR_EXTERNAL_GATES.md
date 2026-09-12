# Gunmar external gates

## Supabase MCP

The repository MCP configuration is scoped to project `spzedizgazoyfovzdgjb`. The live project URL is `https://spzedizgazoyfovzdgjb.supabase.co`.

Verified through the authorized Supabase MCP:

- initial schema and two hardening migrations applied;
- pgvector installed and the Gunmar tables, columns, foreign keys, indexes, grants, RLS, and policies inspected;
- live TypeScript database types generated into `src/lib/supabase/database.types.ts`;
- security and performance advisors rerun after hardening;
- authenticated isolation QA passed for two synthetic users and anon access;
- synthetic QA users and rows removed.

The remaining advisor findings are the expected `vector` extension-in-public warning and unused-index informational findings from an empty development database. The vector extension remains in `public` because the schema uses its type and operator class directly.

Mort (`rakjydmgwwgtdislanbt`) and Loop (`zqalnvfwxmfrnyjcuehq`) were not accessed or modified.

## Cloud inference

`CEREBRAS_API_KEY`, `GROQ_API_KEY`, and `OPENROUTER_API_KEY` are not configured locally. The provider router is implemented and remains fail-closed until deployment secrets are supplied. Routing is Cerebras, Groq, then OpenRouter, with `openrouter/free` as the free-first default.

Task-aware routing metadata and `GunmarBrainRouter` are implemented. Groq is preferred for lightweight extraction/reflection tasks, Cerebras for conversation/reasoning, and OpenRouter for research/evaluation tasks. Ensemble mode remains disabled by default.

Training candidate review, dataset hashing/versioning, and the provider-neutral `TrainingProvider` interface are implemented. Actual upload/jobs/models remain blocked until an explicitly selected training service and credentials are supplied; no provider is assumed or contacted.

Current implementation work completed behind those gates:

- provider-agnostic cloud streaming boundary with timeout, cancellation, bounded fallback, cooldown health, usage metadata, and typed errors;
- Cerebras, Groq, and OpenRouter adapters with server-only keys; mock mode requires explicit `AI_PROVIDER=mock`;
- deterministic memory candidate extraction, scoring, deduplication, correction/supersession API;
- live pgvector hybrid search RPC with per-user filtering;
- request body limits, basic rate limiting, and safe relative auth redirects.

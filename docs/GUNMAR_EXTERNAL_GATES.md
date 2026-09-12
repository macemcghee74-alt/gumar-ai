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

## Other providers

Cloud AI, embeddings, speech, image, web search, Vercel, and training credentials are not configured locally. Their adapters must remain fail-closed until deployment secrets are supplied.

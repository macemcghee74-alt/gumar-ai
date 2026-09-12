# Gunmar architecture

Gunmar is a cloud-first personal AI application. The browser owns presentation and interaction; server routes own provider credentials, validation, persistence, and permissions. Supabase is the durable system of record, and Vercel is the intended deployment target.

## Boundaries

- `src/app`: Next.js routes and UI.
- `src/lib/ai`: provider-neutral inference contract.
- `supabase/migrations`: reproducible schema and RLS.
- Future feature modules should expose typed interfaces rather than importing vendor SDKs directly.

The initial chat route deliberately uses a mock provider by default, so local development does not require model credentials. Production must set a real cloud provider endpoint and key. Service-role credentials must remain server-only.

## Data model

The initial migration establishes authenticated profiles, conversations, messages, identity, and private memories with pgvector-ready embeddings. Memory extraction, relationship state, journal summaries, tools, autonomy, assets, and model evaluation should be added as versioned migrations as each capability is implemented.

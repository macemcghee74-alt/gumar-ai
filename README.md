# Gunmar

Gunmar is a cloud-first personal AI companion that learns, remembers, and develops over time.

## Local development

```bash
npm install
cp .env.example .env.local
npm run dev
```

The default `AI_PROVIDER=mock` mode is safe for local UI development. Configure a server-side cloud provider and Supabase before enabling production inference or persistence.

See [the architecture](docs/GUNMAR_ARCHITECTURE.md) and [implementation plan](docs/GUNMAR_IMPLEMENTATION_PLAN.md).

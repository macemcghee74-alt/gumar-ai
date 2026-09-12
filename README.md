# Gunmar

Gunmar is a cloud-first personal AI companion that learns, remembers, and develops over time.

## Local development

```bash
npm install
cp .env.example .env.local
npm run dev
```

The default cloud routing order is Cerebras, Groq, then OpenRouter. Set `AI_PROVIDER=mock` only for local UI development; production requires one or more server-side provider keys from `.env.example`.

See [the architecture](docs/GUNMAR_ARCHITECTURE.md) and [implementation plan](docs/GUNMAR_IMPLEMENTATION_PLAN.md).

# Gunmar external gates

## Supabase MCP

The repository MCP configuration is scoped to project `spzedizgazoyfovzdgjb`. The prior URL contained `read_only=true`; that flag was removed without changing the project reference. However, the Supabase MCP server is not exposed as a callable tool in the current agent session, so live operations have not been attempted and no migration was applied remotely.

Required follow-up in a VS Code session with the `supabase` MCP connected:

- inspect project URL, extensions, migrations, and tables;
- apply the reviewed migration;
- verify RLS, grants, constraints, indexes, and pgvector remotely;
- generate live database types;
- run authenticated isolation checks.

Mort (`rakjydmgwwgtdislanbt`) and Loop (`zqalnvfwxmfrnyjcuehq`) were not accessed or modified.

## Other providers

Cloud AI, embeddings, speech, image, web search, Vercel, and training credentials are not configured locally. Their adapters must remain fail-closed until deployment secrets are supplied.

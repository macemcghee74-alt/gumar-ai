# Gunmar public repository security report

PUBLIC REPOSITORY: YES

## Vercel configuration

REPOSITORY CONFIG IS CORRECT.

- No `vercel.json` exists.
- `next.config.ts` uses native Next.js configuration only.
- `package.json` uses `next build`.
- No `outputDirectory: "public"` exists.
- No static export, `.next`, `dist`, or `build` deployment override exists.

VERCEL PROJECT SETTING "Output Directory" MUST BE CLEARED.

Vercel should detect the project as **Next.js** and use its native output handling.

## Secret audit

CURRENT SOURCE SECRET SCAN: PASS

GIT HISTORY SECRET SCAN: PASS

The audit covered the current working tree and every reachable Git commit for environment files, Supabase privileged keys, provider keys, Vercel tokens, OAuth secrets, certificates, authorization headers, and hardcoded credentials. `.env` and `.env.*` are ignored, with only `.env.example` allowed. The example file contains variable names and empty placeholders only.

REQUIRED ROTATIONS: NONE

The local `.env.local` contains a client-visible Supabase publishable key and is ignored. No privileged credential is tracked.

## Dependency audit

DEPENDENCY AUDIT: FAIL

`npm audit --audit-level=moderate` reports two PostCSS vulnerabilities (one moderate and one high) through the installed Next.js dependency range. npm recommends a force upgrade to Next.js 16, which is a breaking change and was not applied automatically. This is tracked as a dependency-upgrade gate rather than changing the application during this deployment fix.

## Configuration review

- No GitHub Actions workflow currently exists.
- No Vercel configuration file currently exists.
- No tracked certificates, private keys, or environment files were found.
- Supabase publishable keys are permitted to be browser-visible; service-role keys remain server-only placeholders.

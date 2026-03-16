\# AGENTS.md



\## Project

Satellite Home Watch web application.



\## Current state

This repository contains the cleaned frontend export prepared for backend integration.



\## Primary goal

Preserve the current UI while replacing frontend-only logic with real backend functionality.



\## Rules for changes

\- Do not redesign pages unless explicitly requested.

\- Do not change colors, branding, typography, spacing, or layout style unless explicitly requested.

\- Prefer minimal diffs.

\- Preserve the current page structure and naming unless a structural refactor is explicitly requested.

\- Do not reintroduce mock/demo/fake data.

\- Prefer clean empty states over fake fallback content.

\- Keep the PWA/install functionality intact unless explicitly told to remove it.



\## Roles

\- admin

\- client

\- employee

\- crm



\## Backend plan

\- Supabase Auth

\- Supabase Database

\- Supabase Storage

\- Cloudflare deployment



\## Coding preferences

\- Use backend-ready IDs instead of hardcoded names.

\- Reuse existing components and scripts where possible.

\- Keep JavaScript modular and easy to replace with live data calls.

\- Before changing routes, inspect all related links and references.



\## Deployment / safety

\- Never commit secrets.

\- Use environment variables for all keys.

\- Keep production-safe empty states when data is unavailable.

\- Do not simulate working backend behavior with sample content.


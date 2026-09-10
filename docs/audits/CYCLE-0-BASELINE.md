# Cycle 0 — Baseline & Safety Lock

**Repository:** `cartechautoservice447-collab/Mobile-liquid-glass`

**Baseline branch:** `remediation/cycle-0-baseline`

**Source branch:** `main`

**Baseline captured:** 2026-09-10

## Purpose

Freeze the current application state before Cycle 1 remediation. Cycle 0 makes no product-behavior fixes.

## Repository baseline

- Default branch: `main`
- Public repository: yes
- Repository is archived: no
- Existing safety branch created from current `main`: `remediation/cycle-0-baseline`
- Existing historical safety branch observed: `saved-main-2026-09-07`

## Current dependency/build baseline

- React: `^19.2.0`
- Vite: `^8.2.0`
- Supabase JS: `^2.112.3`
- Capacitor Android/Core/App: `^8.0.0`
- Node/Java release workflow baseline: Node 22, Java 21
- Current package scripts: dev, build, preview, cap:sync, cap:android

## Supabase baseline

The current application source is configured to use the Mobile-liquid-glass Supabase project at the configured project URL. The frontend uses a Supabase publishable key and PKCE auth flow. Secret values are intentionally not recorded in this document.

## Web/Vercel baseline

- Production web origin: `https://mobile-liquid-glass.vercel.app`
- Vercel callback rewrite currently routes `/auth/callback` to `/`

## Android baseline

The repository contains a signed Android App Bundle workflow. It uses GitHub Actions secrets for signing material, Node 22 for web dependencies/build, Java 21 for Gradle, and verifies the generated release AAB before uploading it as an artifact.

## Master audit execution rule

The Master Audit remains the source of truth for BUG #1–#45 and related issues. Cycles only organize execution order. Findings are not renumbered.

Cycle execution format:

`Cycle → Part → Existing Master Audit finding(s) → Fix → Verify → Cycle Gate`

## Cycle 0 exit status

- [x] Baseline branch created
- [x] Current repository identity verified
- [x] Current build/dependency baseline recorded
- [x] Current Supabase connection target recorded without exposing secret values
- [x] Current Vercel callback configuration recorded
- [x] Current Android release workflow baseline recorded
- [x] No application behavior changed by Cycle 0
- [ ] Full local build verification from a clean checkout
- [ ] Production deployment verification
- [ ] Supabase remote project/RLS verification

The remaining unchecked items require execution against the local/deployment/Supabase environments and are deliberately not marked as passed from repository metadata alone.

## Safety rule for subsequent cycles

All remediation work should be committed on dedicated remediation branches or child branches and verified before merging to `main`. Do not rewrite the historical baseline commit.

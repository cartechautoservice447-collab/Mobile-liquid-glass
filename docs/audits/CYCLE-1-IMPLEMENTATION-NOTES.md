# Cycle 1 implementation notes

This file records the intended code-level changes while Cycle 1 is executed.

## Part A
- Keep Supabase as the authoritative authenticated workspace store.
- Keep localStorage only as a device-local fallback/cache.
- Persist explicit course/note deletions to Supabase.
- Preserve stable cloud UUID mappings for legacy local IDs.

## Part B
- Preserve the entered note title when creating a note.

## Part C
- Stable note UUIDs remain independent of title/rename operations.
- The learning-suite title-derived identity consumer is intentionally closed in Cycle 6, where its learning-history semantics are owned.

## Part D
- Save the current editor draft when leaving the editor.
- Immediate saves must write local state and cloud state, not rely only on a delayed background debounce.

## Part E
- Hydrate Engine Settings from `profiles.engine_settings`.
- Persist setting changes back to that authenticated profile.
- Keep a local cache as a fallback, but database state is authoritative when authenticated.

# P2 Refinement Plan

This branch is a safety-isolated refinement pass. No feature behavior is intentionally changed unless required for the listed polish work.

Scope:
- Settings grouping and semantics
- Glass performance governance
- Accessibility baseline
- Unified lightweight notice behavior
- Visual/CSS duplication reduction where safe

Verification:
- Re-scan affected source after each change
- Confirm no legacy class or setting references are accidentally removed
- Confirm the application build after merge/deploy

# Cycle 1 Course Delete Fix

Scope: dashboard course deletion and refresh persistence.

Required invariants:
- The deleted course is removed from the UI immediately.
- The course tombstone is established before any workspace snapshot can be queued.
- Cloud deletion remains serialized with workspace writes for the same user.
- Refresh/load filters the tombstoned course and its children.
- Repeated delete taps do not issue duplicate deletion races.

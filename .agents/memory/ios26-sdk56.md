---
name: iOS 26 / Expo SDK 56 compatibility
description: Apple App Store reviewers run iOS 26 (released 2026). Expo SDK 54 crashes on iOS 26 at TurboModule init.
---

## Rule
Build with **Expo SDK 56** (minimum) to pass Apple review. SDK 54 crashes at `com.meta.react.turbomodulemanager.queue` on iOS 26 with `SIGABRT` / `SIGSEGV` within 2 seconds of launch.

**Why:** Apple's review devices now run iOS 26. SDK 54's native modules use APIs that changed in iOS 26. SDK 56 is the first stable Expo release with iOS 26 support.

**How to apply:** Any new native build submission must use Expo SDK 56+. The upgrade was done in June 2026 for build #12. React Native also bumped from 0.81.5 → 0.85.3.

## Side effects from the upgrade
- `StyleSheet.absoluteFillObject` was removed in RN 0.85 — replace with inline `position/top/right/bottom/left` values.
- `react` / `react-dom` required bump from 19.1.0 → 19.2.3.

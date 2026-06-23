---
name: EAS build number burn
description: EAS Submit timeouts silently register build numbers with Apple; how to avoid conflicts
---

## Rule
EAS Submit's `--auto-submit` flag registers the build number with Apple's servers even when the submission process times out and reports "Something went wrong." The next attempt with the same build number gets Apple error -19232: *"The bundle version must be higher than the previously uploaded version."*

**Why:** Transporter (Apple's upload tool) gives the actual Apple error immediately. EAS Submit's generic timeout hides it. Build numbers 36, 37, 40, 41, 42, 43 were all consumed this way before switching to Transporter.

**How to apply:**
1. Set `"autoIncrement": true` in `eas.json` production profile — EAS auto-bumps the build number on each build so conflicts never happen.
2. Never use `--auto-submit`. Always deliver via Apple Transporter manually — it shows the real Apple error if anything goes wrong.
3. Run from `artifacts/dial-in/` directory, not workspace root: `cd artifacts/dial-in && EAS_NO_VCS=1 eas build --platform ios --profile production --non-interactive`

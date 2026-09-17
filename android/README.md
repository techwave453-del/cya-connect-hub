# CYA Connect Hub — Android

Native Android client for CYA Connect Hub.

## Architecture rule

The Android application connects directly to Supabase. It must not depend on the CYA Connect Hub website server for core application data.

## Current milestone

**Phase 1 — Android Foundation**

- [x] Native Android module created
- [x] Kotlin + Jetpack Compose foundation
- [x] Material 3 foundation
- [x] Navigation dependency prepared
- [ ] Supabase client
- [ ] Secure runtime configuration
- [ ] Authentication
- [ ] Session restoration
- [ ] Profile bootstrap
- [ ] Home bootstrap
- [ ] Room/offline layer

## Local configuration

Do not commit Supabase credentials. The first implementation will load the project URL and publishable key from local/Gradle configuration.

## Development order

1. Foundation
2. Authentication and session management
3. Profile
4. Home and posts
5. Offline-first infrastructure
6. Chat and groups
7. Notifications
8. Search
9. Games
10. Bible and AI
11. Administration
12. Security and release testing

## First APK milestone

The first test APK is targeted for the foundation/auth milestone. It should install, start, authenticate against Supabase, restore a session, load the user's profile, and provide a basic Home shell before feature development continues.

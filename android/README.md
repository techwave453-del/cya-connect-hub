# CYA Connect Hub — Native Android

Native Android client for CYA Connect Hub. The app connects directly to Supabase and does not depend on the website server for core application data.

## Local Supabase configuration

1. Copy `local.properties.example` to `local.properties`.
2. Set `SUPABASE_URL` to the project's Supabase URL.
3. Set `SUPABASE_PUBLISHABLE_KEY` to the project's publishable/anon client key.
4. Never put a Supabase secret/service-role key in the Android application.
5. `local.properties` is ignored by Git.

Open the `android/` directory in Android Studio.

Minimum SDK: 26  
Target SDK: 35  
Application ID: `com.cyaconnecthub.mobile`

## Foundation milestone

- [x] Native Android Gradle foundation
- [x] Kotlin + Jetpack Compose + Material 3
- [x] Supabase Kotlin client
- [x] Local-only Supabase configuration
- [x] Email/password sign in
- [x] Email/password registration
- [x] Session restoration
- [x] Profile bootstrap
- [x] Initial authenticated Home shell
- [ ] Offline cache
- [ ] Bottom navigation
- [ ] Posts/home feed
- [ ] Profile editing

## Security

The Android app is a public client. Authorization remains enforced by Supabase Auth, Postgres RLS, Storage policies, and trusted Edge Functions. No service-role key or other backend secret belongs in the APK.

package com.cyaconnecthub.mobile.core.database

import com.cyaconnecthub.mobile.BuildConfig
import io.github.jan.supabase.auth.Auth
import io.github.jan.supabase.createSupabaseClient
import io.github.jan.supabase.functions.Functions
import io.github.jan.supabase.postgrest.Postgrest
import io.github.jan.supabase.realtime.Realtime
import io.github.jan.supabase.storage.Storage

object SupabaseClientProvider {
    private val url = BuildConfig.SUPABASE_URL.trim()
    private val publishableKey = BuildConfig.SUPABASE_PUBLISHABLE_KEY.trim()

    val isConfigured: Boolean
        get() = url.isNotBlank() && publishableKey.isNotBlank()

    val client by lazy {
        require(isConfigured) {
            "Supabase is not configured. Add SUPABASE_URL and SUPABASE_PUBLISHABLE_KEY to android/local.properties."
        }

        createSupabaseClient(
            supabaseUrl = url,
            supabaseKey = publishableKey
        ) {
            install(Auth) {
                alwaysAutoRefresh = true
                autoLoadFromStorage = true
            }
            install(Postgrest)
            install(Realtime)
            install(Storage)
            install(Functions)
        }
    }
}

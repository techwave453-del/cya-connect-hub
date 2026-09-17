package com.cyaconnecthub.mobile.core.auth

import com.cyaconnecthub.mobile.core.database.SupabaseClientProvider
import kotlinx.serialization.Serializable

@Serializable
data class UserProfile(
    val id: String,
    val user_id: String,
    val username: String,
    val avatar_url: String? = null,
    val local_church: String? = null,
    val created_at: String? = null,
    val updated_at: String? = null
)

class ProfileRepository {
    private val supabase
        get() = SupabaseClientProvider.client

    suspend fun getCurrentProfile(): UserProfile? {
        val userId = supabase.auth.currentUserOrNull()?.id ?: return null

        return supabase
            .from("profiles")
            .select {
                filter {
                    eq("user_id", userId)
                }
            }
            .decodeSingleOrNull<UserProfile>()
    }
}

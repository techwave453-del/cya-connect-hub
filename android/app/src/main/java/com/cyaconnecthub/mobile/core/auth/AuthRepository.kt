package com.cyaconnecthub.mobile.core.auth

import com.cyaconnecthub.mobile.core.database.SupabaseClientProvider
import io.github.jan.supabase.auth.providers.Email
import io.github.jan.supabase.auth.status.SessionStatus
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.map

class AuthRepository {
    private val supabase
        get() = SupabaseClientProvider.client

    val sessionStatus: Flow<SessionStatus>
        get() = supabase.auth.sessionStatus

    val isAuthenticated: Flow<Boolean>
        get() = sessionStatus.map { it is SessionStatus.Authenticated }

    suspend fun signIn(email: String, password: String) {
        supabase.auth.signInWith(Email) {
            this.email = email.trim()
            this.password = password
        }
    }

    suspend fun signUp(email: String, password: String, username: String) {
        supabase.auth.signUpWith(Email) {
            this.email = email.trim()
            this.password = password
            data = kotlinx.serialization.json.buildJsonObject {
                put("username", username.trim())
            }
        }
    }

    suspend fun signOut() {
        supabase.auth.signOut()
    }
}

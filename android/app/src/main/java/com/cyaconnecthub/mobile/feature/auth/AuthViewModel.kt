package com.cyaconnecthub.mobile.feature.auth

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.cyaconnecthub.mobile.core.auth.AuthRepository
import com.cyaconnecthub.mobile.core.auth.ProfileRepository
import com.cyaconnecthub.mobile.core.auth.UserProfile
import io.github.jan.supabase.auth.status.SessionStatus
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.collectLatest
import kotlinx.coroutines.launch

sealed interface AuthUiState {
    data object Loading : AuthUiState
    data object SignedOut : AuthUiState
    data class SignedIn(val profile: UserProfile?) : AuthUiState
}

class AuthViewModel : ViewModel() {
    private val authRepository = AuthRepository()
    private val profileRepository = ProfileRepository()

    private val _uiState = MutableStateFlow<AuthUiState>(AuthUiState.Loading)
    val uiState: StateFlow<AuthUiState> = _uiState.asStateFlow()

    private val _busy = MutableStateFlow(false)
    val busy: StateFlow<Boolean> = _busy.asStateFlow()

    private val _error = MutableStateFlow<String?>(null)
    val error: StateFlow<String?> = _error.asStateFlow()

    private val _message = MutableStateFlow<String?>(null)
    val message: StateFlow<String?> = _message.asStateFlow()

    init {
        viewModelScope.launch {
            authRepository.sessionStatus.collectLatest { status ->
                when (status) {
                    SessionStatus.Initializing -> _uiState.value = AuthUiState.Loading
                    is SessionStatus.Authenticated -> {
                        val profile = runCatching { profileRepository.getCurrentProfile() }.getOrNull()
                        _uiState.value = AuthUiState.SignedIn(profile)
                    }
                    is SessionStatus.NotAuthenticated -> _uiState.value = AuthUiState.SignedOut
                    is SessionStatus.RefreshFailure -> _uiState.value = AuthUiState.SignedOut
                }
            }
        }
    }

    fun signIn(email: String, password: String) {
        submit { authRepository.signIn(email, password) }
    }

    fun signUp(email: String, password: String, username: String) {
        submit {
            authRepository.signUp(email, password, username)
            _message.value = "Account created. Check your email if verification is required."
        }
    }

    fun signOut() {
        submit { authRepository.signOut() }
    }

    fun clearFeedback() {
        _error.value = null
        _message.value = null
    }

    private fun submit(action: suspend () -> Unit) {
        viewModelScope.launch {
            _busy.value = true
            _error.value = null
            try {
                action()
            } catch (t: Throwable) {
                _error.value = t.message?.takeIf { it.isNotBlank() }
                    ?: "Something went wrong. Please try again."
            } finally {
                _busy.value = false
            }
        }
    }
}

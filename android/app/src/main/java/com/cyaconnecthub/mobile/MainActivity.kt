package com.cyaconnecthub.mobile

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.Button
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.unit.dp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.lifecycle.viewmodel.compose.viewModel
import com.cyaconnecthub.mobile.core.database.SupabaseClientProvider
import com.cyaconnecthub.mobile.feature.auth.AuthUiState
import com.cyaconnecthub.mobile.feature.auth.AuthViewModel

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContent { CyaConnectHubApp() }
    }
}

@Composable
private fun CyaConnectHubApp(authViewModel: AuthViewModel = viewModel()) {
    val authState by authViewModel.uiState.collectAsStateWithLifecycle()

    MaterialTheme {
        Surface(modifier = Modifier.fillMaxSize()) {
            when {
                !SupabaseClientProvider.isConfigured -> ConfigurationRequiredScreen()
                authState is AuthUiState.Loading -> LoadingScreen()
                authState is AuthUiState.SignedIn -> {
                    HomeScreen(authViewModel, authState as AuthUiState.SignedIn)
                }
                else -> AuthScreen(authViewModel)
            }
        }
    }
}

@Composable
private fun ConfigurationRequiredScreen() {
    Column(
        modifier = Modifier.fillMaxSize().padding(24.dp),
        verticalArrangement = Arrangement.Center
    ) {
        Text("CYA Connect Hub", style = MaterialTheme.typography.headlineMedium)
        Text(
            "Supabase is not configured yet. Copy android/local.properties.example to local.properties and add the Supabase URL and publishable key.",
            modifier = Modifier.padding(top = 12.dp)
        )
    }
}

@Composable
private fun LoadingScreen() {
    Column(
        modifier = Modifier.fillMaxSize(),
        verticalArrangement = Arrangement.Center
    ) {
        CircularProgressIndicator(modifier = Modifier.padding(24.dp))
    }
}

@Composable
private fun AuthScreen(viewModel: AuthViewModel) {
    var registerMode by rememberSaveable { mutableStateOf(false) }
    var username by rememberSaveable { mutableStateOf("") }
    var email by rememberSaveable { mutableStateOf("") }
    var password by rememberSaveable { mutableStateOf("") }

    val busy by viewModel.busy.collectAsStateWithLifecycle()
    val error by viewModel.error.collectAsStateWithLifecycle()
    val message by viewModel.message.collectAsStateWithLifecycle()

    Column(
        modifier = Modifier.fillMaxSize().verticalScroll(rememberScrollState()).padding(24.dp),
        verticalArrangement = Arrangement.Center
    ) {
        Text("CYA Connect Hub", style = MaterialTheme.typography.headlineLarge)
        Text(
            if (registerMode) "Create your account" else "Sign in to continue",
            style = MaterialTheme.typography.titleMedium,
            modifier = Modifier.padding(top = 8.dp, bottom = 24.dp)
        )

        if (registerMode) {
            OutlinedTextField(
                value = username,
                onValueChange = { username = it },
                label = { Text("Username") },
                singleLine = true,
                enabled = !busy,
                modifier = Modifier.fillMaxWidth()
            )
            Spacer(Modifier.height(10.dp))
        }

        OutlinedTextField(
            value = email,
            onValueChange = { email = it },
            label = { Text("Email") },
            singleLine = true,
            enabled = !busy,
            modifier = Modifier.fillMaxWidth()
        )
        Spacer(Modifier.height(10.dp))
        OutlinedTextField(
            value = password,
            onValueChange = { password = it },
            label = { Text("Password") },
            singleLine = true,
            enabled = !busy,
            visualTransformation = PasswordVisualTransformation(),
            modifier = Modifier.fillMaxWidth()
        )

        if (!error.isNullOrBlank()) {
            Text(
                error.orEmpty(),
                color = MaterialTheme.colorScheme.error,
                modifier = Modifier.padding(top = 12.dp)
            )
        }
        if (!message.isNullOrBlank()) {
            Text(message.orEmpty(), modifier = Modifier.padding(top = 12.dp))
        }

        Button(
            onClick = {
                if (registerMode) viewModel.signUp(email, password, username)
                else viewModel.signIn(email, password)
            },
            enabled = !busy && email.isNotBlank() && password.isNotBlank() &&
                (!registerMode || username.isNotBlank()),
            contentPadding = PaddingValues(vertical = 14.dp),
            modifier = Modifier.fillMaxWidth().padding(top = 20.dp)
        ) {
            if (busy) CircularProgressIndicator()
            else Text(if (registerMode) "Create account" else "Sign in")
        }

        OutlinedButton(
            onClick = {
                registerMode = !registerMode
                viewModel.clearFeedback()
            },
            enabled = !busy,
            modifier = Modifier.fillMaxWidth().padding(top = 10.dp)
        ) {
            Text(if (registerMode) "Already have an account? Sign in" else "Create a new account")
        }
    }
}

@Composable
private fun HomeScreen(viewModel: AuthViewModel, state: AuthUiState.SignedIn) {
    val username = state.profile?.username ?: "Member"

    Column(
        modifier = Modifier.fillMaxSize().padding(24.dp),
        verticalArrangement = Arrangement.spacedBy(16.dp)
    ) {
        Text("Welcome, $username", style = MaterialTheme.typography.headlineMedium)
        Text("CYA Connect Hub is connected directly to Supabase.")
        Text("The native home shell is ready for the next feature modules.")
        OutlinedButton(onClick = viewModel::signOut) {
            Text("Sign out")
        }
    }
}

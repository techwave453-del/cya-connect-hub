package com.cyaconnecthub.mobile.feature.home

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.NavigationBar
import androidx.compose.material3.NavigationBarItem
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import com.cyaconnecthub.mobile.feature.auth.AuthUiState
import com.cyaconnecthub.mobile.feature.auth.AuthViewModel

private enum class HomeDestination(val label: String) {
    Home("Home"),
    Search("Search"),
    Chat("Chat"),
    Profile("Profile")
}

@Composable
fun HomeShell(viewModel: AuthViewModel, state: AuthUiState.SignedIn) {
    var selected by rememberSaveable { mutableStateOf(HomeDestination.Home.name) }

    Scaffold(
        bottomBar = {
            NavigationBar {
                HomeDestination.entries.forEach { destination ->
                    NavigationBarItem(
                        selected = selected == destination.name,
                        onClick = { selected = destination.name },
                        icon = { Text(destination.label.take(1)) },
                        label = { Text(destination.label) }
                    )
                }
            }
        }
    ) { padding ->
        when (HomeDestination.valueOf(selected)) {
            HomeDestination.Home -> HomeTab(state, Modifier.padding(padding))
            HomeDestination.Search -> PlaceholderTab("Search", Modifier.padding(padding))
            HomeDestination.Chat -> PlaceholderTab("Chat", Modifier.padding(padding))
            HomeDestination.Profile -> ProfileTab(viewModel, state, Modifier.padding(padding))
        }
    }
}

@Composable
private fun HomeTab(state: AuthUiState.SignedIn, modifier: Modifier) {
    val username = state.profile?.username ?: "Member"
    Column(
        modifier = modifier.fillMaxSize().padding(24.dp),
        verticalArrangement = Arrangement.spacedBy(12.dp)
    ) {
        Text("Welcome, $username")
        Text("CYA Connect Hub")
        Text("Your community home will appear here.")
    }
}

@Composable
private fun ProfileTab(
    viewModel: AuthViewModel,
    state: AuthUiState.SignedIn,
    modifier: Modifier
) {
    val profile = state.profile
    Column(
        modifier = modifier.fillMaxSize().padding(24.dp),
        verticalArrangement = Arrangement.spacedBy(12.dp)
    ) {
        Text("Profile")
        Text("Username: ${profile?.username ?: "Member"}")
        profile?.local_church?.let { Text("Local church: $it") }
        Text("Profile editing will be added in the Profile milestone.")
        androidx.compose.material3.OutlinedButton(onClick = viewModel::signOut) {
            Text("Sign out")
        }
    }
}

@Composable
private fun PlaceholderTab(title: String, modifier: Modifier) {
    Column(
        modifier = modifier.fillMaxSize().padding(24.dp),
        verticalArrangement = Arrangement.spacedBy(12.dp)
    ) {
        Text(title)
        Text("This module is reserved for the next implementation milestone.")
    }
}

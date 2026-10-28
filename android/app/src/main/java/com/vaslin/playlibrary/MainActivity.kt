package com.vaslin.playlibrary

import android.net.Uri
import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Home
import androidx.compose.material.icons.filled.Person
import androidx.compose.material.icons.filled.Search
import androidx.compose.material.icons.filled.Settings
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.NavigationBar
import androidx.compose.material3.NavigationBarItem
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.key
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.navigation.NavDestination.Companion.hierarchy
import androidx.navigation.NavType
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.currentBackStackEntryAsState
import androidx.navigation.compose.rememberNavController
import androidx.navigation.navArgument
import com.vaslin.playlibrary.data.LibraryRepository
import com.vaslin.playlibrary.data.LibraryStore
import com.vaslin.playlibrary.ui.AlbumDetailScreen
import com.vaslin.playlibrary.ui.GradientBackground
import com.vaslin.playlibrary.ui.HomeScreen
import com.vaslin.playlibrary.ui.ImportScreen
import com.vaslin.playlibrary.ui.PeopleScreen
import com.vaslin.playlibrary.ui.PersonDetailScreen
import com.vaslin.playlibrary.ui.PlayLibraryTheme
import com.vaslin.playlibrary.ui.SearchScreen
import com.vaslin.playlibrary.ui.TrackDetailScreen
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContent {
            PlayLibraryTheme {
                PlayLibraryApp()
            }
        }
    }
}

private data class TopLevel(val route: String, val label: String, val icon: ImageVector)

private val topLevel = listOf(
    TopLevel("home", "Home", Icons.Filled.Home),
    TopLevel("search", "Search", Icons.Filled.Search),
    TopLevel("people", "People", Icons.Filled.Person),
    TopLevel("import", "Library", Icons.Filled.Settings),
)

@Composable
fun PlayLibraryApp() {
    val context = androidx.compose.ui.platform.LocalContext.current
    val scope = rememberCoroutineScope()
    var repo by remember { mutableStateOf<LibraryRepository?>(null) }
    var loaded by remember { mutableStateOf(false) }
    var busy by remember { mutableStateOf(false) }
    var importError by remember { mutableStateOf<String?>(null) }

    androidx.compose.runtime.LaunchedEffect(Unit) {
        repo = withContext(Dispatchers.IO) { LibraryStore.open(context) }
        loaded = true
    }

    fun importLibrary(uri: Uri) {
        scope.launch {
            busy = true
            importError = null
            repo?.close()
            repo = null
            val outcome = withContext(Dispatchers.IO) {
                runCatching { LibraryStore.importFrom(context, uri) }
            }
            if (outcome.isFailure) importError = outcome.exceptionOrNull()?.message ?: "Import failed."
            repo = withContext(Dispatchers.IO) { LibraryStore.open(context) }
            busy = false
        }
    }

    GradientBackground {
        val current = repo
        when {
            !loaded -> Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                CircularProgressIndicator()
            }
            current == null -> ImportScreen(
                hasLibrary = false,
                busy = busy,
                error = importError,
                onPick = ::importLibrary,
            )
            else -> key(current) {
                LibraryApp(current, busy, importError, ::importLibrary)
            }
        }
    }
}

@Composable
private fun LibraryApp(
    repo: LibraryRepository,
    busy: Boolean,
    importError: String?,
    onImport: (Uri) -> Unit,
) {
    val nav = rememberNavController()
    val backStack by nav.currentBackStackEntryAsState()
    val destination = backStack?.destination

    Scaffold(
        containerColor = Color.Transparent,
        bottomBar = {
            NavigationBar(containerColor = MaterialTheme.colorScheme.surfaceContainer) {
                topLevel.forEach { item ->
                    NavigationBarItem(
                        selected = destination?.hierarchy?.any { it.route == item.route } == true,
                        onClick = {
                            nav.navigate(item.route) {
                                popUpTo(nav.graph.startDestinationId) { inclusive = false }
                                launchSingleTop = true
                            }
                        },
                        icon = { Icon(item.icon, contentDescription = item.label) },
                        label = { Text(item.label) },
                    )
                }
            }
        },
    ) { padding ->
        NavHost(
            navController = nav,
            startDestination = "home",
            modifier = Modifier.padding(padding),
        ) {
            composable("home") {
                HomeScreen(repo) { id -> nav.navigate("person/$id") }
            }
            composable("search") {
                SearchScreen(
                    repo = repo,
                    onTrack = { id -> nav.navigate("track/$id") },
                    onPerson = { id -> nav.navigate("person/$id") },
                )
            }
            composable("people") {
                PeopleScreen(repo) { id -> nav.navigate("person/$id") }
            }
            composable("import") {
                ImportScreen(
                    hasLibrary = true,
                    busy = busy,
                    error = importError,
                    onPick = onImport,
                )
            }
            composable(
                "track/{id}",
                arguments = listOf(navArgument("id") { type = NavType.LongType }),
            ) { entry ->
                TrackDetailScreen(
                    repo = repo,
                    trackId = entry.arguments?.getLong("id") ?: 0L,
                    onPerson = { id -> nav.navigate("person/$id") },
                    onAlbum = { id -> nav.navigate("album/$id") },
                    onBack = { nav.popBackStack() },
                )
            }
            composable(
                "album/{id}",
                arguments = listOf(navArgument("id") { type = NavType.LongType }),
            ) { entry ->
                AlbumDetailScreen(
                    repo = repo,
                    albumId = entry.arguments?.getLong("id") ?: 0L,
                    onTrack = { id -> nav.navigate("track/$id") },
                    onBack = { nav.popBackStack() },
                )
            }
            composable(
                "person/{id}",
                arguments = listOf(navArgument("id") { type = NavType.LongType }),
            ) { entry ->
                PersonDetailScreen(
                    repo = repo,
                    personId = entry.arguments?.getLong("id") ?: 0L,
                    onTrack = { id -> nav.navigate("track/$id") },
                    onBack = { nav.popBackStack() },
                )
            }
        }
    }
}

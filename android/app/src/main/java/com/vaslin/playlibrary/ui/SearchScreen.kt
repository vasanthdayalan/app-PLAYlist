package com.vaslin.playlibrary.ui

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Search
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.ScrollableTabRow
import androidx.compose.material3.Tab
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.vaslin.playlibrary.data.LibraryRepository
import com.vaslin.playlibrary.data.PersonCount
import com.vaslin.playlibrary.data.PersonHit
import com.vaslin.playlibrary.data.ROLES
import com.vaslin.playlibrary.data.SearchResults
import com.vaslin.playlibrary.data.TrackRow
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.delay
import kotlinx.coroutines.withContext

@Composable
fun PeopleScreen(repo: LibraryRepository, onPerson: (Long) -> Unit) {
    var selected by rememberSaveable { mutableIntStateOf(0) }
    var people by remember { mutableStateOf<List<PersonCount>>(emptyList()) }

    LaunchedEffect(selected, repo) {
        val role = ROLES[selected]
        people = withContext(Dispatchers.IO) { repo.peopleByRole(role) }
    }

    Column(Modifier.fillMaxSize()) {
        Text(
            "People",
            style = MaterialTheme.typography.headlineLarge,
            fontWeight = FontWeight.Bold,
            modifier = Modifier.padding(start = 16.dp, top = 16.dp, end = 16.dp, bottom = 8.dp),
        )
        ScrollableTabRow(
            selectedTabIndex = selected,
            edgePadding = 16.dp,
            containerColor = Color.Transparent,
        ) {
            ROLES.forEachIndexed { index, role ->
                Tab(
                    selected = selected == index,
                    onClick = { selected = index },
                    text = { Text(roleLabel(role)) },
                )
            }
        }
        LazyColumn(
            contentPadding = PaddingValues(16.dp),
            verticalArrangement = Arrangement.spacedBy(4.dp),
        ) {
            items(people, key = { it.id }) { person ->
                PersonRow(person.name, "${person.count} tracks") { onPerson(person.id) }
            }
        }
    }
}

@Composable
fun SearchScreen(repo: LibraryRepository, onTrack: (Long) -> Unit, onPerson: (Long) -> Unit) {
    var query by rememberSaveable { mutableStateOf("") }
    var results by remember { mutableStateOf(SearchResults(emptyList(), emptyList())) }
    var recent by remember { mutableStateOf<List<TrackRow>>(emptyList()) }

    LaunchedEffect(repo) {
        recent = withContext(Dispatchers.IO) { repo.recentTracks() }
    }
    LaunchedEffect(query, repo) {
        delay(200)
        results = withContext(Dispatchers.IO) { repo.search(query) }
    }

    val browsing = query.isBlank()
    val tracks = if (browsing) recent else results.tracks

    Column(Modifier.fillMaxSize()) {
        Text(
            "Search",
            style = MaterialTheme.typography.headlineLarge,
            fontWeight = FontWeight.Bold,
            modifier = Modifier.padding(start = 16.dp, top = 16.dp, end = 16.dp, bottom = 8.dp),
        )
        OutlinedTextField(
            value = query,
            onValueChange = { query = it },
            placeholder = { Text("Track, album, artist, composer, lyricist…") },
            leadingIcon = { Icon(Icons.Filled.Search, contentDescription = null) },
            singleLine = true,
            shape = RoundedCornerShape(28.dp),
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 16.dp),
        )
        LazyColumn(
            contentPadding = PaddingValues(16.dp),
            verticalArrangement = Arrangement.spacedBy(4.dp),
        ) {
            if (!browsing && results.people.isNotEmpty()) {
                item { SectionTitle("People") }
                items(results.people, key = { "p${it.id}" }) { person: PersonHit ->
                    PersonRow(person.name, null) { onPerson(person.id) }
                }
            }
            item {
                SectionTitle(if (browsing) "Recently added" else "Tracks (${tracks.size})")
            }
            if (!browsing && tracks.isEmpty()) {
                item {
                    Text(
                        "No matches for \"$query\".",
                        style = MaterialTheme.typography.bodyMedium,
                        modifier = Modifier.padding(12.dp),
                    )
                }
            }
            items(tracks, key = { it.id }) { track ->
                TrackItem(track, repo) { onTrack(track.id) }
            }
        }
    }
}

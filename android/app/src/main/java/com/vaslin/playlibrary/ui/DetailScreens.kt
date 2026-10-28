package com.vaslin.playlibrary.ui

import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.ArrowBack
import androidx.compose.material3.AssistChip
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.material3.FilterChip
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.produceState
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import com.vaslin.playlibrary.data.AlbumDetail
import com.vaslin.playlibrary.data.LibraryRepository
import com.vaslin.playlibrary.data.PersonDetail
import com.vaslin.playlibrary.data.ROLES
import com.vaslin.playlibrary.data.TrackDetail
import com.vaslin.playlibrary.data.TrackRow
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext

@Composable
private fun LoadingBox() {
    Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
        CircularProgressIndicator()
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun BackHeader(title: String, onBack: () -> Unit) {
    Row(
        Modifier.fillMaxWidth().padding(bottom = 8.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        IconButton(onClick = onBack) {
            Icon(Icons.Filled.ArrowBack, contentDescription = "Back")
        }
        Text(
            title,
            style = MaterialTheme.typography.titleLarge,
            maxLines = 1,
            overflow = TextOverflow.Ellipsis,
        )
    }
}

@Composable
fun TrackDetailScreen(
    repo: LibraryRepository,
    trackId: Long,
    onPerson: (Long) -> Unit,
    onAlbum: (Long) -> Unit,
    onBack: () -> Unit,
) {
    val detail by produceState<TrackDetail?>(initialValue = null, trackId, repo) {
        value = withContext(Dispatchers.IO) { repo.trackDetail(trackId) }
    }
    val d = detail
    if (d == null) {
        LoadingBox()
        return
    }
    val track: TrackRow = d.track

    LazyColumn(
        contentPadding = PaddingValues(16.dp),
        verticalArrangement = Arrangement.spacedBy(12.dp),
    ) {
        item { BackHeader("Track", onBack) }
        item {
            Column(Modifier.fillMaxWidth(), horizontalAlignment = Alignment.CenterHorizontally) {
                Artwork(track.albumId, repo, track.album, 220.dp)
                Spacer(Modifier.height(16.dp))
                Text(
                    track.name,
                    style = MaterialTheme.typography.headlineMedium,
                    fontWeight = FontWeight.Bold,
                    textAlign = TextAlign.Center,
                )
                Text(
                    "${track.album} · ${track.year}",
                    style = MaterialTheme.typography.bodyLarge,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                    textAlign = TextAlign.Center,
                )
                Spacer(Modifier.height(8.dp))
                Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    AssistChip(onClick = {}, label = { Text(typeLabel(track.type)) })
                    AssistChip(onClick = {}, label = { Text(d.language) })
                    if (track.favorite) AssistChip(onClick = {}, label = { Text("Favorite") })
                }
            }
        }
        item {
            Card(
                shape = RoundedCornerShape(20.dp),
                colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceContainerHigh),
            ) {
                Column(Modifier.padding(16.dp)) {
                    MetaRow("Year", track.year.toString())
                    MetaRow("Duration", formatDuration(d.durationSeconds))
                    Row(
                        Modifier
                            .fillMaxWidth()
                            .clickable { onAlbum(track.albumId) }
                            .padding(vertical = 4.dp),
                    ) {
                        MetaRow("Album", track.album)
                    }
                    MetaRow("Language", d.language)
                    MetaRow("Category", typeLabel(track.type))
                }
            }
        }
        val credited = ROLES.filter { d.credits[it].orEmpty().isNotEmpty() }
        if (credited.isNotEmpty()) {
            item { SectionTitle("Credits") }
        }
        items(credited) { role ->
            Card(
                shape = RoundedCornerShape(20.dp),
                colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceContainerHigh),
            ) {
                Column(Modifier.padding(horizontal = 16.dp, vertical = 12.dp)) {
                    Text(
                        roleSingular(role),
                        style = MaterialTheme.typography.labelLarge,
                        color = MaterialTheme.colorScheme.primary,
                    )
                    d.credits[role].orEmpty().forEach { credit ->
                        Text(
                            credit.name,
                            style = MaterialTheme.typography.bodyLarge,
                            modifier = Modifier
                                .fillMaxWidth()
                                .clickable { onPerson(credit.personId) }
                                .padding(vertical = 6.dp),
                        )
                    }
                }
            }
        }
    }
}

@Composable
fun AlbumDetailScreen(
    repo: LibraryRepository,
    albumId: Long,
    onTrack: (Long) -> Unit,
    onBack: () -> Unit,
) {
    val detail by produceState<AlbumDetail?>(initialValue = null, albumId, repo) {
        value = withContext(Dispatchers.IO) { repo.albumDetail(albumId) }
    }
    val d = detail
    if (d == null) {
        LoadingBox()
        return
    }

    LazyColumn(
        contentPadding = PaddingValues(16.dp),
        verticalArrangement = Arrangement.spacedBy(8.dp),
    ) {
        item { BackHeader("Album", onBack) }
        item {
            Column(Modifier.fillMaxWidth(), horizontalAlignment = Alignment.CenterHorizontally) {
                Artwork(d.id, repo, d.name, 200.dp)
                Spacer(Modifier.height(12.dp))
                Text(
                    d.name,
                    style = MaterialTheme.typography.headlineSmall,
                    fontWeight = FontWeight.Bold,
                    textAlign = TextAlign.Center,
                )
                Text(
                    "${d.year} · ${d.tracks.size} tracks",
                    style = MaterialTheme.typography.bodyLarge,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                )
            }
        }
        item { SectionTitle("Tracks") }
        items(d.tracks, key = { it.id }) { track ->
            TrackItem(track, repo) { onTrack(track.id) }
        }
    }
}

@Composable
fun PersonDetailScreen(
    repo: LibraryRepository,
    personId: Long,
    onTrack: (Long) -> Unit,
    onBack: () -> Unit,
) {
    val detail by produceState<PersonDetail?>(initialValue = null, personId, repo) {
        value = withContext(Dispatchers.IO) { repo.personDetail(personId) }
    }
    val d = detail
    if (d == null) {
        LoadingBox()
        return
    }
    var selectedRole by rememberSaveable { mutableStateOf<String?>(null) }
    val shown = selectedRole?.let { d.tracksByRole[it] } ?: d.tracks

    LazyColumn(
        contentPadding = PaddingValues(16.dp),
        verticalArrangement = Arrangement.spacedBy(8.dp),
    ) {
        item { BackHeader(d.name, onBack) }
        item {
            Row(
                Modifier
                    .fillMaxWidth()
                    .horizontalScroll(rememberScrollState()),
                horizontalArrangement = Arrangement.spacedBy(8.dp),
            ) {
                ROLES.filter { d.roleCounts.containsKey(it) }.forEach { role ->
                    FilterChip(
                        selected = selectedRole == role,
                        onClick = { selectedRole = if (selectedRole == role) null else role },
                        label = { Text("${roleSingular(role)} · ${d.roleCounts[role]}") },
                    )
                }
            }
        }
        item {
            SectionTitle(
                if (selectedRole == null) "Tracks (${shown.size})"
                else "${roleSingular(selectedRole!!)} tracks (${shown.size})",
            )
        }
        items(shown, key = { it.id }) { track ->
            TrackItem(track, repo) { onTrack(track.id) }
        }
    }
}

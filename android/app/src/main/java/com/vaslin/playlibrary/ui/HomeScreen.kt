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
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.clickable
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.runtime.produceState
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import com.vaslin.playlibrary.data.LibraryRepository
import com.vaslin.playlibrary.data.RoleStat
import com.vaslin.playlibrary.data.Totals
import com.vaslin.playlibrary.data.ROLES
import com.vaslin.playlibrary.data.YearCount
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext

private class HomeData(
    val totals: Totals,
    val years: List<YearCount>,
    val roles: List<RoleStat>,
)

@Composable
fun HomeScreen(repo: LibraryRepository, onPerson: (Long) -> Unit) {
    val home by produceState<HomeData?>(initialValue = null, repo) {
        value = withContext(Dispatchers.IO) {
            HomeData(
                totals = repo.totals(),
                years = repo.yearCounts(),
                roles = ROLES.map { RoleStat(it, repo.peopleByRole(it)) },
            )
        }
    }

    val data = home
    if (data == null) {
        Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
            CircularProgressIndicator()
        }
        return
    }

    LazyColumn(
        contentPadding = PaddingValues(16.dp),
        verticalArrangement = Arrangement.spacedBy(16.dp),
    ) {
        item {
            Text(
                "Library",
                style = MaterialTheme.typography.headlineLarge,
                fontWeight = FontWeight.Bold,
            )
        }
        item {
            Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                StatCard("Tracks", data.totals.tracks.toString(), Modifier.weight(1f))
                StatCard("Albums", data.totals.albums.toString(), Modifier.weight(1f))
            }
        }
        item {
            Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                StatCard("People", data.totals.people.toString(), Modifier.weight(1f))
                StatCard(
                    "Movie / Indie",
                    "${data.totals.movies} / ${data.totals.indies}",
                    Modifier.weight(1f),
                )
            }
        }
        item {
            Card(
                shape = RoundedCornerShape(20.dp),
                colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceContainerHigh),
            ) {
                Column(Modifier.padding(16.dp)) {
                    SectionTitle("Tracks by year")
                    Spacer(Modifier.height(8.dp))
                    YearBarChart(data.years)
                }
            }
        }
        items(data.roles, key = { it.role }) { stat ->
            RoleCard(stat, onPerson)
        }
    }
}

@Composable
private fun RoleCard(stat: RoleStat, onPerson: (Long) -> Unit) {
    Card(
        shape = RoundedCornerShape(20.dp),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceContainerHigh),
    ) {
        Column(Modifier.padding(16.dp)) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                SectionTitle(roleLabel(stat.role))
                Spacer(Modifier.weight(1f))
                Text(
                    "${stat.people.size} total",
                    style = MaterialTheme.typography.labelLarge,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                )
            }
            stat.people.take(5).forEachIndexed { index, person ->
                Row(
                    Modifier
                        .fillMaxWidth()
                        .clip(RoundedCornerShape(12.dp))
                        .clickable { onPerson(person.id) }
                        .padding(vertical = 8.dp, horizontal = 4.dp),
                    verticalAlignment = Alignment.CenterVertically,
                ) {
                    Text(
                        "${index + 1}",
                        style = MaterialTheme.typography.labelLarge,
                        color = MaterialTheme.colorScheme.primary,
                        modifier = Modifier.width(28.dp),
                    )
                    Text(
                        person.name,
                        style = MaterialTheme.typography.bodyLarge,
                        maxLines = 1,
                        overflow = TextOverflow.Ellipsis,
                        modifier = Modifier.weight(1f),
                    )
                    Text(
                        "${person.count} tracks",
                        style = MaterialTheme.typography.labelLarge,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                    )
                }
            }
        }
    }
}

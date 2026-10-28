package com.vaslin.playlibrary.data

import android.database.Cursor
import android.database.sqlite.SQLiteDatabase
import java.io.Closeable
import java.io.File

val ROLES = listOf("artist", "composer", "lyricist", "actor")

data class Totals(val tracks: Int, val albums: Int, val people: Int, val movies: Int, val indies: Int)
data class YearCount(val year: Int, val count: Int)
data class PersonCount(val id: Long, val name: String, val count: Int)
data class RoleStat(val role: String, val people: List<PersonCount>)
data class TrackRow(
    val id: Long,
    val name: String,
    val album: String,
    val albumId: Long,
    val year: Int,
    val type: String,
    val favorite: Boolean,
)
data class Credit(val personId: Long, val name: String)
data class TrackDetail(
    val track: TrackRow,
    val language: String,
    val durationSeconds: Int?,
    val credits: Map<String, List<Credit>>,
)
data class PersonDetail(
    val id: Long,
    val name: String,
    val roleCounts: Map<String, Int>,
    val tracks: List<TrackRow>,
    val tracksByRole: Map<String, List<TrackRow>>,
)
data class AlbumDetail(val id: Long, val name: String, val year: Int, val tracks: List<TrackRow>)
data class PersonHit(val id: Long, val name: String)
data class SearchResults(val tracks: List<TrackRow>, val people: List<PersonHit>)

/**
 * Read-only access to the exported library snapshot. Archived tracks are excluded
 * from every query.
 */
class LibraryRepository private constructor(private val db: SQLiteDatabase) : Closeable {

    fun totals(): Totals {
        val types = query("SELECT type, COUNT(*) FROM tracks WHERE archived = 0 GROUP BY type") {
            it.getString(0) to it.getInt(1)
        }.toMap()
        return Totals(
            tracks = scalar("SELECT COUNT(*) FROM tracks WHERE archived = 0"),
            albums = scalar("SELECT COUNT(DISTINCT album_id) FROM tracks WHERE archived = 0"),
            people = scalar(
                "SELECT COUNT(DISTINCT tp.person_id) FROM track_people tp " +
                    "JOIN tracks t ON t.id = tp.track_id WHERE t.archived = 0",
            ),
            movies = types["movie"] ?: 0,
            indies = types["indie"] ?: 0,
        )
    }

    fun yearCounts(): List<YearCount> = query(
        "SELECT year, COUNT(*) FROM tracks WHERE archived = 0 GROUP BY year ORDER BY year",
    ) { YearCount(it.getInt(0), it.getInt(1)) }

    fun peopleByRole(role: String): List<PersonCount> = query(
        """
        SELECT p.id, p.name, COUNT(DISTINCT tp.track_id)
        FROM track_people tp
        JOIN tracks t ON t.id = tp.track_id AND t.archived = 0
        JOIN people p ON p.id = tp.person_id
        WHERE tp.role = ?
        GROUP BY p.id
        ORDER BY 3 DESC, p.name
        """.trimIndent(),
        arrayOf(role),
    ) { PersonCount(it.getLong(0), it.getString(1), it.getInt(2)) }

    fun recentTracks(limit: Int = 100): List<TrackRow> = query(
        "$TRACK_SQL WHERE t.archived = 0 ORDER BY t.created_at DESC LIMIT $limit",
    ) { trackRow(it) }

    fun search(raw: String): SearchResults {
        val tokens = raw.split(NON_WORD).filter { it.isNotEmpty() }
        if (tokens.isEmpty()) return SearchResults(emptyList(), emptyList())
        val match = tokens.joinToString(" ") { "\"$it\"*" }

        val trackIds = ftsIds(match, "track", 150)
        val personIds = ftsIds(match, "person", 50)

        val tracks = if (trackIds.isEmpty()) emptyList() else query(
            "$TRACK_SQL WHERE t.archived = 0 AND t.id IN (${trackIds.joinToString(",")})",
        ) { trackRow(it) }.sortedBy { trackIds.indexOf(it.id) }

        val people = if (personIds.isEmpty()) emptyList() else query(
            """
            SELECT p.id, p.name FROM people p
            WHERE p.id IN (${personIds.joinToString(",")})
              AND EXISTS (SELECT 1 FROM track_people tp JOIN tracks t ON t.id = tp.track_id
                          WHERE tp.person_id = p.id AND t.archived = 0)
            """.trimIndent(),
        ) { PersonHit(it.getLong(0), it.getString(1)) }.sortedBy { personIds.indexOf(it.id) }

        return SearchResults(tracks, people)
    }

    fun trackDetail(id: Long): TrackDetail? {
        val (track, language, duration) = first(
            "SELECT t.id, t.track_name, a.name, a.id, t.year, t.type, t.favorite, " +
                "l.name, t.duration_seconds " +
                "FROM tracks t JOIN albums a ON a.id = t.album_id " +
                "JOIN languages l ON l.id = t.language_id WHERE t.id = ?",
            arrayOf(id.toString()),
        ) { Triple(trackRow(it), it.getString(7), if (it.isNull(8)) null else it.getInt(8)) }
            ?: return null

        val credits = query(
            "SELECT tp.role, p.id, p.name FROM track_people tp " +
                "JOIN people p ON p.id = tp.person_id " +
                "WHERE tp.track_id = ? ORDER BY tp.position",
            arrayOf(id.toString()),
        ) { Triple(it.getString(0), it.getLong(1), it.getString(2)) }

        return TrackDetail(
            track = track,
            language = language,
            durationSeconds = duration,
            credits = ROLES.associateWith { role ->
                credits.filter { it.first == role }.map { Credit(it.second, it.third) }
            },
        )
    }

    fun personDetail(id: Long): PersonDetail? {
        val name = first("SELECT name FROM people WHERE id = ?", arrayOf(id.toString())) {
            it.getString(0)
        } ?: return null

        val roleCounts = query(
            "SELECT tp.role, COUNT(DISTINCT tp.track_id) FROM track_people tp " +
                "JOIN tracks t ON t.id = tp.track_id AND t.archived = 0 " +
                "WHERE tp.person_id = ? GROUP BY tp.role",
            arrayOf(id.toString()),
        ) { it.getString(0) to it.getInt(1) }.toMap()

        val tracks = query(
            "$TRACK_SQL WHERE t.archived = 0 AND t.id IN " +
                "(SELECT track_id FROM track_people WHERE person_id = ?) " +
                "ORDER BY t.year DESC, t.track_name",
            arrayOf(id.toString()),
        ) { trackRow(it) }

        val tracksByRole = roleCounts.keys.associateWith { role ->
            query(
                "$TRACK_SQL WHERE t.archived = 0 AND t.id IN " +
                    "(SELECT track_id FROM track_people WHERE person_id = ? AND role = ?) " +
                    "ORDER BY t.year DESC, t.track_name",
                arrayOf(id.toString(), role),
            ) { trackRow(it) }
        }

        return PersonDetail(id, name, roleCounts, tracks, tracksByRole)
    }

    fun albumDetail(id: Long): AlbumDetail? {
        val (name, year) = first(
            "SELECT name, year FROM albums WHERE id = ?",
            arrayOf(id.toString()),
        ) { it.getString(0) to it.getInt(1) } ?: return null

        val tracks = query(
            "$TRACK_SQL WHERE t.archived = 0 AND t.album_id = ? ORDER BY t.track_name",
            arrayOf(id.toString()),
        ) { trackRow(it) }

        return AlbumDetail(id, name, year, tracks)
    }

    fun artwork(albumId: Long): ByteArray? = first(
        "SELECT data FROM album_artwork WHERE album_id = ?",
        arrayOf(albumId.toString()),
    ) { it.getBlob(0) }

    fun userVersion(): Int = scalar("PRAGMA user_version")

    override fun close() = db.close()

    private fun ftsIds(match: String, kind: String, limit: Int): List<Long> = query(
        "SELECT ref_id FROM search_index WHERE text MATCH ? AND kind = ? LIMIT $limit",
        arrayOf(match, kind),
    ) { it.getString(0).toLong() }

    private fun scalar(sql: String): Int =
        db.rawQuery(sql, null).use { if (it.moveToFirst()) it.getInt(0) else 0 }

    private fun <T> first(sql: String, args: Array<String>, map: (Cursor) -> T): T? =
        db.rawQuery(sql, args).use { if (it.moveToFirst()) map(it) else null }

    private fun <T> query(sql: String, args: Array<String> = emptyArray(), map: (Cursor) -> T): List<T> =
        db.rawQuery(sql, args).use { c -> buildList { while (c.moveToNext()) add(map(c)) } }

    private fun trackRow(c: Cursor) = TrackRow(
        id = c.getLong(0),
        name = c.getString(1),
        album = c.getString(2),
        albumId = c.getLong(3),
        year = c.getInt(4),
        type = c.getString(5),
        favorite = c.getInt(6) == 1,
    )

    companion object {
        const val SUPPORTED_VERSION = 1

        private const val TRACK_SQL =
            "SELECT t.id, t.track_name, a.name, a.id, t.year, t.type, t.favorite " +
                "FROM tracks t JOIN albums a ON a.id = t.album_id"
        private val NON_WORD = Regex("[^\\p{L}\\p{M}\\p{Nd}]+")

        fun open(file: File): LibraryRepository =
            LibraryRepository(SQLiteDatabase.openDatabase(file.path, null, SQLiteDatabase.OPEN_READONLY))
    }
}

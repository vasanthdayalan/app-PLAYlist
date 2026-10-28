package com.vaslin.playlibrary.data

import android.content.Context
import android.net.Uri
import java.io.File

object LibraryStore {
    private const val FILE_NAME = "library.db"

    fun file(context: Context): File = File(context.filesDir, FILE_NAME)

    fun open(context: Context): LibraryRepository? {
        val file = file(context)
        if (!file.exists() || !isValid(file)) return null
        return LibraryRepository.open(file)
    }

    fun importFrom(context: Context, uri: Uri) {
        val staging = File(context.cacheDir, "import-$FILE_NAME")
        try {
            val input = context.contentResolver.openInputStream(uri)
                ?: error("Could not open the selected file.")
            input.use { src -> staging.outputStream().use { dst -> src.copyTo(dst) } }
            require(isValid(staging)) {
                "This is not a PLAYlist library export for this app version."
            }
            staging.copyTo(file(context), overwrite = true)
        } finally {
            staging.delete()
        }
    }

    private fun isValid(file: File): Boolean = try {
        LibraryRepository.open(file).use { it.userVersion() == LibraryRepository.SUPPORTED_VERSION }
    } catch (e: Exception) {
        false
    }
}

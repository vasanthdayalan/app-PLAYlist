package com.vaslin.playlibrary.ui

import androidx.compose.material3.LocalContentColor
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.darkColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.runtime.CompositionLocalProvider
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.TextStyle
import androidx.compose.material3.LocalTextStyle

private val DarkScheme = darkColorScheme(
    primary = Color(0xFFBCC3FF),
    onPrimary = Color(0xFF1F2A6B),
    primaryContainer = Color(0xFF3A4590),
    onPrimaryContainer = Color(0xFFDDE1FF),
    secondary = Color(0xFFC4C5DD),
    onSecondary = Color(0xFF2D2F42),
    background = Color(0xFF16161D),
    onBackground = Color(0xFFE6E1E9),
    surface = Color(0xFF16161D),
    onSurface = Color(0xFFE6E1E9),
    surfaceVariant = Color(0xFF45464F),
    onSurfaceVariant = Color(0xFFC7C5D0),
    surfaceContainer = Color(0xFF211F26),
    surfaceContainerHigh = Color(0xFF2B2930),
    outline = Color(0xFF918F9A),
)

/** Always dark, fixed palette: readable text on every background, no dynamic color. */
@Composable
fun PlayLibraryTheme(content: @Composable () -> Unit) {
    CompositionLocalProvider(
        LocalContentColor provides DarkScheme.onBackground,
        LocalTextStyle provides TextStyle(color = DarkScheme.onBackground),
    ) {
        MaterialTheme(colorScheme = DarkScheme, content = content)
    }
}

package com.ora.wellbeing.presentation.components

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp

/**
 * Template pour les écrans d'onboarding d'inscription
 * Fournit un layout cohérent avec fond beige Ora
 */
@Composable
fun AuthScreenTemplate(
    modifier: Modifier = Modifier,
    scrollable: Boolean = true,
    content: @Composable ColumnScope.() -> Unit
) {
    Surface(
        modifier = modifier.fillMaxSize(),
        color = MaterialTheme.colorScheme.background // Fond beige chaud #FFF5F0
    ) {
        val columnModifier = if (scrollable) {
            Modifier
                .fillMaxSize()
                .verticalScroll(rememberScrollState())
                .padding(24.dp)
        } else {
            Modifier
                .fillMaxSize()
                .padding(24.dp)
        }

        Column(
            modifier = columnModifier,
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.Center,
            content = content
        )
    }
}

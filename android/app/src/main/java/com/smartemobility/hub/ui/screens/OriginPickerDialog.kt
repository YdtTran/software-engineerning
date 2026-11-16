package com.smartemobility.hub.ui.screens

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.interaction.MutableInteractionSource
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.imePadding
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.statusBarsPadding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardActions
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Close
import androidx.compose.material.icons.filled.MyLocation
import androidx.compose.material.icons.filled.PinDrop
import androidx.compose.material.icons.filled.Search
import androidx.compose.material.icons.outlined.Place
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.OutlinedTextFieldDefaults
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalSoftwareKeyboardController
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.window.Dialog
import androidx.compose.ui.window.DialogProperties
import com.smartemobility.hub.data.model.OriginSource
import com.smartemobility.hub.data.model.SelectedOrigin
import com.smartemobility.hub.data.network.PhotonPlaceSuggestion
import com.smartemobility.hub.ui.components.FeedbackBanner
import com.smartemobility.hub.ui.theme.HubColors

/**
 * Quick origin-picker modal offering 3 choices:
 * 1) Current GPS location, 2) Photon geocoding search, 3) Interactive map tap/crosshair pick.
 */
@Composable
fun OriginPickerDialog(
    currentOrigin: SelectedOrigin,
    suggestions: List<PhotonPlaceSuggestion>,
    isSearching: Boolean,
    errorMessage: String?,
    onDismiss: () -> Unit,
    onSelectGps: () -> Unit,
    onStartMapPick: () -> Unit,
    onSearchQueryChange: (String) -> Unit,
    onSelectSuggestion: (PhotonPlaceSuggestion) -> Unit
) {
    var query by remember { mutableStateOf("") }
    val keyboardController = LocalSoftwareKeyboardController.current

    Dialog(
        onDismissRequest = onDismiss,
        properties = DialogProperties(
            usePlatformDefaultWidth = false,
            decorFitsSystemWindows = false
        )
    ) {
        Box(
            modifier = Modifier.fillMaxSize(),
            contentAlignment = Alignment.TopCenter
        ) {
            // Scrim sibling sits strictly behind the card so taps inside never fall through to dismiss.
            Box(
                modifier = Modifier
                    .fillMaxSize()
                    .background(Color.Black.copy(alpha = 0.25f))
                    .clickable(
                        interactionSource = remember { MutableInteractionSource() },
                        indication = null,
                        onClick = onDismiss
                    )
            )
            Surface(
                shape = RoundedCornerShape(24.dp),
                color = HubColors.CanvasBackground,
                shadowElevation = 14.dp,
                border = BorderStroke(1.dp, HubColors.CardBorder),
                modifier = Modifier
                    .fillMaxWidth()
                    .statusBarsPadding()
                    .imePadding()
                    .padding(horizontal = 16.dp, vertical = 14.dp)
            ) {
                Column(modifier = Modifier.padding(16.dp)) {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Column(modifier = Modifier.weight(1f)) {
                            Text(
                                text = "Chọn vị trí xuất phát",
                                fontSize = 18.sp,
                                fontWeight = FontWeight.Bold,
                                color = HubColors.TextPrimary
                            )
                            Text(
                                text = "Đang dùng: ${currentOrigin.label}",
                                fontSize = 12.sp,
                                color = HubColors.TextSecondary,
                                maxLines = 1,
                                overflow = TextOverflow.Ellipsis
                            )
                        }
                        IconButton(onClick = onDismiss) {
                            Icon(Icons.Filled.Close, contentDescription = "Đóng")
                        }
                    }

                    Spacer(modifier = Modifier.height(10.dp))

                    // Option 1 & Option 3 quick actions
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.spacedBy(8.dp)
                    ) {
                        OriginQuickActionButton(
                            label = "Vị trí GPS hiện tại",
                            icon = Icons.Filled.MyLocation,
                            highlighted = currentOrigin.source == OriginSource.GPS,
                            onClick = onSelectGps,
                            modifier = Modifier.weight(1f)
                        )
                        OriginQuickActionButton(
                            label = "Chọn trên bản đồ",
                            icon = Icons.Filled.PinDrop,
                            highlighted = currentOrigin.source == OriginSource.MAP_PICK,
                            onClick = onStartMapPick,
                            modifier = Modifier.weight(1f)
                        )
                    }

                    Spacer(modifier = Modifier.height(12.dp))
                    Text(
                        text = "Hoặc nhập địa chỉ / địa điểm bất kỳ",
                        fontSize = 12.sp,
                        fontWeight = FontWeight.SemiBold,
                        color = HubColors.TextSecondary
                    )
                    Spacer(modifier = Modifier.height(6.dp))

                    // Option 2: Photon geocoding input (debounced 350ms in ViewModel)
                    Surface(
                        shape = RoundedCornerShape(14.dp),
                        color = Color.White,
                        border = BorderStroke(1.dp, HubColors.CardBorder),
                        modifier = Modifier.fillMaxWidth()
                    ) {
                        OutlinedTextField(
                            value = query,
                            onValueChange = {
                                query = it
                                onSearchQueryChange(it)
                            },
                            placeholder = {
                                Text(
                                    "Ví dụ: Ký túc xá khu B, Suối Tiên...",
                                    fontSize = 13.sp,
                                    color = HubColors.TextMuted
                                )
                            },
                            leadingIcon = {
                                Icon(
                                    imageVector = Icons.Filled.Search,
                                    contentDescription = null,
                                    tint = HubColors.RoyalBlue
                                )
                            },
                            trailingIcon = {
                                when {
                                    isSearching -> CircularProgressIndicator(
                                        modifier = Modifier.size(18.dp),
                                        strokeWidth = 2.dp,
                                        color = HubColors.RoyalBlue
                                    )
                                    query.isNotEmpty() -> IconButton(
                                        onClick = {
                                            query = ""
                                            onSearchQueryChange("")
                                        }
                                    ) {
                                        Icon(Icons.Filled.Close, contentDescription = "Xóa từ khóa")
                                    }
                                }
                            },
                            singleLine = true,
                            keyboardOptions = KeyboardOptions(imeAction = ImeAction.Search),
                            keyboardActions = KeyboardActions(
                                onSearch = { keyboardController?.hide() }
                            ),
                            colors = OutlinedTextFieldDefaults.colors(
                                focusedContainerColor = Color.Transparent,
                                unfocusedContainerColor = Color.Transparent,
                                focusedBorderColor = Color.Transparent,
                                unfocusedBorderColor = Color.Transparent
                            ),
                            modifier = Modifier.fillMaxWidth()
                        )
                    }

                    if (!errorMessage.isNullOrBlank()) {
                        Spacer(modifier = Modifier.height(10.dp))
                        FeedbackBanner(message = errorMessage, isError = true)
                    } else if (suggestions.isNotEmpty()) {
                        Spacer(modifier = Modifier.height(10.dp))
                        Surface(
                            shape = RoundedCornerShape(14.dp),
                            color = Color.White,
                            border = BorderStroke(1.dp, HubColors.CardBorder),
                            modifier = Modifier.fillMaxWidth()
                        ) {
                            LazyColumn(
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .heightIn(max = 260.dp)
                            ) {
                                items(suggestions) { item ->
                                    Row(
                                        modifier = Modifier
                                            .fillMaxWidth()
                                            .clickable {
                                                keyboardController?.hide()
                                                onSelectSuggestion(item)
                                            }
                                            .padding(horizontal = 12.dp, vertical = 10.dp),
                                        verticalAlignment = Alignment.CenterVertically
                                    ) {
                                        Surface(
                                            shape = RoundedCornerShape(10.dp),
                                            color = HubColors.InfoBg,
                                            modifier = Modifier.size(34.dp)
                                        ) {
                                            Box(contentAlignment = Alignment.Center) {
                                                Icon(
                                                    imageVector = Icons.Outlined.Place,
                                                    contentDescription = null,
                                                    tint = HubColors.RoyalBlue,
                                                    modifier = Modifier.size(18.dp)
                                                )
                                            }
                                        }
                                        Spacer(modifier = Modifier.width(10.dp))
                                        Column(modifier = Modifier.weight(1f)) {
                                            Text(
                                                text = item.name,
                                                fontSize = 14.sp,
                                                fontWeight = FontWeight.SemiBold,
                                                color = HubColors.TextPrimary,
                                                maxLines = 1,
                                                overflow = TextOverflow.Ellipsis
                                            )
                                            Text(
                                                text = item.subtitle,
                                                fontSize = 12.sp,
                                                color = HubColors.TextSecondary,
                                                maxLines = 1,
                                                overflow = TextOverflow.Ellipsis
                                            )
                                        }
                                    }
                                    HorizontalDivider(color = HubColors.DividerSubtle.copy(alpha = 0.6f))
                                }
                            }
                        }
                    } else if (query.trim().length >= 2 && !isSearching) {
                        Spacer(modifier = Modifier.height(10.dp))
                        Text(
                            text = "Không tìm thấy địa điểm phù hợp từ Photon. Hãy thử từ khóa khác.",
                            fontSize = 12.sp,
                            color = HubColors.TextSecondary
                        )
                    }
                }
            }
        }
    }
}

@Composable
private fun OriginQuickActionButton(
    label: String,
    icon: androidx.compose.ui.graphics.vector.ImageVector,
    highlighted: Boolean,
    onClick: () -> Unit,
    modifier: Modifier = Modifier
) {
    OutlinedButton(
        onClick = onClick,
        shape = RoundedCornerShape(14.dp),
        border = BorderStroke(
            width = if (highlighted) 1.5.dp else 1.dp,
            color = if (highlighted) HubColors.RoyalBlue else HubColors.CardBorder
        ),
        colors = androidx.compose.material3.ButtonDefaults.outlinedButtonColors(
            containerColor = if (highlighted) HubColors.InfoBg else Color.White,
            contentColor = HubColors.RoyalBlue
        ),
        contentPadding = PaddingValues(horizontal = 10.dp, vertical = 10.dp),
        modifier = modifier
    ) {
        Icon(icon, contentDescription = null, modifier = Modifier.size(16.dp))
        Spacer(modifier = Modifier.width(6.dp))
        Text(
            text = label,
            fontSize = 12.sp,
            fontWeight = FontWeight.SemiBold,
            maxLines = 1,
            overflow = TextOverflow.Ellipsis
        )
    }
}

package com.smartemobility.hub.ui.components

import androidx.compose.foundation.layout.navigationBarsPadding
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Home
import androidx.compose.material.icons.filled.Map
import androidx.compose.material.icons.filled.Notifications
import androidx.compose.material.icons.filled.Person
import androidx.compose.material.icons.outlined.Home
import androidx.compose.material.icons.outlined.Map
import androidx.compose.material.icons.outlined.Notifications
import androidx.compose.material.icons.outlined.Person
import androidx.compose.material3.Badge
import androidx.compose.material3.BadgedBox
import androidx.compose.material3.Icon
import androidx.compose.material3.NavigationBar
import androidx.compose.material3.NavigationBarItem
import androidx.compose.material3.NavigationBarItemDefaults
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.smartemobility.hub.ui.theme.HubColors

enum class MainTab(
    val label: String,
    val selectedIcon: ImageVector,
    val unselectedIcon: ImageVector
) {
    HOME("Trang chủ", Icons.Filled.Home, Icons.Outlined.Home),
    MAP("Bản đồ", Icons.Filled.Map, Icons.Outlined.Map),
    NOTIFICATIONS("Thông báo", Icons.Filled.Notifications, Icons.Outlined.Notifications),
    ACCOUNT("Tài khoản", Icons.Filled.Person, Icons.Outlined.Person)
}

@Composable
fun HubBottomNavBar(
    currentTab: MainTab,
    notificationCount: Int,
    onSelectTab: (MainTab) -> Unit
) {
    NavigationBar(
        containerColor = HubColors.NavBarBackground,
        tonalElevation = 0.dp,
        modifier = Modifier.navigationBarsPadding()
    ) {
        MainTab.entries.forEach { tab ->
            val selected = currentTab == tab
            NavigationBarItem(
                selected = selected,
                onClick = { onSelectTab(tab) },
                icon = {
                    val icon = if (selected) tab.selectedIcon else tab.unselectedIcon
                    if (tab == MainTab.NOTIFICATIONS && notificationCount > 0) {
                        BadgedBox(
                            badge = {
                                Badge { Text(notificationCount.coerceAtMost(99).toString()) }
                            }
                        ) {
                            Icon(imageVector = icon, contentDescription = tab.label)
                        }
                    } else {
                        Icon(imageVector = icon, contentDescription = tab.label)
                    }
                },
                label = {
                    Text(
                        text = tab.label,
                        fontSize = 12.sp,
                        fontWeight = if (selected) FontWeight.SemiBold else FontWeight.Normal
                    )
                },
                colors = NavigationBarItemDefaults.colors(
                    selectedIconColor = HubColors.NavActiveContent,
                    selectedTextColor = HubColors.TextPrimary,
                    indicatorColor = HubColors.NavActivePill,
                    unselectedIconColor = HubColors.NavInactiveContent,
                    unselectedTextColor = HubColors.NavInactiveContent
                )
            )
        }
    }
}

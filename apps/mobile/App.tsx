import { useEffect } from "react";
import { StatusBar } from "expo-status-bar";
import { NavigationContainer, DarkTheme } from "@react-navigation/native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { Ionicons } from "@expo/vector-icons";
import { ActivityIndicator, View } from "react-native";
import { colors } from "./src/theme/colors";
import { AuthProvider, useAuth } from "./src/lib/auth";
import { registerForPushNotifications } from "./src/lib/pushNotifications";
import { LoginScreen } from "./src/screens/LoginScreen";
import { StatusScreen } from "./src/screens/StatusScreen";
import { MapScreen } from "./src/screens/MapScreen";
import { DashboardScreen } from "./src/screens/DashboardScreen";
import { AlertsScreen } from "./src/screens/AlertsScreen";
import { SettingsScreen } from "./src/screens/SettingsScreen";

const Tab = createBottomTabNavigator();

const TAB_ICONS: Record<string, keyof typeof Ionicons.glyphMap> = {
  Status: "list",
  Map: "map",
  Dashboard: "grid",
  Alerts: "notifications",
  Settings: "settings",
};

const navTheme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    background: colors.background,
    card: colors.surface,
    border: colors.border,
    primary: colors.primary,
    text: colors.foreground,
  },
};

function FleetTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.muted,
        tabBarStyle: { backgroundColor: colors.surface, borderTopColor: colors.border },
        tabBarIcon: ({ color, size }) => (
          <Ionicons name={TAB_ICONS[route.name]} color={color} size={size} />
        ),
      })}
    >
      <Tab.Screen name="Status" component={StatusScreen} />
      <Tab.Screen name="Map" component={MapScreen} />
      <Tab.Screen name="Dashboard" component={DashboardScreen} />
      <Tab.Screen name="Alerts" component={AlertsScreen} />
      <Tab.Screen name="Settings" component={SettingsScreen} />
    </Tab.Navigator>
  );
}

function Root() {
  const { user, isLoading } = useAuth();

  useEffect(() => {
    if (user) registerForPushNotifications();
  }, [user]);

  if (isLoading) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: colors.background }}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  return user ? <FleetTabs /> : <LoginScreen />;
}

export default function App() {
  return (
    <AuthProvider>
      <NavigationContainer theme={navTheme}>
        <Root />
        <StatusBar style="light" />
      </NavigationContainer>
    </AuthProvider>
  );
}

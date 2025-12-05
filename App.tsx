// App.tsx
import React, { useEffect, useState } from "react";
import { View, ActivityIndicator, StyleSheet } from "react-native";
import { StatusBar } from "expo-status-bar";
import { NavigationContainer } from "@react-navigation/native";

import { RootNavigator } from "./src/navigation/RootNavigator";
import { initDatabase } from "./src/db/sqlite";
import { COLORS } from "./theme";

export default function App() {
  const [dbReady, setDbReady] = useState(false);

  useEffect(() => {
    // Initialize SQLite tables once on app startup
    initDatabase()
      .then(() => {
        setDbReady(true);
      })
      .catch((error) => {
        console.error("Failed to initialize database", error);
        // Even if DB init fails, we can still let the app render
        setDbReady(true);
      });
  }, []);

  if (!dbReady) {
    // Simple full-screen loading state while DB is preparing
    return (
      <View style={styles.loadingRoot}>
        <StatusBar style="light" />
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  return (
    <>
      <StatusBar style="light" />
      <NavigationContainer>
        <RootNavigator />
      </NavigationContainer>
    </>
  );
}

const styles = StyleSheet.create({
  loadingRoot: {
    flex: 1,
    backgroundColor: COLORS.background,
    alignItems: "center",
    justifyContent: "center",
  },
});

// src/screens/HomeScreen.tsx
import React from "react";
import {
  View,
  Text,
  StyleSheet,
  Platform,
  ScrollView,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";

import { COLORS } from "../../theme";
import { ActionCard } from "../components/ActionCard";
import type { RootStackParamList } from "../navigation/RootNavigator";

type HomeScreenNavProp = NativeStackNavigationProp<
  RootStackParamList,
  "Home"
>;

export const HomeScreen: React.FC = () => {
  const navigation = useNavigation<HomeScreenNavProp>();

  return (
    <View style={styles.root}>
      {/* Top header bar with primary brand color */}
      <View style={styles.header}>
        <Text style={styles.appTitle}>Cadet TRB</Text>
        <Text style={styles.appSubtitle}>Cadet Training Record Book</Text>
      </View>

      {/* Scrollable content area */}
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.welcome}>Welcome, Cadet</Text>
        <Text style={styles.description}>
          This will become your digital Training Record Book for documenting
          sea service, tasks, watchkeeping and reviews.
        </Text>

        {/* Quick actions stacked vertically */}
        <View style={styles.actionsColumn}>
          <ActionCard
            title="Cadet Profile"
            description="Manage your personal, academy and emergency contact details."
            onPress={() => navigation.navigate("Profile")}
          />
          <View style={styles.actionGap} />
          <ActionCard
            title="(1) Sea Service"
            description="View and record sign-on / sign-off and voyage details."
            onPress={() => navigation.navigate("SeaService")}
          />
          <View style={styles.actionGap} />
          <ActionCard
            title="(2) Tasks & Competence"
            description="Complete mandatory training tasks and request sign-off."
            onPress={() => navigation.navigate("Tasks")}
          />
          <View style={styles.actionGap} />
          <ActionCard
            title="(3) Diary & Watchkeeping"
            description="Log daily activities and bridge/engine watches."
            onPress={() => navigation.navigate("Diary")}
          />
        </View>

        {/* Info card */}
        <View style={styles.placeholderCard}>
          <Text style={styles.cardTitle}>Next Steps</Text>
          <Text style={styles.cardText}>
            • We will add structured TRB tasks linked to STCW{"\n"}
            • Then we will connect diary & watchkeeping logs{"\n"}
            • Finally, we will plug in evidence, signatures and PDF export
          </Text>
        </View>

        <Text style={styles.footerNote}>
          For now, this is still an offline-first prototype. All data is stored
          locally in SQLite on your device.
        </Text>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    paddingTop: Platform.OS === "android" ? 40 : 20,
    paddingBottom: 16,
    paddingHorizontal: 24,
    backgroundColor: COLORS.primary,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "rgba(0,0,0,0.15)",
  },
  appTitle: {
    fontSize: 26,
    fontWeight: "700",
    color: COLORS.textOnPrimary,
  },
  appSubtitle: {
    marginTop: 4,
    fontSize: 14,
    color: "rgba(255,255,255,0.85)",
  },
  content: {
    paddingHorizontal: 24,
    paddingVertical: 20,
    paddingBottom: 40,
  },
  welcome: {
    fontSize: 22,
    fontWeight: "600",
    color: COLORS.textOnDark,
    marginBottom: 8,
  },
  description: {
    fontSize: 15,
    lineHeight: 22,
    color: COLORS.textOnDark,
    marginBottom: 20,
    maxWidth: 700,
  },
  actionsColumn: {
    marginBottom: 24,
  },
  actionGap: {
    height: 12,
  },
  placeholderCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
    maxWidth: 700,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: COLORS.textOnDark,
    marginBottom: 8,
  },
  cardText: {
    fontSize: 14,
    lineHeight: 20,
    color: COLORS.textOnDark,
  },
  footerNote: {
    marginTop: 16,
    fontSize: 12,
    color: COLORS.textMuted,
  },
});

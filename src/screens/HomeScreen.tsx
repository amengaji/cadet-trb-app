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
        <View>
          <Text style={styles.appTitle}>Cadet TRB</Text>
          <Text style={styles.appSubtitle}>Cadet Training Record Book</Text>
        </View>

        <View style={styles.headerRight}>
          <Text style={styles.headerMode}>Cadet mode</Text>
        </View>
      </View>

      {/* Scrollable content area */}
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.welcome}>Welcome, Cadet</Text>
        <Text style={styles.description}>
          This will become your digital Training Record Book for documenting
          sea service, tasks, watchkeeping and reviews.
        </Text>

        {/* Section label */}
        <Text style={styles.sectionLabel}>Record book sections</Text>

        {/* Quick actions stacked vertically */}
        <View style={styles.actionsColumn}>
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
            • We will add navigation to full detail screens{"\n"}
            • Then we will connect it to an offline database{"\n"}
            • Finally, we will plug in sync, evidence, and signatures
          </Text>
        </View>

        <Text style={styles.footerNote}>
          This is an early shell of the Cadet app UI. All content is local and
          static for now — we&apos;ll introduce real data and offline storage
          next.
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
    paddingBottom: 12,
    paddingHorizontal: 24,
    backgroundColor: COLORS.primary,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "rgba(0,0,0,0.15)",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
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
  headerRight: {
    alignItems: "flex-end",
  },
  headerMode: {
    fontSize: 12,
    color: "rgba(255,255,255,0.9)",
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
  sectionLabel: {
    fontSize: 12,
    fontWeight: "600",
    letterSpacing: 1,
    textTransform: "uppercase",
    color: COLORS.textMuted,
    marginBottom: 8,
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

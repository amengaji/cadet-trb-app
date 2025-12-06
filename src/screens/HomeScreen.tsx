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
import TRBHeader from "../components/TRBHeader";

type HomeNavProp = NativeStackNavigationProp<RootStackParamList, "Home">;

  const HomeScreen: React.FC = () => {
  const navigation = useNavigation<HomeNavProp>();

  return (
    <View style={styles.root}>
      {/* NEW: Global TRB Header (no double headers) */}
      <TRBHeader
        title="Cadet TRB"
        subtitle="Training Record Book Dashboard"
        showBack={false}
        showHome={false}
      />

      {/* Scrollable content */}
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.welcome}>Welcome, Cadet</Text>
        <Text style={styles.description}>
          This will become your digital Training Record Book for documenting
          sea service, tasks, watchkeeping and reviews.
        </Text>

        {/* Quick Actions */}
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

          <View style={styles.actionGap} />

          <ActionCard
            title="(4) Cadet Profile"
            description="Maintain your personal and academy details for the TRB."
            onPress={() => navigation.navigate("CadetProfile")}
          />
        </View>

        {/* Info Card */}
        <View style={styles.placeholderCard}>
          <Text style={styles.cardTitle}>Next Steps</Text>
          <Text style={styles.cardText}>
            • Add evidence & signatures to tasks{"\n"}
            • Add officer / Master review workflows{"\n"}
            • Add cloud sync and PDF export{"\n"}
          </Text>
        </View>

        <Text style={styles.footerNote}>
          For now, these sections are local-only and offline-first. This mirrors
          a paper TRB, but on a tablet or phone.
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
  content: {
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 40,
    maxWidth: 900,
    width: "100%",
    alignSelf: "center",
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
    marginBottom: 12,
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
    marginTop: 8,
    fontSize: 12,
    color: COLORS.textMuted,
  },
});

export default HomeScreen;

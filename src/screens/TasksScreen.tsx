// src/screens/TasksScreen.tsx
import React from "react";
import {
  View,
  Text,
  StyleSheet,
  Platform,
  ScrollView,
  TouchableOpacity,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { COLORS } from "../../theme";
import type { RootStackParamList } from "../navigation/RootNavigator";

type TasksNavProp = NativeStackNavigationProp<RootStackParamList, "Tasks">;

export const TasksScreen: React.FC = () => {
  const navigation = useNavigation<TasksNavProp>();

  const handleBack = () => {
    if (navigation.canGoBack()) {
      navigation.goBack();
    } else {
      navigation.navigate("Home");
    }
  };

  return (
    <View style={styles.root}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={handleBack} style={styles.backButton}>
          <Text style={styles.backArrow}>←</Text>
          <Text style={styles.backText}>Home</Text>
        </TouchableOpacity>

        <View style={styles.headerTitles}>
          <Text style={styles.appTitle}>Cadet TRB</Text>
          <Text style={styles.appSubtitle}>Tasks & Competence</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.heading}>Tasks & Competence</Text>
        <Text style={styles.text}>
          This screen will manage your mandatory training tasks, their status
          (Pending / Submitted / Verified / Approved) and evidence.
        </Text>

        <View style={styles.placeholderBox}>
          <Text style={styles.placeholderTitle}>Coming soon</Text>
          <Text style={styles.placeholderText}>
            • Task list grouped by STCW function{"\n"}
            • Task detail with evidence and reflection{"\n"}
            • Submit for verification workflow
          </Text>
        </View>
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
  },
  backButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 4,
    paddingRight: 16,
  },
  backArrow: {
    fontSize: 18,
    color: COLORS.textOnPrimary,
    marginRight: 4,
  },
  backText: {
    fontSize: 14,
    color: COLORS.textOnPrimary,
  },
  headerTitles: {
    flex: 1,
  },
  appTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: COLORS.textOnPrimary,
  },
  appSubtitle: {
    marginTop: 2,
    fontSize: 13,
    color: "rgba(255,255,255,0.85)",
  },
  content: {
    paddingHorizontal: 24,
    paddingVertical: 20,
    paddingBottom: 40,
  },
  heading: {
    fontSize: 20,
    fontWeight: "600",
    color: COLORS.textOnDark,
    marginBottom: 8,
  },
  text: {
    fontSize: 14,
    lineHeight: 20,
    color: COLORS.textOnDark,
    marginBottom: 20,
    maxWidth: 700,
  },
  placeholderBox: {
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
    maxWidth: 700,
  },
  placeholderTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: COLORS.textOnDark,
    marginBottom: 6,
  },
  placeholderText: {
    fontSize: 14,
    lineHeight: 20,
    color: COLORS.textOnDark,
  },
});

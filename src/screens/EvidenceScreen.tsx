// src/screens/EvidenceScreen.tsx
import React from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from "react-native";
import { useRoute } from "@react-navigation/native";
import EvidenceThumbnail from "../components/EvidenceThumbnail";
import TRBHeader from "../components/TRBHeader";


const EvidenceScreen: React.FC = () => {
  const route = useRoute<any>();
  const taskId: string = route.params?.taskId || "unknown";

  const evidence = [
    { id: "1", uri: "", caption: "PPE check (demo)" },
    { id: "2", uri: "", caption: "Bridge console (demo)" },
  ];

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Text style={styles.header}>Evidence for Task</Text>
        <Text style={styles.subHeader}>Task ID: {taskId}</Text>

        <View style={styles.evidenceRow}>
          {evidence.map((item) => (
            <EvidenceThumbnail
              key={item.id}
              uri={item.uri}
              caption={item.caption}
            />
          ))}
        </View>

        <View style={styles.actions}>
          <TouchableOpacity style={[styles.button, styles.primaryButton]}>
            <Text style={styles.primaryButtonText}>Add Photo</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.button, styles.secondaryButton]}>
            <Text style={styles.secondaryButtonText}>
              Add Note / Document
            </Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.infoText}>
          This is a placeholder screen. Later we will connect it to real file
          storage and SQLite.
        </Text>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F9FAFB" },
  scrollContent: { padding: 16, paddingBottom: 24 },
  header: {
    fontSize: 16,
    fontWeight: "700",
    color: "#111827",
  },
  subHeader: {
    fontSize: 12,
    color: "#4B5563",
    marginTop: 2,
    marginBottom: 12,
  },
  evidenceRow: {
    flexDirection: "row",
    marginBottom: 16,
  },
  actions: {
    flexDirection: "column",
  },
  button: {
    borderRadius: 999,
    paddingVertical: 10,
    alignItems: "center",
    marginBottom: 8,
  },
  primaryButton: { backgroundColor: "#2563EB" },
  primaryButtonText: { color: "white", fontWeight: "600", fontSize: 13 },
  secondaryButton: { backgroundColor: "#EFF6FF" },
  secondaryButtonText: { color: "#1D4ED8", fontWeight: "600", fontSize: 13 },
  infoText: {
    marginTop: 16,
    fontSize: 12,
    color: "#6B7280",
  },
});

export default EvidenceScreen;

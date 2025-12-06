// src/screens/SyncScreen.tsx
import React from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import TRBHeader from "../components/TRBHeader";


const SyncScreen: React.FC = () => {
  const [lastSync, setLastSync] = React.useState<string>("Never");

  const handleSync = () => {
    const now = new Date().toLocaleString();
    setLastSync(now);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Sync & Status</Text>
      <Text style={styles.label}>Last sync:</Text>
      <Text style={styles.value}>{lastSync}</Text>

      <TouchableOpacity style={styles.button} onPress={handleSync}>
        <Text style={styles.buttonText}>Sync Now</Text>
      </TouchableOpacity>

      <Text style={styles.infoText}>
        This will later upload your pending changes and download officer
        approvals.
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F9FAFB",
    padding: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 12,
  },
  label: {
    fontSize: 13,
    color: "#4B5563",
  },
  value: {
    fontSize: 14,
    fontWeight: "600",
    color: "#111827",
    marginBottom: 16,
  },
  button: {
    borderRadius: 999,
    backgroundColor: "#2563EB",
    paddingVertical: 10,
    alignItems: "center",
    marginBottom: 16,
  },
  buttonText: {
    color: "white",
    fontWeight: "600",
    fontSize: 14,
  },
  infoText: {
    fontSize: 12,
    color: "#6B7280",
  },
});

export default SyncScreen;

// src/screens/TaskDetailScreen.tsx
import React from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
} from "react-native";
import { useRoute, useNavigation } from "@react-navigation/native";
import StatusPill from "../components/StatusPill";
import TRBHeader from "../components/TRBHeader";


type TaskDetailRouteParams = {
  task: {
    id: string;
    code: string;
    title: string;
    sectionName?: string;
    status?: string;
    description?: string;
  };
};

const TaskDetailScreen: React.FC = () => {
  const route = useRoute<any>();
  const navigation = useNavigation<any>();

  const task: TaskDetailRouteParams["task"] =
    route.params?.task || ({
      id: "demo",
      code: "NAV-01.03",
      title: "Keep a safe navigational watch",
      sectionName: "Navigation & Watchkeeping",
      status: "in_progress",
      description:
        "Demonstrate ability to keep a safe navigational watch under supervision.",
    } as any);

  const [notes, setNotes] = React.useState("");

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <View style={{ flex: 1 }}>
            <Text style={styles.code}>{task.code}</Text>
            <Text style={styles.title}>{task.title}</Text>
            {!!task.sectionName && (
              <Text style={styles.sectionName}>{task.sectionName}</Text>
            )}
          </View>
          <StatusPill status={task.status} />
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Task Description</Text>
          <Text style={styles.cardBody}>
            {task.description || "No description available."}
          </Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Your Attempt</Text>
          <Text style={styles.fieldLabel}>What did you do?</Text>
          <TextInput
            style={styles.textArea}
            multiline
            placeholder="Describe what you did for this task..."
            value={notes}
            onChangeText={setNotes}
          />
          <View style={styles.buttonRow}>
            <TouchableOpacity
              style={[styles.button, styles.secondaryButton]}
              onPress={() => navigation.navigate("Evidence", { taskId: task.id })}
            >
              <Text style={styles.secondaryButtonText}>Add Evidence</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.button, styles.primaryButton]}>
              <Text style={styles.primaryButtonText}>Mark Completed</Text>
            </TouchableOpacity>
          </View>
          <TouchableOpacity style={styles.fullWidthOutlineButton}>
            <Text style={styles.outlineButtonText}>Send for Verification</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.cardMuted}>
          <Text style={styles.cardTitle}>Officer Review</Text>
          <Text style={styles.mutedText}>
            Once an officer verifies this task, their name, comments and
            signature will appear here.
          </Text>
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F9FAFB" },
  scrollContent: { padding: 16, paddingBottom: 32 },
  header: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 16,
  },
  code: {
    fontSize: 12,
    fontWeight: "700",
    color: "#1D4ED8",
    marginBottom: 2,
  },
  title: {
    fontSize: 16,
    fontWeight: "700",
    color: "#111827",
  },
  sectionName: {
    fontSize: 12,
    color: "#6B7280",
    marginTop: 2,
  },
  card: {
    backgroundColor: "white",
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  cardMuted: {
    backgroundColor: "#F3F4F6",
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#111827",
    marginBottom: 6,
  },
  cardBody: {
    fontSize: 13,
    color: "#374151",
  },
  fieldLabel: {
    fontSize: 12,
    fontWeight: "500",
    color: "#4B5563",
    marginBottom: 4,
    marginTop: 8,
  },
  textArea: {
    minHeight: 80,
    borderWidth: 1,
    borderColor: "#D1D5DB",
    borderRadius: 8,
    padding: 8,
    fontSize: 13,
    textAlignVertical: "top",
    backgroundColor: "white",
  },
  buttonRow: {
    flexDirection: "row",
    marginTop: 12,
  },
  button: {
    flex: 1,
    borderRadius: 999,
    paddingVertical: 10,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 8,
  },
  primaryButton: { backgroundColor: "#2563EB" },
  primaryButtonText: { color: "white", fontWeight: "600", fontSize: 13 },
  secondaryButton: { backgroundColor: "#EFF6FF" },
  secondaryButtonText: { color: "#1D4ED8", fontWeight: "600", fontSize: 13 },
  fullWidthOutlineButton: {
    marginTop: 10,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#2563EB",
    paddingVertical: 10,
    alignItems: "center",
  },
  outlineButtonText: {
    color: "#2563EB",
    fontWeight: "600",
    fontSize: 13,
  },
  mutedText: {
    fontSize: 12,
    color: "#6B7280",
  },
});

export default TaskDetailScreen;

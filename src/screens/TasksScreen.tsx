// src/screens/TasksScreen.tsx
import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Platform,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";

import { COLORS } from "../../theme";
import type { RootStackParamList } from "../navigation/RootNavigator";
import { getAll, run } from "../db/sqlite";
import type {
  CadetStream,
  TrainingTaskWithProgress,
  TaskStatus,
} from "../models/crb";

type TasksNavProp = NativeStackNavigationProp<RootStackParamList, "Tasks">;

type SectionFilter = "ALL" | "NAV" | "CARGO" | "SAFETY" | "LIFE";
type StatusFilter = "ALL" | TaskStatus;

const SECTION_LABELS: Record<SectionFilter, string> = {
  ALL: "All sections",
  NAV: "Navigation & watch",
  CARGO: "Cargo & ballast",
  SAFETY: "Safety & emergency",
  LIFE: "Shipboard life",
};

const STATUS_LABELS: Record<StatusFilter, string> = {
  ALL: "All",
  PENDING: "Pending",
  SUBMITTED: "Submitted",
  VERIFIED: "Verified",
  APPROVED: "Approved",
};

const CURRENT_CADET_ID = "cadet-001";
const CURRENT_STREAM: CadetStream = "DECK";

export const TasksScreen: React.FC = () => {
  const navigation = useNavigation<TasksNavProp>();

  const [loading, setLoading] = useState(true);
  const [tasks, setTasks] = useState<TrainingTaskWithProgress[]>([]);
  const [sectionFilter, setSectionFilter] = useState<SectionFilter>("ALL");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("ALL");
  const [savingTaskId, setSavingTaskId] = useState<string | null>(null);

  const handleBack = () => {
    if (navigation.canGoBack()) {
      navigation.goBack();
    } else {
      navigation.navigate("Home");
    }
  };

  useEffect(() => {
    let isMounted = true;

    const init = async () => {
      try {
        await ensureSampleTasks(CURRENT_CADET_ID, CURRENT_STREAM);
        const loaded = await loadTasksForCadet(CURRENT_CADET_ID, CURRENT_STREAM);
        if (isMounted) {
          setTasks(loaded);
        }
      } catch (error) {
        console.error("Error loading tasks", error);
        Alert.alert("Error", "Could not load tasks. See console for details.");
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    init();

    return () => {
      isMounted = false;
    };
  }, []);

  const refreshTasks = async () => {
    const loaded = await loadTasksForCadet(CURRENT_CADET_ID, CURRENT_STREAM);
    setTasks(loaded);
  };

  const updateTaskLocally = (
    taskId: string,
    updater: (t: TrainingTaskWithProgress) => TrainingTaskWithProgress
  ) => {
    setTasks((prev) =>
      prev.map((t) => (t.template.id === taskId ? updater(t) : t))
    );
  };

  const handleToggleStatus = async (task: TrainingTaskWithProgress) => {
    const currentStatus = task.progress.status;
    const nextStatus: TaskStatus =
      currentStatus === "PENDING" ? "SUBMITTED" : "PENDING";

    try {
      setSavingTaskId(task.template.id);
      const now = new Date().toISOString();

      if (task.progress.id) {
        await run(
          `
          UPDATE training_task_progress
          SET status = ?, last_status_change_at = ?, updated_at = ?
          WHERE id = ?;
        `,
          [nextStatus, now, now, task.progress.id]
        );
      } else {
        const newId = `taskprog-${Date.now()}`;
        await run(
          `
          INSERT INTO training_task_progress (
            id,
            cadet_id,
            template_id,
            status,
            last_status_change_at,
            created_at,
            updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?);
        `,
          [newId, CURRENT_CADET_ID, task.template.id, nextStatus, now, now, now]
        );
      }

      await refreshTasks();
    } catch (error) {
      console.error("Error updating task status", error);
      Alert.alert(
        "Error",
        "Could not update task status. See console for details."
      );
    } finally {
      setSavingTaskId(null);
    }
  };

  const handleSaveReflection = async (
    task: TrainingTaskWithProgress,
    reflectionText: string
  ) => {
    try {
      setSavingTaskId(task.template.id);
      const now = new Date().toISOString();

      if (task.progress.id) {
        // Update existing progress row
        await run(
          `
          UPDATE training_task_progress
          SET reflection_text = ?, updated_at = ?
          WHERE id = ?;
        `,
          [reflectionText.trim() || null, now, task.progress.id]
        );
      } else {
        // Create a progress row if it doesn't exist yet
        const newId = `taskprog-${Date.now()}`;
        await run(
          `
          INSERT INTO training_task_progress (
            id,
            cadet_id,
            template_id,
            status,
            reflection_text,
            last_status_change_at,
            created_at,
            updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?);
        `,
          [
            newId,
            CURRENT_CADET_ID,
            task.template.id,
            "PENDING",
            reflectionText.trim() || null,
            now,
            now,
            now,
          ]
        );
      }

      // Reload from DB so UI always reflects persisted state
      await refreshTasks();

      Alert.alert("Saved", "Reflection saved for this task.");
    } catch (error) {
      console.error("Error saving reflection", error);
      Alert.alert(
        "Error",
        "Could not save reflection. See console for details."
      );
    } finally {
      setSavingTaskId(null);
    }
  };


  const filteredTasks = tasks.filter((t) => {
    if (sectionFilter !== "ALL" && t.template.sectionCode !== sectionFilter) {
      return false;
    }
    if (statusFilter !== "ALL" && t.progress.status !== statusFilter) {
      return false;
    }
    return true;
  });

  const totalTasks = tasks.length;
  const submittedCount = tasks.filter(
    (t) => t.progress.status === "SUBMITTED"
  ).length;
  const verifiedCount = tasks.filter(
    (t) => t.progress.status === "VERIFIED"
  ).length;
  const approvedCount = tasks.filter(
    (t) => t.progress.status === "APPROVED"
  ).length;

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

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>Loading tasks...</Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.content}>
          {/* Summary strip */}
          <View style={styles.summaryStrip}>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryLabel}>Total tasks</Text>
              <Text style={styles.summaryValue}>{totalTasks}</Text>
            </View>
            <View style={styles.summaryDivider} />
            <View style={styles.summaryItem}>
              <Text style={styles.summaryLabel}>Submitted</Text>
              <Text style={styles.summaryValue}>{submittedCount}</Text>
            </View>
            <View style={styles.summaryDivider} />
            <View style={styles.summaryItem}>
              <Text style={styles.summaryLabel}>Verified / Approved</Text>
              <Text style={styles.summaryValue}>
                {verifiedCount + approvedCount}
              </Text>
            </View>
          </View>

          <Text style={styles.heading}>Practical training tasks</Text>
          <Text style={styles.text}>
            These tasks mirror a traditional Training Record Book. As a cadet
            you complete each task, write a brief reflection, and mark it as
            submitted. Later, an officer and the Master will verify and approve
            them in the ship / admin interfaces.
          </Text>

          {/* Filters */}
          <Text style={styles.filterLabel}>Section</Text>
          <View style={styles.chipRow}>
            {(["ALL", "NAV", "CARGO", "SAFETY", "LIFE"] as SectionFilter[]).map(
              (section) => {
                const isActive = sectionFilter === section;
                return (
                  <TouchableOpacity
                    key={section}
                    style={[
                      styles.chip,
                      isActive && styles.chipActive,
                    ]}
                    onPress={() => setSectionFilter(section)}
                  >
                    <Text
                      style={[
                        styles.chipText,
                        isActive && styles.chipTextActive,
                      ]}
                    >
                      {SECTION_LABELS[section]}
                    </Text>
                  </TouchableOpacity>
                );
              }
            )}
          </View>

          <Text style={styles.filterLabel}>Status</Text>
          <View style={styles.chipRow}>
            {(["ALL", "PENDING", "SUBMITTED", "VERIFIED", "APPROVED"] as StatusFilter[]).map(
              (status) => {
                const isActive = statusFilter === status;
                return (
                  <TouchableOpacity
                    key={status}
                    style={[
                      styles.chipSmall,
                      isActive && styles.chipActive,
                    ]}
                    onPress={() => setStatusFilter(status)}
                  >
                    <Text
                      style={[
                        styles.chipTextSmall,
                        isActive && styles.chipTextActive,
                      ]}
                    >
                      {STATUS_LABELS[status]}
                    </Text>
                  </TouchableOpacity>
                );
              }
            )}
          </View>

          {/* Task cards */}
          {filteredTasks.length === 0 ? (
            <View style={styles.emptyBox}>
              <Text style={styles.emptyTitle}>No tasks match this filter</Text>
              <Text style={styles.emptyText}>
                Try changing the section or status filter above.
              </Text>
            </View>
          ) : (
            <View style={styles.listContainer}>
              {filteredTasks.map((task) => {
                const isSaving = savingTaskId === task.template.id;
                return (
                  <TaskCard
                    key={task.template.id}
                    task={task}
                    onToggleStatus={() => handleToggleStatus(task)}
                    onSaveReflection={(text) =>
                      handleSaveReflection(task, text)
                    }
                    isSaving={isSaving}
                  />
                );
              })}
            </View>
          )}
        </ScrollView>
      )}
    </View>
  );
};

// ----- Task card component -----
// ----- Task card component -----

type TaskCardProps = {
  task: TrainingTaskWithProgress;
  onToggleStatus: () => void;
  onSaveReflection: (text: string) => void;
  isSaving: boolean;
};

const TaskCard: React.FC<TaskCardProps> = ({
  task,
  onToggleStatus,
  onSaveReflection,
  isSaving,
}) => {
  const [reflectionDraft, setReflectionDraft] = useState(
    task.progress.reflectionText ?? ""
  );

  // Keep the text field in sync with DB whenever the task's reflection changes
  useEffect(() => {
    setReflectionDraft(task.progress.reflectionText ?? "");
  }, [task.progress.reflectionText]);

  const status = task.progress.status;
  const statusLabel = STATUS_LABELS[status];
  const isSubmittedOrAbove = status !== "PENDING";

  const statusStyle =
    status === "APPROVED"
      ? styles.statusApproved
      : status === "VERIFIED"
      ? styles.statusVerified
      : status === "SUBMITTED"
      ? styles.statusSubmitted
      : styles.statusPending;

  const statusTextStyle =
    status === "APPROVED"
      ? styles.statusApprovedText
      : status === "VERIFIED"
      ? styles.statusVerifiedText
      : status === "SUBMITTED"
      ? styles.statusSubmittedText
      : styles.statusPendingText;

  const handleSavePress = () => {
    onSaveReflection(reflectionDraft);
  };

  return (
    <View style={styles.taskCard}>
      <View style={styles.taskHeaderRow}>
        <View style={{ flex: 1 }}>
          <Text style={styles.taskTitle}>{task.template.title}</Text>
          <Text style={styles.taskSubtitle}>
            {task.template.sectionCode === "NAV"
              ? "Navigation & watchkeeping"
              : task.template.sectionCode === "CARGO"
              ? "Cargo & ballast operations"
              : task.template.sectionCode === "SAFETY"
              ? "Safety & emergency"
              : "Shipboard life / misc."}
            {task.template.isMandatory ? " • Mandatory" : ""}
          </Text>
        </View>
        <View style={[styles.statusPill, statusStyle]}>
          <Text style={statusTextStyle}>{statusLabel}</Text>
        </View>
      </View>

      <Text style={styles.taskDescription}>{task.template.description}</Text>

      <Text style={styles.reflectionLabel}>
        Reflection (what you did / learnt)
      </Text>
      <TextInput
        style={styles.reflectionInput}
        placeholder="Example: Assisted 2/O with fixing position using radar ranges; learned how to check parallel index..."
        placeholderTextColor={COLORS.textMuted}
        value={reflectionDraft}
        onChangeText={setReflectionDraft}
        multiline
      />

      <View style={styles.taskActionsRow}>
        <TouchableOpacity
          style={[styles.taskButton, styles.taskButtonSecondary]}
          onPress={handleSavePress}
          disabled={isSaving}
        >
          <Text style={styles.taskButtonSecondaryText}>
            {isSaving ? "Saving..." : "Save reflection"}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.taskButton,
            isSubmittedOrAbove
              ? styles.taskButtonDangerOutline
              : styles.taskButtonPrimary,
          ]}
          onPress={onToggleStatus}
          disabled={isSaving}
        >
          <Text
            style={
              isSubmittedOrAbove
                ? styles.taskButtonDangerOutlineText
                : styles.taskButtonPrimaryText
            }
          >
            {status === "PENDING"
              ? "Mark as submitted"
              : "Mark as pending"}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};


// ----- Data helpers -----

async function ensureSampleTasks(
  cadetId: string,
  stream: CadetStream
): Promise<void> {
  const templateRows = await getAll<{ count: number }>(
    "SELECT COUNT(*) as count FROM training_task_template;"
  );
  const templateCount = templateRows[0]?.count ?? 0;

  const now = new Date().toISOString();

  if (templateCount === 0) {
    await run(
      `
      INSERT INTO training_task_template (
        id,
        section_code,
        title,
        description,
        stream,
        is_mandatory
      ) VALUES
        ("task-nav-001", "NAV", "Keep a proper lookout and report traffic", "Take part in bridge watch, maintain lookout by sight and hearing, and report targets to OOW.", "DECK", 1),
        ("task-nav-002", "NAV", "Fix ship's position using GPS and visual bearings", "Assist the OOW in plotting positions, cross-checking GPS with visual or radar bearings.", "DECK", 1),
        ("task-cargo-001", "CARGO", "Assist in pre-loading checks", "Participate in cargo tank / hold inspection, line-up, and pre-loading checklist.", "DECK", 1),
        ("task-safety-001", "SAFETY", "Participate in abandon ship drill", "Muster at lifeboat station, don lifejacket, help in lowering / securing survival craft.", "DECK", 1),
        ("task-life-001", "LIFE", "Observe safe working practices on deck", "Identify slip / trip hazards, use proper PPE, and follow toolbox talks.", "DECK", 0);
    `,
      []
    );
  }

  // Ensure progress rows for this cadet
  const existingProgress = await getAll<{ count: number }>(
    "SELECT COUNT(*) as count FROM training_task_progress WHERE cadet_id = ?;",
    [cadetId]
  );
  const progressCount = existingProgress[0]?.count ?? 0;

  if (progressCount === 0) {
    const deckTemplates = await getAll<{ id: string }>(
      "SELECT id FROM training_task_template WHERE stream = ?;",
      [stream]
    );

    for (const row of deckTemplates) {
      const progressId = `taskprog-${row.id}`;
      await run(
        `
        INSERT INTO training_task_progress (
          id,
          cadet_id,
          template_id,
          status,
          last_status_change_at,
          created_at,
          updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?);
      `,
        [progressId, cadetId, row.id, "PENDING", now, now, now]
      );
    }
  }
}

async function loadTasksForCadet(
  cadetId: string,
  stream: CadetStream
): Promise<TrainingTaskWithProgress[]> {
  const rows = await getAll<any>(
    `
    SELECT
      t.id AS template_id,
      t.section_code,
      t.title,
      t.description,
      t.stream,
      t.is_mandatory,
      p.id AS progress_id,
      p.status,
      p.last_status_change_at,
      p.reflection_text,
      p.verified_by_id,
      p.verified_by_name,
      p.verified_at,
      p.approved_by_master_id,
      p.approved_by_master_name,
      p.approved_at,
      p.created_at,
      p.updated_at
    FROM training_task_template t
    LEFT JOIN training_task_progress p
      ON p.template_id = t.id
      AND p.cadet_id = ?
    WHERE t.stream = ?
    ORDER BY t.section_code, t.title;
  `,
    [cadetId, stream]
  );

  return rows.map((row: any): TrainingTaskWithProgress => {
    const status: TaskStatus = (row.status as TaskStatus) ?? "PENDING";
    return {
      template: {
        id: row.template_id,
        sectionCode: row.section_code,
        title: row.title,
        description: row.description,
        stream: row.stream as CadetStream,
        isMandatory: row.is_mandatory === 1,
      },
      progress: {
        id: row.progress_id ?? "",
        cadetId,
        templateId: row.template_id,
        status,
        lastStatusChangeAt: row.last_status_change_at ?? undefined,
        reflectionText: row.reflection_text ?? undefined,
        verifiedById: row.verified_by_id ?? undefined,
        verifiedByName: row.verified_by_name ?? undefined,
        verifiedAt: row.verified_at ?? undefined,
        approvedByMasterId: row.approved_by_master_id ?? undefined,
        approvedByMasterName: row.approved_by_master_name ?? undefined,
        approvedAt: row.approved_at ?? undefined,
        createdAt: row.created_at ?? undefined,
        updatedAt: row.updated_at ?? undefined,
      },
    };
  });
}

// ----- Styles -----

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
  loadingContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  loadingText: {
    marginTop: 8,
    fontSize: 13,
    color: COLORS.textMuted,
  },
  content: {
    paddingHorizontal: 24,
    paddingVertical: 20,
    paddingBottom: 40,
  },
  summaryStrip: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#0C1725",
    borderRadius: 16,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.06)",
    marginBottom: 16,
  },
  summaryItem: {
    flex: 1,
  },
  summaryLabel: {
    fontSize: 11,
    color: COLORS.textMuted,
    marginBottom: 2,
  },
  summaryValue: {
    fontSize: 16,
    fontWeight: "600",
    color: COLORS.textOnDark,
  },
  summaryDivider: {
    width: 1,
    height: 24,
    backgroundColor: "rgba(255,255,255,0.12)",
    marginHorizontal: 12,
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
    marginBottom: 16,
    maxWidth: 700,
  },
  filterLabel: {
    fontSize: 12,
    fontWeight: "500",
    color: COLORS.textMuted,
    marginBottom: 4,
    marginTop: 8,
  },
  chipRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 8,
  },
  chipSmall: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.22)",
    backgroundColor: "#050B16",
  },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.22)",
    backgroundColor: "#050B16",
  },
  chipActive: {
    borderColor: COLORS.primary,
    backgroundColor: "rgba(49,148,160,0.16)",
  },
  chipText: {
    fontSize: 12,
    color: COLORS.textOnDark,
  },
  chipTextSmall: {
    fontSize: 11,
    color: COLORS.textOnDark,
  },
  chipTextActive: {
    color: COLORS.primary,
    fontWeight: "600",
  },
  emptyBox: {
    marginTop: 16,
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
    maxWidth: 700,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: COLORS.textOnDark,
    marginBottom: 4,
  },
  emptyText: {
    fontSize: 14,
    color: COLORS.textOnDark,
  },
  listContainer: {
    marginTop: 10,
    gap: 12,
  },
  taskCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
    maxWidth: 700,
  },
  taskHeaderRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 6,
  },
  taskTitle: {
    fontSize: 15,
    fontWeight: "600",
    color: COLORS.textOnDark,
    marginBottom: 2,
  },
  taskSubtitle: {
    fontSize: 12,
    color: COLORS.textMuted,
  },
  statusPill: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderWidth: 1,
    marginLeft: 10,
  },
  statusPending: {
    borderColor: "rgba(255,255,255,0.25)",
    backgroundColor: "rgba(255,255,255,0.03)",
  },
  statusSubmitted: {
    borderColor: "rgba(255,193,7,0.9)",
    backgroundColor: "rgba(255,193,7,0.08)",
  },
  statusVerified: {
    borderColor: "rgba(0,168,255,0.9)",
    backgroundColor: "rgba(0,168,255,0.08)",
  },
  statusApproved: {
    borderColor: "rgba(99,214,111,0.9)",
    backgroundColor: "rgba(99,214,111,0.08)",
  },
  statusPendingText: {
    fontSize: 10,
    fontWeight: "600",
    color: COLORS.textMuted,
  },
  statusSubmittedText: {
    fontSize: 10,
    fontWeight: "600",
    color: "#FFC107",
  },
  statusVerifiedText: {
    fontSize: 10,
    fontWeight: "600",
    color: "#00A8FF",
  },
  statusApprovedText: {
    fontSize: 10,
    fontWeight: "600",
    color: "#6BEA7E",
  },
  taskDescription: {
    fontSize: 13,
    color: COLORS.textOnDark,
    marginTop: 4,
    marginBottom: 10,
  },
  reflectionLabel: {
    fontSize: 12,
    fontWeight: "500",
    color: COLORS.textOnDark,
    marginBottom: 4,
  },
  reflectionInput: {
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.14)",
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 13,
    color: COLORS.textOnDark,
    backgroundColor: "#050B16",
    minHeight: 60,
    textAlignVertical: "top",
  },
  taskActionsRow: {
    marginTop: 10,
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 8,
  },
  taskButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
  },
  taskButtonSecondary: {
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.22)",
  },
  taskButtonSecondaryText: {
    fontSize: 12,
    color: COLORS.textOnDark,
  },
  taskButtonPrimary: {
    backgroundColor: COLORS.primary,
  },
  taskButtonPrimaryText: {
    fontSize: 12,
    fontWeight: "600",
    color: COLORS.textOnPrimary,
  },
  taskButtonDangerOutline: {
    borderWidth: 1,
    borderColor: "rgba(255,99,99,0.9)",
  },
  taskButtonDangerOutlineText: {
    fontSize: 12,
    fontWeight: "600",
    color: "rgba(255,99,99,0.95)",
  },
});

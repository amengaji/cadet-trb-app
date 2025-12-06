// src/screens/TasksScreen.tsx
import React, { useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Platform,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Modal,
  TextInput,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Feather } from "@expo/vector-icons";
import TRBHeader from "../components/TRBHeader";


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
  NAV: "Navigation & watchkeeping",
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

  const TasksScreen: React.FC = () => {
  const navigation = useNavigation<TasksNavProp>();

  const [loading, setLoading] = useState(true);
  const [tasks, setTasks] = useState<TrainingTaskWithProgress[]>([]);
  const [sectionFilter, setSectionFilter] = useState<SectionFilter>("ALL");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("ALL");
  const [savingTaskId, setSavingTaskId] = useState<string | null>(null);

  // Modal state
  const [selectedTask, setSelectedTask] =
    useState<TrainingTaskWithProgress | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [modalReflectionDraft, setModalReflectionDraft] = useState("");

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
        const loaded = await loadTasksForCadet(
          CURRENT_CADET_ID,
          CURRENT_STREAM
        );
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

  const filteredTasks = useMemo(() => {
    return tasks.filter((t) => {
      if (sectionFilter !== "ALL" && t.template.sectionCode !== sectionFilter) {
        return false;
      }
      if (statusFilter !== "ALL" && t.progress.status !== statusFilter) {
        return false;
      }
      return true;
    });
  }, [tasks, sectionFilter, statusFilter]);

  // Group by section for TRB-style display
  const groupedBySection = useMemo(() => {
    const groups: Record<string, TrainingTaskWithProgress[]> = {};
    for (const t of filteredTasks) {
      const key = t.template.sectionCode || "OTHER";
      if (!groups[key]) groups[key] = [];
      groups[key].push(t);
    }
    return groups;
  }, [filteredTasks]);

  const totalTasks = tasks.length;
  const pendingCount = tasks.filter((t) => t.progress.status === "PENDING")
    .length;
  const submittedCount = tasks.filter(
    (t) => t.progress.status === "SUBMITTED"
  ).length;
  const verifiedCount = tasks.filter((t) => t.progress.status === "VERIFIED")
    .length;
  const approvedCount = tasks.filter((t) => t.progress.status === "APPROVED")
    .length;

  const completionPercent =
    totalTasks === 0
      ? 0
      : Math.round(((verifiedCount + approvedCount) / totalTasks) * 100);

  // ----- Actions -----

  const handleToggleStatus = async (task: TrainingTaskWithProgress) => {
    const currentStatus = task.progress.status;

    if (currentStatus === "VERIFIED" || currentStatus === "APPROVED") {
      Alert.alert(
        "Read-only",
        "This task has already been verified/approved. Status changes must be done by the officer or Master in the ship/admin interface."
      );
      return;
    }

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
        await run(
          `
          UPDATE training_task_progress
          SET reflection_text = ?, updated_at = ?
          WHERE id = ?;
        `,
          [reflectionText.trim() || null, now, task.progress.id]
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

  const openTaskModal = (task: TrainingTaskWithProgress) => {
    setSelectedTask(task);
    setModalReflectionDraft(task.progress.reflectionText ?? "");
    setModalVisible(true);
  };

  const closeTaskModal = () => {
    setModalVisible(false);
    setSelectedTask(null);
    setModalReflectionDraft("");
  };

  const handleModalSave = async () => {
    if (!selectedTask) return;
    await handleSaveReflection(selectedTask, modalReflectionDraft);
  };

  const handleModalToggleStatus = async () => {
    if (!selectedTask) return;
    await handleToggleStatus(selectedTask);
  };

  // ----- Render -----

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
          <Text style={styles.appSubtitle}>Tasks & Competence (TRB)</Text>
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
              <Text style={styles.summaryLabel}>Verified + Approved</Text>
              <Text style={styles.summaryValue}>
                {verifiedCount + approvedCount}
              </Text>
            </View>
          </View>

          {/* Progress bar */}
          <View style={styles.progressWrapper}>
            <View style={styles.progressLabelsRow}>
              <Text style={styles.progressLabelText}>Overall competence</Text>
              <Text style={styles.progressLabelText}>{completionPercent}%</Text>
            </View>
            <View style={styles.progressBarTrack}>
              <View
                style={[
                  styles.progressBarFill,
                  { width: `${completionPercent}%` },
                ]}
              />
            </View>
          </View>

          <Text style={styles.heading}>Practical TRB tasks</Text>
          <Text style={styles.text}>
            These items mirror a Training Record Book. Complete each task at
            sea, write a short reflection, then mark it as submitted. Your
            officer and the Master will review and sign off through their
            interfaces.
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
                    style={[styles.chip, isActive && styles.chipActive]}
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
            {(
              ["ALL", "PENDING", "SUBMITTED", "VERIFIED", "APPROVED"] as StatusFilter[]
            ).map((status) => {
              const isActive = statusFilter === status;
              return (
                <TouchableOpacity
                  key={status}
                  style={[styles.chipSmall, isActive && styles.chipActive]}
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
            })}
          </View>

          {/* Grouped tasks */}
          {Object.keys(groupedBySection).length === 0 ? (
            <View style={styles.emptyBox}>
              <Text style={styles.emptyTitle}>No tasks match this filter</Text>
              <Text style={styles.emptyText}>
                Try changing the section or status filter above.
              </Text>
            </View>
          ) : (
            <View style={styles.listContainer}>
              {Object.entries(groupedBySection).map(
                ([sectionCode, sectionTasks]) => (
                  <View key={sectionCode} style={styles.sectionBlock}>
                    <View style={styles.sectionHeaderRow}>
                      <View>
                        <Text style={styles.sectionTitle}>
                          {getSectionTitle(sectionCode)}
                        </Text>
                        <Text style={styles.sectionSubtitle}>
                          {sectionTasks.length} tasks in this section
                        </Text>
                      </View>
                    </View>

                    {sectionTasks.map((task) => {
                      const isSaving = savingTaskId === task.template.id;
                      return (
                        <TaskCard
                          key={task.template.id}
                          task={task}
                          isSaving={isSaving}
                          onOpenDetails={() => openTaskModal(task)}
                          onToggleStatus={() => handleToggleStatus(task)}
                        />
                      );
                    })}
                  </View>
                )
              )}
            </View>
          )}
        </ScrollView>
      )}

      {/* Task details modal */}
      <Modal
        visible={modalVisible && !!selectedTask}
        animationType="slide"
        transparent
        onRequestClose={closeTaskModal}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalContainer}>
            {selectedTask && (
              <>
                <View style={styles.modalHeaderRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.modalTitle}>
                      {selectedTask.template.title}
                    </Text>
                    <Text style={styles.modalSubtitle}>
                      {getSectionTitle(selectedTask.template.sectionCode)}{" "}
                      {selectedTask.template.isMandatory ? "• Mandatory" : ""}
                    </Text>
                  </View>
                  <StatusPill status={selectedTask.progress.status} />
                </View>

                <ScrollView
                  style={styles.modalBody}
                  contentContainerStyle={{ paddingBottom: 16 }}
                >
                  <Text style={styles.modalLabel}>Task description</Text>
                  <Text style={styles.modalDescription}>
                    {selectedTask.template.description}
                  </Text>

                  <Text style={styles.modalLabel}>
                    Reflection (what you did / learned)
                  </Text>
                  <TextInput
                    style={styles.modalTextArea}
                    placeholder="Describe how you performed this task, what you observed, and what you learned."
                    placeholderTextColor={COLORS.textMuted}
                    value={modalReflectionDraft}
                    onChangeText={setModalReflectionDraft}
                    multiline
                    editable={
                      selectedTask.progress.status !== "VERIFIED" &&
                      selectedTask.progress.status !== "APPROVED"
                    }
                  />

                  <View style={styles.timelineBox}>
                    <Text style={styles.timelineTitle}>Status timeline</Text>
                    <TimelineRow
                      label="Submitted"
                      active={
                        selectedTask.progress.status === "SUBMITTED" ||
                        selectedTask.progress.status === "VERIFIED" ||
                        selectedTask.progress.status === "APPROVED"
                      }
                    />
                    <TimelineRow
                      label="Verified by officer"
                      active={
                        selectedTask.progress.status === "VERIFIED" ||
                        selectedTask.progress.status === "APPROVED"
                      }
                    />
                    <TimelineRow
                      label="Approved by Master / academy"
                      active={selectedTask.progress.status === "APPROVED"}
                    />
                    <Text style={styles.timelineHint}>
                      Officer and Master sign-offs will be done via ship /
                      admin interfaces, not on this cadet app.
                    </Text>
                  </View>
                </ScrollView>

                <View style={styles.modalActionsRow}>
                  <TouchableOpacity
                    style={styles.modalSecondaryButton}
                    onPress={closeTaskModal}
                  >
                    <Text style={styles.modalSecondaryButtonText}>Close</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.modalPrimaryButton}
                    onPress={handleModalSave}
                    disabled={
                      savingTaskId === selectedTask.template.id ||
                      selectedTask.progress.status === "VERIFIED" ||
                      selectedTask.progress.status === "APPROVED"
                    }
                  >
                    <Text style={styles.modalPrimaryButtonText}>
                      {savingTaskId === selectedTask.template.id
                        ? "Saving..."
                        : "Save reflection"}
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[
                      styles.modalPrimaryButton,
                      selectedTask.progress.status === "PENDING"
                        ? styles.modalSubmitButton
                        : styles.modalUnsubmitButton,
                    ]}
                    onPress={handleModalToggleStatus}
                    disabled={savingTaskId === selectedTask.template.id}
                  >
                    <Text style={styles.modalPrimaryButtonText}>
                      {selectedTask.progress.status === "PENDING"
                        ? "Mark as submitted"
                        : selectedTask.progress.status === "SUBMITTED"
                        ? "Mark as pending"
                        : "Status locked"}
                    </Text>
                  </TouchableOpacity>
                </View>
              </>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
};

// ----- Task card component -----

type TaskCardProps = {
  task: TrainingTaskWithProgress;
  isSaving: boolean;
  onOpenDetails: () => void;
  onToggleStatus: () => void;
};

const TaskCard: React.FC<TaskCardProps> = ({
  task,
  isSaving,
  onOpenDetails,
  onToggleStatus,
}) => {
  const status = task.progress.status;
  const reflectionSnippet = task.progress.reflectionText
    ? truncate(task.progress.reflectionText, 140)
    : "No reflection saved yet.";

  const canToggle =
    status === "PENDING" || status === "SUBMITTED";

  return (
    <View style={styles.taskCard}>
      <View style={styles.taskHeaderRow}>
        <View style={{ flex: 1 }}>
          <Text style={styles.taskTitle}>{task.template.title}</Text>
          <Text style={styles.taskSubtitle}>
            {getSectionTitle(task.template.sectionCode)}
            {task.template.isMandatory ? " • Mandatory" : ""}
          </Text>
        </View>
        <StatusPill status={status} />
      </View>

      <Text style={styles.taskReflectionSnippet}>{reflectionSnippet}</Text>

      <View style={styles.taskFooterRow}>
        <TouchableOpacity
          style={styles.taskDetailsButton}
          onPress={onOpenDetails}
        >
          <Feather
            name="file-text"
            size={14}
            color={COLORS.textOnDark}
            style={{ marginRight: 6 }}
          />
          <Text style={styles.taskDetailsButtonText}>Open details</Text>
        </TouchableOpacity>

        {canToggle && (
          <TouchableOpacity
            style={[
              styles.taskStatusButton,
              status === "PENDING"
                ? styles.taskStatusSubmit
                : styles.taskStatusUnsubmit,
            ]}
            onPress={onToggleStatus}
            disabled={isSaving}
          >
            <Text style={styles.taskStatusButtonText}>
              {isSaving
                ? "Saving..."
                : status === "PENDING"
                ? "Mark as submitted"
                : "Mark as pending"}
          </Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
};

// ----- Small status pill -----

const StatusPill: React.FC<{ status: TaskStatus }> = ({ status }) => {
  const label = STATUS_LABELS[status];

  let containerStyle = styles.statusPillPending;
  let textStyle = styles.statusPillTextPending;
  let iconName: keyof typeof Feather.glyphMap = "clock";

  if (status === "SUBMITTED") {
    containerStyle = styles.statusPillSubmitted;
    textStyle = styles.statusPillTextSubmitted;
    iconName = "send";
  } else if (status === "VERIFIED") {
    containerStyle = styles.statusPillVerified;
    textStyle = styles.statusPillTextVerified;
    iconName = "shield";
  } else if (status === "APPROVED") {
    containerStyle = styles.statusPillApproved;
    textStyle = styles.statusPillTextApproved;
    iconName = "check-circle";
  }

  return (
    <View style={[styles.statusPill, containerStyle]}>
      <Feather
        name={iconName}
        size={11}
        color={textStyle.color as string}
        style={{ marginRight: 4 }}
      />
      <Text style={textStyle}>{label}</Text>
    </View>
  );
};

// ----- Timeline row -----

const TimelineRow: React.FC<{ label: string; active: boolean }> = ({
  label,
  active,
}) => {
  return (
    <View style={styles.timelineRow}>
      <View
        style={[styles.timelineDot, active && styles.timelineDotActive]}
      />
      <Text
        style={[
          styles.timelineRowLabel,
          active && styles.timelineRowLabelActive,
        ]}
      >
        {label}
      </Text>
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
        ("task-nav-001", "NAV", "Keep a proper lookout and report traffic", "Take part in bridge watch, maintain lookout by sight and hearing, and report targets to the OOW using correct reporting phrases.", "DECK", 1),
        ("task-nav-002", "NAV", "Fix the ship's position", "Assist the OOW in fixing the ship's position using GPS, cross-checked with visual or radar bearings, and plot it correctly on the chart.", "DECK", 1),
        ("task-cargo-001", "CARGO", "Assist in pre-loading checks", "Participate in cargo hold / tank inspection, line-up of cargo systems, and completion of pre-loading checklists according to company procedures.", "DECK", 1),
        ("task-safety-001", "SAFETY", "Participate in abandon ship drill", "Muster at lifeboat station, don lifejacket, assist with launching arrangements, and carry out duties assigned in the muster list.", "DECK", 1),
        ("task-life-001", "LIFE", "Demonstrate safe working practices", "Observe and apply safe working practices on deck, including PPE use, housekeeping, and toolbox talks.", "DECK", 0);
    `,
      []
    );
  }

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

// ----- Small helpers -----

function getSectionTitle(sectionCode: string): string {
  switch (sectionCode) {
    case "NAV":
      return "Navigation & watchkeeping";
    case "CARGO":
      return "Cargo & ballast operations";
    case "SAFETY":
      return "Safety & emergency";
    case "LIFE":
      return "Shipboard life / other";
    default:
      return "Other tasks";
  }
}

function truncate(text: string, max: number): string {
  if (text.length <= max) return text;
  return text.slice(0, max - 1) + "…";
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
    marginBottom: 12,
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
  progressWrapper: {
    marginBottom: 18,
  },
  progressLabelsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 6,
  },
  progressLabelText: {
    fontSize: 12,
    color: COLORS.textMuted,
  },
  progressBarTrack: {
    height: 8,
    borderRadius: 999,
    backgroundColor: "#10192A",
    overflow: "hidden",
  },
  progressBarFill: {
    height: "100%",
    borderRadius: 999,
    backgroundColor: COLORS.primary,
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
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.22)",
    backgroundColor: "#050B16",
  },
  chipSmall: {
    paddingHorizontal: 10,
    paddingVertical: 4,
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
    marginTop: 8,
    gap: 12,
  },
  sectionBlock: {
    marginBottom: 16,
  },
  sectionHeaderRow: {
    marginBottom: 6,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: "600",
    color: COLORS.textOnDark,
  },
  sectionSubtitle: {
    fontSize: 12,
    color: COLORS.textMuted,
  },
  taskCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
    maxWidth: 700,
    marginTop: 6,
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
  taskReflectionSnippet: {
    fontSize: 13,
    color: COLORS.textOnDark,
    marginTop: 4,
  },
  taskFooterRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 10,
  },
  taskDetailsButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.24)",
  },
  taskDetailsButtonText: {
    fontSize: 12,
    color: COLORS.textOnDark,
  },
  taskStatusButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
  },
  taskStatusSubmit: {
    backgroundColor: COLORS.primary,
  },
  taskStatusUnsubmit: {
    borderWidth: 1,
    borderColor: "rgba(255,193,7,0.9)",
  },
  taskStatusButtonText: {
    fontSize: 12,
    fontWeight: "600",
    color: COLORS.textOnPrimary,
  },
  statusPill: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
    marginLeft: 10,
    borderWidth: 1,
  },
  statusPillPending: {
    borderColor: "rgba(255,255,255,0.25)",
    backgroundColor: "rgba(255,255,255,0.03)",
  },
  statusPillSubmitted: {
    borderColor: "rgba(255,193,7,0.9)",
    backgroundColor: "rgba(255,193,7,0.08)",
  },
  statusPillVerified: {
    borderColor: "rgba(0,168,255,0.9)",
    backgroundColor: "rgba(0,168,255,0.08)",
  },
  statusPillApproved: {
    borderColor: "rgba(99,214,111,0.9)",
    backgroundColor: "rgba(99,214,111,0.08)",
  },
  statusPillTextPending: {
    fontSize: 10,
    fontWeight: "600",
    color: COLORS.textMuted,
  },
  statusPillTextSubmitted: {
    fontSize: 10,
    fontWeight: "600",
    color: "#FFC107",
  },
  statusPillTextVerified: {
    fontSize: 10,
    fontWeight: "600",
    color: "#00A8FF",
  },
  statusPillTextApproved: {
    fontSize: 10,
    fontWeight: "600",
    color: "#6BEA7E",
  },
  // Modal
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.55)",
    justifyContent: "center",
    paddingHorizontal: 16,
  },
  modalContainer: {
    backgroundColor: COLORS.surface,
    borderRadius: 18,
    maxHeight: "85%",
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 10,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.18)",
  },
  modalHeaderRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 8,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: COLORS.textOnDark,
  },
  modalSubtitle: {
    fontSize: 12,
    color: COLORS.textMuted,
    marginTop: 2,
  },
  modalBody: {
    marginTop: 8,
  },
  modalLabel: {
    fontSize: 12,
    fontWeight: "500",
    color: COLORS.textOnDark,
    marginTop: 10,
    marginBottom: 4,
  },
  modalDescription: {
    fontSize: 13,
    color: COLORS.textOnDark,
  },
  modalTextArea: {
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.14)",
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 13,
    color: COLORS.textOnDark,
    backgroundColor: "#050B16",
    minHeight: 80,
    textAlignVertical: "top",
  },
  modalActionsRow: {
    flexDirection: "row",
    justifyContent: "flex-end",
    alignItems: "center",
    gap: 8,
    marginTop: 10,
  },
  modalSecondaryButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.24)",
  },
  modalSecondaryButtonText: {
    fontSize: 12,
    color: COLORS.textOnDark,
  },
  modalPrimaryButton: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: COLORS.primary,
  },
  modalSubmitButton: {
    backgroundColor: COLORS.primary,
  },
  modalUnsubmitButton: {
    backgroundColor: "rgba(255,193,7,0.12)",
  },
  modalPrimaryButtonText: {
    fontSize: 12,
    fontWeight: "600",
    color: COLORS.textOnPrimary,
  },
  // Timeline
  timelineBox: {
    marginTop: 14,
    padding: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.15)",
    backgroundColor: "#050B16",
  },
  timelineTitle: {
    fontSize: 12,
    fontWeight: "600",
    color: COLORS.textOnDark,
    marginBottom: 6,
  },
  timelineRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 4,
  },
  timelineDot: {
    width: 8,
    height: 8,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.35)",
    marginRight: 8,
  },
  timelineDotActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  timelineRowLabel: {
    fontSize: 12,
    color: COLORS.textMuted,
  },
  timelineRowLabelActive: {
    color: COLORS.textOnDark,
    fontWeight: "500",
  },
  timelineHint: {
    fontSize: 11,
    color: COLORS.textMuted,
    marginTop: 6,
  },
});
export default TasksScreen;

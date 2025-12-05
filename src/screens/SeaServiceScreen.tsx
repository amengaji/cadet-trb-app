// src/screens/SeaServiceScreen.tsx
import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Platform,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  TextInput,
  Modal,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";

import DateTimePicker, {
  DateTimePickerEvent,
} from "@react-native-community/datetimepicker";

import { COLORS } from "../../theme";
import type { RootStackParamList } from "../navigation/RootNavigator";
import { getAll, run } from "../db/sqlite";
import type { SeaServiceDeployment } from "../models/crb";

type SeaServiceNavProp = NativeStackNavigationProp<
  RootStackParamList,
  "SeaService"
>;

type UiVessel = {
  id: string;
  name: string;
  flagState?: string | null;
  vesselType?: string | null;
};

export const SeaServiceScreen: React.FC = () => {
  const navigation = useNavigation<SeaServiceNavProp>();

  const [loading, setLoading] = useState(true);
  const [deployments, setDeployments] = useState<SeaServiceDeployment[]>([]);

  // Vessels (shore-admin managed)
  const [vessels, setVessels] = useState<UiVessel[]>([]);
  const [selectedVesselId, setSelectedVesselId] = useState<string | null>(null);
  const [showVesselPicker, setShowVesselPicker] = useState(false);

  // Add deployment form state (sign-on)
  const [showForm, setShowForm] = useState(false);
  const [signOnDate, setSignOnDate] = useState<Date | null>(null);
  const [showSignOnDatePicker, setShowSignOnDatePicker] = useState(false);
  const [formSignOnPort, setFormSignOnPort] = useState("");

  // Dev-only: resetting sample data
  const [resetting, setResetting] = useState(false);

  // Sign-off flow state
  const [showSignOffModal, setShowSignOffModal] = useState(false);
  const [signOffTargetId, setSignOffTargetId] = useState<string | null>(null);
  const [signOffDate, setSignOffDate] = useState<Date | null>(null);
  const [showSignOffDatePicker, setShowSignOffDatePicker] = useState(false);
  const [signOffPort, setSignOffPort] = useState("");

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
        await ensureSampleVesselAndDeployment();
        const [deps, vesselRows] = await Promise.all([
          loadDeploymentsFromDb(),
          loadVesselsFromDb(),
        ]);

        if (isMounted) {
          setDeployments(deps);
          setVessels(vesselRows);
          if (!selectedVesselId && vesselRows.length > 0) {
            setSelectedVesselId(vesselRows[0].id);
          }
        }
      } catch (error) {
        console.error("Error loading sea service screen", error);
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

  const refreshDeployments = async () => {
    const deps = await loadDeploymentsFromDb();
    setDeployments(deps);
  };

  const resetForm = () => {
    setSignOnDate(null);
    setFormSignOnPort("");
  };

  const selectedVessel = vessels.find((v) => v.id === selectedVesselId) ?? null;

  const handleSaveDeployment = async () => {
    if (!selectedVesselId) {
      alert("Please select a vessel. Vessels are created by the shore admin.");
      return;
    }
    if (!signOnDate) {
      alert("Please select a sign-on date.");
      return;
    }

    try {
      const now = new Date().toISOString();
      const depId = `dep-${Date.now()}`;
      const signOnDateStr = signOnDate.toISOString().slice(0, 10);

      await run(
        `
        INSERT INTO sea_service_deployment (
          id,
          cadet_id,
          vessel_id,
          role,
          sign_on_date,
          sign_on_port,
          created_at,
          updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?);
      `,
        [
          depId,
          "cadet-001", // placeholder until cadet profile is wired
          selectedVesselId,
          "CADET",
          signOnDateStr,
          formSignOnPort.trim() || null,
          now,
          now,
        ]
      );

      await refreshDeployments();
      resetForm();
      setShowForm(false);
    } catch (error) {
      console.error("Error saving deployment", error);
      alert("Could not save deployment. See console for details.");
    }
  };

  const handleCancelForm = () => {
    resetForm();
    setShowForm(false);
  };

  const handleResetSample = async () => {
    try {
      setResetting(true);
      setLoading(true);

      await run("DELETE FROM sea_service_deployment");
      await run("DELETE FROM vessel");

      await ensureSampleVesselAndDeployment();
      const [deps, vesselRows] = await Promise.all([
        loadDeploymentsFromDb(),
        loadVesselsFromDb(),
      ]);

      setDeployments(deps);
      setVessels(vesselRows);
      if (vesselRows.length > 0) {
        setSelectedVesselId(vesselRows[0].id);
      }
    } catch (error) {
      console.error("Error resetting sample data", error);
      alert("Could not reset sample data. See console for details.");
    } finally {
      setResetting(false);
      setLoading(false);
    }
  };

  const handleSignOnDateChange = (
    event: DateTimePickerEvent,
    date?: Date | undefined
  ) => {
    if (Platform.OS === "android") {
      setShowSignOnDatePicker(false);
    }
    if (event.type === "set" && date) {
      setSignOnDate(date);
    }
  };

  // ---- Sign-off flow handlers ----

  const openSignOffModal = (dep: SeaServiceDeployment) => {
    setSignOffTargetId(dep.id);
    const initial = dep.signOffDate
      ? new Date(dep.signOffDate)
      : new Date();
    setSignOffDate(initial);
    setSignOffPort(dep.signOffPort ?? "");
    setShowSignOffDatePicker(false);
    setShowSignOffModal(true);
  };

  const handleSignOffDateChange = (
    event: DateTimePickerEvent,
    date?: Date | undefined
  ) => {
    if (Platform.OS === "android") {
      setShowSignOffDatePicker(false);
    }
    if (event.type === "set" && date) {
      setSignOffDate(date);
    }
  };

  const handleCancelSignOff = () => {
    setShowSignOffModal(false);
    setSignOffTargetId(null);
    setSignOffDate(null);
    setSignOffPort("");
    setShowSignOffDatePicker(false);
  };

  const handleSaveSignOff = async () => {
    if (!signOffTargetId) {
      alert("No deployment selected.");
      return;
    }
    if (!signOffDate) {
      alert("Please select a sign-off date.");
      return;
    }

    // Find the deployment to get its sign-on date
    const dep = deployments.find((d) => d.id === signOffTargetId);
    if (!dep || !dep.signOnDate) {
      alert("Could not find sign-on date for this deployment.");
      return;
    }

    try {
      const signOnDateObj = new Date(dep.signOnDate);
      const signOffDateObj = signOffDate;

      const msPerDay = 1000 * 60 * 60 * 24;
      const diffMs = signOffDateObj.getTime() - signOnDateObj.getTime();
      let totalDays = Math.floor(diffMs / msPerDay) + 1; // inclusive of both days
      if (totalDays < 0) {
        totalDays = 0;
      }

      const signOffDateStr = signOffDateObj.toISOString().slice(0, 10);
      const now = new Date().toISOString();

      await run(
        `
        UPDATE sea_service_deployment
        SET 
          sign_off_date = ?,
          sign_off_port = ?,
          total_days_onboard = ?,
          updated_at = ?
        WHERE id = ?;
      `,
        [
          signOffDateStr,
          signOffPort.trim() || null,
          totalDays,
          now,
          signOffTargetId,
        ]
      );

      await refreshDeployments();
      handleCancelSignOff();
    } catch (error) {
      console.error("Error saving sign-off", error);
      alert("Could not save sign-off. See console for details.");
    }
  };

  const totalDaysOnboard = deployments.reduce(
    (sum, dep) => sum + computeTotalDaysForDeployment(dep),
    0
  );

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
          <Text style={styles.appSubtitle}>Sea Service</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {/* Summary strip */}
        <View style={styles.summaryStrip}>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryLabel}>Deployments</Text>
            <Text style={styles.summaryValue}>{deployments.length}</Text>
          </View>
          <View style={styles.summaryDivider} />
          <View style={styles.summaryItem}>
            <Text style={styles.summaryLabel}>Total days onboard</Text>
            <Text style={styles.summaryValue}>
              {totalDaysOnboard || "—"}
            </Text>
          </View>
        </View>

        <Text style={styles.heading}>Sea Service Record</Text>
        <Text style={styles.text}>
          Vessels are created and managed by the{" "}
          <Text style={styles.textEmphasis}>shore admin</Text>. As a cadet, you
          select an existing vessel and record your sea service for each
          contract. You can later record sign-off to complete the contract and
          calculate days on board.
        </Text>

        {/* Dev-only reset button (we'll remove later) */}
        <View style={styles.devRow}>
          <Text style={styles.devLabel}>Dev tools (local only):</Text>
          <TouchableOpacity
            style={styles.resetButton}
            onPress={handleResetSample}
            disabled={resetting}
          >
            <Text style={styles.resetButtonText}>
              {resetting ? "Resetting..." : "Reset sample data"}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Add deployment button */}
        {!showForm && (
          <TouchableOpacity
            style={styles.addButton}
            onPress={() => setShowForm(true)}
          >
            <Text style={styles.addButtonText}>＋ Add deployment</Text>
          </TouchableOpacity>
        )}

        {/* Add deployment form (sign-on) */}
        {showForm && (
          <View style={styles.formCard}>
            <Text style={styles.formTitle}>New deployment</Text>

            {/* Vessel select (dropdown) */}
            <Text style={styles.formLabel}>Vessel (shore-admin list)</Text>
            <TouchableOpacity
              style={styles.selectInput}
              onPress={() => setShowVesselPicker(true)}
            >
              <Text
                style={
                  selectedVessel
                    ? styles.selectText
                    : styles.selectPlaceholder
                }
              >
                {selectedVessel
                  ? selectedVessel.name
                  : "Select vessel (shore admin manages list)"}
              </Text>
            </TouchableOpacity>

            {/* Sign-on date via calendar */}
            <Text style={styles.formLabel}>Sign-on date</Text>
            <TouchableOpacity
              style={styles.selectInput}
              onPress={() => setShowSignOnDatePicker(true)}
            >
              <Text
                style={
                  signOnDate ? styles.selectText : styles.selectPlaceholder
                }
              >
                {signOnDate
                  ? formatDate(signOnDate.toISOString())
                  : "Select date"}
              </Text>
            </TouchableOpacity>

            {showSignOnDatePicker && (
              <DateTimePicker
                value={signOnDate ?? new Date()}
                mode="date"
                display={Platform.OS === "ios" ? "spinner" : "default"}
                onChange={handleSignOnDateChange}
              />
            )}

            {/* Sign-on port */}
            <Text style={styles.formLabel}>Sign-on port (optional)</Text>
            <TextInput
              style={styles.formInput}
              placeholder="e.g. Singapore"
              placeholderTextColor={COLORS.textMuted}
              value={formSignOnPort}
              onChangeText={setFormSignOnPort}
            />

            <View style={styles.formButtonsRow}>
              <TouchableOpacity
                style={[styles.formButton, styles.formButtonSecondary]}
                onPress={handleCancelForm}
              >
                <Text style={styles.formButtonSecondaryText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.formButton, styles.formButtonPrimary]}
                onPress={handleSaveDeployment}
              >
                <Text style={styles.formButtonPrimaryText}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={COLORS.primary} />
            <Text style={styles.loadingText}>Loading deployments...</Text>
          </View>
        ) : deployments.length === 0 ? (
          <View style={styles.emptyBox}>
            <Text style={styles.emptyTitle}>No deployments yet</Text>
            <Text style={styles.emptyText}>
              Once you add your first sign-on / sign-off record, it will appear
              here.
            </Text>
          </View>
        ) : (
          <View style={styles.listContainer}>
            {deployments.map((dep) => {
              const isOpen = !dep.signOffDate;
              const days = computeTotalDaysForDeployment(dep);

              return (
                <View key={dep.id} style={styles.deploymentCard}>
                  <View style={styles.cardHeaderRow}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.deploymentTitle}>
                        {dep.vesselName
                          ? dep.vesselName
                          : `Deployment on vessel ID: ${dep.vesselId}`}
                      </Text>
                      {(dep.vesselType || dep.vesselFlagState) && (
                        <Text style={styles.deploymentSubTitle}>
                          {dep.vesselType ?? "Vessel"}{" "}
                          {dep.vesselFlagState ? `• ${dep.vesselFlagState}` : ""}
                        </Text>
                      )}
                    </View>
                    <View
                      style={[
                        styles.statusPill,
                        isOpen ? styles.statusOpen : styles.statusCompleted,
                      ]}
                    >
                      <Text
                        style={
                          isOpen
                            ? styles.statusOpenText
                            : styles.statusCompletedText
                        }
                      >
                        {isOpen ? "OPEN CONTRACT" : "COMPLETED"}
                      </Text>
                    </View>
                  </View>

                  <Text style={styles.deploymentLine}>
                    Role:{" "}
                    <Text style={styles.deploymentValue}>{dep.role}</Text>
                  </Text>
                  <Text style={styles.deploymentLine}>
                    Sign-on:{" "}
                    <Text style={styles.deploymentValue}>
                      {formatDate(dep.signOnDate)}{" "}
                      {dep.signOnPort ? `(${dep.signOnPort})` : ""}
                    </Text>
                  </Text>
                  <Text style={styles.deploymentLine}>
                    Sign-off:{" "}
                    <Text style={styles.deploymentValue}>
                      {dep.signOffDate
                        ? `${formatDate(dep.signOffDate)}${
                            dep.signOffPort ? ` (${dep.signOffPort})` : ""
                          }`
                        : "Still on board / not recorded"}
                    </Text>
                  </Text>
                  <Text style={styles.deploymentLine}>
                    Days on board:{" "}
                    <Text style={styles.deploymentValue}>
                      {days > 0 ? days : "—"}
                    </Text>
                  </Text>
                  {dep.voyageSummary ? (
                    <Text style={styles.deploymentLine}>
                      Voyage:{" "}
                      <Text style={styles.deploymentValue}>
                        {dep.voyageSummary}
                      </Text>
                    </Text>
                  ) : null}

                  {isOpen && (
                    <View style={styles.cardActionsRow}>
                      <TouchableOpacity
                        style={styles.signOffButton}
                        onPress={() => openSignOffModal(dep)}
                      >
                        <Text style={styles.signOffButtonText}>
                          Record sign-off
                        </Text>
                      </TouchableOpacity>
                    </View>
                  )}
                </View>
              );
            })}
          </View>
        )}
      </ScrollView>

      {/* Vessel picker modal */}
      <Modal
        visible={showVesselPicker}
        transparent
        animationType="fade"
        onRequestClose={() => setShowVesselPicker(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Select vessel</Text>
            <ScrollView style={styles.modalList}>
              {vessels.map((v) => (
                <TouchableOpacity
                  key={v.id}
                  style={styles.modalOption}
                  onPress={() => {
                    setSelectedVesselId(v.id);
                    setShowVesselPicker(false);
                  }}
                >
                  <Text style={styles.modalOptionTitle}>{v.name}</Text>
                  {(v.vesselType || v.flagState) && (
                    <Text style={styles.modalOptionSubtitle}>
                      {v.vesselType ?? "Vessel"}{" "}
                      {v.flagState ? `• ${v.flagState}` : ""}
                    </Text>
                  )}
                </TouchableOpacity>
              ))}
              {vessels.length === 0 && (
                <Text style={styles.modalEmptyText}>
                  No vessels found. Shore admin must create vessels in the admin
                  portal.
                </Text>
              )}
            </ScrollView>
            <TouchableOpacity
              style={styles.modalCloseButton}
              onPress={() => setShowVesselPicker(false)}
            >
              <Text style={styles.modalCloseText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Sign-off modal */}
      <Modal
        visible={showSignOffModal}
        transparent
        animationType="fade"
        onRequestClose={handleCancelSignOff}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Record sign-off</Text>

            <Text style={styles.formLabel}>Sign-off date</Text>
            <TouchableOpacity
              style={styles.selectInput}
              onPress={() => setShowSignOffDatePicker(true)}
            >
              <Text
                style={
                  signOffDate ? styles.selectText : styles.selectPlaceholder
                }
              >
                {signOffDate
                  ? formatDate(signOffDate.toISOString())
                  : "Select date"}
              </Text>
            </TouchableOpacity>

            {showSignOffDatePicker && (
              <DateTimePicker
                value={signOffDate ?? new Date()}
                mode="date"
                display={Platform.OS === "ios" ? "spinner" : "default"}
                onChange={handleSignOffDateChange}
              />
            )}

            <Text style={styles.formLabel}>Sign-off port</Text>
            <TextInput
              style={styles.formInput}
              placeholder="e.g. Rotterdam"
              placeholderTextColor={COLORS.textMuted}
              value={signOffPort}
              onChangeText={setSignOffPort}
            />

            <View style={styles.formButtonsRow}>
              <TouchableOpacity
                style={[styles.formButton, styles.formButtonSecondary]}
                onPress={handleCancelSignOff}
              >
                <Text style={styles.formButtonSecondaryText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.formButton, styles.formButtonPrimary]}
                onPress={handleSaveSignOff}
              >
                <Text style={styles.formButtonPrimaryText}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

// ---------- Helpers ----------

async function ensureSampleVesselAndDeployment(): Promise<void> {
  // Is there any deployment at all?
  const depRows = await getAll<{ count: number }>(
    "SELECT COUNT(*) as count FROM sea_service_deployment"
  );
  const depCount = depRows[0]?.count ?? 0;
  if (depCount > 0) {
    return; // already has data
  }

  const now = new Date().toISOString();

  // Seed sample vessel (shore-admin style)
  const vesselId = "vessel-001";
  await run(
    `
      INSERT INTO vessel (
        id,
        name,
        flag_state,
        vessel_type,
        created_at,
        updated_at
      ) VALUES (?, ?, ?, ?, ?, ?);
    `,
    [
      vesselId,
      "MT OCEAN LEARNER",
      "Liberia",
      "TANKER",
      now,
      now,
    ]
  );

  // Seed sample deployment
  const depId = "dep-001";
  await run(
    `
    INSERT INTO sea_service_deployment (
      id,
      cadet_id,
      vessel_id,
      role,
      sign_on_date,
      sign_on_port,
      sign_off_date,
      sign_off_port,
      total_days_onboard,
      total_sea_days,
      total_port_days,
      voyage_summary,
      created_at,
      updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
  `,
    [
      depId,
      "cadet-001",
      vesselId,
      "CADET",
      "2024-01-15",
      "Singapore",
      "2024-07-20",
      "Rotterdam",
      187,
      130,
      57,
      "Singapore – Fujairah – Suez – Rotterdam",
      now,
      now,
    ]
  );
}

async function loadDeploymentsFromDb(): Promise<SeaServiceDeployment[]> {
  const rows = await getAll<any>(
    `
    SELECT 
      d.*,
      v.name AS vessel_name,
      v.flag_state AS vessel_flag_state,
      v.vessel_type AS vessel_type
    FROM sea_service_deployment d
    LEFT JOIN vessel v ON d.vessel_id = v.id
    ORDER BY d.sign_on_date DESC
  `
  );

  const deployments: SeaServiceDeployment[] = rows.map((row: any) => ({
    id: row.id,
    cadetId: row.cadet_id,
    vesselId: row.vessel_id,
    vesselName: row.vessel_name ?? undefined,
    vesselFlagState: row.vessel_flag_state ?? undefined,
    vesselType: row.vessel_type ?? undefined,
    role: row.role,
    signOnDate: row.sign_on_date,
    signOffDate: row.sign_off_date ?? undefined,
    signOnPort: row.sign_on_port ?? undefined,
    signOffPort: row.sign_off_port ?? undefined,
    totalDaysOnboard: row.total_days_onboard ?? undefined,
    totalSeaDays: row.total_sea_days ?? undefined,
    totalPortDays: row.total_port_days ?? undefined,
    voyageSummary: row.voyage_summary ?? undefined,
    trainingContacts: {
      masterName: row.master_name ?? undefined,
      masterId: row.master_id ?? undefined,
      chiefEngineerName: row.chief_engineer_name ?? undefined,
      chiefEngineerId: row.chief_engineer_id ?? undefined,
      dstoName: row.dsto_name ?? undefined,
      dstoId: row.dsto_id ?? undefined,
    },
    testimonialText: row.testimonial_text ?? undefined,
    testimonialSignedAt: row.testimonial_signed_at ?? undefined,
    createdAt: row.created_at ?? undefined,
    updatedAt: row.updated_at ?? undefined,
  }));

  return deployments;
}

async function loadVesselsFromDb(): Promise<UiVessel[]> {
  const rows = await getAll<any>(
    "SELECT id, name, flag_state, vessel_type FROM vessel ORDER BY name ASC"
  );
  return rows.map((row: any) => ({
    id: row.id,
    name: row.name,
    flagState: row.flag_state ?? undefined,
    vesselType: row.vessel_type ?? undefined,
  }));
}

function computeTotalDaysForDeployment(dep: SeaServiceDeployment): number {
  if (dep.totalDaysOnboard && dep.totalDaysOnboard > 0) {
    return dep.totalDaysOnboard;
  }
  if (!dep.signOnDate || !dep.signOffDate) {
    return 0;
  }
  const start = new Date(dep.signOnDate);
  const end = new Date(dep.signOffDate);
  const msPerDay = 1000 * 60 * 60 * 24;
  const diffMs = end.getTime() - start.getTime();
  const rawDays = Math.floor(diffMs / msPerDay) + 1;
  return rawDays > 0 ? rawDays : 0;
}

function formatDate(dateStr: string | undefined): string {
  if (!dateStr) return "-";
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return dateStr;
  return d.toISOString().slice(0, 10);
}

// ---------- Styles ----------

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
  textEmphasis: {
    fontWeight: "600",
    color: COLORS.primary,
  },
  devRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
    gap: 8,
  },
  devLabel: {
    fontSize: 11,
    color: COLORS.textMuted,
  },
  resetButton: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.25)",
  },
  resetButtonText: {
    fontSize: 11,
    color: COLORS.textOnDark,
  },
  addButton: {
    alignSelf: "flex-start",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: COLORS.primary,
    marginBottom: 16,
  },
  addButtonText: {
    fontSize: 13,
    fontWeight: "600",
    color: COLORS.primary,
  },
  formCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
    maxWidth: 700,
    marginBottom: 20,
  },
  formTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: COLORS.textOnDark,
    marginBottom: 10,
  },
  formLabel: {
    fontSize: 13,
    fontWeight: "500",
    color: COLORS.textOnDark,
    marginTop: 8,
    marginBottom: 4,
  },
  formInput: {
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.14)",
    paddingHorizontal: 10,
    paddingVertical: Platform.OS === "ios" ? 10 : 6,
    fontSize: 13,
    color: COLORS.textOnDark,
    backgroundColor: "#050B16",
  },
  selectInput: {
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.18)",
    paddingHorizontal: 12,
    paddingVertical: Platform.OS === "ios" ? 10 : 8,
    backgroundColor: "#050B16",
  },
  selectText: {
    fontSize: 13,
    color: COLORS.textOnDark,
  },
  selectPlaceholder: {
    fontSize: 13,
    color: COLORS.textMuted,
  },
  formButtonsRow: {
    flexDirection: "row",
    justifyContent: "flex-end",
    marginTop: 14,
    gap: 10,
  },
  formButton: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
  },
  formButtonSecondary: {
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.18)",
  },
  formButtonSecondaryText: {
    fontSize: 13,
    color: COLORS.textOnDark,
  },
  formButtonPrimary: {
    backgroundColor: COLORS.primary,
  },
  formButtonPrimaryText: {
    fontSize: 13,
    fontWeight: "600",
    color: COLORS.textOnPrimary,
  },
  loadingContainer: {
    marginTop: 20,
    alignItems: "center",
  },
  loadingText: {
    marginTop: 8,
    fontSize: 13,
    color: COLORS.textMuted,
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
    marginTop: 12,
    gap: 12,
  },
  deploymentCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
    maxWidth: 700,
  },
  cardHeaderRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 6,
  },
  deploymentTitle: {
    fontSize: 15,
    fontWeight: "600",
    color: COLORS.textOnDark,
    marginBottom: 2,
  },
  deploymentSubTitle: {
    fontSize: 12,
    color: COLORS.textMuted,
  },
  deploymentLine: {
    fontSize: 13,
    color: COLORS.textOnDark,
    marginTop: 2,
  },
  deploymentValue: {
    fontWeight: "500",
  },
  cardActionsRow: {
    marginTop: 10,
    flexDirection: "row",
    justifyContent: "flex-end",
  },
  signOffButton: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: COLORS.primary,
  },
  signOffButtonText: {
    fontSize: 13,
    fontWeight: "600",
    color: COLORS.primary,
  },
  statusPill: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderWidth: 1,
  },
  statusOpen: {
    borderColor: COLORS.primary,
    backgroundColor: "rgba(49,148,160,0.08)",
  },
  statusCompleted: {
    borderColor: "rgba(99, 214, 111, 0.9)",
    backgroundColor: "rgba(99,214,111,0.08)",
  },
  statusOpenText: {
    fontSize: 10,
    fontWeight: "600",
    color: COLORS.primary,
  },
  statusCompletedText: {
    fontSize: 10,
    fontWeight: "600",
    color: "#6BEA7E",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  modalCard: {
    backgroundColor: "#050B16",
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.18)",
    maxHeight: "70%",
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: COLORS.textOnDark,
    marginBottom: 8,
  },
  modalList: {
    marginBottom: 12,
  },
  modalOption: {
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "rgba(255,255,255,0.12)",
  },
  modalOptionTitle: {
    fontSize: 14,
    color: COLORS.textOnDark,
  },
  modalOptionSubtitle: {
    fontSize: 12,
    color: COLORS.textMuted,
  },
  modalEmptyText: {
    fontSize: 13,
    color: COLORS.textMuted,
  },
  modalCloseButton: {
    alignSelf: "flex-end",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.22)",
  },
  modalCloseText: {
    fontSize: 12,
    color: COLORS.textOnDark,
  },
});

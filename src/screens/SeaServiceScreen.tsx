// src/screens/SeaServiceScreen.tsx
import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Platform,
  ActivityIndicator,
  Alert,
} from "react-native";
import DateTimePicker from "@react-native-community/datetimepicker";
import { Feather } from "@expo/vector-icons";

import { COLORS } from "../../theme";
import { getAll, run } from "../db/sqlite";
import TRBHeader from "../components/TRBHeader";


const CURRENT_CADET_ID = "cadet-001";

type VesselRow = {
  id: string;
  name: string;
  imo_number: string | null;
  vessel_type: string | null;
};

type DeploymentRow = {
  id: string;
  cadet_id: string;
  vessel_id: string;
  role: string;
  sign_on_date: string;
  sign_off_date: string | null;
  sign_on_port: string | null;
  sign_off_port: string | null;
  voyage_summary: string | null;
  created_at: string;
  updated_at: string;
};

type DeploymentForm = {
  id?: string;
  vesselId: string;
  role: string;
  signOnDate: string;
  signOffDate: string;
  signOnPort: string;
  signOffPort: string;
  voyageSummary: string;
};

const EMPTY_FORM: DeploymentForm = {
  vesselId: "",
  role: "",
  signOnDate: "",
  signOffDate: "",
  signOnPort: "",
  signOffPort: "",
  voyageSummary: "",
};

// ---- Shared date helpers (same behaviour as Cadet Profile) ----
function parseISODate(value: string): Date | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const [y, m, d] = trimmed.split("-").map((v) => Number(v));
  if (!y || !m || !d) return null;
  const date = new Date(y, m - 1, d);
  if (Number.isNaN(date.getTime())) return null;
  if (y < 1900 || y > 2100) return null;
  return date;
}

function formatDateInput(raw: string): string {
  const digits = raw.replace(/\D/g, "").slice(0, 8);
  if (digits.length <= 4) return digits;
  if (digits.length <= 6) return `${digits.slice(0, 4)}-${digits.slice(4)}`;
  return `${digits.slice(0, 4)}-${digits.slice(4, 6)}-${digits.slice(6)}`;
}

  const SeaServiceScreen: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [vessels, setVessels] = useState<VesselRow[]>([]);
  const [deployments, setDeployments] = useState<DeploymentRow[]>([]);

  const [form, setForm] = useState<DeploymentForm>(EMPTY_FORM);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Date picker state for sign-on / sign-off
  const [signOnDateObj, setSignOnDateObj] = useState<Date>(() => {
    return new Date();
  });
  const [showSignOnPicker, setShowSignOnPicker] = useState(false);

  const [signOffDateObj, setSignOffDateObj] = useState<Date>(() => {
    return new Date();
  });
  const [showSignOffPicker, setShowSignOffPicker] = useState(false);

  // ---- Load vessels + deployments ----
  useEffect(() => {
    let mounted = true;

    const load = async () => {
      try {
        const vesselRows = await getAll<VesselRow>(
          `
          SELECT id, name, imo_number, vessel_type
          FROM vessel
          ORDER BY name COLLATE NOCASE ASC;
        `
        );

        const deploymentRows = await getAll<DeploymentRow>(
          `
          SELECT
            id,
            cadet_id,
            vessel_id,
            role,
            sign_on_date,
            sign_off_date,
            sign_on_port,
            sign_off_port,
            voyage_summary,
            created_at,
            updated_at
          FROM sea_service_deployment
          WHERE cadet_id = ?
          ORDER BY sign_on_date DESC;
        `,
          [CURRENT_CADET_ID]
        );

        if (!mounted) return;

        setVessels(vesselRows);
        setDeployments(deploymentRows);
      } catch (err) {
        console.error("Error loading sea service data", err);
        Alert.alert("Error", "Could not load sea service data.");
      } finally {
        if (mounted) setLoading(false);
      }
    };

    load();
    return () => {
      mounted = false;
    };
  }, []);

  const vesselById = React.useMemo(() => {
    const map = new Map<string, VesselRow>();
    vessels.forEach((v) => map.set(v.id, v));
    return map;
  }, [vessels]);

  // ---- Form helpers ----
  const updateField = <K extends keyof DeploymentForm>(
    key: K,
    value: DeploymentForm[K]
  ) => {
    setForm((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  const resetForm = () => {
    setForm(EMPTY_FORM);
    setEditingId(null);
    setSignOnDateObj(new Date());
    setSignOffDateObj(new Date());
  };

  // ---- Date input handlers (typed + picker) ----
  const handleSignOnTextChange = (text: string) => {
    const formatted = formatDateInput(text);
    updateField("signOnDate", formatted);

    const parts = formatted.split("-");
    if (
      parts.length === 3 &&
      parts[0].length === 4 &&
      parts[1].length === 2 &&
      parts[2].length === 2
    ) {
      const parsed = parseISODate(formatted);
      if (parsed) setSignOnDateObj(parsed);
    }
  };

  const handleSignOnBlur = () => {
    if (!form.signOnDate) return;
    const parsed = parseISODate(form.signOnDate);
    if (!parsed) {
      Alert.alert(
        "Invalid sign-on date",
        "Please enter a valid date in YYYY-MM-DD format."
      );
      updateField("signOnDate", "");
      return;
    }
    setSignOnDateObj(parsed);
  };

  const handleSignOffTextChange = (text: string) => {
    const formatted = formatDateInput(text);
    updateField("signOffDate", formatted);

    const parts = formatted.split("-");
    if (
      parts.length === 3 &&
      parts[0].length === 4 &&
      parts[1].length === 2 &&
      parts[2].length === 2
    ) {
      const parsed = parseISODate(formatted);
      if (parsed) setSignOffDateObj(parsed);
    }
  };

  const handleSignOffBlur = () => {
    if (!form.signOffDate) return; // optional
    const parsed = parseISODate(form.signOffDate);
    if (!parsed) {
      Alert.alert(
        "Invalid sign-off date",
        "Please enter a valid date in YYYY-MM-DD format."
      );
      updateField("signOffDate", "");
      return;
    }
    setSignOffDateObj(parsed);
  };

  const onSignOnPickerChange = (_event: any, selected?: Date | undefined) => {
    if (Platform.OS !== "ios") setShowSignOnPicker(false);
    if (selected) {
      setSignOnDateObj(selected);
      const iso = selected.toISOString().slice(0, 10);
      updateField("signOnDate", iso);
    }
  };

  const onSignOffPickerChange = (_event: any, selected?: Date | undefined) => {
    if (Platform.OS !== "ios") setShowSignOffPicker(false);
    if (selected) {
      setSignOffDateObj(selected);
      const iso = selected.toISOString().slice(0, 10);
      updateField("signOffDate", iso);
    }
  };

  // ---- Save deployment (insert / update) ----
  const handleSave = async () => {
    if (!form.vesselId) {
      Alert.alert("Missing vessel", "Please select a vessel.");
      return;
    }
    if (!form.role.trim()) {
      Alert.alert("Missing rank/role", "Please enter your rank or role.");
      return;
    }
    if (!form.signOnDate.trim()) {
      Alert.alert("Missing sign-on date", "Please set the sign-on date.");
      return;
    }

    const validSignOn = parseISODate(form.signOnDate);
    if (!validSignOn) {
      Alert.alert("Invalid sign-on date", "Please fix the sign-on date.");
      return;
    }

    if (form.signOffDate.trim()) {
      const validSignOff = parseISODate(form.signOffDate);
      if (!validSignOff) {
        Alert.alert("Invalid sign-off date", "Please fix the sign-off date.");
        return;
      }
    }

    try {
      setSaving(true);
      const now = new Date().toISOString();

      if (editingId) {
        await run(
          `
          UPDATE sea_service_deployment
          SET
            vessel_id = ?,
            role = ?,
            sign_on_date = ?,
            sign_off_date = ?,
            sign_on_port = ?,
            sign_off_port = ?,
            voyage_summary = ?,
            updated_at = ?
          WHERE id = ?;
        `,
          [
            form.vesselId,
            form.role.trim(),
            form.signOnDate.trim(),
            form.signOffDate.trim() || null,
            form.signOnPort.trim() || null,
            form.signOffPort.trim() || null,
            form.voyageSummary.trim() || null,
            now,
            editingId,
          ]
        );
      } else {
        const newId = `deployment-${Date.now()}`;
        await run(
          `
          INSERT INTO sea_service_deployment (
            id,
            cadet_id,
            vessel_id,
            role,
            sign_on_date,
            sign_off_date,
            sign_on_port,
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
            newId,
            CURRENT_CADET_ID,
            form.vesselId,
            form.role.trim(),
            form.signOnDate.trim(),
            form.signOffDate.trim() || null,
            form.signOnPort.trim() || null,
            form.signOffPort.trim() || null,
            null,
            null,
            null,
            form.voyageSummary.trim() || null,
            now,
            now,
          ]
        );
      }

      // Reload list
      const deploymentRows = await getAll<DeploymentRow>(
        `
        SELECT
          id,
          cadet_id,
          vessel_id,
          role,
          sign_on_date,
          sign_off_date,
          sign_on_port,
          sign_off_port,
          voyage_summary,
          created_at,
          updated_at
        FROM sea_service_deployment
        WHERE cadet_id = ?
        ORDER BY sign_on_date DESC;
      `,
        [CURRENT_CADET_ID]
      );
      setDeployments(deploymentRows);
      resetForm();

      Alert.alert("Saved", "Sea service deployment saved.");
    } catch (err) {
      console.error("Error saving sea service deployment", err);
      Alert.alert("Error", "Could not save the deployment.");
    } finally {
      setSaving(false);
    }
  };

  // ---- Edit existing deployment ----
  const handleEditDeployment = (deployment: DeploymentRow) => {
    const signOn = deployment.sign_on_date || "";
    const signOff = deployment.sign_off_date || "";

    setForm({
      id: deployment.id,
      vesselId: deployment.vessel_id,
      role: deployment.role || "",
      signOnDate: signOn,
      signOffDate: signOff,
      signOnPort: deployment.sign_on_port || "",
      signOffPort: deployment.sign_off_port || "",
      voyageSummary: deployment.voyage_summary || "",
    });
    setEditingId(deployment.id);

    if (signOn) {
      const parsedOn = parseISODate(signOn);
      if (parsedOn) setSignOnDateObj(parsedOn);
    }
    if (signOff) {
      const parsedOff = parseISODate(signOff);
      if (parsedOff) setSignOffDateObj(parsedOff);
    }
  };

  // ---- Render ----

  if (loading) {
    return (
      <View style={styles.loadingRoot}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>Loading sea service data…</Text>
      </View>
    );
  }

  return (
    <View style={styles.root}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Sea service & contracts</Text>
        <Text style={styles.headerSubtitle}>
          Track sign-on / sign-off details and vessels served.
        </Text>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {/* Deployment form */}
        <View style={styles.card}>
          <View style={styles.cardHeaderRow}>
            <Text style={styles.cardTitle}>
              {editingId ? "Edit deployment" : "Add deployment"}
            </Text>
            {editingId && (
              <TouchableOpacity onPress={resetForm}>
                <Text style={styles.resetText}>Clear</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Vessel selection */}
          <Text style={styles.label}>Vessel</Text>
          <View style={styles.vesselChipsRow}>
            {vessels.length === 0 ? (
              <Text style={styles.smallMuted}>
                No vessels available. (Created by shore admin only.)
              </Text>
            ) : (
              vessels.map((vessel) => {
                const active = vessel.id === form.vesselId;
                return (
                  <TouchableOpacity
                    key={vessel.id}
                    style={[
                      styles.vesselChip,
                      active && styles.vesselChipActive,
                    ]}
                    onPress={() => updateField("vesselId", vessel.id)}
                  >
                    <Text
                      style={[
                        styles.vesselChipText,
                        active && styles.vesselChipTextActive,
                      ]}
                    >
                      {vessel.name}
                    </Text>
                  </TouchableOpacity>
                );
              })
            )}
          </View>

          {/* Role */}
          <Text style={styles.label}>Rank / role</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g. Deck Cadet, Engine Cadet"
            placeholderTextColor={COLORS.textMuted}
            value={form.role}
            onChangeText={(text) => updateField("role", text)}
          />

          {/* Sign-on date & port */}
          <Text style={styles.label}>Sign-on</Text>
          <View style={styles.dateRow}>
            <TextInput
              style={[styles.input, styles.dateInput]}
              placeholder="YYYY-MM-DD"
              placeholderTextColor={COLORS.textMuted}
              value={form.signOnDate}
              keyboardType="number-pad"
              onChangeText={handleSignOnTextChange}
              onBlur={handleSignOnBlur}
            />
            <TouchableOpacity
              style={styles.dateIconButton}
              onPress={() => setShowSignOnPicker(true)}
            >
              <Feather
                name="calendar"
                size={18}
                color={COLORS.textOnDark}
              />
            </TouchableOpacity>
          </View>
          {showSignOnPicker && (
            <DateTimePicker
              value={signOnDateObj}
              mode="date"
              display="spinner"
              onChange={onSignOnPickerChange}
            />
          )}

          <TextInput
            style={styles.input}
            placeholder="Sign-on port (optional)"
            placeholderTextColor={COLORS.textMuted}
            value={form.signOnPort}
            onChangeText={(text) => updateField("signOnPort", text)}
          />

          {/* Sign-off date & port */}
          <Text style={styles.label}>Sign-off (optional)</Text>
          <View style={styles.dateRow}>
            <TextInput
              style={[styles.input, styles.dateInput]}
              placeholder="YYYY-MM-DD"
              placeholderTextColor={COLORS.textMuted}
              value={form.signOffDate}
              keyboardType="number-pad"
              onChangeText={handleSignOffTextChange}
              onBlur={handleSignOffBlur}
            />
            <TouchableOpacity
              style={styles.dateIconButton}
              onPress={() => setShowSignOffPicker(true)}
            >
              <Feather
                name="calendar"
                size={18}
                color={COLORS.textOnDark}
              />
            </TouchableOpacity>
          </View>
          {showSignOffPicker && (
            <DateTimePicker
              value={signOffDateObj}
              mode="date"
              display="spinner"
              onChange={onSignOffPickerChange}
            />
          )}

          <TextInput
            style={styles.input}
            placeholder="Sign-off port (optional)"
            placeholderTextColor={COLORS.textMuted}
            value={form.signOffPort}
            onChangeText={(text) => updateField("signOffPort", text)}
          />

          {/* Voyage summary */}
          <Text style={styles.label}>Voyage summary (optional)</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            placeholder="e.g. India – Singapore – China – back to India"
            placeholderTextColor={COLORS.textMuted}
            value={form.voyageSummary}
            onChangeText={(text) => updateField("voyageSummary", text)}
            multiline
          />

          <View style={styles.formActionsRow}>
            <TouchableOpacity
              style={styles.saveButton}
              onPress={handleSave}
              disabled={saving}
            >
              <Text style={styles.saveButtonText}>
                {saving
                  ? "Saving…"
                  : editingId
                  ? "Update deployment"
                  : "Save deployment"}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Existing deployments list */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Recorded deployments</Text>

          {deployments.length === 0 ? (
            <Text style={styles.smallMuted}>
              No deployments saved yet. Add your first contract above.
            </Text>
          ) : (
            deployments.map((d) => {
              const vessel = vesselById.get(d.vessel_id);
              return (
                <View key={d.id} style={styles.deploymentCard}>
                  <View style={styles.deploymentHeaderRow}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.deploymentVesselName}>
                        {vessel?.name || "Unknown vessel"}
                      </Text>
                      <Text style={styles.deploymentMeta}>
                        {vessel?.vessel_type || "Vessel"} •{" "}
                        {vessel?.imo_number
                          ? `IMO ${vessel.imo_number}`
                          : "IMO unknown"}
                      </Text>
                    </View>
                    <TouchableOpacity
                      style={styles.deploymentEditButton}
                      onPress={() => handleEditDeployment(d)}
                    >
                      <Feather
                        name="edit-2"
                        size={14}
                        color={COLORS.textOnDark}
                      />
                    </TouchableOpacity>
                  </View>

                  <Text style={styles.deploymentRole}>
                    {d.role || "Role not set"}
                  </Text>

                  <Text style={styles.deploymentDates}>
                    {d.sign_on_date} →{" "}
                    {d.sign_off_date ? d.sign_off_date : "Present"}
                  </Text>

                  {(d.sign_on_port || d.sign_off_port) && (
                    <Text style={styles.deploymentPorts}>
                      {d.sign_on_port || "??"} →{" "}
                      {d.sign_off_port || "??"}
                    </Text>
                  )}

                  {d.voyage_summary && (
                    <Text style={styles.deploymentVoyage}>
                      {d.voyage_summary}
                    </Text>
                  )}
                </View>
              );
            })
          )}
        </View>
      </ScrollView>
    </View>
  );
};

// ---- Styles ----

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  loadingRoot: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: COLORS.background,
  },
  loadingText: {
    marginTop: 8,
    fontSize: 13,
    color: COLORS.textMuted,
  },
  header: {
    paddingTop: Platform.OS === "android" ? 40 : 20,
    paddingBottom: 12,
    paddingHorizontal: 24,
    backgroundColor: COLORS.primary,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: COLORS.textOnPrimary,
  },
  headerSubtitle: {
    marginTop: 4,
    fontSize: 12,
    color: "rgba(255,255,255,0.85)",
  },
  content: {
    paddingHorizontal: 24,
    paddingVertical: 16,
    paddingBottom: 40,
    gap: 16,
  },
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
  },
  cardHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: "600",
    color: COLORS.textOnDark,
    flex: 1,
  },
  resetText: {
    fontSize: 12,
    color: COLORS.primary,
  },
  label: {
    fontSize: 12,
    fontWeight: "500",
    color: COLORS.textOnDark,
    marginTop: 10,
    marginBottom: 4,
  },
  input: {
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.16)",
    paddingHorizontal: 10,
    paddingVertical: Platform.OS === "ios" ? 10 : 8,
    fontSize: 13,
    color: COLORS.textOnDark,
    backgroundColor: "#050B16",
  },
  textArea: {
    minHeight: 60,
    textAlignVertical: "top",
  },
  vesselChipsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 4,
  },
  vesselChip: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.25)",
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: "#050B16",
  },
  vesselChipActive: {
    borderColor: COLORS.primary,
    backgroundColor: "rgba(49,148,160,0.16)",
  },
  vesselChipText: {
    fontSize: 11,
    color: COLORS.textOnDark,
  },
  vesselChipTextActive: {
    color: COLORS.primary,
    fontWeight: "600",
  },
  smallMuted: {
    fontSize: 12,
    color: COLORS.textMuted,
  },
  dateRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  dateInput: {
    flex: 1,
  },
  dateIconButton: {
    marginLeft: 8,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.25)",
    padding: 8,
    backgroundColor: "#050B16",
  },
  formActionsRow: {
    marginTop: 16,
    alignItems: "flex-end",
  },
  saveButton: {
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 999,
    backgroundColor: COLORS.primary,
  },
  saveButtonText: {
    fontSize: 13,
    fontWeight: "600",
    color: COLORS.textOnPrimary,
  },
  deploymentCard: {
    marginTop: 10,
    padding: 12,
    borderRadius: 12,
    backgroundColor: "#050B16",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
  },
  deploymentHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 4,
  },
  deploymentVesselName: {
    fontSize: 14,
    fontWeight: "600",
    color: COLORS.textOnDark,
  },
  deploymentMeta: {
    fontSize: 11,
    color: COLORS.textMuted,
  },
  deploymentEditButton: {
    padding: 6,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.25)",
  },
  deploymentRole: {
    marginTop: 4,
    fontSize: 12,
    fontWeight: "500",
    color: COLORS.textOnDark,
  },
  deploymentDates: {
    marginTop: 4,
    fontSize: 12,
    color: COLORS.textOnDark,
  },
  deploymentPorts: {
    marginTop: 2,
    fontSize: 11,
    color: COLORS.textMuted,
  },
  deploymentVoyage: {
    marginTop: 4,
    fontSize: 11,
    color: COLORS.textMuted,
  },
});
export default SeaServiceScreen;

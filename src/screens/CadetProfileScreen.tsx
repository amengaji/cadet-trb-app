// src/screens/CadetProfileScreen.tsx
import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Platform,
  ScrollView,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Feather } from "@expo/vector-icons";
import DateTimePicker from "@react-native-community/datetimepicker";

import { COLORS } from "../../theme";
import { getAll, run } from "../db/sqlite";
import type { RootStackParamList } from "../navigation/RootNavigator";
import type { CadetStream } from "../models/crb";
import TRBHeader from "../components/TRBHeader";

type CadetProfileNav = NativeStackNavigationProp<
  RootStackParamList,
  "CadetProfile"
>;

const CURRENT_CADET_ID = "cadet-001";

type ProfileForm = {
  fullName: string;
  dateOfBirth: string;
  stream: CadetStream;
  dischargeBookNo: string;
  passportNo: string;
  academyName: string;
  academyId: string;
  nextOfKinName: string;
  nextOfKinContact: string;
};

const EMPTY_PROFILE: ProfileForm = {
  fullName: "",
  dateOfBirth: "",
  stream: "DECK",
  dischargeBookNo: "",
  passportNo: "",
  academyName: "",
  academyId: "",
  nextOfKinName: "",
  nextOfKinContact: "",
};

const STREAM_OPTIONS: Array<{ value: CadetStream; label: string }> = [
  { value: "DECK", label: "Deck" },
  { value: "ENGINE", label: "Engine" },
  { value: "ETO", label: "Electro-Technical" },
];

function parseISODate(value: string): Date | null {
  if (!value) return null;
  const [y, m, d] = value.split("-").map((v) => Number(v));
  if (!y || !m || !d) return null;
  const date = new Date(y, m - 1, d);
  return Number.isNaN(date.getTime()) ? null : date;
}

function formatDobInput(raw: string): string {
  const digits = raw.replace(/\D/g, "").slice(0, 8);
  if (digits.length <= 4) return digits;
  if (digits.length <= 6) return `${digits.slice(0, 4)}-${digits.slice(4)}`;
  return `${digits.slice(0, 4)}-${digits.slice(4, 6)}-${digits.slice(6)}`;
}

  const CadetProfileScreen: React.FC = () => {
  const navigation = useNavigation<CadetProfileNav>();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [hasExisting, setHasExisting] = useState(false);

  const [form, setForm] = useState<ProfileForm>(EMPTY_PROFILE);
  const [savedForm, setSavedForm] = useState<ProfileForm>(EMPTY_PROFILE);

  const [dobDateObj, setDobDateObj] = useState<Date>(new Date(2000, 0, 1));
  const [showDobPicker, setShowDobPicker] = useState(false);

  // Load profile from SQLite
  useEffect(() => {
    let mounted = true;
    const load = async () => {
      try {
        const rows = await getAll<any>(
          `SELECT * FROM cadet_profile WHERE id = ?;`,
          [CURRENT_CADET_ID]
        );

        if (!mounted) return;

        if (rows.length > 0) {
          const row = rows[0];
          const loaded: ProfileForm = {
            fullName: row.full_name ?? "",
            dateOfBirth: row.date_of_birth ?? "",
            stream: row.stream ?? "DECK",
            dischargeBookNo: row.discharge_book_no ?? "",
            passportNo: row.passport_no ?? "",
            academyName: row.academy_name ?? "",
            academyId: row.academy_id ?? "",
            nextOfKinName: row.next_of_kin_name ?? "",
            nextOfKinContact: row.next_of_kin_contact ?? "",
          };

          setForm(loaded);
          setSavedForm(loaded);
          setHasExisting(true);
          setIsEditing(false);

          const parsed = parseISODate(loaded.dateOfBirth);
          if (parsed) setDobDateObj(parsed);
        } else {
          setForm(EMPTY_PROFILE);
          setSavedForm(EMPTY_PROFILE);
          setHasExisting(false);
          setIsEditing(true); // No record → edit mode
        }
      } catch (err) {
        Alert.alert("Error", "Could not load cadet profile.");
      } finally {
        if (mounted) setLoading(false);
      }
    };

    load();
    return () => {
      mounted = false;
    };
  }, []);

  const updateField = <K extends keyof ProfileForm>(
    key: K,
    value: ProfileForm[K]
  ) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleToggleEdit = () => {
    if (!isEditing) {
      setIsEditing(true);
    } else {
      setForm(savedForm);
      const parsed = parseISODate(savedForm.dateOfBirth);
      if (parsed) setDobDateObj(parsed);
      setIsEditing(false);
    }
  };

  const handleDobTextChange = (text: string) => {
    if (!isEditing) return;
    const formatted = formatDobInput(text);
    updateField("dateOfBirth", formatted);
  };

  const handleDobBlur = () => {
    if (!form.dateOfBirth) return;
    const parsed = parseISODate(form.dateOfBirth);
    if (!parsed) {
      Alert.alert("Invalid date", "Use YYYY-MM-DD format.");
      updateField("dateOfBirth", "");
    } else setDobDateObj(parsed);
  };

  const onDobPickerChange = (_event: any, selected?: Date) => {
    if (Platform.OS !== "ios") setShowDobPicker(false);
    if (selected) {
      setDobDateObj(selected);
      updateField("dateOfBirth", selected.toISOString().slice(0, 10));
    }
  };

  const handleSave = async () => {
    if (!form.fullName.trim()) {
      Alert.alert("Missing name", "Please enter the full name.");
      return;
    }

    try {
      setSaving(true);
      const now = new Date().toISOString();

      if (hasExisting) {
        await run(
          `UPDATE cadet_profile SET
            full_name=?, date_of_birth=?, stream=?, discharge_book_no=?,
            passport_no=?, academy_name=?, academy_id=?,
            next_of_kin_name=?, next_of_kin_contact=?, updated_at=?
          WHERE id=?`,
          [
            form.fullName,
            form.dateOfBirth || null,
            form.stream,
            form.dischargeBookNo || null,
            form.passportNo || null,
            form.academyName || null,
            form.academyId || null,
            form.nextOfKinName || null,
            form.nextOfKinContact || null,
            now,
            CURRENT_CADET_ID,
          ]
        );
      } else {
        await run(
          `INSERT INTO cadet_profile (
            id, full_name, date_of_birth, stream,
            discharge_book_no, passport_no, academy_name,
            academy_id, next_of_kin_name, next_of_kin_contact,
            created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            CURRENT_CADET_ID,
            form.fullName,
            form.dateOfBirth || null,
            form.stream,
            form.dischargeBookNo || null,
            form.passportNo || null,
            form.academyName || null,
            form.academyId || null,
            form.nextOfKinName || null,
            form.nextOfKinContact || null,
            now,
            now,
          ]
        );
        setHasExisting(true);
      }

      setSavedForm(form);
      setIsEditing(false);
      Alert.alert("Saved", "Profile updated.");
    } catch (err) {
      Alert.alert("Error", "Could not save profile.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingRoot}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>Loading profile…</Text>
      </View>
    );
  }

  return (
    <View style={styles.root}>
      {/* NEW: Consistent TRB Header */}
      <TRBHeader
        title="Cadet Profile"
        subtitle={isEditing ? "Editing personal details" : "View stored TRB details"}
      />

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.card}>
          <View style={styles.editRow}>
            <Text style={styles.sectionTitle}>Personal Details</Text>
            <TouchableOpacity onPress={handleToggleEdit}>
              <Feather
                name="edit-2"
                size={16}
                color={COLORS.primary}
              />
            </TouchableOpacity>
          </View>

          {/* Full Name */}
          <Text style={styles.label}>Full Name</Text>
          <TextInput
            style={[styles.input, !isEditing && styles.inputReadonly]}
            editable={isEditing}
            value={form.fullName}
            onChangeText={(t) => updateField("fullName", t)}
          />

          {/* DOB */}
          <Text style={styles.label}>Date of Birth</Text>
          <View style={styles.dobRow}>
            <TextInput
              style={[styles.input, styles.flex1, !isEditing && styles.inputReadonly]}
              editable={isEditing}
              keyboardType="number-pad"
              placeholder="YYYY-MM-DD"
              value={form.dateOfBirth}
              onChangeText={handleDobTextChange}
              onBlur={handleDobBlur}
            />
            <TouchableOpacity
              style={styles.dobIcon}
              disabled={!isEditing}
              onPress={() => isEditing && setShowDobPicker(true)}
            >
              <Feather name="calendar" size={18} color={COLORS.textOnDark} />
            </TouchableOpacity>
          </View>

          {showDobPicker && (
            <DateTimePicker
              value={dobDateObj}
              mode="date"
              display="spinner"
              onChange={onDobPickerChange}
            />
          )}

          {/* Stream */}
          <Text style={styles.sectionTitle}>Stream</Text>
          <View style={styles.streamRow}>
            {STREAM_OPTIONS.map((opt) => (
              <TouchableOpacity
                key={opt.value}
                style={[
                  styles.streamChip,
                  form.stream === opt.value && styles.streamActive,
                ]}
                disabled={!isEditing}
                onPress={() => updateField("stream", opt.value)}
              >
                <Text
                  style={[
                    styles.streamChipText,
                    form.stream === opt.value && styles.streamChipTextActive,
                  ]}
                >
                  {opt.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Documents */}
          <Text style={styles.sectionTitle}>Documents</Text>

          <Text style={styles.label}>Discharge Book No.</Text>
          <TextInput
            style={[styles.input, !isEditing && styles.inputReadonly]}
            editable={isEditing}
            value={form.dischargeBookNo}
            onChangeText={(t) => updateField("dischargeBookNo", t)}
          />

          <Text style={styles.label}>Passport No.</Text>
          <TextInput
            style={[styles.input, !isEditing && styles.inputReadonly]}
            editable={isEditing}
            value={form.passportNo}
            onChangeText={(t) => updateField("passportNo", t)}
          />

          {/* Academy */}
          <Text style={styles.sectionTitle}>Academy / Institute</Text>

          <Text style={styles.label}>Academy Name</Text>
          <TextInput
            style={[styles.input, !isEditing && styles.inputReadonly]}
            editable={isEditing}
            value={form.academyName}
            onChangeText={(t) => updateField("academyName", t)}
          />

          <Text style={styles.label}>Academy ID</Text>
          <TextInput
            style={[styles.input, !isEditing && styles.inputReadonly]}
            editable={isEditing}
            value={form.academyId}
            onChangeText={(t) => updateField("academyId", t)}
          />

          {/* Next of kin */}
          <Text style={styles.sectionTitle}>Emergency Contact</Text>

          <Text style={styles.label}>Next of Kin Name</Text>
          <TextInput
            style={[styles.input, !isEditing && styles.inputReadonly]}
            editable={isEditing}
            value={form.nextOfKinName}
            onChangeText={(t) => updateField("nextOfKinName", t)}
          />

          <Text style={styles.label}>Next of Kin Contact</Text>
          <TextInput
            style={[styles.input, !isEditing && styles.inputReadonly]}
            editable={isEditing}
            value={form.nextOfKinContact}
            onChangeText={(t) => updateField("nextOfKinContact", t)}
          />

          {/* Save button */}
          {isEditing && (
            <TouchableOpacity
              style={styles.saveButton}
              onPress={handleSave}
              disabled={saving}
            >
              <Text style={styles.saveButtonText}>
                {saving ? "Saving…" : "Save Profile"}
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </ScrollView>
    </View>
  );
};

// ------------------ Styles ------------------ //

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  loadingRoot: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    marginTop: 8,
    fontSize: 13,
    color: COLORS.textMuted,
  },
  content: {
    paddingHorizontal: 24,
    paddingVertical: 16,
    paddingBottom: 32,
  },
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    padding: 18,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
  },
  sectionTitle: {
    marginTop: 12,
    marginBottom: 6,
    fontSize: 14,
    fontWeight: "600",
    color: COLORS.textOnDark,
  },
  label: {
    fontSize: 12,
    color: COLORS.textOnDark,
    marginBottom: 4,
    marginTop: 10,
  },
  input: {
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.16)",
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 13,
    color: COLORS.textOnDark,
    backgroundColor: "#050B16",
  },
  inputReadonly: {
    opacity: 0.7,
  },
  dobRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  flex1: { flex: 1 },
  dobIcon: {
    marginLeft: 10,
    padding: 10,
    backgroundColor: "#050B16",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.16)",
  },
  streamRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  streamChip: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.25)",
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: "#050B16",
  },
  streamActive: {
    borderColor: COLORS.primary,
    backgroundColor: "rgba(49,148,160,0.18)",
  },
  streamChipText: {
    fontSize: 12,
    color: COLORS.textOnDark,
  },
  streamChipTextActive: {
    color: COLORS.primary,
    fontWeight: "600",
  },
  saveButton: {
    marginTop: 20,
    paddingVertical: 12,
    borderRadius: 999,
    alignItems: "center",
    backgroundColor: COLORS.primary,
  },
  saveButtonText: {
    color: COLORS.textOnPrimary,
    fontWeight: "700",
  },
  editRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
});

export default CadetProfileScreen;

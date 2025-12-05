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

type CadetProfileNav = NativeStackNavigationProp<
  RootStackParamList,
  "CadetProfile"
>;

const CURRENT_CADET_ID = "cadet-001";

type ProfileForm = {
  fullName: string;
  dateOfBirth: string; // YYYY-MM-DD
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

const STREAM_OPTIONS: { value: CadetStream; label: string }[] = [
  { value: "DECK", label: "Deck" },
  { value: "ENGINE", label: "Engine" },
  { value: "ETO", label: "Electro-Technical" },
];

// Helper: parse YYYY-MM-DD into Date safely
function parseISODate(value: string): Date | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const [y, m, d] = trimmed.split("-").map((v) => Number(v));
  if (!y || !m || !d) return null;
  const date = new Date(y, m - 1, d);
  if (Number.isNaN(date.getTime())) return null;
  // basic sanity guard (1900–2100)
  if (y < 1900 || y > 2100) return null;
  return date;
}

// Helper: auto format typed digits into YYYY-MM-DD
function formatDobInput(raw: string): string {
  const digits = raw.replace(/\D/g, "").slice(0, 8); // max 8 digits
  if (digits.length <= 4) {
    return digits; // YYYY
  } else if (digits.length <= 6) {
    return `${digits.slice(0, 4)}-${digits.slice(4)}`; // YYYY-MM
  } else {
    return `${digits.slice(0, 4)}-${digits.slice(4, 6)}-${digits.slice(6)}`; // YYYY-MM-DD
  }
}

export const CadetProfileScreen: React.FC = () => {
  const navigation = useNavigation<CadetProfileNav>();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [hasExisting, setHasExisting] = useState(false);

  const [form, setForm] = useState<ProfileForm>(EMPTY_PROFILE);
  const [savedForm, setSavedForm] = useState<ProfileForm>(EMPTY_PROFILE);

  // DOB picker state
  const [dobDateObj, setDobDateObj] = useState<Date>(() => {
    return new Date(2000, 0, 1); // default
  });
  const [showDobPicker, setShowDobPicker] = useState(false);

  // ---- Load from DB on mount ----
  useEffect(() => {
    let mounted = true;

    const load = async () => {
      try {
        const rows = await getAll<any>(
          `
          SELECT *
          FROM cadet_profile
          WHERE id = ?;
        `,
          [CURRENT_CADET_ID]
        );

        if (!mounted) return;

        if (rows.length > 0) {
          const row = rows[0];
          const loaded: ProfileForm = {
            fullName: row.full_name ?? "",
            dateOfBirth: row.date_of_birth ?? "",
            stream: (row.stream as CadetStream) || "DECK",
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

          if (loaded.dateOfBirth) {
            const parsed = parseISODate(loaded.dateOfBirth);
            if (parsed) setDobDateObj(parsed);
          }
          setIsEditing(false); // view mode
        } else {
          setForm(EMPTY_PROFILE);
          setSavedForm(EMPTY_PROFILE);
          setHasExisting(false);
          setIsEditing(true); // no profile yet → start in edit mode
        }
      } catch (err) {
        console.error("Error loading cadet profile", err);
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

  // ---- Helpers & handlers ----

  const updateField = <K extends keyof ProfileForm>(
    key: K,
    value: ProfileForm[K]
  ) => {
    setForm((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  const handleClose = () => {
    navigation.goBack();
  };

  const handleToggleEdit = () => {
    if (!isEditing) {
      setIsEditing(true);
    } else {
      // cancel edit → revert to last saved snapshot
      setForm(savedForm);
      if (savedForm.dateOfBirth) {
        const parsed = parseISODate(savedForm.dateOfBirth);
        if (parsed) setDobDateObj(parsed);
      }
      setIsEditing(false);
    }
  };

  // When user types DOB manually
  const handleDobTextChange = (text: string) => {
    if (!isEditing) return;
    const formatted = formatDobInput(text);
    updateField("dateOfBirth", formatted);

    // if full YYYY-MM-DD and valid, sync dateObj
    const parts = formatted.split("-");
    if (parts.length === 3 && parts[0].length === 4 && parts[1].length === 2 && parts[2].length === 2) {
      const parsed = parseISODate(formatted);
      if (parsed) {
        setDobDateObj(parsed);
      }
    }
  };

  // When user leaves the DOB field
  const handleDobBlur = () => {
    if (!form.dateOfBirth) return;
    const parsed = parseISODate(form.dateOfBirth);
    if (!parsed) {
      Alert.alert(
        "Invalid date",
        "Please enter a valid date in YYYY-MM-DD format (e.g. 2001-09-15)."
      );
      updateField("dateOfBirth", "");
      return;
    }
    setDobDateObj(parsed);
  };

  // When user uses the native picker
  const onDobPickerChange = (_event: any, selected?: Date | undefined) => {
    if (Platform.OS !== "ios") {
      setShowDobPicker(false);
    }
    if (selected) {
      setDobDateObj(selected);
      const iso = selected.toISOString().slice(0, 10); // YYYY-MM-DD
      updateField("dateOfBirth", iso);
    }
  };

  const handleSave = async () => {
    if (!form.fullName.trim()) {
      Alert.alert("Missing name", "Please enter the cadet's full name.");
      return;
    }

    // Optional: validate DOB if provided
    if (form.dateOfBirth.trim()) {
      const parsed = parseISODate(form.dateOfBirth);
      if (!parsed) {
        Alert.alert(
          "Invalid date of birth",
          "Please fix the date of birth (YYYY-MM-DD) before saving."
        );
        return;
      }
    }

    try {
      setSaving(true);
      const now = new Date().toISOString();

      if (hasExisting) {
        await run(
          `
          UPDATE cadet_profile
          SET
            full_name = ?,
            date_of_birth = ?,
            stream = ?,
            discharge_book_no = ?,
            passport_no = ?,
            academy_name = ?,
            academy_id = ?,
            next_of_kin_name = ?,
            next_of_kin_contact = ?,
            updated_at = ?
          WHERE id = ?;
        `,
          [
            form.fullName.trim(),
            form.dateOfBirth.trim() || null,
            form.stream,
            form.dischargeBookNo.trim() || null,
            form.passportNo.trim() || null,
            form.academyName.trim() || null,
            form.academyId.trim() || null,
            form.nextOfKinName.trim() || null,
            form.nextOfKinContact.trim() || null,
            now,
            CURRENT_CADET_ID,
          ]
        );
      } else {
        await run(
          `
          INSERT INTO cadet_profile (
            id,
            full_name,
            date_of_birth,
            stream,
            discharge_book_no,
            passport_no,
            academy_name,
            academy_id,
            next_of_kin_name,
            next_of_kin_contact,
            created_at,
            updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
        `,
          [
            CURRENT_CADET_ID,
            form.fullName.trim(),
            form.dateOfBirth.trim() || null,
            form.stream,
            form.dischargeBookNo.trim() || null,
            form.passportNo.trim() || null,
            form.academyName.trim() || null,
            form.academyId.trim() || null,
            form.nextOfKinName.trim() || null,
            form.nextOfKinContact.trim() || null,
            now,
            now,
          ]
        );
        setHasExisting(true);
      }

      setSavedForm(form);
      setIsEditing(false);
      Alert.alert("Saved", "Cadet profile updated.");
    } catch (err) {
      console.error("Error saving cadet profile", err);
      Alert.alert("Error", "Could not save cadet profile.");
    } finally {
      setSaving(false);
    }
  };

  // ---- Render ----

  if (loading) {
    return (
      <View style={styles.loadingRoot}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>Loading cadet profile…</Text>
      </View>
    );
  }

  return (
    <View style={styles.root}>
      {/* Modal header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.headerIconLeft}
          onPress={handleClose}
        >
          <Feather name="x" size={20} color={COLORS.textOnPrimary} />
        </TouchableOpacity>

        <View style={styles.headerTitles}>
          <Text style={styles.headerTitle}>Cadet profile</Text>
          <Text style={styles.headerSubtitle}>
            {isEditing
              ? "Editing personal and academy details"
              : "View your stored TRB identity details"}
          </Text>
        </View>

        <TouchableOpacity
          style={styles.headerIconRight}
          onPress={handleToggleEdit}
        >
          <Feather
            name="edit-2"
            size={18}
            color={COLORS.textOnPrimary}
          />
        </TouchableOpacity>
      </View>

      {/* Modal content */}
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Personal details</Text>

          <Text style={styles.label}>Full name</Text>
          <TextInput
            style={[styles.input, !isEditing && styles.inputReadonly]}
            editable={isEditing}
            placeholder="e.g. John Stuart"
            placeholderTextColor={COLORS.textMuted}
            value={form.fullName}
            onChangeText={(text) => updateField("fullName", text)}
          />

          <Text style={styles.label}>Date of birth</Text>
          <View style={styles.dobRow}>
            <TextInput
              style={[
                styles.input,
                styles.dobInput,
                !isEditing && styles.inputReadonly,
              ]}
              editable={isEditing}
              keyboardType="number-pad"
              placeholder="YYYY-MM-DD"
              placeholderTextColor={COLORS.textMuted}
              value={form.dateOfBirth}
              onChangeText={handleDobTextChange}
              onBlur={handleDobBlur}
            />
            <TouchableOpacity
              style={[
                styles.dobIconButton,
                !isEditing && styles.dobIconButtonDisabled,
              ]}
              activeOpacity={isEditing ? 0.8 : 1}
              onPress={() => {
                if (!isEditing) return;
                setShowDobPicker(true);
              }}
            >
              <Feather
                name="calendar"
                size={18}
                color={COLORS.textOnDark}
              />
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

          <Text style={styles.label}>Stream</Text>
          <View style={styles.streamRow}>
            {STREAM_OPTIONS.map((opt) => {
              const active = form.stream === opt.value;
              return (
                <TouchableOpacity
                  key={opt.value}
                  style={[
                    styles.streamChip,
                    active && styles.streamChipActive,
                    !isEditing && styles.streamChipDisabled,
                  ]}
                  activeOpacity={isEditing ? 0.8 : 1}
                  onPress={() => {
                    if (!isEditing) return;
                    updateField("stream", opt.value);
                  }}
                >
                  <Text
                    style={[
                      styles.streamChipText,
                      active && styles.streamChipTextActive,
                    ]}
                  >
                    {opt.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <Text style={styles.sectionTitle}>Documents</Text>

          <Text style={styles.label}>Discharge book number</Text>
          <TextInput
            style={[styles.input, !isEditing && styles.inputReadonly]}
            editable={isEditing}
            placeholder="e.g. MUM123456"
            placeholderTextColor={COLORS.textMuted}
            value={form.dischargeBookNo}
            onChangeText={(text) => updateField("dischargeBookNo", text)}
          />

          <Text style={styles.label}>Passport number</Text>
          <TextInput
            style={[styles.input, !isEditing && styles.inputReadonly]}
            editable={isEditing}
            placeholder="e.g. Z1234567"
            placeholderTextColor={COLORS.textMuted}
            value={form.passportNo}
            onChangeText={(text) => updateField("passportNo", text)}
          />

          <Text style={styles.sectionTitle}>Academy / Institute</Text>

          <Text style={styles.label}>Academy name</Text>
          <TextInput
            style={[styles.input, !isEditing && styles.inputReadonly]}
            editable={isEditing}
            placeholder="e.g. Tolani Maritime Institute"
            placeholderTextColor={COLORS.textMuted}
            value={form.academyName}
            onChangeText={(text) => updateField("academyName", text)}
          />

          <Text style={styles.label}>Academy ID / roll no.</Text>
          <TextInput
            style={[styles.input, !isEditing && styles.inputReadonly]}
            editable={isEditing}
            placeholder="e.g. TMI-2025-1234"
            placeholderTextColor={COLORS.textMuted}
            value={form.academyId}
            onChangeText={(text) => updateField("academyId", text)}
          />

          <Text style={styles.sectionTitle}>Emergency contact</Text>

          <Text style={styles.label}>Next of kin name</Text>
          <TextInput
            style={[styles.input, !isEditing && styles.inputReadonly]}
            editable={isEditing}
            placeholder="e.g. Maria Stuart"
            placeholderTextColor={COLORS.textMuted}
            value={form.nextOfKinName}
            onChangeText={(text) => updateField("nextOfKinName", text)}
          />

          <Text style={styles.label}>Next of kin contact</Text>
          <TextInput
            style={[styles.input, !isEditing && styles.inputReadonly]}
            editable={isEditing}
            placeholder="Phone / email"
            placeholderTextColor={COLORS.textMuted}
            value={form.nextOfKinContact}
            onChangeText={(text) => updateField("nextOfKinContact", text)}
          />
        </View>

        {isEditing && (
          <View style={styles.footerActions}>
            <TouchableOpacity
              style={styles.saveButton}
              onPress={handleSave}
              disabled={saving}
            >
              <Text style={styles.saveButtonText}>
                {saving ? "Saving…" : "Save profile"}
              </Text>
            </TouchableOpacity>
          </View>
        )}
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
    flexDirection: "row",
    alignItems: "center",
  },
  headerIconLeft: {
    padding: 6,
    marginRight: 8,
  },
  headerIconRight: {
    padding: 6,
    marginLeft: 8,
  },
  headerTitles: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: COLORS.textOnPrimary,
  },
  headerSubtitle: {
    marginTop: 2,
    fontSize: 12,
    color: "rgba(255,255,255,0.85)",
  },
  content: {
    paddingHorizontal: 24,
    paddingVertical: 16,
    paddingBottom: 32,
    maxWidth: 800,
    width: "100%",
    alignSelf: "center",
  },
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: COLORS.textOnDark,
    marginBottom: 8,
    marginTop: 4,
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
  inputReadonly: {
    opacity: 0.7,
  },
  dobRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  dobInput: {
    flex: 1,
  },
  dobIconButton: {
    marginLeft: 8,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.25)",
    padding: 8,
    backgroundColor: "#050B16",
  },
  dobIconButtonDisabled: {
    opacity: 0.5,
  },
  streamRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 2,
  },
  streamChip: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.25)",
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: "#050B16",
  },
  streamChipActive: {
    borderColor: COLORS.primary,
    backgroundColor: "rgba(49,148,160,0.16)",
  },
  streamChipDisabled: {
    opacity: 0.6,
  },
  streamChipText: {
    fontSize: 11,
    color: COLORS.textOnDark,
  },
  streamChipTextActive: {
    color: COLORS.primary,
    fontWeight: "600",
  },
  footerActions: {
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
});

// src/screens/CadetProfileScreen.tsx
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
import type { CadetProfile, CadetStream } from "../models/crb";

type ProfileNavProp = NativeStackNavigationProp<
  RootStackParamList,
  "Profile"
>;

const STREAM_OPTIONS: { value: CadetStream; label: string }[] = [
  { value: "DECK", label: "Deck Cadet" },
  { value: "ENGINE", label: "Engine Cadet" },
  { value: "ETO", label: "Electro-Technical (ETO)" },
];


export const CadetProfileScreen: React.FC = () => {
  const navigation = useNavigation<ProfileNavProp>();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [profileId, setProfileId] = useState<string | null>(null);

  const [fullName, setFullName] = useState("");
  const [stream, setStream] = useState<CadetStream>("DECK");
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [dischargeBookNo, setDischargeBookNo] = useState("");
  const [passportNo, setPassportNo] = useState("");
  const [academyName, setAcademyName] = useState("");
  const [academyId, setAcademyId] = useState("");
  const [nextOfKinName, setNextOfKinName] = useState("");
  const [nextOfKinContact, setNextOfKinContact] = useState("");

  const handleBack = () => {
    if (navigation.canGoBack()) {
      navigation.goBack();
    } else {
      navigation.navigate("Home");
    }
  };

  useEffect(() => {
    let isMounted = true;

    const loadProfile = async () => {
      try {
        const rows = await getAll<any>(
          "SELECT * FROM cadet_profile LIMIT 1;"
        );

        if (!isMounted) return;

        if (rows.length === 0) {
          // Create an empty skeleton profile with id "cadet-001"
          const now = new Date().toISOString();
          const newId = "cadet-001";

          await run(
            `
            INSERT INTO cadet_profile (
              id,
              full_name,
              stream,
              created_at,
              updated_at
            ) VALUES (?, ?, ?, ?, ?);
          `,
            [newId, "", "DECK", now, now]
          );

          setProfileId(newId);
          setFullName("");
          setStream("DECK");
          setDateOfBirth("");
          setDischargeBookNo("");
          setPassportNo("");
          setAcademyName("");
          setAcademyId("");
          setNextOfKinName("");
          setNextOfKinContact("");
        } else {
          const row = rows[0];
          const profile: CadetProfile = {
            id: row.id,
            fullName: row.full_name ?? "",
            dateOfBirth: row.date_of_birth ?? undefined,
            stream: (row.stream as CadetStream) ?? "DECK",
            dischargeBookNo: row.discharge_book_no ?? undefined,
            passportNo: row.passport_no ?? undefined,
            academyName: row.academy_name ?? undefined,
            academyId: row.academy_id ?? undefined,
            nextOfKinName: row.next_of_kin_name ?? undefined,
            nextOfKinContact: row.next_of_kin_contact ?? undefined,
            createdAt: row.created_at ?? undefined,
            updatedAt: row.updated_at ?? undefined,
          };

          setProfileId(profile.id);
          setFullName(profile.fullName);
          setStream(profile.stream);
          setDateOfBirth(profile.dateOfBirth ?? "");
          setDischargeBookNo(profile.dischargeBookNo ?? "");
          setPassportNo(profile.passportNo ?? "");
          setAcademyName(profile.academyName ?? "");
          setAcademyId(profile.academyId ?? "");
          setNextOfKinName(profile.nextOfKinName ?? "");
          setNextOfKinContact(profile.nextOfKinContact ?? "");
        }
      } catch (error) {
        console.error("Error loading cadet profile", error);
        Alert.alert(
          "Error",
          "Could not load profile. See console for details."
        );
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    loadProfile();

    return () => {
      isMounted = false;
    };
  }, []);

  const handleSave = async () => {
    if (!fullName.trim()) {
      Alert.alert("Missing name", "Please enter the cadet’s full name.");
      return;
    }

    try {
      setSaving(true);
      const now = new Date().toISOString();

      if (profileId) {
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
            fullName.trim(),
            dateOfBirth.trim() || null,
            stream,
            dischargeBookNo.trim() || null,
            passportNo.trim() || null,
            academyName.trim() || null,
            academyId.trim() || null,
            nextOfKinName.trim() || null,
            nextOfKinContact.trim() || null,
            now,
            profileId,
          ]
        );
      } else {
        const newId = "cadet-001";
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
            newId,
            fullName.trim(),
            dateOfBirth.trim() || null,
            stream,
            dischargeBookNo.trim() || null,
            passportNo.trim() || null,
            academyName.trim() || null,
            academyId.trim() || null,
            nextOfKinName.trim() || null,
            nextOfKinContact.trim() || null,
            now,
            now,
          ]
        );
        setProfileId(newId);
      }

      Alert.alert("Saved", "Cadet profile updated.");
    } catch (error) {
      console.error("Error saving cadet profile", error);
      Alert.alert("Error", "Could not save profile. See console for details.");
    } finally {
      setSaving(false);
    }
  };

  const currentStreamLabel =
    STREAM_OPTIONS.find((opt) => opt.value === stream)?.label ?? "Cadet";

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
          <Text style={styles.appSubtitle}>Cadet Profile</Text>
        </View>
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>Loading profile...</Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.content}>
          {/* Summary strip */}
          <View style={styles.summaryStrip}>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryLabel}>Cadet</Text>
              <Text style={styles.summaryValue}>
                {fullName.trim() || "Unnamed cadet"}
              </Text>
            </View>
            <View style={styles.summaryDivider} />
            <View style={styles.summaryItem}>
              <Text style={styles.summaryLabel}>Stream</Text>
              <Text style={styles.summaryValue}>{currentStreamLabel}</Text>
            </View>
          </View>

          {/* Main profile card */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Personal details</Text>

            <Text style={styles.label}>Full name *</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. Cadet John Smith"
              placeholderTextColor={COLORS.textMuted}
              value={fullName}
              onChangeText={setFullName}
            />

            <Text style={styles.label}>Stream</Text>
            <View style={styles.streamRow}>
              {STREAM_OPTIONS.map((opt) => {
                const isActive = opt.value === stream;
                return (
                  <TouchableOpacity
                    key={opt.value}
                    style={[
                      styles.streamPill,
                      isActive && styles.streamPillActive,
                    ]}
                    onPress={() => setStream(opt.value)}
                  >
                    <Text
                      style={[
                        styles.streamPillText,
                        isActive && styles.streamPillTextActive,
                      ]}
                    >
                      {opt.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <Text style={styles.label}>Date of birth (YYYY-MM-DD)</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. 2002-08-15"
              placeholderTextColor={COLORS.textMuted}
              value={dateOfBirth}
              onChangeText={setDateOfBirth}
            />

            <Text style={styles.label}>Discharge book number</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. MUM123456"
              placeholderTextColor={COLORS.textMuted}
              value={dischargeBookNo}
              onChangeText={setDischargeBookNo}
            />

            <Text style={styles.label}>Passport number</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. P1234567"
              placeholderTextColor={COLORS.textMuted}
              value={passportNo}
              onChangeText={setPassportNo}
            />

            <Text style={styles.cardTitle}>Academy / Institute</Text>

            <Text style={styles.label}>Academy name</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. T.S. Rahaman"
              placeholderTextColor={COLORS.textMuted}
              value={academyName}
              onChangeText={setAcademyName}
            />

            <Text style={styles.label}>Batch / ID</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. Deck Batch 2024-A"
              placeholderTextColor={COLORS.textMuted}
              value={academyId}
              onChangeText={setAcademyId}
            />

            <Text style={styles.cardTitle}>Emergency contact</Text>

            <Text style={styles.label}>Next of kin name</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. Maria Smith"
              placeholderTextColor={COLORS.textMuted}
              value={nextOfKinName}
              onChangeText={setNextOfKinName}
            />

            <Text style={styles.label}>Next of kin contact</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. +91 98xxxxxxx"
              placeholderTextColor={COLORS.textMuted}
              value={nextOfKinContact}
              onChangeText={setNextOfKinContact}
            />

            <View style={styles.actionsRow}>
              <TouchableOpacity
                style={styles.saveButton}
                onPress={handleSave}
                disabled={saving}
              >
                <Text style={styles.saveButtonText}>
                  {saving ? "Saving..." : "Save profile"}
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          <Text style={styles.footerNote}>
            These details will be used across your Training Record Book for
            sea-service testimonials, task sign-off, and PDF exports.
          </Text>
        </ScrollView>
      )}
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
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
    maxWidth: 700,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: "600",
    color: COLORS.textOnDark,
    marginTop: 12,
    marginBottom: 6,
  },
  label: {
    fontSize: 13,
    fontWeight: "500",
    color: COLORS.textOnDark,
    marginTop: 10,
    marginBottom: 4,
  },
  input: {
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.14)",
    paddingHorizontal: 10,
    paddingVertical: Platform.OS === "ios" ? 10 : 6,
    fontSize: 13,
    color: COLORS.textOnDark,
    backgroundColor: "#050B16",
  },
  streamRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 4,
  },
  streamPill: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.18)",
    backgroundColor: "#050B16",
  },
  streamPillActive: {
    borderColor: COLORS.primary,
    backgroundColor: "rgba(49,148,160,0.16)",
  },
  streamPillText: {
    fontSize: 12,
    color: COLORS.textOnDark,
  },
  streamPillTextActive: {
    color: COLORS.primary,
    fontWeight: "600",
  },
  actionsRow: {
    marginTop: 18,
    flexDirection: "row",
    justifyContent: "flex-end",
  },
  saveButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 999,
    backgroundColor: COLORS.primary,
  },
  saveButtonText: {
    fontSize: 13,
    fontWeight: "600",
    color: COLORS.textOnPrimary,
  },
  footerNote: {
    marginTop: 16,
    fontSize: 12,
    color: COLORS.textMuted,
    maxWidth: 700,
  },
});

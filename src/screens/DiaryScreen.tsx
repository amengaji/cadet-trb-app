// src/screens/DiaryScreen.tsx
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
  TextInput,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import DateTimePicker from "@react-native-community/datetimepicker";
import { Feather } from "@expo/vector-icons";

import { COLORS } from "../../theme";
import type { RootStackParamList } from "../navigation/RootNavigator";
import { getAll, run } from "../db/sqlite";
import type { DiaryEntry, DiaryEntryType } from "../models/crb";
import TRBHeader from "../components/TRBHeader";
import HomeScreen from "./HomeScreen";


type DiaryNavProp = NativeStackNavigationProp<RootStackParamList, "Diary">;

const CURRENT_CADET_ID = "cadet-001";

type TypeFilter = "ALL" | DiaryEntryType;

const TYPE_LABEL: Record<DiaryEntryType, string> = {
  DAILY: "Daily",
  BRIDGE: "Bridge watch",
  ENGINE: "Engine watch",
};

const FILTER_LABEL: Record<TypeFilter, string> = {
  ALL: "All entries",
  DAILY: "Daily",
  BRIDGE: "Bridge",
  ENGINE: "Engine",
};

  const DiaryScreen: React.FC = () => {
  const navigation = useNavigation<DiaryNavProp>();

  const [loading, setLoading] = useState(true);
  const [entries, setEntries] = useState<DiaryEntry[]>([]);
  const [filterType, setFilterType] = useState<TypeFilter>("ALL");

  // Are we editing an existing entry?
  const [editingEntry, setEditingEntry] = useState<DiaryEntry | null>(null);

  // ----- New / edit entry core state -----

  const [newType, setNewType] = useState<DiaryEntryType>("DAILY");

  // Date (ISO for DB) + display text + picker
  const [newDate, setNewDate] = useState(() =>
    new Date().toISOString().slice(0, 10)
  );
  const [dateInput, setDateInput] = useState(() =>
    formatIsoToDisplay(new Date().toISOString().slice(0, 10))
  );
  const [dateError, setDateError] = useState<string | null>(null);
  const [dateObj, setDateObj] = useState<Date>(() => new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);

  // Time + pickers
  const [newTimeStart, setNewTimeStart] = useState("");
  const [newTimeEnd, setNewTimeEnd] = useState("");
  const [timeStartObj, setTimeStartObj] = useState<Date | null>(null);
  const [timeEndObj, setTimeEndObj] = useState<Date | null>(null);
  const [showStartTimePicker, setShowStartTimePicker] = useState(false);
  const [showEndTimePicker, setShowEndTimePicker] = useState(false);

  // Textual fields
  const [newSummary, setNewSummary] = useState("");
  const [newCourse, setNewCourse] = useState("");
  const [newSpeed, setNewSpeed] = useState("");
  const [newWeather, setNewWeather] = useState("");
  const [newRole, setNewRole] = useState("");
  const [newSteeringMinutes, setNewSteeringMinutes] = useState("");
  const [newMachineryMonitored, setNewMachineryMonitored] = useState("");
  const [newRemarks, setNewRemarks] = useState("");

  // Lat / Lon body (digits only) + hemisphere toggles
  // Latitude: DDMM.m (e.g. 0115.0) -> display as 01°15.0 in the box
  const [latBody, setLatBody] = useState("");
  const [latHem, setLatHem] = useState<"N" | "S">("N");

  // Longitude: DDDMM.m (e.g. 10345.0) -> display as 103°45.0
  const [lonBody, setLonBody] = useState("");
  const [lonHem, setLonHem] = useState<"E" | "W">("E");

  const [saving, setSaving] = useState(false);

  // ----- Navigation -----

  const handleBack = () => {
    if (navigation.canGoBack()) {
      navigation.goBack();
    } else {
      navigation.navigate("Home");
    }
  };

  // ----- Load entries from DB -----

  useEffect(() => {
    let isMounted = true;

    const load = async () => {
      try {
        const loaded = await loadEntriesForCadet(CURRENT_CADET_ID);
        if (isMounted) {
          setEntries(loaded);
        }
      } catch (error) {
        console.error("Error loading diary entries", error);
        Alert.alert(
          "Error",
          "Could not load diary entries. See console for details."
        );
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    load();

    return () => {
      isMounted = false;
    };
  }, []);

  const refreshEntries = async () => {
    const loaded = await loadEntriesForCadet(CURRENT_CADET_ID);
    setEntries(loaded);
  };

  // ----- Derived values -----

  const filteredEntries = useMemo(() => {
    if (filterType === "ALL") return entries;
    return entries.filter((e) => e.entryType === filterType);
  }, [entries, filterType]);

  const { totalEntries, bridgeHours, engineHours } = useMemo(() => {
    let total = entries.length;
    let bridge = 0;
    let engine = 0;

    for (const e of entries) {
      if (e.entryType === "BRIDGE") {
        const hrs = estimateHours(e.timeStart, e.timeEnd);
        bridge += hrs;
      }
      if (e.entryType === "ENGINE") {
        const hrs = estimateHours(e.timeStart, e.timeEnd);
        engine += hrs;
      }
    }

    return { totalEntries: total, bridgeHours: bridge, engineHours: engine };
  }, [entries]);

  // ----- Date & time picker callbacks -----

  const onDateChange = (_event: any, selectedDate?: Date | undefined) => {
    if (Platform.OS !== "ios") {
      setShowDatePicker(false);
    }

    if (selectedDate) {
      setDateObj(selectedDate);
      const iso = selectedDate.toISOString().slice(0, 10);
      setNewDate(iso);
      setDateInput(formatIsoToDisplay(iso));
      setDateError(null);
    }
  };

  const handleDateTextChange = (text: string) => {
    const digits = text.replace(/\D/g, "").slice(0, 8); // DDMMYYYY
    let formatted = digits;

    if (digits.length > 2 && digits.length <= 4) {
      formatted = `${digits.slice(0, 2)}-${digits.slice(2)}`;
    } else if (digits.length > 4) {
      formatted = `${digits.slice(0, 2)}-${digits.slice(2, 4)}-${digits.slice(
        4
      )}`;
    }

    setDateInput(formatted);
    setDateError(null);

    if (digits.length === 8) {
      const dd = Number(digits.slice(0, 2));
      const mm = Number(digits.slice(2, 4));
      const yyyy = Number(digits.slice(4));

      const parsed = parseDisplayDate(dd, mm, yyyy);
      if (!parsed) {
        setDateError("Invalid date");
        return;
      }

      const iso = toIsoFromParts(dd, mm, yyyy);
      setNewDate(iso);
      setDateObj(parsed);
      setDateError(null);
    }
  };

  const onStartTimeChange = (_event: any, selected?: Date | undefined) => {
    if (Platform.OS !== "ios") {
      setShowStartTimePicker(false);
    }
    if (selected) {
      setTimeStartObj(selected);
      setNewTimeStart(formatTime(selected));
    }
  };

  const onEndTimeChange = (_event: any, selected?: Date | undefined) => {
    if (Platform.OS !== "ios") {
      setShowEndTimePicker(false);
    }
    if (selected) {
      setTimeEndObj(selected);
      setNewTimeEnd(formatTime(selected));
    }
  };

  // ----- Edit existing entry -----

  const startEditing = (entry: DiaryEntry) => {
    setEditingEntry(entry);

    setNewType(entry.entryType);
    setNewDate(entry.date);
    setDateInput(formatIsoToDisplay(entry.date));
    setDateError(null);

    const parsedDate = new Date(entry.date);
    if (!Number.isNaN(parsedDate.getTime())) {
      setDateObj(parsedDate);
    }

    setNewTimeStart(entry.timeStart ?? "");
    setNewTimeEnd(entry.timeEnd ?? "");
    setTimeStartObj(entry.timeStart ? buildDateFromTime(entry.timeStart) : null);
    setTimeEndObj(entry.timeEnd ? buildDateFromTime(entry.timeEnd) : null);

    setNewSummary(entry.summary ?? "");
    setNewCourse(
      entry.courseOverGroundDeg != null
        ? String(entry.courseOverGroundDeg)
        : ""
    );
    setNewSpeed(
      entry.speedOverGroundKnots != null
        ? String(entry.speedOverGroundKnots)
        : ""
    );
    setNewWeather(entry.weatherSummary ?? "");
    setNewRole(entry.role ?? "");
    setNewSteeringMinutes(
      entry.steeringMinutes != null ? String(entry.steeringMinutes) : ""
    );
    setNewMachineryMonitored(entry.machineryMonitored ?? "");
    setNewRemarks(entry.remarks ?? "");

    if (entry.positionLat) {
      const parsed = parseLatBodyFromDisplay(entry.positionLat);
      if (parsed) {
        setLatBody(parsed.body);
        setLatHem(parsed.hem);
      } else {
        setLatBody("");
        setLatHem("N");
      }
    } else {
      setLatBody("");
      setLatHem("N");
    }

    if (entry.positionLon) {
      const parsed = parseLonBodyFromDisplay(entry.positionLon);
      if (parsed) {
        setLonBody(parsed.body);
        setLonHem(parsed.hem);
      } else {
        setLonBody("");
        setLonHem("E");
      }
    } else {
      setLonBody("");
      setLonHem("E");
    }
  };

  const cancelEditing = () => {
    setEditingEntry(null);

    setNewTimeStart("");
    setNewTimeEnd("");
    setTimeStartObj(null);
    setTimeEndObj(null);
    setNewSummary("");
    setNewCourse("");
    setNewSpeed("");
    setNewWeather("");
    setNewRole("");
    setNewSteeringMinutes("");
    setNewMachineryMonitored("");
    setNewRemarks("");
    setLatBody("");
    setLatHem("N");
    setLonBody("");
    setLonHem("E");
    setDateError(null);
  };

  // ----- Save (insert or update) -----

  const handleSaveNewEntry = async () => {
    if (!newDate.trim()) {
      Alert.alert("Missing date", "Please select a date.");
      return;
    }

    if (newType === "BRIDGE" || newType === "ENGINE") {
      if (!newTimeStart.trim() || !newTimeEnd.trim()) {
        Alert.alert(
          "Missing time",
          "Please select start and end time for watch entries."
        );
        return;
      }
    }

    // Build + validate Lat / Lon for bridge entries
    let positionLat: string | null = null;
    let positionLon: string | null = null;

    if (newType === "BRIDGE") {
      if (latBody.trim()) {
        const res = buildLatStringFromBody(latBody, latHem);
        if (!res.ok) {
          Alert.alert("Invalid latitude", res.message);
          return;
        }
        positionLat = res.value!;
      }

      if (lonBody.trim()) {
        const res = buildLonStringFromBody(lonBody, lonHem);
        if (!res.ok) {
          Alert.alert("Invalid longitude", res.message);
          return;
        }
        positionLon = res.value!;
      }
    }

    try {
      setSaving(true);
      const now = new Date().toISOString();

      const steeringMinutes =
        newType === "BRIDGE" && newSteeringMinutes.trim()
          ? Number(newSteeringMinutes.trim()) || null
          : null;

      const courseNum = newCourse.trim()
        ? Number(newCourse.trim()) || null
        : null;
      const speedNum = newSpeed.trim()
        ? Number(newSpeed.trim()) || null
        : null;

      // Ensure audit table exists (idempotent)
      await run(
        `
        CREATE TABLE IF NOT EXISTS diary_entry_audit (
          id TEXT PRIMARY KEY NOT NULL,
          diary_entry_id TEXT NOT NULL,
          cadet_id TEXT,
          snapshot_json TEXT NOT NULL,
          change_type TEXT NOT NULL,
          changed_at TEXT NOT NULL
        );
      `,
        []
      );

      if (editingEntry) {
        // --- UPDATE + audit log ---

        const auditId = `diary-audit-${Date.now()}`;
        const snapshot = JSON.stringify(editingEntry);

        await run(
          `
          INSERT INTO diary_entry_audit (
            id,
            diary_entry_id,
            cadet_id,
            snapshot_json,
            change_type,
            changed_at
          ) VALUES (?, ?, ?, ?, ?, ?);
        `,
          [
            auditId,
            editingEntry.id,
            CURRENT_CADET_ID,
            snapshot,
            "UPDATE",
            now,
          ]
        );

        await run(
          `
          UPDATE diary_entry
          SET
            date = ?,
            entry_type = ?,
            time_start = ?,
            time_end = ?,
            summary = ?,
            position_lat = ?,
            position_lon = ?,
            course_over_ground_deg = ?,
            speed_over_ground_knots = ?,
            weather_summary = ?,
            role = ?,
            steering_minutes = ?,
            machinery_monitored = ?,
            remarks = ?,
            updated_at = ?
          WHERE id = ?;
        `,
          [
            newDate.trim(),
            newType,
            newType === "DAILY" ? null : newTimeStart.trim() || null,
            newType === "DAILY" ? null : newTimeEnd.trim() || null,
            newSummary.trim() || null,
            positionLat,
            positionLon,
            courseNum,
            speedNum,
            newWeather.trim() || null,
            newRole.trim() || null,
            steeringMinutes,
            newType === "ENGINE"
              ? newMachineryMonitored.trim() || null
              : null,
            newRemarks.trim() || null,
            now,
            editingEntry.id,
          ]
        );
      } else {
        // --- INSERT new row ---

        const id = `diary-${Date.now()}`;

        await run(
          `
          INSERT INTO diary_entry (
            id,
            cadet_id,
            deployment_id,
            date,
            entry_type,
            time_start,
            time_end,
            summary,
            position_lat,
            position_lon,
            course_over_ground_deg,
            speed_over_ground_knots,
            weather_summary,
            role,
            steering_minutes,
            machinery_monitored,
            remarks,
            created_at,
            updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
        `,
          [
            id,
            CURRENT_CADET_ID,
            null,
            newDate.trim(),
            newType,
            newType === "DAILY" ? null : newTimeStart.trim() || null,
            newType === "DAILY" ? null : newTimeEnd.trim() || null,
            newSummary.trim() || null,
            positionLat,
            positionLon,
            courseNum,
            speedNum,
            newWeather.trim() || null,
            newRole.trim() || null,
            steeringMinutes,
            newType === "ENGINE"
              ? newMachineryMonitored.trim() || null
              : null,
            newRemarks.trim() || null,
            now,
            now,
          ]
        );
      }

      await refreshEntries();

      setEditingEntry(null);

      // Reset non-date fields (keep type + date for convenience)
      setNewTimeStart("");
      setNewTimeEnd("");
      setTimeStartObj(null);
      setTimeEndObj(null);
      setNewSummary("");
      setNewCourse("");
      setNewSpeed("");
      setNewWeather("");
      setNewRole("");
      setNewSteeringMinutes("");
      setNewMachineryMonitored("");
      setNewRemarks("");
      setLatBody("");
      setLatHem("N");
      setLonBody("");
      setLonHem("E");
      setDateError(null);

      Alert.alert(
        "Saved",
        editingEntry ? "Diary entry updated." : "Diary entry added."
      );
    } catch (error) {
      console.error("Error saving diary entry", error);
      Alert.alert(
        "Error",
        "Could not save diary entry. See console for details."
      );
    } finally {
      setSaving(false);
    }
  };

  // ----- Render -----

  return (
    <View style={styles.root}>
      <TRBHeader
        title="Diary & Watchkeeping"
        subtitle="Daily logs, bridge & engine watch entries"
      />

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>Loading diary entries...</Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.content}>
          {/* Summary strip */}
          <View style={styles.summaryStrip}>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryLabel}>Entries</Text>
              <Text style={styles.summaryValue}>{totalEntries}</Text>
            </View>
            <View style={styles.summaryDivider} />
            <View style={styles.summaryItem}>
              <Text style={styles.summaryLabel}>Bridge watch (hrs)</Text>
              <Text style={styles.summaryValue}>{bridgeHours}</Text>
            </View>
            <View style={styles.summaryDivider} />
            <View style={styles.summaryItem}>
              <Text style={styles.summaryLabel}>Engine watch (hrs)</Text>
              <Text style={styles.summaryValue}>{engineHours}</Text>
            </View>
          </View>

          <Text style={styles.heading}>
            {editingEntry ? "Edit entry" : "New entry"}
          </Text>
          <Text style={styles.text}>
            Record either a daily training summary, a bridge watch, or an engine
            watch. These entries will feed into your TRB watchkeeping totals.
          </Text>

          {/* Type selector */}
          <View style={styles.chipRow}>
            {(["DAILY", "BRIDGE", "ENGINE"] as DiaryEntryType[]).map((t) => {
              const isActive = newType === t;
              return (
                <TouchableOpacity
                  key={t}
                  style={[styles.chip, isActive && styles.chipActive]}
                  onPress={() => setNewType(t)}
                >
                  <Text
                    style={[
                      styles.chipText,
                      isActive && styles.chipTextActive,
                    ]}
                  >
                    {TYPE_LABEL[t]}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* New / edit entry form */}
          <View style={styles.card}>
            {/* Date with profile-style input + picker */}
            <Text style={styles.label}>Date</Text>
            <View style={styles.dateRow}>
              <TextInput
                style={[
                  styles.dateTextInput,
                  dateError && styles.inputErrorBorder,
                ]}
                placeholder="DD-MM-YYYY"
                placeholderTextColor={COLORS.textMuted}
                keyboardType="numeric"
                value={dateInput}
                onChangeText={handleDateTextChange}
                maxLength={10}
              />
              <TouchableOpacity
                style={styles.calendarButton}
                onPress={() => setShowDatePicker(true)}
              >
                <Feather
                  name="calendar"
                  size={16}
                  color={COLORS.textOnDark}
                />
              </TouchableOpacity>
            </View>
            {dateError && <Text style={styles.errorText}>{dateError}</Text>}
            {showDatePicker && (
              <DateTimePicker
                value={dateObj}
                mode="date"
                display={Platform.OS === "ios" ? "inline" : "default"}
                onChange={onDateChange}
              />
            )}

            {(newType === "BRIDGE" || newType === "ENGINE") && (
              <>
                <Text style={styles.label}>Time</Text>
                <View style={styles.row}>
                  <View style={styles.rowHalf}>
                    <Text style={styles.subLabel}>Start</Text>
                    <TouchableOpacity
                      style={styles.dateButton}
                      onPress={() => setShowStartTimePicker(true)}
                    >
                      <Text style={styles.dateButtonText}>
                        {newTimeStart || "Select start time"}
                      </Text>
                    </TouchableOpacity>
                    {showStartTimePicker && (
                      <DateTimePicker
                        value={timeStartObj || new Date()}
                        mode="time"
                        is24Hour={true}
                        display={
                          Platform.OS === "ios" ? "spinner" : "default"
                        }
                        onChange={onStartTimeChange}
                      />
                    )}
                  </View>
                  <View style={styles.rowGap} />
                  <View style={styles.rowHalf}>
                    <Text style={styles.subLabel}>End</Text>
                    <TouchableOpacity
                      style={styles.dateButton}
                      onPress={() => setShowEndTimePicker(true)}
                    >
                      <Text style={styles.dateButtonText}>
                        {newTimeEnd || "Select end time"}
                      </Text>
                    </TouchableOpacity>
                    {showEndTimePicker && (
                      <DateTimePicker
                        value={timeEndObj || new Date()}
                        mode="time"
                        is24Hour={true}
                        display={
                          Platform.OS === "ios" ? "spinner" : "default"
                        }
                        onChange={onEndTimeChange}
                      />
                    )}
                  </View>
                </View>
              </>
            )}

            {newType === "BRIDGE" && (
              <>
                <Text style={styles.label}>Latitude (DDMM.m)</Text>
                <View style={styles.row}>
                  <View style={styles.rowHalf}>
                    <TextInput
                      style={styles.input}
                      placeholder="e.g. 0115.0"
                      placeholderTextColor={COLORS.textMuted}
                      value={formatLatDisplay(latBody)}
                      onChangeText={(text) =>
                        setLatBody(sanitizeLatLonInput(text))
                      }
                      keyboardType="numeric"
                    />
                  </View>
                  <View style={styles.rowGap} />
                  <View style={styles.hemisphereToggle}>
                    <TouchableOpacity
                      style={[
                        styles.hemisphereChip,
                        latHem === "N" && styles.hemisphereChipActive,
                      ]}
                      onPress={() => setLatHem("N")}
                    >
                      <Text
                        style={[
                          styles.hemisphereChipText,
                          latHem === "N" && styles.hemisphereChipTextActive,
                        ]}
                      >
                        N
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[
                        styles.hemisphereChip,
                        latHem === "S" && styles.hemisphereChipActive,
                      ]}
                      onPress={() => setLatHem("S")}
                    >
                      <Text
                        style={[
                          styles.hemisphereChipText,
                          latHem === "S" && styles.hemisphereChipTextActive,
                        ]}
                      >
                        S
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>

                <Text style={styles.label}>Longitude (DDDMM.m)</Text>
                <View style={styles.row}>
                  <View style={styles.rowHalf}>
                    <TextInput
                      style={styles.input}
                      placeholder="e.g. 10345.0"
                      placeholderTextColor={COLORS.textMuted}
                      value={formatLonDisplay(lonBody)}
                      onChangeText={(text) =>
                        setLonBody(sanitizeLatLonInput(text))
                      }
                      keyboardType="numeric"
                    />
                  </View>
                  <View style={styles.rowGap} />
                  <View style={styles.hemisphereToggle}>
                    <TouchableOpacity
                      style={[
                        styles.hemisphereChip,
                        lonHem === "E" && styles.hemisphereChipActive,
                      ]}
                      onPress={() => setLonHem("E")}
                    >
                      <Text
                        style={[
                          styles.hemisphereChipText,
                          lonHem === "E" && styles.hemisphereChipTextActive,
                        ]}
                      >
                        E
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[
                        styles.hemisphereChip,
                        lonHem === "W" && styles.hemisphereChipActive,
                      ]}
                      onPress={() => setLonHem("W")}
                    >
                      <Text
                        style={[
                          styles.hemisphereChipText,
                          lonHem === "W" && styles.hemisphereChipTextActive,
                        ]}
                      >
                        W
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>

                <View style={styles.row}>
                  <View style={styles.rowHalf}>
                    <Text style={styles.subLabel}>Course (°)</Text>
                    <TextInput
                      style={styles.input}
                      placeholder="e.g. 090"
                      placeholderTextColor={COLORS.textMuted}
                      value={newCourse}
                      onChangeText={setNewCourse}
                      keyboardType="numeric"
                    />
                  </View>
                  <View style={styles.rowGap} />
                  <View style={styles.rowHalf}>
                    <Text style={styles.subLabel}>Speed (kn)</Text>
                    <TextInput
                      style={styles.input}
                      placeholder="e.g. 12.5"
                      placeholderTextColor={COLORS.textMuted}
                      value={newSpeed}
                      onChangeText={setNewSpeed}
                      keyboardType="numeric"
                    />
                  </View>
                </View>

                <Text style={styles.label}>Weather / visibility</Text>
                <TextInput
                  style={styles.input}
                  placeholder="e.g. Good vis, slight sea, NE'ly wind F3"
                  placeholderTextColor={COLORS.textMuted}
                  value={newWeather}
                  onChangeText={setNewWeather}
                />

                <Text style={styles.label}>Steering minutes (optional)</Text>
                <TextInput
                  style={styles.input}
                  placeholder="e.g. 30"
                  placeholderTextColor={COLORS.textMuted}
                  value={newSteeringMinutes}
                  onChangeText={setNewSteeringMinutes}
                  keyboardType="numeric"
                />
              </>
            )}

            {newType === "ENGINE" && (
              <>
                <Text style={styles.label}>Machinery monitored</Text>
                <TextInput
                  style={[styles.input, styles.textArea]}
                  placeholder="e.g. Main engine lubricating oil system, generators 1 & 2"
                  placeholderTextColor={COLORS.textMuted}
                  value={newMachineryMonitored}
                  onChangeText={setNewMachineryMonitored}
                  multiline
                />
              </>
            )}

            <Text style={styles.label}>
              Summary ({newType === "DAILY" ? "daily work" : "watch details"})
            </Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder={
                newType === "DAILY"
                  ? "e.g. Assisted 3/O with chart corrections, attended safety meeting..."
                  : "e.g. Kept bridge watch with OOW, monitored traffic on ARPA, adjusted course during pilotage..."
              }
              placeholderTextColor={COLORS.textMuted}
              value={newSummary}
              onChangeText={setNewSummary}
              multiline
            />

            <Text style={styles.label}>Role / capacity (optional)</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. Lookout, helmsman, engine room watch"
              placeholderTextColor={COLORS.textMuted}
              value={newRole}
              onChangeText={setNewRole}
            />

            <Text style={styles.label}>Remarks (optional)</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Any additional notes, incidents, or lessons learnt."
              placeholderTextColor={COLORS.textMuted}
              value={newRemarks}
              onChangeText={setNewRemarks}
              multiline
            />

            <View style={styles.actionsRow}>
              {editingEntry && (
                <TouchableOpacity
                  style={styles.cancelButton}
                  onPress={cancelEditing}
                  disabled={saving}
                >
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity
                style={styles.saveButton}
                onPress={handleSaveNewEntry}
                disabled={saving}
              >
                <Text style={styles.saveButtonText}>
                  {saving
                    ? editingEntry
                      ? "Updating..."
                      : "Saving..."
                    : editingEntry
                    ? "Update entry"
                    : "Add entry"}
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Filter existing entries */}
          <Text style={styles.heading}>Previous entries</Text>
          <View style={styles.chipRow}>
            {(["ALL", "DAILY", "BRIDGE", "ENGINE"] as TypeFilter[]).map(
              (type) => {
                const isActive = filterType === type;
                return (
                  <TouchableOpacity
                    key={type}
                    style={[styles.chipSmall, isActive && styles.chipActive]}
                    onPress={() => setFilterType(type)}
                  >
                    <Text
                      style={[
                        styles.chipTextSmall,
                        isActive && styles.chipTextActive,
                      ]}
                    >
                      {FILTER_LABEL[type]}
                    </Text>
                  </TouchableOpacity>
                );
              }
            )}
          </View>

          {filteredEntries.length === 0 ? (
            <View style={styles.emptyBox}>
              <Text style={styles.emptyTitle}>No entries yet</Text>
              <Text style={styles.emptyText}>
                Use the form above to add your first diary or watch entry.
              </Text>
            </View>
          ) : (
            <View style={styles.listContainer}>
              {filteredEntries.map((entry) => (
                <DiaryEntryCard
                  key={entry.id}
                  entry={entry}
                  onEdit={() => startEditing(entry)}
                />
              ))}
            </View>
          )}
        </ScrollView>
      )}
    </View>
  );
};

// ---- Entry card ----

type DiaryEntryCardProps = {
  entry: DiaryEntry;
  onEdit: () => void;
};

const DiaryEntryCard: React.FC<DiaryEntryCardProps> = ({
  entry,
  onEdit,
}) => {
  const typeLabel = TYPE_LABEL[entry.entryType];

  const timeRange =
    entry.timeStart && entry.timeEnd
      ? `${entry.timeStart}–${entry.timeEnd}`
      : undefined;

  const hasBridgePosition =
    !!entry.positionLat || !!entry.positionLon || !!entry.courseOverGroundDeg;

  const hours =
    entry.entryType === "BRIDGE" || entry.entryType === "ENGINE"
      ? estimateHours(entry.timeStart, entry.timeEnd)
      : undefined;

  return (
    <View style={styles.entryCard}>
      <View style={styles.entryHeaderRow}>
        <View style={{ flex: 1 }}>
          <Text style={styles.entryDate}>
            {formatIsoToDisplay(entry.date)}
          </Text>
          <Text style={styles.entryTitle}>{typeLabel}</Text>
        </View>
        <View
          style={[
            styles.entryTypePill,
            entry.entryType === "BRIDGE"
              ? styles.entryTypeBridge
              : entry.entryType === "ENGINE"
              ? styles.entryTypeEngine
              : styles.entryTypeDaily,
          ]}
        >
          <Text style={styles.entryTypePillText}>{typeLabel}</Text>
        </View>
      </View>

      {timeRange && (
        <Text style={styles.entryMetaText}>Time: {timeRange}</Text>
      )}

      {hours !== undefined && (
        <Text style={styles.entryMetaText}>
          Counted hours: {hours.toFixed(1)}
        </Text>
      )}

      {hasBridgePosition && (
        <Text style={styles.entryMetaText}>
          {entry.positionLat && `Pos: ${entry.positionLat} `}
          {entry.positionLon && `${entry.positionLon} `}
          {entry.courseOverGroundDeg !== undefined &&
            `(C:${entry.courseOverGroundDeg}°) `}
          {entry.speedOverGroundKnots !== undefined &&
            `(S:${entry.speedOverGroundKnots} kn)`}
        </Text>
      )}

      {entry.machineryMonitored && (
        <Text style={styles.entryMetaText}>
          Machinery: {entry.machineryMonitored}
        </Text>
      )}

      {entry.weatherSummary && (
        <Text style={styles.entryMetaText}>
          Weather: {entry.weatherSummary}
        </Text>
      )}

      {entry.role && (
        <Text style={styles.entryMetaText}>Role: {entry.role}</Text>
      )}

      {entry.summary && (
        <Text style={styles.entrySummary}>{entry.summary}</Text>
      )}

      {entry.remarks && (
        <Text style={styles.entryRemarks}>Remarks: {entry.remarks}</Text>
      )}

      <View style={styles.entryActionsRow}>
        <TouchableOpacity style={styles.entryEditButton} onPress={onEdit}>
          <Feather name="edit-2" size={14} color={COLORS.textOnDark} />
        </TouchableOpacity>
      </View>
    </View>
  );
};

// ---- Data helper ----

async function loadEntriesForCadet(cadetId: string): Promise<DiaryEntry[]> {
  const rows = await getAll<any>(
    `
    SELECT *
    FROM diary_entry
    WHERE cadet_id = ?
    ORDER BY date DESC, time_start DESC;
  `,
    [cadetId]
  );

  return rows.map((row: any): DiaryEntry => ({
    id: row.id,
    cadetId: row.cadet_id,
    deploymentId: row.deployment_id ?? undefined,
    date: row.date,
    entryType: row.entry_type as DiaryEntryType,
    timeStart: row.time_start ?? undefined,
    timeEnd: row.time_end ?? undefined,
    summary: row.summary ?? undefined,
    positionLat: row.position_lat ?? undefined,
    positionLon: row.position_lon ?? undefined,
    courseOverGroundDeg: row.course_over_ground_deg ?? undefined,
    speedOverGroundKnots: row.speed_over_ground_knots ?? undefined,
    weatherSummary: row.weather_summary ?? undefined,
    role: row.role ?? undefined,
    steeringMinutes: row.steering_minutes ?? undefined,
    machineryMonitored: row.machinery_monitored ?? undefined,
    remarks: row.remarks ?? undefined,
    createdAt: row.created_at ?? undefined,
    updatedAt: row.updated_at ?? undefined,
  }));
}

// ---- Small util for approximate hours ----

function estimateHours(start?: string, end?: string): number {
  if (!start || !end) return 0;

  const [sh, sm] = start.split(":").map((x) => Number(x) || 0);
  const [eh, em] = end.split(":").map((x) => Number(x) || 0);

  const startMin = sh * 60 + sm;
  let endMin = eh * 60 + em;

  // Handle case where watch crosses midnight (e.g. 22:00–02:00)
  if (endMin < startMin) {
    endMin += 24 * 60;
  }

  const diffMin = endMin - startMin;
  return diffMin / 60;
}

// ---- Date helpers (profile-style) ----

function formatIsoToDisplay(iso: string | undefined | null): string {
  if (!iso) return "";
  const parts = iso.split("-");
  if (parts.length !== 3) return iso;
  const [yyyy, mm, dd] = parts;
  return `${dd}-${mm}-${yyyy}`;
}

function toIsoFromParts(dd: number, mm: number, yyyy: number): string {
  const d = dd.toString().padStart(2, "0");
  const m = mm.toString().padStart(2, "0");
  const y = yyyy.toString().padStart(4, "0");
  return `${y}-${m}-${d}`;
}

function parseDisplayDate(
  dd: number,
  mm: number,
  yyyy: number
): Date | null {
  if (dd < 1 || dd > 31) return null;
  if (mm < 1 || mm > 12) return null;
  if (yyyy < 1900 || yyyy > 2100) return null;

  const d = new Date(yyyy, mm - 1, dd);
  if (
    d.getFullYear() !== yyyy ||
    d.getMonth() !== mm - 1 ||
    d.getDate() !== dd
  ) {
    return null;
  }
  return d;
}

// ---- Lat / Lon helpers ----

type ParseResult =
  | { ok: true; value: string }
  | { ok: false; message: string };

function buildLatStringFromBody(
  body: string,
  hem: "N" | "S"
): ParseResult {
  const raw = body.trim();
  if (!raw) {
    return { ok: false, message: "Latitude cannot be empty." };
  }
  if (raw.length < 3) {
    return {
      ok: false,
      message: "Latitude should be in DDMM.m format (e.g. 0115.0).",
    };
  }

  const degStr = raw.slice(0, 2);
  const minStr = raw.slice(2);

  const deg = Number(degStr);
  const minutes = Number(minStr);

  if (Number.isNaN(deg) || Number.isNaN(minutes)) {
    return {
      ok: false,
      message: "Latitude must contain only numbers and decimal point.",
    };
  }

  if (deg < 0 || deg > 90) {
    return {
      ok: false,
      message: "Latitude degrees must be between 0 and 90.",
    };
  }

  if (minutes < 0 || minutes >= 60) {
    return {
      ok: false,
      message: "Latitude minutes must be between 0.0 and 59.999.",
    };
  }

  const degFormatted = deg.toString().padStart(2, "0");
  const minFormatted = minutes.toFixed(1); // 1 decimal place

  const final = `${degFormatted}°${minFormatted}'${hem}`;
  return { ok: true, value: final };
}

function buildLonStringFromBody(
  body: string,
  hem: "E" | "W"
): ParseResult {
  const raw = body.trim();
  if (!raw) {
    return { ok: false, message: "Longitude cannot be empty." };
  }
  if (raw.length < 4) {
    return {
      ok: false,
      message: "Longitude should be in DDDMM.m format (e.g. 10345.0).",
    };
  }

  const degStr = raw.slice(0, 3);
  const minStr = raw.slice(3);

  const deg = Number(degStr);
  const minutes = Number(minStr);

  if (Number.isNaN(deg) || Number.isNaN(minutes)) {
    return {
      ok: false,
      message: "Longitude must contain only numbers and decimal point.",
    };
  }

  if (deg < 0 || deg > 180) {
    return {
      ok: false,
      message: "Longitude degrees must be between 0 and 180.",
    };
  }

  if (minutes < 0 || minutes >= 60) {
    return {
      ok: false,
      message: "Longitude minutes must be between 0.0 and 59.999.",
    };
  }

  const degFormatted = deg.toString().padStart(3, "0");
  const minFormatted = minutes.toFixed(1);

  const final = `${degFormatted}°${minFormatted}'${hem}`;
  return { ok: true, value: final };
}

// Format display with ° after 2 or 3 digits

function formatLatDisplay(body: string): string {
  const raw = body.trim();
  if (!raw) return "";
  if (raw.length <= 2) return raw;
  return raw.slice(0, 2) + "°" + raw.slice(2);
}

function formatLonDisplay(body: string): string {
  const raw = body.trim();
  if (!raw) return "";
  if (raw.length <= 3) return raw;
  return raw.slice(0, 3) + "°" + raw.slice(3);
}

function sanitizeLatLonInput(text: string): string {
  return text.replace(/[^0-9.]/g, "");
}

// Parse back from display string like "01°15.0'N" into "0115.0" + hemisphere

function parseLatBodyFromDisplay(display: string): {
  body: string;
  hem: "N" | "S";
} | null {
  const trimmed = display.trim();
  if (!trimmed) return null;

  const hemMatch = trimmed.match(/([NS])/i);
  const hem = (hemMatch?.[1].toUpperCase() as "N" | "S") ?? "N";

  const digits = trimmed.replace(/[^0-9.]/g, "");
  if (!digits) return null;

  return { body: digits, hem };
}

function parseLonBodyFromDisplay(display: string): {
  body: string;
  hem: "E" | "W";
} | null {
  const trimmed = display.trim();
  if (!trimmed) return null;

  const hemMatch = trimmed.match(/([EW])/i);
  const hem = (hemMatch?.[1].toUpperCase() as "E" | "W") ?? "E";

  const digits = trimmed.replace(/[^0-9.]/g, "");
  if (!digits) return null;

  return { body: digits, hem };
}

// Time helpers

function formatTime(d: Date): string {
  const h = d.getHours().toString().padStart(2, "0");
  const m = d.getMinutes().toString().padStart(2, "0");
  return `${h}:${m}`;
}

function buildDateFromTime(time: string): Date {
  const [hStr, mStr] = time.split(":");
  const now = new Date();
  const h = Number(hStr) || 0;
  const m = Number(mStr) || 0;
  now.setHours(h, m, 0, 0);
  return now;
}

// ---- Styles ----

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: COLORS.background,
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
    maxWidth: 900,
    width: "100%",
    alignSelf: "center",
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
    marginBottom: 12,
    maxWidth: 700,
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
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
    maxWidth: 700,
    marginBottom: 16,
  },
  label: {
    fontSize: 13,
    fontWeight: "500",
    color: COLORS.textOnDark,
    marginTop: 10,
    marginBottom: 4,
  },
  subLabel: {
    fontSize: 11,
    fontWeight: "500",
    color: COLORS.textMuted,
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
  textArea: {
    minHeight: 60,
    textAlignVertical: "top",
  },
  row: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 4,
  },
  rowHalf: {
    flex: 1,
  },
  rowGap: {
    width: 10,
  },
  actionsRow: {
    marginTop: 16,
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 8,
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
  cancelButton: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 999,
    backgroundColor: "transparent",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.24)",
  },
  cancelButtonText: {
    fontSize: 13,
    color: COLORS.textOnDark,
  },
  dateButton: {
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.14)",
    paddingHorizontal: 10,
    paddingVertical: 10,
    backgroundColor: "#050B16",
  },
  dateButtonText: {
    fontSize: 13,
    color: COLORS.textOnDark,
  },
  // New: profile-style date row
  dateRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  dateTextInput: {
    flex: 1,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.14)",
    paddingHorizontal: 10,
    paddingVertical: Platform.OS === "ios" ? 10 : 6,
    fontSize: 13,
    color: COLORS.textOnDark,
    backgroundColor: "#050B16",
  },
  calendarButton: {
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.24)",
    backgroundColor: "#050B16",
  },
  inputErrorBorder: {
    borderColor: "#ff6b6b",
  },
  errorText: {
    marginTop: 2,
    fontSize: 11,
    color: "#ff6b6b",
  },
  hemisphereToggle: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.2)",
    overflow: "hidden",
  },
  hemisphereChip: {
    paddingHorizontal: 8,
    paddingVertical: 6,
  },
  hemisphereChipActive: {
    backgroundColor: COLORS.primary,
  },
  hemisphereChipText: {
    fontSize: 11,
    color: COLORS.textOnDark,
  },
  hemisphereChipTextActive: {
    color: COLORS.textOnPrimary,
    fontWeight: "600",
  },
  emptyBox: {
    marginTop: 10,
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
    gap: 10,
  },
  entryCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
    maxWidth: 700,
  },
  entryHeaderRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 4,
  },
  entryDate: {
    fontSize: 12,
    color: COLORS.textMuted,
    marginBottom: 2,
  },
  entryTitle: {
    fontSize: 15,
    fontWeight: "600",
    color: COLORS.textOnDark,
  },
  entryTypePill: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderWidth: 1,
    marginLeft: 10,
  },
  entryTypeDaily: {
    borderColor: "rgba(255,255,255,0.2)",
    backgroundColor: "rgba(255,255,255,0.05)",
  },
  entryTypeBridge: {
    borderColor: "rgba(0,168,255,0.9)",
    backgroundColor: "rgba(0,168,255,0.08)",
  },
  entryTypeEngine: {
    borderColor: "rgba(255,193,7,0.9)",
    backgroundColor: "rgba(255,193,7,0.08)",
  },
  entryTypePillText: {
    fontSize: 10,
    fontWeight: "600",
    color: COLORS.textOnDark,
  },
  entryMetaText: {
    fontSize: 12,
    color: COLORS.textMuted,
  },
  entrySummary: {
    fontSize: 13,
    color: COLORS.textOnDark,
    marginTop: 6,
  },
  entryRemarks: {
    fontSize: 12,
    color: COLORS.textMuted,
    marginTop: 4,
  },
  entryActionsRow: {
    marginTop: 8,
    flexDirection: "row",
    justifyContent: "flex-end",
  },
  entryEditButton: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.25)",
  },
});
export default HomeScreen;

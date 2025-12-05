// src/screens/DiaryScreen.tsx
import React, { useEffect, useMemo, useState } from "react";
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
import DateTimePicker from "@react-native-community/datetimepicker";

import { COLORS } from "../../theme";
import type { RootStackParamList } from "../navigation/RootNavigator";
import { getAll, run } from "../db/sqlite";
import type { DiaryEntry, DiaryEntryType } from "../models/crb";

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

export const DiaryScreen: React.FC = () => {
  const navigation = useNavigation<DiaryNavProp>();

  const [loading, setLoading] = useState(true);
  const [entries, setEntries] = useState<DiaryEntry[]>([]);
  const [filterType, setFilterType] = useState<TypeFilter>("ALL");

  // New entry state
  const [newType, setNewType] = useState<DiaryEntryType>("DAILY");

  // Date state + native picker
  const [newDate, setNewDate] = useState(() =>
    new Date().toISOString().slice(0, 10)
  );
  const [dateObj, setDateObj] = useState<Date>(() => new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);

  // Time / summary / watch details
  const [newTimeStart, setNewTimeStart] = useState("");
  const [newTimeEnd, setNewTimeEnd] = useState("");
  const [newSummary, setNewSummary] = useState("");
  const [newCourse, setNewCourse] = useState("");
  const [newSpeed, setNewSpeed] = useState("");
  const [newWeather, setNewWeather] = useState("");
  const [newRole, setNewRole] = useState("");
  const [newSteeringMinutes, setNewSteeringMinutes] = useState("");
  const [newMachineryMonitored, setNewMachineryMonitored] = useState("");
  const [newRemarks, setNewRemarks] = useState("");

  // Lat / Long structured (so cadet never types "°")
  const [latDeg, setLatDeg] = useState("");
  const [latMin, setLatMin] = useState("");
  const [latHem, setLatHem] = useState<"N" | "S">("N");

  const [lonDeg, setLonDeg] = useState("");
  const [lonMin, setLonMin] = useState("");
  const [lonHem, setLonHem] = useState<"E" | "W">("E");

  const [saving, setSaving] = useState(false);

  const handleBack = () => {
    if (navigation.canGoBack()) {
      navigation.goBack();
    } else {
      navigation.navigate("Home");
    }
  };

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

  const onDateChange = (
    _event: any,
    selectedDate?: Date | undefined
  ) => {
    if (Platform.OS !== "ios") {
      setShowDatePicker(false);
    }

    if (selectedDate) {
      setDateObj(selectedDate);
      const iso = selectedDate.toISOString().slice(0, 10);
      setNewDate(iso);
    }
  };

  const handleSaveNewEntry = async () => {
    if (!newDate.trim()) {
      Alert.alert("Missing date", "Please select a date.");
      return;
    }

    if (newType === "BRIDGE" || newType === "ENGINE") {
      if (!newTimeStart.trim() || !newTimeEnd.trim()) {
        Alert.alert(
          "Missing time",
          "Please enter start and end time for watch entries (HH:MM)."
        );
        return;
      }
    }

    try {
      setSaving(true);
      const now = new Date().toISOString();
      const id = `diary-${Date.now()}`;

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

      const positionLat =
        newType === "BRIDGE"
          ? buildLatString(latDeg, latMin, latHem)
          : null;

      const positionLon =
        newType === "BRIDGE"
          ? buildLonString(lonDeg, lonMin, lonHem)
          : null;

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

      await refreshEntries();

      // Reset form lightly but keep date & type (Cadet is usually logging multiple in same day)
      setNewTimeStart("");
      setNewTimeEnd("");
      setNewSummary("");
      setNewCourse("");
      setNewSpeed("");
      setNewWeather("");
      setNewRole("");
      setNewSteeringMinutes("");
      setNewMachineryMonitored("");
      setNewRemarks("");
      setLatDeg("");
      setLatMin("");
      setLatHem("N");
      setLonDeg("");
      setLonMin("");
      setLonHem("E");

      Alert.alert("Saved", "Diary entry added.");
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
          <Text style={styles.appSubtitle}>Diary & Watchkeeping</Text>
        </View>
      </View>

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

          <Text style={styles.heading}>New entry</Text>
          <Text style={styles.text}>
            Record either a daily training summary, a bridge watch, or an engine
            watch. Later, these will feed into your TRB watchkeeping totals.
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

          {/* New entry form */}
          <View style={styles.card}>
            {/* Date with native picker */}
            <Text style={styles.label}>Date</Text>
            <TouchableOpacity
              style={styles.dateButton}
              onPress={() => setShowDatePicker(true)}
            >
              <Text style={styles.dateButtonText}>
                {newDate || "Select date"}
              </Text>
            </TouchableOpacity>
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
                <Text style={styles.label}>Time (HH:MM)</Text>
                <View style={styles.row}>
                  <View style={styles.rowHalf}>
                    <Text style={styles.subLabel}>Start</Text>
                    <TextInput
                      style={styles.input}
                      placeholder="e.g. 04:00"
                      placeholderTextColor={COLORS.textMuted}
                      value={newTimeStart}
                      onChangeText={setNewTimeStart}
                    />
                  </View>
                  <View style={styles.rowGap} />
                  <View style={styles.rowHalf}>
                    <Text style={styles.subLabel}>End</Text>
                    <TextInput
                      style={styles.input}
                      placeholder="e.g. 08:00"
                      placeholderTextColor={COLORS.textMuted}
                      value={newTimeEnd}
                      onChangeText={setNewTimeEnd}
                    />
                  </View>
                </View>
              </>
            )}

            {newType === "BRIDGE" && (
              <>
                <Text style={styles.label}>Latitude</Text>
                <View style={styles.row}>
                  <View style={styles.rowHalf}>
                    <TextInput
                      style={styles.input}
                      placeholder="Deg (e.g. 01)"
                      placeholderTextColor={COLORS.textMuted}
                      value={latDeg}
                      onChangeText={setLatDeg}
                      keyboardType="numeric"
                    />
                  </View>
                  <View style={styles.rowGap} />
                  <View style={styles.rowHalf}>
                    <TextInput
                      style={styles.input}
                      placeholder="Min.dec (e.g. 15.0)"
                      placeholderTextColor={COLORS.textMuted}
                      value={latMin}
                      onChangeText={setLatMin}
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

                <Text style={styles.label}>Longitude</Text>
                <View style={styles.row}>
                  <View style={styles.rowHalf}>
                    <TextInput
                      style={styles.input}
                      placeholder="Deg (e.g. 103)"
                      placeholderTextColor={COLORS.textMuted}
                      value={lonDeg}
                      onChangeText={setLonDeg}
                      keyboardType="numeric"
                    />
                  </View>
                  <View style={styles.rowGap} />
                  <View style={styles.rowHalf}>
                    <TextInput
                      style={styles.input}
                      placeholder="Min.dec (e.g. 45.0)"
                      placeholderTextColor={COLORS.textMuted}
                      value={lonMin}
                      onChangeText={setLonMin}
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
              <TouchableOpacity
                style={styles.saveButton}
                onPress={handleSaveNewEntry}
                disabled={saving}
              >
                <Text style={styles.saveButtonText}>
                  {saving ? "Saving..." : "Add entry"}
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
                <DiaryEntryCard key={entry.id} entry={entry} />
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
};

const DiaryEntryCard: React.FC<DiaryEntryCardProps> = ({ entry }) => {
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
          <Text style={styles.entryDate}>{entry.date}</Text>
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

// ---- Lat / Lon helpers ----

function buildLatString(
  deg: string,
  min: string,
  hem: "N" | "S"
): string | null {
  const d = deg.trim();
  const m = min.trim();

  if (!d && !m) return null;
  if (!d) return null; // must have degrees

  const mFormatted = m || "00.0";
  return `${d}°${mFormatted}'${hem}`;
}

function buildLonString(
  deg: string,
  min: string,
  hem: "E" | "W"
): string | null {
  const d = deg.trim();
  const m = min.trim();

  if (!d && !m) return null;
  if (!d) return null;

  const mFormatted = m || "00.0";
  return `${d}°${mFormatted}'${hem}`;
}

// ---- Styles ----

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
});

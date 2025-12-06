// src/components/StatusPill.tsx
import React from "react";
import { View, Text, StyleSheet } from "react-native";

type Status =
  | "not_started"
  | "pending"
  | "in_progress"
  | "completed"
  | "sent_for_verification"
  | "verified"
  | "rejected";

interface Props {
  status?: Status | string;
}

/**
 * StatusPill
 *
 * Small colored pill to show task status.
 */
const StatusPill: React.FC<Props> = ({ status }) => {
  if (!status) return null;

  const normalized = status.toLowerCase();
  let backgroundColor = "#E5E7EB"; // gray
  let textColor = "#111827";

  if (normalized === "completed") {
    backgroundColor = "#D1FAE5";
    textColor = "#047857";
  } else if (normalized === "verified" || normalized === "sent_for_verification") {
    backgroundColor = "#DBEAFE";
    textColor = "#1D4ED8";
  } else if (normalized === "rejected") {
    backgroundColor = "#FEE2E2";
    textColor = "#B91C1C";
  } else if (normalized === "in_progress") {
    backgroundColor = "#FEF3C7";
    textColor = "#92400E";
  }

  return (
    <View style={[styles.pill, { backgroundColor }]}>
      <Text style={[styles.text, { color: textColor }]}>
        {status.toString().replace(/_/g, " ")}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  pill: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
    alignSelf: "flex-start",
  },
  text: {
    fontSize: 12,
    fontWeight: "600",
    textTransform: "capitalize",
  },
});

export default StatusPill;

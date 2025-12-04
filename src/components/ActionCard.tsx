// src/components/ActionCard.tsx
import React from "react";
import { View, Text, StyleSheet, TouchableOpacity, GestureResponderEvent } from "react-native";
import { COLORS } from "../../theme";

type ActionCardProps = {
  title: string;
  description?: string;
  onPress?: (event: GestureResponderEvent) => void;
};

export const ActionCard: React.FC<ActionCardProps> = ({
  title,
  description,
  onPress,
}) => {
  return (
    <TouchableOpacity
      activeOpacity={0.8}
      onPress={onPress}
      style={styles.touchWrapper}
    >
      <View style={styles.card}>
        <Text style={styles.title}>{title}</Text>
        {description ? <Text style={styles.description}>{description}</Text> : null}
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  touchWrapper: {
    flex: 1,
    minWidth: 180,
  },
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
  },
  title: {
    fontSize: 16,
    fontWeight: "600",
    color: COLORS.textOnDark,
    marginBottom: 6,
  },
  description: {
    fontSize: 13,
    color: COLORS.textMuted,
  },
});

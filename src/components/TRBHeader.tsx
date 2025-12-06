// src/components/TRBHeader.tsx
import React from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";

interface HeaderProps {
  title: string;
  subtitle?: string;
  showHome?: boolean;
  showBack?: boolean;
  progress?: number; // 0–100
}

const TRBHeader: React.FC<HeaderProps> = ({
  title,
  subtitle,
  showHome = true,
  showBack = true,
  progress,
}) => {
  const navigation = useNavigation<any>();

  return (
    <View style={styles.wrapper}>
      <View style={styles.iconsRow}>
        {showBack && (
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={22} color="white" />
          </TouchableOpacity>
        )}

        {showHome && (
          <TouchableOpacity
            onPress={() => navigation.navigate("Home")}
            style={{ marginLeft: 14 }}
          >
            <Ionicons name="home-outline" size={22} color="white" />
          </TouchableOpacity>
        )}
      </View>

      <Text style={styles.title}>{title}</Text>
      {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}

      {progress !== undefined && (
        <View style={styles.progressContainer}>
          <View style={styles.progressBackground}>
            <View
              style={[
                styles.progressFill,
                { width: `${progress}%` },
              ]}
            />
          </View>
          <Text style={styles.progressText}>{progress}%</Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    backgroundColor: "#3194A0",
    paddingTop: 48,
    paddingBottom: 20,
    paddingHorizontal: 18,
    borderBottomLeftRadius: 16,
    borderBottomRightRadius: 16,
  },
  iconsRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 6,
  },
  title: {
    fontSize: 20,
    fontWeight: "700",
    color: "white",
  },
  subtitle: {
    fontSize: 13,
    color: "white",
    opacity: 0.9,
    marginTop: 2,
  },
  progressContainer: {
    marginTop: 12,
  },
  progressBackground: {
    width: "100%",
    height: 6,
    backgroundColor: "rgba(255,255,255,0.3)",
    borderRadius: 999,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    backgroundColor: "white",
    borderRadius: 999,
  },
  progressText: {
    marginTop: 4,
    color: "white",
    fontSize: 12,
    fontWeight: "600",
  },
});

export default TRBHeader;

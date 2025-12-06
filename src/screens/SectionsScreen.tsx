// src/screens/SectionsScreen.tsx
import React from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import TRBHeader from "../components/TRBHeader";


interface SectionItem {
  id: string;
  code: string;
  name: string;
  description: string;
}

const SectionsScreen: React.FC = () => {
  const navigation = useNavigation<any>();

  const sections: SectionItem[] = [
    {
      id: "NAV",
      code: "NAV",
      name: "Navigation & Watchkeeping",
      description: "Bridge watch, position fixing, COLREGS.",
    },
    {
      id: "CARGO",
      code: "CARGO",
      name: "Cargo Operations",
      description: "Loading, discharge, documentation.",
    },
    {
      id: "SAFETY",
      code: "SAFETY",
      name: "Safety & Emergency",
      description: "Drills, PPE, firefighting.",
    },
    {
      id: "LIFE",
      code: "LIFE",
      name: "Life-Saving Appliances",
      description: "Lifeboats, rafts, survival.",
    },
  ];

  return (
    <View style={styles.container}>
      <FlatList
        data={sections}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.card}
            onPress={() => navigation.navigate("Tasks")}
          >
            <View style={styles.cardHeader}>
              <Text style={styles.code}>{item.code}</Text>
              <Text style={styles.name}>{item.name}</Text>
            </View>
            <Text style={styles.description}>{item.description}</Text>
            <Text style={styles.linkText}>View tasks →</Text>
          </TouchableOpacity>
        )}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F9FAFB" },
  listContent: { padding: 16 },
  card: {
    backgroundColor: "white",
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
    elevation: 2,
  },
  cardHeader: { flexDirection: "row", alignItems: "center", marginBottom: 4 },
  code: {
    fontSize: 12,
    fontWeight: "700",
    color: "#1D4ED8",
    marginRight: 8,
  },
  name: {
    fontSize: 14,
    fontWeight: "600",
    color: "#111827",
    flexShrink: 1,
  },
  description: {
    fontSize: 12,
    color: "#4B5563",
    marginTop: 4,
  },
  linkText: {
    marginTop: 8,
    fontSize: 12,
    fontWeight: "600",
    color: "#2563EB",
  },
});

export default SectionsScreen;

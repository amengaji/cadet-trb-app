// src/screens/OfficerTasksScreen.tsx
import React from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import StatusPill from "../components/StatusPill";
import TRBHeader from "../components/TRBHeader";


const OfficerTasksScreen: React.FC = () => {
  const navigation = useNavigation<any>();

  const pendingTasks = [
    {
      id: "t1",
      code: "NAV-01.03",
      title: "Keep a safe navigational watch",
      cadetName: "Cadet Demo",
      status: "sent_for_verification",
    },
    {
      id: "t2",
      code: "CARGO-02.01",
      title: "Assist in cargo operations",
      cadetName: "Cadet Demo 2",
      status: "sent_for_verification",
    },
  ];

  return (
    <View style={styles.container}>
      <FlatList
        data={pendingTasks}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.card}
            onPress={() =>
              navigation.navigate("TaskDetail", {
                task: {
                  id: item.id,
                  code: item.code,
                  title: item.title,
                  sectionName: "Section (demo)",
                  status: item.status,
                },
              })
            }
          >
            <View style={styles.cardHeader}>
              <View style={{ flex: 1 }}>
                <Text style={styles.code}>{item.code}</Text>
                <Text style={styles.title}>{item.title}</Text>
                <Text style={styles.cadetName}>
                  Cadet: {item.cadetName}
                </Text>
              </View>
              <StatusPill status={item.status} />
            </View>
            <Text style={styles.linkText}>Open task →</Text>
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
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 8,
  },
  code: {
    fontSize: 12,
    fontWeight: "700",
    color: "#1D4ED8",
  },
  title: {
    fontSize: 14,
    fontWeight: "600",
    color: "#111827",
  },
  cadetName: {
    fontSize: 12,
    color: "#4B5563",
    marginTop: 2,
  },
  linkText: {
    fontSize: 12,
    color: "#2563EB",
    fontWeight: "600",
  },
});

export default OfficerTasksScreen;

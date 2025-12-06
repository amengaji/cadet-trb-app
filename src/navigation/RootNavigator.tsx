import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";

// ---- Screens ----
import HomeScreen from "../screens/HomeScreen";
import TasksScreen from "../screens/TasksScreen";
import DiaryScreen from "../screens/DiaryScreen";
import CadetProfileScreen from "../screens/CadetProfileScreen";
import SeaServiceScreen from "../screens/SeaServiceScreen";
import SectionsScreen from "../screens/SectionsScreen";
import TaskDetailScreen from "../screens/TaskDetailScreen";
import EvidenceScreen from "../screens/EvidenceScreen";
import SyncScreen from "../screens/SyncScreen";
import OfficerTasksScreen from "../screens/OfficerTasksScreen";

// ---- Route params type ----
export type RootStackParamList = {
  Home: undefined;
  Tasks: undefined;
  Diary: undefined;
  CadetProfile: undefined;
  SeaService: undefined;
  Sections: undefined;
  TaskDetail: { taskId: string };
  Evidence: { taskId: string };
  Sync: undefined;
  OfficerTasks: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function RootNavigator() {
  return (
    <Stack.Navigator
      initialRouteName="Home"
      screenOptions={{ headerShown: false }}
    >
      <Stack.Screen name="Home" component={HomeScreen} />
      <Stack.Screen name="Tasks" component={TasksScreen} />
      <Stack.Screen name="Diary" component={DiaryScreen} />
      <Stack.Screen name="CadetProfile" component={CadetProfileScreen} />
      <Stack.Screen name="SeaService" component={SeaServiceScreen} />
      <Stack.Screen name="Sections" component={SectionsScreen} />
      <Stack.Screen name="TaskDetail" component={TaskDetailScreen} />
      <Stack.Screen name="Evidence" component={EvidenceScreen} />
      <Stack.Screen name="Sync" component={SyncScreen} />
      <Stack.Screen name="OfficerTasks" component={OfficerTasksScreen} />
    </Stack.Navigator>
  );
}

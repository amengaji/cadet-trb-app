// src/navigation/RootNavigator.tsx
import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { HomeScreen } from "../screens/HomeScreen";
import { SeaServiceScreen } from "../screens/SeaServiceScreen";
import { TasksScreen } from "../screens/TasksScreen";
import { DiaryScreen } from "../screens/DiaryScreen";

export type RootStackParamList = {
  Home: undefined;
  SeaService: undefined;
  Tasks: undefined;
  Diary: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export const RootNavigator: React.FC = () => {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
      }}
    >
      <Stack.Screen name="Home" component={HomeScreen} />
      <Stack.Screen name="SeaService" component={SeaServiceScreen} />
      <Stack.Screen name="Tasks" component={TasksScreen} />
      <Stack.Screen name="Diary" component={DiaryScreen} />
    </Stack.Navigator>
  );
};

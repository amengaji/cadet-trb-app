// src/navigation/RootNavigator.tsx
import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { HomeScreen } from "../screens/HomeScreen";
import { SeaServiceScreen } from "../screens/SeaServiceScreen";

export type RootStackParamList = {
  Home: undefined;
  SeaService: undefined;
  // Later:
  // Tasks: undefined;
  // Diary: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export const RootNavigator: React.FC = () => {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false, // using custom headers in screens
      }}
    >
      <Stack.Screen name="Home" component={HomeScreen} />
      <Stack.Screen name="SeaService" component={SeaServiceScreen} />
    </Stack.Navigator>
  );
};

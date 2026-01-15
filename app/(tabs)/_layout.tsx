import { Tabs } from "expo-router";
import { LayoutDashboard, FileText, MessageCircle, User, FolderOpen } from "lucide-react-native";
import React from "react";
import Colors from "@/constants/colors";

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: Colors.tab.active,
        tabBarInactiveTintColor: Colors.tab.inactive,
        tabBarStyle: {
          backgroundColor: Colors.tab.background,
          borderTopColor: Colors.tab.border,
          borderTopWidth: 1,
          paddingTop: 8,
          height: 88,
          elevation: 0,
          shadowOpacity: 0,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '500' as const,
          marginTop: 4,
          letterSpacing: 0.2,
        },
        tabBarIconStyle: {
          marginTop: 2,
        },
        headerShown: false,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Dashboard",
          tabBarIcon: ({ color, size }) => <LayoutDashboard size={size} color={color} strokeWidth={1.5} />,
        }}
      />
      <Tabs.Screen
        name="policies"
        options={{
          title: "Policen",
          tabBarIcon: ({ color, size }) => <FileText size={size} color={color} strokeWidth={1.5} />,
        }}
      />
      <Tabs.Screen
        name="documents"
        options={{
          title: "Dokumente",
          tabBarIcon: ({ color, size }) => <FolderOpen size={size} color={color} strokeWidth={1.5} />,
        }}
      />
      <Tabs.Screen
        name="chat"
        options={{
          title: "Chat",
          tabBarIcon: ({ color, size }) => <MessageCircle size={size} color={color} strokeWidth={1.5} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: "Profil",
          tabBarIcon: ({ color, size }) => <User size={size} color={color} strokeWidth={1.5} />,
        }}
      />
    </Tabs>
  );
}

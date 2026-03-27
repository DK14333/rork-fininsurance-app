import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import React, { useEffect } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { AuthProvider } from "@/contexts/AuthContext";
import Colors from "@/constants/colors";

SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient();

type AppErrorBoundaryProps = {
  children: React.ReactNode;
};

type AppErrorBoundaryState = {
  error: Error | null;
};

class AppErrorBoundary extends React.Component<
  AppErrorBoundaryProps,
  AppErrorBoundaryState
> {
  state: AppErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): AppErrorBoundaryState {
    return { error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.log("[ErrorBoundary] Caught error", {
      name: error?.name,
      message: error?.message,
      stack: error?.stack,
      componentStack: info?.componentStack,
    });
  }

  private reset = () => {
    console.log("[ErrorBoundary] Reset pressed");
    this.setState({ error: null });
  };

  render() {
    const error = this.state.error;

    if (!error) return this.props.children;

    const message = String(error?.message ?? "Unknown error");
    const isLinkingContext = message.includes("LinkingContext") || message.includes("NativeStackView");

    return (
      <View style={{ flex: 1, backgroundColor: Colors.background }}>
        <ScrollView
          contentContainerStyle={{
            paddingHorizontal: 20,
            paddingTop: 64,
            paddingBottom: 40,
            gap: 16,
          }}
          testID="errorBoundary.scroll"
        >
          <Text
            style={{
              fontSize: 22,
              fontWeight: "700" as const,
              color: Colors.text,
              letterSpacing: -0.2,
            }}
            testID="errorBoundary.title"
          >
            Etwas ist schiefgelaufen
          </Text>

          <Text
            style={{
              fontSize: 14,
              color: Colors.textSecondary,
              lineHeight: 20,
            }}
            testID="errorBoundary.subtitle"
          >
            {isLinkingContext
              ? "Das sieht nach einer doppelten React-Navigation-Installation aus (Version-Mismatch)."
              : "Bitte versuche es erneut oder starte die App neu."}
          </Text>

          <View
            style={{
              backgroundColor: "#0B1220",
              borderRadius: 14,
              padding: 12,
              borderWidth: 1,
              borderColor: "rgba(255,255,255,0.08)",
            }}
            testID="errorBoundary.details"
          >
            <Text
              style={{
                fontSize: 12,
                color: "rgba(255,255,255,0.85)",
                fontFamily: "monospace",
              }}
            >
              {message}
            </Text>
          </View>

          {isLinkingContext ? (
            <View style={{ gap: 10 }} testID="errorBoundary.navFix">
              <Text
                style={{
                  fontSize: 13,
                  color: Colors.textSecondary,
                  lineHeight: 19,
                }}
              >
                Fix: Entferne in package.json die Dependency @react-navigation/native (expo-router bringt React Navigation bereits mit).
                Danach Lockfile neu erzeugen und App neu starten.
              </Text>

              <View style={{ gap: 6 }}>
                <Text style={{ fontSize: 12, color: Colors.textMuted }}>
                  1) package.json → dependencies → @react-navigation/native entfernen
                </Text>
                <Text style={{ fontSize: 12, color: Colors.textMuted }}>
                  2) bun.lock löschen (oder neu installieren)
                </Text>
                <Text style={{ fontSize: 12, color: Colors.textMuted }}>
                  3) App neu starten
                </Text>
              </View>
            </View>
          ) : null}

          <Pressable
            onPress={this.reset}
            style={({ pressed }) => ({
              marginTop: 8,
              backgroundColor: Colors.primary,
              borderRadius: 14,
              paddingVertical: 14,
              alignItems: "center",
              opacity: pressed ? 0.85 : 1,
            })}
            testID="errorBoundary.retry"
          >
            <Text style={{ color: "white", fontSize: 15, fontWeight: "600" as const }}>
              Erneut versuchen
            </Text>
          </Pressable>
        </ScrollView>
      </View>
    );
  }
}

function RootLayoutNav() {
  return (
    <>
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: Colors.background },
        }}
      >
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="login" options={{ headerShown: false }} />
        <Stack.Screen name="verify-2fa" options={{ headerShown: false }} />
        <Stack.Screen 
          name="appointments" 
          options={{ 
            headerShown: false,
            presentation: 'modal',
          }} 
        />
        <Stack.Screen 
          name="pdf-viewer" 
          options={{ 
            headerShown: false,
            presentation: 'modal',
          }} 
        />
      </Stack>
    </>
  );
}

export default function RootLayout() {
  useEffect(() => {
    SplashScreen.hideAsync();
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <GestureHandlerRootView style={{ flex: 1 }}>
          <StatusBar style="dark" />
          <AppErrorBoundary>
            <RootLayoutNav />
          </AppErrorBoundary>
        </GestureHandlerRootView>
      </AuthProvider>
    </QueryClientProvider>
  );
}

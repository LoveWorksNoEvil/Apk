import React, { useState, useEffect, useRef } from "react";
import { View, Text, StyleSheet, AppState } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";

const STORAGE_KEY = "SCREEN_TIME_TOTAL";
const STORAGE_DATE = "SCREEN_TIME_DATE";

export default function App() {
  const [totalTime, setTotalTime] = useState(0); // milliseconds
  const [appState, setAppState] = useState(AppState.currentState);
  const startTimeRef = useRef(null);

  useEffect(() => {
    loadStoredTime();

    const subscription = AppState.addEventListener("change", handleAppStateChange);
    return () => subscription.remove();
  }, []);

  // Load stored total time for today
  async function loadStoredTime() {
    try {
      const storedDate = await AsyncStorage.getItem(STORAGE_DATE);
      const today = new Date().toISOString().slice(0, 10);
      if (storedDate !== today) {
        // New day: reset storage
        await AsyncStorage.setItem(STORAGE_DATE, today);
        await AsyncStorage.setItem(STORAGE_KEY, "0");
        setTotalTime(0);
      } else {
        const storedTime = await AsyncStorage.getItem(STORAGE_KEY);
        setTotalTime(parseInt(storedTime || "0", 10));
      }
    } catch (e) {
      console.log("Failed to load stored time", e);
    }
  }

  // Handle app going to background or foreground
  async function handleAppStateChange(nextAppState) {
    const now = Date.now();

    if (appState.match(/inactive|background/) && nextAppState === "active") {
      // App comes to foreground: start timing
      startTimeRef.current = now;
    } else if (appState === "active" && nextAppState.match(/inactive|background/)) {
      // App goes to background: stop timing, save elapsed
      if (startTimeRef.current !== null) {
        const elapsed = now - startTimeRef.current;
        const newTotal = totalTime + elapsed;
        setTotalTime(newTotal);
        await AsyncStorage.setItem(STORAGE_KEY, newTotal.toString());
        startTimeRef.current = null;
      }
    }
    setAppState(nextAppState);
  }

  // Show total time as hh:mm:ss
  function formatTime(ms) {
    const totalSeconds = Math.floor(ms / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
  }
  function pad(num) {
    return num.toString().padStart(2, "0");
  }

  // Start timer if app is active initially
  useEffect(() => {
    if (appState === "active") {
      startTimeRef.current = Date.now();
    }
  }, [appState]);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Screen Time Today</Text>
      <Text style={styles.timer}>{formatTime(totalTime)}</Text>
      <Text style={styles.note}>(Only counts while app is open)</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
  },
  title: {
    fontSize: 28,
    marginBottom: 12,
  },
  timer: {
    fontSize: 48,
    fontWeight: "bold",
    color: "#007AFF",
  },
  note: {
    marginTop: 16,
    fontSize: 14,
    color: "#555",
  },
});

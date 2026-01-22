"use client";

import { useState, useEffect, useCallback, useRef } from "react";

interface ActivitySession {
  date: string;
  totalSeconds: number;
  pages: Record<string, number>;
}

interface ActivityData {
  today: ActivitySession;
  thisWeek: number;
  allTime: number;
}

const STORAGE_KEY = "studyhub_activity";
const IDLE_TIMEOUT = 2 * 60 * 1000; // 2 minutes of inactivity = idle

export function useActivityTracker(currentPage: string) {
  const [isActive, setIsActive] = useState(true);
  const [todaySeconds, setTodaySeconds] = useState(0);
  const [activityData, setActivityData] = useState<ActivityData | null>(null);
  const lastActivityRef = useRef<number>(Date.now());
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  // Get today's date string
  const getTodayDate = () => new Date().toISOString().split("T")[0];

  // Load activity data from localStorage
  const loadActivityData = useCallback((): ActivityData => {
    if (typeof window === "undefined") {
      return {
        today: { date: getTodayDate(), totalSeconds: 0, pages: {} },
        thisWeek: 0,
        allTime: 0,
      };
    }

    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const data = JSON.parse(stored) as ActivityData;
        // Check if today's data is still valid
        if (data.today.date !== getTodayDate()) {
          // New day, reset today but keep allTime
          return {
            today: { date: getTodayDate(), totalSeconds: 0, pages: {} },
            thisWeek: data.thisWeek,
            allTime: data.allTime,
          };
        }
        return data;
      }
    } catch (e) {
      console.error("Error loading activity data:", e);
    }

    return {
      today: { date: getTodayDate(), totalSeconds: 0, pages: {} },
      thisWeek: 0,
      allTime: 0,
    };
  }, []);

  // Save activity data to localStorage
  const saveActivityData = useCallback((data: ActivityData) => {
    if (typeof window === "undefined") return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch (e) {
      console.error("Error saving activity data:", e);
    }
  }, []);

  // Initialize on mount
  useEffect(() => {
    const data = loadActivityData();
    setActivityData(data);
    setTodaySeconds(data.today.totalSeconds);
  }, [loadActivityData]);

  // Track user activity (mouse move, key press, scroll, click)
  useEffect(() => {
    const handleActivity = () => {
      lastActivityRef.current = Date.now();
      if (!isActive) {
        setIsActive(true);
      }
    };

    // Listen for user activity
    const events = ["mousemove", "keydown", "scroll", "click", "touchstart"];
    events.forEach((event) => {
      window.addEventListener(event, handleActivity, { passive: true });
    });

    // Check for idle every 10 seconds
    const idleChecker = setInterval(() => {
      const timeSinceLastActivity = Date.now() - lastActivityRef.current;
      if (timeSinceLastActivity > IDLE_TIMEOUT && isActive) {
        setIsActive(false);
      }
    }, 10000);

    return () => {
      events.forEach((event) => {
        window.removeEventListener(event, handleActivity);
      });
      clearInterval(idleChecker);
    };
  }, [isActive]);

  // Main timer - only ticks when user is active
  useEffect(() => {
    if (isActive) {
      intervalRef.current = setInterval(() => {
        setTodaySeconds((prev) => {
          const newValue = prev + 1;
          
          // Update activity data every second
          setActivityData((currentData) => {
            if (!currentData) return currentData;
            
            const newData: ActivityData = {
              today: {
                ...currentData.today,
                totalSeconds: newValue,
                pages: {
                  ...currentData.today.pages,
                  [currentPage]: (currentData.today.pages[currentPage] || 0) + 1,
                },
              },
              thisWeek: currentData.thisWeek + 1,
              allTime: currentData.allTime + 1,
            };
            
            // Save every 5 seconds to reduce localStorage writes
            if (newValue % 5 === 0) {
              saveActivityData(newData);
            }
            
            return newData;
          });
          
          return newValue;
        });
      }, 1000);
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isActive, currentPage, saveActivityData]);

  // Save on unmount or page change
  useEffect(() => {
    return () => {
      if (activityData) {
        saveActivityData(activityData);
      }
    };
  }, [activityData, saveActivityData]);

  // Format seconds to readable time
  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    if (minutes > 0) {
      return `${minutes}m ${secs}s`;
    }
    return `${secs}s`;
  };

  // Get page-wise stats
  const getPageStats = () => {
    if (!activityData) return [];
    
    return Object.entries(activityData.today.pages)
      .map(([page, seconds]) => ({
        page: page.replace("/dashboard", "").replace("/", "") || "dashboard",
        seconds,
        formatted: formatTime(seconds),
      }))
      .sort((a, b) => b.seconds - a.seconds);
  };

  return {
    isActive,
    todaySeconds,
    todayFormatted: formatTime(todaySeconds),
    thisWeekSeconds: activityData?.thisWeek || 0,
    thisWeekFormatted: formatTime(activityData?.thisWeek || 0),
    allTimeSeconds: activityData?.allTime || 0,
    allTimeFormatted: formatTime(activityData?.allTime || 0),
    pageStats: getPageStats(),
    formatTime,
  };
}

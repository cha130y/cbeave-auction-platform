'use client';

import { useEffect, useState } from 'react';

export type CountdownValue = {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  isComplete: boolean;
  isReady: boolean;
  totalMilliseconds: number;
};

export function useCountdown(targetDate: string): CountdownValue {
  const [currentTime, setCurrentTime] = useState<number | null>(null);
  const targetTime = new Date(targetDate).getTime();

  useEffect(() => {
    const updateCurrentTime = () => {
      setCurrentTime(Date.now());
    };

    const initialTimer = window.setTimeout(updateCurrentTime, 0);
    const interval = window.setInterval(updateCurrentTime, 1_000);

    return () => {
      window.clearTimeout(initialTimer);
      window.clearInterval(interval);
    };
  }, []);

  if (currentTime === null) {
    return {
      days: 0,
      hours: 0,
      minutes: 0,
      seconds: 0,
      isComplete: false,
      isReady: false,
      totalMilliseconds: 0,
    };
  }

  const totalMilliseconds = Math.max(targetTime - currentTime, 0);
  const totalSeconds = Math.floor(totalMilliseconds / 1_000);

  const days = Math.floor(totalSeconds / 86_400);
  const hours = Math.floor((totalSeconds % 86_400) / 3_600);
  const minutes = Math.floor((totalSeconds % 3_600) / 60);
  const seconds = totalSeconds % 60;

  return {
    days,
    hours,
    minutes,
    seconds,
    isComplete: totalMilliseconds === 0,
    isReady: true,
    totalMilliseconds,
  };
}

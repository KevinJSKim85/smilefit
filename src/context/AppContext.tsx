import { createContext, useContext, useState, useCallback, useMemo, type ReactNode } from 'react';
import { AppScreen, GameType, type Language } from '../types/app';
import type { CalibrationData } from '../types/detection';
import { useLocalStorage } from '../hooks/useLocalStorage';

interface AppContextValue {
  // Navigation
  screen: AppScreen;
  setScreen: (screen: AppScreen) => void;

  // Player data (localStorage-backed)
  nickname: string;
  setNickname: (name: string) => void;
  country: string;
  setCountry: (code: string) => void;
  language: Language;
  setLanguage: (lang: Language) => void;

  // Calibration (localStorage-backed)
  calibrationData: CalibrationData | null;
  setCalibrationData: (data: CalibrationData) => void;

  // Game session (transient)
  selectedGame: GameType | null;
  setSelectedGame: (game: GameType) => void;
  lastScore: number;
  setLastScore: (score: number) => void;
  lastScoreId: string;
  setLastScoreId: (id: string) => void;
}

const AppContext = createContext<AppContextValue | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  // Navigation (transient — refresh resets to Start)
  const [screen, setScreen] = useState<AppScreen>(AppScreen.Start);

  // localStorage-backed state
  const [nickname, setNickname] = useLocalStorage<string>('smilefit_nickname', '');
  const [country, setCountry] = useLocalStorage<string>('smilefit_country', '');
  const [language, setLanguage] = useLocalStorage<Language>('smilefit_language', 'ko');
  const [calibrationData, setCalibrationData] = useLocalStorage<CalibrationData | null>(
    'smilefit_calibration',
    null
  );

  // Transient game session state
  const [selectedGame, setSelectedGame] = useState<GameType | null>(null);
  const [lastScore, setLastScore] = useState<number>(0);
  const [lastScoreId, setLastScoreId] = useState<string>('');

  const handleSetScreen = useCallback((s: AppScreen) => setScreen(s), []);

  // Memoize so consumers only re-render when actual state values change
  // (setter refs from useState/useLocalStorage are stable across renders)
  const value = useMemo<AppContextValue>(() => ({
    screen,
    setScreen: handleSetScreen,
    nickname,
    setNickname,
    country,
    setCountry,
    language,
    setLanguage,
    calibrationData,
    setCalibrationData,
    selectedGame,
    setSelectedGame,
    lastScore,
    setLastScore,
    lastScoreId,
    setLastScoreId,
  }), [
    screen, handleSetScreen,
    nickname, setNickname,
    country, setCountry,
    language, setLanguage,
    calibrationData, setCalibrationData,
    selectedGame, setSelectedGame,
    lastScore, setLastScore,
    lastScoreId, setLastScoreId,
  ]);

  return (
    <AppContext.Provider value={value}>
      {children}
    </AppContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAppContext(): AppContextValue {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useAppContext must be used within AppProvider');
  }
  return context;
}

import { useEffect } from 'react';
import { useAppContext } from './context/AppContext';
import { AppScreen } from './types/app';
import { LanguageToggle } from './components/LanguageToggle';
import SoundToggle from './components/SoundToggle';
import { preloadAllSounds } from './audio/SoundManager';
import { useMusicManager } from './audio/useMusicManager';
import { StartScreen } from './screens/StartScreen';
import { NicknameScreen } from './screens/NicknameScreen';
import { CalibrationScreen } from './screens/CalibrationScreen';
import { GameSelectScreen } from './screens/GameSelectScreen';
import { CountdownScreen } from './screens/CountdownScreen';
import { GameplayScreen } from './screens/GameplayScreen';
import { GameOverScreen } from './screens/GameOverScreen';
import { LeaderboardScreen } from './screens/LeaderboardScreen';
import { TutorialScreen } from './screens/TutorialScreen';
import { DebugScreen } from './screens/DebugScreen';
import { AboutScreen } from './screens/AboutScreen';
import { Logo } from './components/Logo';

function renderScreen(screen: AppScreen) {
  switch (screen) {
    case AppScreen.Start:
      return <StartScreen />;
    case AppScreen.Nickname:
      return <NicknameScreen />;
    case AppScreen.Calibration:
      return <CalibrationScreen />;
    case AppScreen.GameSelect:
      return <GameSelectScreen />;
    case AppScreen.Tutorial:
      return <TutorialScreen />;
    case AppScreen.Countdown:
      return <CountdownScreen />;
    case AppScreen.Gameplay:
      return <GameplayScreen />;
    case AppScreen.GameOver:
      return <GameOverScreen />;
    case AppScreen.Leaderboard:
      return <LeaderboardScreen />;
    case AppScreen.Debug:
      return <DebugScreen />;
    case AppScreen.About:
      return <AboutScreen />;
  }
}

export default function App() {
  const { screen, selectedGame } = useAppContext();

  // Auto-switch background music based on current screen
  useMusicManager(screen, selectedGame);

  // Preload sounds on first user interaction (AudioContext needs a gesture)
  useEffect(() => {
    const handler = () => {
      preloadAllSounds();
      window.removeEventListener('click', handler);
      window.removeEventListener('touchstart', handler);
    };
    window.addEventListener('click', handler, { once: true });
    window.addEventListener('touchstart', handler, { once: true });
    return () => {
      window.removeEventListener('click', handler);
      window.removeEventListener('touchstart', handler);
    };
  }, []);

  const showLanguageToggle =
    screen !== AppScreen.Gameplay &&
    screen !== AppScreen.Countdown &&
    screen !== AppScreen.Tutorial &&
    screen !== AppScreen.Debug;

  // Show small logo on inner screens (not start, gameplay, countdown, tutorial, debug, about)
  const showHeaderLogo =
    screen !== AppScreen.Start &&
    screen !== AppScreen.Gameplay &&
    screen !== AppScreen.Countdown &&
    screen !== AppScreen.Tutorial &&
    screen !== AppScreen.Debug &&
    screen !== AppScreen.About;

  return (
    <>
      <div key={screen} className="page-enter">
        {renderScreen(screen)}
      </div>
      {/* Top-left logo on inner screens */}
      {showHeaderLogo && (
        <div className="fixed top-4 left-4 z-50">
          <Logo size={36} className="opacity-80" />
        </div>
      )}
      {/* Top-right controls */}
      <div className="fixed top-4 right-4 z-50 flex items-center gap-2">
        {screen !== AppScreen.Debug && <SoundToggle />}
        {showLanguageToggle && <LanguageToggle />}
      </div>
    </>
  );

}

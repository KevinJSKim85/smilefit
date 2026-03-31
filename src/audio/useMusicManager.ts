import { useEffect } from 'react';
import { AppScreen, GameType } from '../types/app';
import { soundManager } from './SoundManager';

/**
 * Automatically switches background music based on current screen and game.
 * Mount once in App.tsx.
 *
 * Music mapping:
 *   Menu screens  → menuMusic
 *   Balloon flow  → balloonMusic
 *   Tetris flow   → tetrisMusic
 *   GameOver      → resultsMusic
 *   Leaderboard   → leaderboardMusic
 *   Debug         → (silence)
 */
export function useMusicManager(screen: AppScreen, selectedGame: GameType | null): void {
  useEffect(() => {
    const track = getTrackForScreen(screen, selectedGame);
    if (track) {
      soundManager.switchMusic(track);
    } else {
      soundManager.stopMusic();
    }
  }, [screen, selectedGame]);
}

function getTrackForScreen(screen: AppScreen, game: GameType | null): string | null {
  switch (screen) {
    // Menu screens — shared menu music
    case AppScreen.Start:
    case AppScreen.Nickname:
    case AppScreen.Calibration:
    case AppScreen.GameSelect:
      return 'menuMusic';

    // Game flow — game-specific music
    case AppScreen.Tutorial:
    case AppScreen.Countdown:
    case AppScreen.Gameplay:
      if (game === GameType.Balloon) return 'balloonMusic';
      if (game === GameType.Tetris) return 'tetrisMusic';
      return 'menuMusic'; // fallback

    // Results
    case AppScreen.GameOver:
      return 'resultsMusic';

    // Leaderboard
    case AppScreen.Leaderboard:
      return 'leaderboardMusic';

    // Debug — no music
    case AppScreen.Debug:
      return null;

    default:
      return null;
  }
}

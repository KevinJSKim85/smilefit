import { useEffect, useCallback } from 'react';
import { useAppContext } from '../context/AppContext';
import { useTranslation } from '../i18n';
import { AppScreen, GameType } from '../types/app';
import { soundManager } from '../audio/SoundManager';
import { GAMES } from '../constants/games';
import { FluidBackground } from '../components/FluidBackground';
import { DecoShapes } from '../components/DecoShapes';
import { Icon } from '../components/Icons';

const CONTROL_BADGE: Record<GameType, { iconName: string; key: 'gameSelect.smileControl' | 'gameSelect.winkControl' }> = {
  [GameType.Balloon]: { iconName: 'face.smile', key: 'gameSelect.smileControl' },
  [GameType.Tetris]: { iconName: 'face.wink', key: 'gameSelect.winkControl' },
};

export function GameSelectScreen() {
  const { setSelectedGame, setScreen } = useAppContext();
  const { t } = useTranslation();

  // Hidden debug access: Ctrl+Shift+Alt+D (Ctrl+Shift+Option+D on Mac)
  // Uses e.code (physical key) because Option transforms e.key to special chars (e.g. Î)
  const handleDebugKey = useCallback((e: KeyboardEvent) => {
    if (e.ctrlKey && e.shiftKey && e.altKey && e.code === 'KeyD') {
      e.preventDefault();
      setScreen(AppScreen.Debug);
    }
  }, [setScreen]);

  useEffect(() => {
    window.addEventListener('keydown', handleDebugKey);
    return () => window.removeEventListener('keydown', handleDebugKey);
  }, [handleDebugKey]);

  const handleSelect = (game: GameType) => {
    soundManager.play('navForward');
    setSelectedGame(game);
    setScreen(AppScreen.Tutorial);
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-transparent text-[var(--text-primary)] p-4 relative overflow-hidden">
      <FluidBackground variant="gameSelect" />
      <DecoShapes variant="gameSelect" />
      <div className="flex flex-col items-center relative z-10">
        <h2 className="text-3xl font-bold mb-10 stagger-1">{t('gameSelect.title')}</h2>

        <div className="flex gap-6 stagger-2">
          {GAMES.map((game) => (
            <button
              key={game.type}
              onClick={() => handleSelect(game.type)}
              className="w-80 glass-card gradient-border rounded-2xl overflow-hidden text-left transition-all duration-200 hover:scale-[1.04] hover:shadow-xl active:scale-[0.98]"
              style={{ '--gb-color-1': game.color, '--gb-color-2': game.type === GameType.Balloon ? '#7C5CC4' : '#2BA89A' } as React.CSSProperties}
            >
              <div className="p-7">
                <div className="mb-4"><Icon name={game.iconName} size={52} /></div>
                <div className="text-xl font-bold mb-2" style={{ color: game.color }}>
                  {t(game.nameKey as Parameters<typeof t>[0])}
                </div>
                <div className="text-sm text-[var(--text-secondary)] mb-5 leading-relaxed">
                  {t(game.descriptionKey as Parameters<typeof t>[0])}
                </div>
                <div className="flex gap-2 flex-wrap">
                  <span
                    className="inline-block px-3 py-1.5 rounded-full text-xs font-semibold"
                    style={{
                      backgroundColor: game.color + '18',
                      color: game.color,
                    }}
                  >
                    {t(game.difficultyKey as Parameters<typeof t>[0])}
                  </span>
                  <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-[var(--surface-card-hover)] text-[var(--text-secondary)]">
                    <Icon name={CONTROL_BADGE[game.type].iconName} size={16} />
                    {t(CONTROL_BADGE[game.type].key)}
                  </span>
                </div>
              </div>
            </button>
          ))}
        </div>

        {/* Secondary back action (ghost button) */}
        <button
          onClick={() => { soundManager.play('navBack'); setScreen(AppScreen.Calibration); }}
          className="mt-8 px-6 py-2 text-sm text-[var(--text-muted)] hover:text-[var(--text-secondary)] transition-colors"
        >
          {t('common.back')}
        </button>

      </div>
    </div>
  );
}

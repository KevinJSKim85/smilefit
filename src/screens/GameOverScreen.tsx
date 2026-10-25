import { useState, useRef, useCallback, useEffect } from 'react';
import { useAppContext } from '../context/AppContext';
import { useTranslation } from '../i18n';
import { AppScreen, GameType } from '../types/app';
import { soundManager } from '../audio/SoundManager';
import { submitScore } from '../services/leaderboard';
import { FluidBackground } from '../components/FluidBackground';
import type { FluidVariant } from '../components/FluidBackground';
import { DecoShapes } from '../components/DecoShapes';
import type { DecoVariant } from '../components/DecoShapes';
import { useCountUp } from '../hooks/useCountUp';
import { ConfettiEffect } from '../components/ConfettiEffect';

const GAME_ACCENT: Record<GameType, string> = {
  [GameType.Balloon]: 'var(--accent-balloon)',
  [GameType.Tetris]: 'var(--accent-tetris)',
};

function createScoreRequestId(): string {
  return globalThis.crypto?.randomUUID?.()
    ?? `score_${Date.now()}_${Math.random().toString(36).slice(2)}`;
}

export function GameOverScreen() {
  const { lastScore, selectedGame, nickname, country, setScreen, setLastScoreId } = useAppContext();
  const { t } = useTranslation();

  // Personal best comes from the shared score records in Google Sheets.
  const [personalBest, setPersonalBest] = useState<number | null>(null);
  const [isNewBest, setIsNewBest] = useState(false);
  const [pulsing, setPulsing] = useState(false);

  const [submitState, setSubmitState] = useState<'idle' | 'submitting' | 'done' | 'error'>(() => {
    // Auto-submit score on initial render
    if (!selectedGame || !nickname || lastScore < 0) return 'idle';
    return 'submitting';
  });
  const submittedRef = useRef(false);
  const pulseTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Submit score via callback ref to avoid setState-in-effect
  const submitRef = useCallback(
    (node: HTMLDivElement | null) => {
      if (!node || submittedRef.current || submitState !== 'submitting' || !selectedGame) return;
      submittedRef.current = true;
      submitScore(selectedGame, nickname, lastScore, country, createScoreRequestId())
        .then((result) => {
          setLastScoreId(result.id);
          setPersonalBest(result.personalBest);
          setIsNewBest(result.isNewBest);
          if (result.isNewBest) {
            if (pulseTimerRef.current) clearTimeout(pulseTimerRef.current);
            setPulsing(true);
            pulseTimerRef.current = setTimeout(() => setPulsing(false), 1500);
          }
          setSubmitState('done');
        })
        .catch(() => setSubmitState('error'));
    },
    [selectedGame, nickname, lastScore, country, submitState, setLastScoreId]
  );

  useEffect(() => {
    if (submitState !== 'done' && submitState !== 'error') return;
    soundManager.play(submitState === 'done' && isNewBest ? 'newRecord' : 'gameEnd');
  }, [submitState, isNewBest]);

  useEffect(() => () => {
    if (pulseTimerRef.current) clearTimeout(pulseTimerRef.current);
  }, []);

  const accent = selectedGame ? GAME_ACCENT[selectedGame] : 'var(--accent-teal)';
  const animatedScore = useCountUp(lastScore, 1200);

  return (
    <div className="min-h-screen flex items-center justify-center bg-transparent text-[var(--text-primary)] p-4 relative overflow-hidden">
      <FluidBackground
        variant={(selectedGame === GameType.Tetris ? 'gameOverTetris' : 'gameOverBalloon') as FluidVariant}
        pulse={pulsing}
      />
      <DecoShapes variant={(selectedGame === GameType.Tetris ? 'gameOverTetris' : 'gameOverBalloon') as DecoVariant} />
      {isNewBest && <ConfettiEffect />}
      <div
        ref={submitRef}
        className="w-full max-w-md glass-card-strong gradient-border rounded-2xl p-10 text-center relative z-10"
        style={{ animation: 'bounceIn 0.5s ease-out', '--gb-color-1': accent, '--gb-color-2': 'var(--accent-teal)' } as React.CSSProperties}
      >
        {/* Encouraging header */}
        <p className="text-sm text-[var(--text-muted)] uppercase tracking-wide mb-2">{t('gameOver.title')}</p>
        <h2
          className="text-3xl font-bold mb-6"
          style={isNewBest ? { color: accent } : undefined}
        >
          {isNewBest ? t('gameOver.newRecord') : t('gameOver.wellDone')}
        </h2>

        {/* Key score block */}
        <div className="mb-2">
          <div
            className="text-7xl font-extrabold tabular-nums"
            style={{ color: accent }}
          >
            {animatedScore.toLocaleString()}
          </div>
          <p className="text-[var(--text-muted)] text-sm mt-1">{t('gameOver.score')}</p>
        </div>

        {/* Personal best */}
        {isNewBest ? (
          <p className="text-sm text-[var(--warning)] font-bold mb-1">{t('gameOver.newBest')}</p>
        ) : (
          <p className="text-sm text-[var(--text-muted)] mb-1">
            {t('gameOver.best')}: <span className="tabular-nums">
              {personalBest === null ? '—' : personalBest.toLocaleString()}
            </span>
          </p>
        )}

        {/* Submit status */}
        <p className="text-sm text-[var(--text-muted)] mb-8 h-5">
          {submitState === 'submitting' && t('gameOver.submitting')}
          {submitState === 'error' && t('common.error')}
        </p>

        {/* Primary CTA — full width */}
        <button
          onClick={() => { soundManager.play('navForward'); setScreen(AppScreen.Countdown); }}
          className="w-full py-4 rounded-xl text-lg font-bold text-black transition-all duration-150 hover:brightness-110 active:scale-[0.98] mb-3 btn-shimmer"
          style={{ backgroundColor: accent }}
        >
          {t('leaderboard.playAgain')}
        </button>

        {/* Secondary actions */}
        <div className="flex gap-3">
          <button
            onClick={() => { soundManager.play('navForward'); setScreen(AppScreen.Leaderboard); }}
            className="flex-1 py-3 glass-card rounded-xl font-semibold text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
          >
            {t('leaderboard.title')}
          </button>
          <button
            onClick={() => { soundManager.play('navBack'); setScreen(AppScreen.GameSelect); }}
            className="flex-1 py-3 glass-card rounded-xl font-semibold text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
          >
            {t('leaderboard.chooseGame')}
          </button>
        </div>
      </div>
    </div>
  );
}

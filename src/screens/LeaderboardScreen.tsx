import { useState, useEffect, useCallback } from 'react';
import { useAppContext } from '../context/AppContext';
import { useTranslation } from '../i18n';
import { AppScreen, GameType } from '../types/app';
import { soundManager } from '../audio/SoundManager';
import type { PlayerStats, ScoreEntry, TimeFilter, LocationFilter } from '../types/leaderboard';
import { getLeaderboard } from '../services/leaderboard';
import { countryCodeToFlag } from '../utils/countries';
import { FluidBackground } from '../components/FluidBackground';
import type { FluidVariant } from '../components/FluidBackground';
import { DecoShapes } from '../components/DecoShapes';
import { Icon } from '../components/Icons';

const TIME_FILTERS: TimeFilter[] = ['daily', 'weekly', 'monthly', 'allTime'];
const LOCATION_FILTERS: LocationFilter[] = ['global', 'country'];

const MEDAL_ICONS = ['rank.1', 'rank.2', 'rank.3'] as const;

const GAME_ACCENT: Record<GameType, string> = {
  [GameType.Balloon]: 'var(--accent-balloon)',
  [GameType.Tetris]: 'var(--accent-tetris)',
};

export function LeaderboardScreen() {
  const { selectedGame, nickname, country, lastScore, lastScoreId, setScreen } = useAppContext();
  const { t } = useTranslation();

  const [timeFilter, setTimeFilter] = useState<TimeFilter>('allTime');
  const [locationFilter, setLocationFilter] = useState<LocationFilter>('global');
  const [scores, setScores] = useState<ScoreEntry[]>([]);
  const [playerStats, setPlayerStats] = useState<PlayerStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  const [errorDetail, setErrorDetail] = useState('');

  const fetchScores = useCallback(async () => {
    if (!selectedGame) return;
    setLoading(true);
    setHasError(false);
    setErrorDetail('');
    try {
      // Fall back to global if no country is set
      const effectiveLocation = (locationFilter === 'country' && !country) ? 'global' : locationFilter;
      const data = await getLeaderboard(selectedGame, timeFilter, effectiveLocation, country, nickname);
      setScores(data.scores);
      setPlayerStats(data.playerStats);
    } catch (err) {
      setHasError(true);
      if (import.meta.env.DEV) {
        setErrorDetail(err instanceof Error ? err.message : String(err));
      }
    } finally {
      setLoading(false);
    }
  }, [selectedGame, timeFilter, locationFilter, country, nickname]);

  useEffect(() => {
    fetchScores();
  }, [fetchScores]);

  const timeLabels: Record<TimeFilter, string> = {
    daily: t('leaderboard.daily'),
    weekly: t('leaderboard.weekly'),
    monthly: t('leaderboard.monthly'),
    allTime: t('leaderboard.allTime'),
  };

  const locationLabels: Record<LocationFilter, string> = {
    global: t('leaderboard.global'),
    country: t('leaderboard.country'),
  };

  const accent = selectedGame ? GAME_ACCENT[selectedGame] : 'var(--accent-teal)';

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-transparent text-[var(--text-primary)] p-4 relative overflow-hidden">
      <FluidBackground variant={(selectedGame === GameType.Tetris ? 'leaderboardTetris' : 'leaderboardBalloon') as FluidVariant} />
      <DecoShapes variant="leaderboard" />
      <div className="w-full max-w-xl relative z-10">
        <h2 className="text-3xl font-bold text-center mb-6 stagger-1">{t('leaderboard.title')}</h2>

        {/* Time filter — segmented tab bar */}
        <div className="flex glass-card rounded-xl p-1 mb-3 stagger-2">
          {TIME_FILTERS.map((f) => (
            <button
              key={f}
              onClick={() => { soundManager.play('buttonClick'); setTimeFilter(f); }}
              className={`flex-1 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                timeFilter === f
                  ? 'bg-[var(--surface-panel)] text-[var(--text-primary)] shadow-sm'
                  : 'text-[var(--text-muted)] hover:text-[var(--text-secondary)]'
              }`}
            >
              {timeLabels[f]}
            </button>
          ))}
        </div>

        {/* Location filter — segmented tab bar */}
        <div className="flex glass-card rounded-xl p-1 mb-4 stagger-2">
          {LOCATION_FILTERS.map((f) => (
            <button
              key={f}
              onClick={() => { soundManager.play('buttonClick'); setLocationFilter(f); }}
              className={`flex-1 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                locationFilter === f
                  ? 'bg-[var(--surface-panel)] text-[var(--text-primary)] shadow-sm'
                  : 'text-[var(--text-muted)] hover:text-[var(--text-secondary)]'
              }`}
            >
              {locationLabels[f]}
            </button>
          ))}
        </div>

        {/* The nickname profile is looked up from the shared score rows. */}
        {!loading && !hasError && nickname && playerStats && (
          <div
            className="glass-card-strong rounded-xl px-4 py-3 mb-4 stagger-3"
            style={{ borderColor: `color-mix(in srgb, ${accent} 30%, transparent)`, boxShadow: `0 0 12px color-mix(in srgb, ${accent} 12%, transparent)` }}
          >
            <p className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wide mb-2">
              {t('leaderboard.personalSummary')}
            </p>
            <p className="text-sm font-semibold truncate mb-3">
              {country && countryCodeToFlag(country)} {nickname}
            </p>
            {playerStats.gamesPlayed > 0 ? (
              <>
                <div className="grid grid-cols-3 gap-2 text-center mb-3">
                  <div className="rounded-lg bg-black/[0.03] px-2 py-2">
                    <p className="text-[10px] text-[var(--text-muted)]">{t('leaderboard.gamesPlayed')}</p>
                    <p className="font-mono font-bold tabular-nums">{playerStats.gamesPlayed.toLocaleString()}</p>
                  </div>
                  <div className="rounded-lg bg-black/[0.03] px-2 py-2">
                    <p className="text-[10px] text-[var(--text-muted)]">{t('leaderboard.totalPoints')}</p>
                    <p className="font-mono font-bold tabular-nums">{playerStats.cumulativeScore.toLocaleString()}</p>
                  </div>
                  <div className="rounded-lg bg-black/[0.03] px-2 py-2">
                    <p className="text-[10px] text-[var(--text-muted)]">{t('leaderboard.personalBest')}</p>
                    <p className="font-mono font-bold tabular-nums">{playerStats.personalBest.toLocaleString()}</p>
                  </div>
                </div>
                {lastScore > 0 && (
                  <p className="text-xs text-[var(--text-muted)] mb-2">
                    {t('leaderboard.yourScore')}: <span className="font-mono font-semibold" style={{ color: accent }}>{lastScore.toLocaleString()}</span>
                  </p>
                )}
                {playerStats.recentScores.length > 0 && (
                  <div>
                    <p className="text-[10px] font-semibold text-[var(--text-muted)] uppercase tracking-wide mb-1">
                      {t('leaderboard.recentHistory')}
                    </p>
                    <ul className="space-y-1">
                      {playerStats.recentScores.map((entry) => (
                        <li key={entry.id} className="flex justify-between gap-3 text-xs text-[var(--text-secondary)]">
                          <span>{entry.timestamp.toLocaleDateString()}</span>
                          <span className="font-mono tabular-nums">{entry.score.toLocaleString()}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </>
            ) : (
              <p className="text-sm text-[var(--text-muted)]">{t('leaderboard.noScoreYet')}</p>
            )}
          </div>
        )}

        {/* Leaderboard table */}
        <div className="glass-card-strong rounded-xl overflow-hidden mb-8 stagger-4">
          {/* Header */}
          <div className="grid grid-cols-[48px_1fr_80px] px-4 py-2.5 border-b border-white/20 text-[var(--text-muted)] text-xs font-semibold uppercase tracking-wide">
            <span>{t('leaderboard.rank')}</span>
            <span>{t('leaderboard.player')}</span>
            <span className="text-right">{t('leaderboard.score')}</span>
          </div>

          {/* Body */}
          <div className="max-h-[400px] overflow-y-auto">
            {loading && (
              <div className="px-4 py-4 space-y-2">
                {Array.from({ length: 5 }, (_, i) => (
                  <div key={i} className="grid grid-cols-[48px_1fr_80px] gap-2">
                    <div className="skeleton h-5 w-8" />
                    <div className="skeleton h-5" />
                    <div className="skeleton h-5 w-14 ml-auto" />
                  </div>
                ))}
              </div>
            )}

            {hasError && (
              <div className="py-12 text-center text-[var(--danger)]">
                <p>{t('common.error')}</p>
                {errorDetail && (
                  <p className="text-xs text-[var(--text-muted)] mt-2 px-4 break-all">{errorDetail}</p>
                )}
              </div>
            )}

            {!loading && !hasError && scores.length === 0 && (
              <div className="py-12 text-center text-[var(--text-muted)]">
                {t('leaderboard.empty')}
              </div>
            )}

            {!loading &&
              !hasError &&
              scores.map((entry, i) => {
                const isMe = lastScoreId ? entry.id === lastScoreId : false;
                const isTop3 = i < 3;
                return (
                  <div
                    key={entry.id || i}
                    className={`grid grid-cols-[48px_1fr_80px] px-4 py-2.5 border-t border-white/10 text-sm transition-colors ${
                      isMe ? 'bg-black/[0.04]' : ''
                    }`}
                    style={isTop3 ? { backgroundColor: `color-mix(in srgb, ${accent} 6%, transparent)` } : undefined}
                  >
                    <span
                      className="font-bold tabular-nums"
                      style={{ color: isTop3 ? accent : 'var(--text-muted)' }}
                    >
                      {i < 3 ? <Icon name={MEDAL_ICONS[i]} size={24} /> : i + 1}
                    </span>
                    <span className={`truncate ${isMe ? 'font-bold' : ''}`}
                      style={isMe ? { color: accent } : undefined}
                    >
                      {entry.country && countryCodeToFlag(entry.country)}{' '}
                      {entry.nickname}
                    </span>
                    <span className="text-right font-mono tabular-nums">
                      {entry.score.toLocaleString()}
                    </span>
                  </div>
                );
              })}
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-3 stagger-4">
          <button
            onClick={() => { soundManager.play('navForward'); setScreen(AppScreen.Countdown); }}
            className="flex-1 py-4 text-lg rounded-xl font-bold text-black transition-all duration-150 hover:brightness-110 active:scale-[0.98] btn-shimmer"
            style={{ backgroundColor: accent }}
          >
            {t('leaderboard.playAgain')}
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

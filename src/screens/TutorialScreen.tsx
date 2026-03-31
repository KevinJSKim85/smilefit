import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useAppContext } from '../context/AppContext';
import { useTranslation } from '../i18n';
import { AppScreen, GameType } from '../types/app';
import { soundManager } from '../audio/SoundManager';
import { useCamera } from '../hooks/useCamera';
import { useSharedLandmarker } from '../context/DetectionContext';
import { useFaceDetection } from '../hooks/useFaceDetection';
import { CameraPreview } from '../components/CameraPreview';
import { FluidBackground } from '../components/FluidBackground';
import type { FluidVariant } from '../components/FluidBackground';
import { DecoShapes } from '../components/DecoShapes';
import { BalloonTutorialGame } from '../games/balloon/BalloonTutorialGame';
import type { TutorialStage } from '../games/balloon/BalloonTutorialGame';
import { TetrisTutorialGame } from '../games/tetris/TetrisTutorialGame';
import type { TranslationKey } from '../i18n';

// ─── Balloon stage → clear toast key mapping ──────────────
const STAGE_CLEAR_KEYS: Record<TutorialStage, TranslationKey> = {
  fly: 'tutorial.balloon.flyClear',
  pipe: 'tutorial.balloon.pipeClear',
  bird: 'tutorial.balloon.birdClear',
};

// ─── Tetris phase → hint / clear toast keys ───────────────
const TETRIS_HINT_KEYS: TranslationKey[] = [
  'tutorial.tetris.phase0Hint',
  'tutorial.tetris.phase1Hint',
  'tutorial.tetris.phase2Hint',
  'tutorial.tetris.phase3Hint',
];

const TETRIS_CLEAR_KEYS: TranslationKey[] = [
  'tutorial.tetris.phase0Clear',
  'tutorial.tetris.phase1Clear',
  'tutorial.tetris.phase2Clear',
  'tutorial.tetris.phase3Clear',
];

const TOAST_TRANSITION_MS = 3000;
const TOAST_HIT_MS = 1200;
const TOAST_SUCCESS_MS = 1000;
const HINT_DELAY_MS = 1000;
const HINT_DURATION_MS = 3500; // +0.5s longer than before

export function TutorialScreen() {
  const { selectedGame, calibrationData, setScreen } = useAppContext();
  const { t } = useTranslation();
  const { videoRef, isReady: cameraReady, start: startCamera, stop: stopCamera } = useCamera();
  const { landmarker } = useSharedLandmarker();

  const [phase, setPhase] = useState(0); // tetris only
  const [completed, setCompleted] = useState(false);
  const [resetKey, setResetKey] = useState(0);

  const isBalloon = selectedGame === GameType.Balloon;

  const detection = useFaceDetection({
    videoRef,
    landmarker,
    calibration: calibrationData,
    enabled: cameraReady && !!landmarker,
  });

  const isPlaying = cameraReady && !!landmarker;

  useEffect(() => {
    startCamera();
    return () => stopCamera();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ─── Shared toast state ──────────────────────────────────
  const [toastKey, setToastKey] = useState<TranslationKey | null>(null);
  const [toastOverride, setToastOverride] = useState<string | null>(null);
  const [isToastNegative, setIsToastNegative] = useState(false);
  const [advanceSignal, setAdvanceSignal] = useState(0);
  const toastTimerRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  // ─── Tetris callbacks ────────────────────────────────────
  const handlePhaseChange = useCallback((p: number) => {
    setPhase(p);
  }, []);

  const handleTetrisPhaseClear = useCallback((clearedPhase: number) => {
    const key = TETRIS_CLEAR_KEYS[clearedPhase];
    if (key) {
      soundManager.play('tutorialPhaseComplete');
      setToastKey(key);
      setToastOverride(null);
      clearTimeout(toastTimerRef.current);
      toastTimerRef.current = setTimeout(() => {
        setToastKey(null);
        setAdvanceSignal((s) => s + 1);
      }, TOAST_TRANSITION_MS);
    }
  }, []);

  const handleTetrisSuccess = useCallback((remaining: number) => {
    if (remaining <= 0) return; // phase clear toast will show instead
    soundManager.play('tutorialSuccess');
    const text = remaining === 1
      ? t('tutorial.tetris.lastOne')
      : `${t('tutorial.tetris.success')} ${remaining}${t('tutorial.tetris.remaining')}`;
    setToastOverride(text);
    setToastKey(null);
    setIsToastNegative(false);
    clearTimeout(toastTimerRef.current);
    toastTimerRef.current = setTimeout(() => {
      setToastOverride(null);
    }, TOAST_SUCCESS_MS);
  }, [t]);

  const handleTetrisRetry = useCallback(() => {
    setToastOverride(t('tutorial.tetris.retry'));
    setToastKey(null);
    setIsToastNegative(true);
    clearTimeout(toastTimerRef.current);
    toastTimerRef.current = setTimeout(() => {
      setToastOverride(null);
      setIsToastNegative(false);
    }, TOAST_HIT_MS);
  }, [t]);

  const handleComplete = useCallback(() => {
    setCompleted(true);
  }, []);

  // ─── Tetris instruction hint (show after 1s, visible for 3.5s per phase) ──
  const [showTetrisHint, setShowTetrisHint] = useState(false);
  const tetrisHintTimerRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => {
    if (isBalloon || completed) {
      setShowTetrisHint(false);
      clearTimeout(tetrisHintTimerRef.current);
      return;
    }
    // Reset hint on phase change
    setShowTetrisHint(false);
    clearTimeout(tetrisHintTimerRef.current);
    tetrisHintTimerRef.current = setTimeout(() => {
      setShowTetrisHint(true);
      tetrisHintTimerRef.current = setTimeout(() => setShowTetrisHint(false), HINT_DURATION_MS);
    }, HINT_DELAY_MS);
    return () => clearTimeout(tetrisHintTimerRef.current);
  }, [isBalloon, phase, completed]);

  // ─── Navigation callbacks ────────────────────────────────
  const handleSkip = () => {
    soundManager.play('navForward');
    stopCamera();
    setScreen(AppScreen.Countdown);
  };

  const handleStart = () => {
    soundManager.play('navForward');
    stopCamera();
    setScreen(AppScreen.Countdown);
  };

  const handleTryAgain = () => {
    setPhase(0);
    setCompleted(false);
    setToastKey(null);
    setToastOverride(null);
    setIsToastNegative(false);
    setBalloonStage('fly');
    setAdvanceSignal(0);
    setShowTetrisHint(false);
    setShowFlyHint(false);
    clearTimeout(toastTimerRef.current);
    clearTimeout(tetrisHintTimerRef.current);
    clearTimeout(flyHintTimerRef.current);
    setResetKey((k) => k + 1);
  };

  // ─── Balloon toast system ────────────────────────────────
  const [balloonStage, setBalloonStage] = useState<TutorialStage | 'done'>('fly');
  const [showFlyHint, setShowFlyHint] = useState(false);
  const flyHintTimerRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  const smileIntensity = detection.smileState.emaScore;

  // Show fly hint after 1s delay
  useEffect(() => {
    if (!isBalloon || balloonStage !== 'fly') {
      setShowFlyHint(false);
      clearTimeout(flyHintTimerRef.current);
      return;
    }
    flyHintTimerRef.current = setTimeout(() => {
      setShowFlyHint(true);
      flyHintTimerRef.current = setTimeout(() => setShowFlyHint(false), HINT_DURATION_MS);
    }, HINT_DELAY_MS);
    return () => clearTimeout(flyHintTimerRef.current);
  }, [isBalloon, balloonStage]);

  const handleStageClear = useCallback((stage: TutorialStage) => {
    soundManager.play('tutorialPhaseComplete');
    setBalloonStage(stage === 'bird' ? 'done' : stage === 'fly' ? 'pipe' : 'bird');
    setToastKey(STAGE_CLEAR_KEYS[stage]);

    clearTimeout(toastTimerRef.current);
    toastTimerRef.current = setTimeout(() => {
      setToastKey(null);
      setAdvanceSignal((s) => s + 1);
    }, TOAST_TRANSITION_MS);
  }, []);

  const handleBalloonHit = useCallback(() => {
    setToastKey('tutorial.balloon.hit');
    clearTimeout(toastTimerRef.current);
    toastTimerRef.current = setTimeout(() => {
      setToastKey(null);
    }, TOAST_HIT_MS);
  }, []);

  const handleBalloonComplete = useCallback(() => {
    setCompleted(true);
  }, []);

  // Cleanup timers
  useEffect(() => {
    return () => {
      clearTimeout(toastTimerRef.current);
      clearTimeout(flyHintTimerRef.current);
      clearTimeout(tetrisHintTimerRef.current);
    };
  }, []);

  // ─── Sidebar hints for tetris renderer ───────────────────
  const tetrisHints = useMemo(() => [
    t('tetris.hint.leftWink'),
    t('tetris.hint.rightWink'),
    t('tetris.hint.smile'),
    t('tetris.hint.doubleWink'),
  ], [t]);

  // ─── Gauge labels for tetris hold bar ────────────────────
  const tetrisGaugeLabels = useMemo(() => [
    t('tutorial.tetris.gaugeWink'),  // phase 0: left wink
    t('tutorial.tetris.gaugeWink'),  // phase 1: right wink
    t('tutorial.tetris.gaugeBlink'), // phase 2: double blink
    '',                              // phase 3: smile (no gauge)
  ], [t]);

  // ─── Toast text computation ──────────────────────────────
  // Balloon: toastKey > flyHint > null
  const balloonToastText = toastKey
    ? t(toastKey)
    : showFlyHint
      ? t('tutorial.balloon.smileHint')
      : null;

  // Tetris: toastOverride > toastKey > tetrisHint > null
  const tetrisToastText = toastOverride
    ?? (toastKey ? t(toastKey) : null)
    ?? (showTetrisHint
      ? t(TETRIS_HINT_KEYS[Math.min(phase, TETRIS_HINT_KEYS.length - 1)])
      : null);

  const toastText = isBalloon ? balloonToastText : tetrisToastText;
  const toastIsNegative = toastKey === 'tutorial.balloon.hit' || isToastNegative;

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-transparent text-[var(--text-primary)] p-4 relative overflow-hidden">
      <FluidBackground variant={(isBalloon ? 'tutorialBalloon' : 'tutorialTetris') as FluidVariant} />
      <DecoShapes variant="tutorial" />

      <div className="flex flex-col items-center w-full max-w-4xl relative z-10">
        {/* Header */}
        <div className="w-full flex items-center mb-4 stagger-1">
          <h2 className="text-2xl font-bold">{t('tutorial.title')}</h2>
        </div>

        {/* Game canvas */}
        <div className="relative stagger-2">
          {isBalloon ? (
            <BalloonTutorialGame
              smileIntensity={smileIntensity}
              isRunning={isPlaying}
              onStageClear={handleStageClear}
              onComplete={handleBalloonComplete}
              onHit={handleBalloonHit}
              advanceSignal={advanceSignal}
              resetKey={resetKey}
            />
          ) : (
            <TetrisTutorialGame
              leftWink={detection.winkState.leftWink}
              rightWink={detection.winkState.rightWink}
              doubleWink={detection.winkState.doubleWink}
              isSmiling={detection.smileState.isSmiling}
              holdMs={detection.winkState.holdMs}
              holdSide={detection.winkState.holdSide}
              doubleHoldMs={detection.winkState.doubleHoldMs}
              smileScore={detection.smileState.emaScore}
              isRunning={isPlaying}
              onPhaseChange={handlePhaseChange}
              onPhaseClear={handleTetrisPhaseClear}
              onSuccess={handleTetrisSuccess}
              onRetry={handleTetrisRetry}
              onComplete={handleComplete}
              advanceSignal={advanceSignal}
              resetKey={resetKey}
              controlHints={tetrisHints}
              gaugeLabels={tetrisGaugeLabels}
            />
          )}

          {/* Canvas toast overlay (both games) */}
          {toastText && (
            <div className="absolute inset-0 flex items-center justify-center z-20 pointer-events-none">
              <div
                className={`glass-card-strong px-6 py-3 rounded-full text-base font-semibold ${
                  toastIsNegative ? 'text-[var(--danger)]' : 'text-[var(--text-primary)]'
                }`}
                style={{ animation: 'scaleIn 0.2s ease-out' }}
                key={toastText}
              >
                {toastText}
              </div>
            </div>
          )}

        </div>

        {/* Instruction pill — generic label for both games */}
        <div
          className="mt-4 glass-card-strong px-6 py-3 rounded-full text-[15px] font-medium text-[var(--text-primary)] stagger-3"
          style={{ animation: 'scaleIn 0.3s ease-out' }}
          key={isBalloon ? 'balloon-label' : 'tetris-label'}
        >
          {isBalloon ? t('tutorial.balloon.label') : t('tutorial.tetris.label')}
        </div>

        {/* Phase progress dots (Tetris only) */}
        {!isBalloon && (
          <div className="flex items-center gap-0 mt-3 stagger-3">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="flex items-center">
                <div
                  className={`w-3 h-3 rounded-full transition-all duration-300 ${
                    i < phase || completed
                      ? 'bg-[var(--accent-teal)] scale-100'
                      : i === phase
                        ? 'bg-[var(--text-primary)] scale-110'
                        : 'bg-[var(--border)] scale-100'
                  }`}
                />
                {i < 3 && (
                  <div
                    className="w-8 h-0.5 transition-colors duration-300"
                    style={{
                      backgroundColor: i < phase || completed
                        ? 'var(--accent-teal)'
                        : 'var(--border)',
                    }}
                  />
                )}
              </div>
            ))}
          </div>
        )}

        {/* Action buttons */}
        <div className="flex items-center gap-3 mt-5 stagger-4">
          {/* Try Again — always visible but subtle during play, prominent on complete */}
          <button
            onClick={handleTryAgain}
            className={`px-6 py-3 text-base font-semibold rounded-xl transition-all duration-150 active:scale-[0.98] ${
              completed
                ? 'glass-card-strong text-[var(--text-primary)] hover:bg-white/90 hover:shadow-md'
                : 'text-[var(--text-muted)] hover:text-[var(--text-secondary)]'
            }`}
          >
            {t('tutorial.tryAgain')}
          </button>

          {/* Start Game — only on complete */}
          {completed && (
            <button
              onClick={handleStart}
              className="px-10 py-3 bg-[var(--accent-teal)] text-black font-bold text-lg rounded-xl transition-all duration-150 hover:brightness-110 active:scale-[0.98] btn-shimmer"
              style={{ animation: 'bounceIn 0.5s ease-out' }}
            >
              {t('tutorial.startGame')}
            </button>
          )}
          {/* Skip — inline with other buttons */}
          <button
            onClick={handleSkip}
            className="px-6 py-3 text-base font-semibold rounded-xl glass-card text-[var(--text-primary)] hover:bg-white/80 hover:shadow-md transition-all duration-150 active:scale-[0.98]"
          >
            {t('tutorial.skip')} →
          </button>
        </div>
      </div>

      {/* Camera preview — screen-level positioning, matching GameplayScreen */}
      <CameraPreview videoRef={videoRef} show={isPlaying} />
    </div>
  );
}

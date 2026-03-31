import { useEffect } from 'react';
import { useAppContext } from '../context/AppContext';
import { useTranslation, type TranslationKey } from '../i18n';
import { AppScreen } from '../types/app';
import { soundManager } from '../audio/SoundManager';
import { useCamera } from '../hooks/useCamera';
import { useSharedLandmarker } from '../context/DetectionContext';
import { useCalibration } from '../hooks/useCalibration';
import { FluidBackground } from '../components/FluidBackground';
import { DecoShapes } from '../components/DecoShapes';
import { Icon } from '../components/Icons';

/* ── Ring Timer ─────────────────────────────── */

const RING_SIZE = 120;
const RING_STROKE = 6;
const RING_R = (RING_SIZE - RING_STROKE) / 2;
const RING_C = 2 * Math.PI * RING_R;
const TOTAL_SECONDS = 5;

function RingTimer({ secondsLeft }: { secondsLeft: number }) {
  const offset = RING_C * (1 - secondsLeft / TOTAL_SECONDS);

  return (
    <div className="relative" style={{ width: RING_SIZE, height: RING_SIZE }}>
      <svg
        width={RING_SIZE}
        height={RING_SIZE}
        className="-rotate-90"
        style={{ filter: 'drop-shadow(0 2px 8px rgba(0,0,0,0.2))' }}
      >
        {/* track */}
        <circle
          cx={RING_SIZE / 2} cy={RING_SIZE / 2} r={RING_R}
          fill="none" stroke="rgba(255,255,255,0.3)" strokeWidth={RING_STROKE}
        />
        {/* progress arc */}
        <circle
          cx={RING_SIZE / 2} cy={RING_SIZE / 2} r={RING_R}
          fill="none" stroke="var(--accent-teal)" strokeWidth={RING_STROKE}
          strokeLinecap="round"
          strokeDasharray={RING_C}
          strokeDashoffset={offset}
          style={{ transition: 'stroke-dashoffset 1s linear' }}
        />
      </svg>
      <div
        className="absolute inset-0 flex items-center justify-center text-4xl font-bold text-white tabular-nums"
        style={{ textShadow: '0 2px 8px rgba(0,0,0,0.35)' }}
      >
        {secondsLeft}
      </div>
    </div>
  );
}

/* ── Calibration Screen ─────────────────────── */

export function CalibrationScreen() {
  const { calibrationData, setCalibrationData, setScreen } = useAppContext();
  const { t } = useTranslation();
  const { videoRef, isReady: cameraReady, error: cameraError, start: startCamera, stop: stopCamera } = useCamera();
  const { landmarker, isLoading: modelLoading, error: modelError } = useSharedLandmarker();

  const hasSaved = calibrationData !== null;

  const {
    isCalibrating, secondsLeft, faceDetected,
    calibrationResult, calibrationFailed,
    startCalibration, cancelCalibration,
  } = useCalibration({ videoRef, landmarker });

  useEffect(() => {
    startCamera();
    return () => {
      stopCamera();
      cancelCalibration();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleStartCalibration = () => {
    if (!landmarker || !cameraReady) return;
    startCalibration();
  };

  const handleContinue = () => {
    if (calibrationResult) {
      setCalibrationData(calibrationResult);
    }
    soundManager.play('navForward');
    stopCamera();
    setScreen(AppScreen.GameSelect);
  };

  const loading = modelLoading || !cameraReady;
  const error = cameraError || modelError;

  const showResultCard = !!calibrationResult && !isCalibrating;
  const showFailedCard = calibrationFailed && !isCalibrating;
  const showSavedCard = !calibrationResult && !calibrationFailed && hasSaved && !isCalibrating;

  const subtitle = isCalibrating
    ? t('calibration.holdPrompt')
    : showResultCard
      ? t('calibration.completeMsg')
      : showFailedCard
        ? t('calibration.failedMsg')
        : loading
          ? t('calibration.starting')
          : t('calibration.holdPrompt');

  /* Feature-readiness rows — reused on result + saved cards */
  const featureRows = (
    <div className="flex flex-col gap-2 mt-3">
      {[
        t('calibration.featureSmile'),
        t('calibration.featureLeftEye'),
        t('calibration.featureRightEye'),
      ].map((label, i) => (
        <div
          key={label}
          className={`flex items-center gap-2.5 stagger-${i + 1}`}
        >
          <span
            className="w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold"
            style={{ color: 'var(--success)', backgroundColor: 'rgba(45,159,94,0.12)' }}
          >
            ✓
          </span>
          <span className="text-sm text-[var(--text-primary)]">{label}</span>
          <span className="ml-auto text-xs font-medium" style={{ color: 'var(--success)' }}>
            {t('calibration.featureReady')}
          </span>
        </div>
      ))}
    </div>
  );

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-transparent text-[var(--text-primary)] p-4 relative overflow-hidden">
      <FluidBackground variant="calibration" />
      <DecoShapes variant="calibration" />
      <div className="fade-in flex flex-col items-center w-full max-w-xl relative z-10">
        <h2 className="text-2xl font-bold mb-2">{t('calibration.title')}</h2>
        <p className="text-[var(--text-secondary)] mb-6">{subtitle}</p>

        {/* Camera feed */}
        <div
          className="relative w-[480px] h-[360px] bg-[var(--surface-panel)] rounded-2xl overflow-hidden mb-6"
          style={{
            border: isCalibrating ? '2px solid var(--accent-teal)' : '1px solid var(--border)',
            boxShadow: isCalibrating ? '0 0 24px rgba(43,168,154,0.2)' : undefined,
            animation: isCalibrating ? 'pulseGlow 2s ease-in-out infinite' : undefined,
          }}
        >
          <video
            ref={videoRef}
            className="w-full h-full object-cover scale-x-[-1]"
            playsInline
            muted
          />

          {/* Neutral face hint */}
          {isCalibrating && faceDetected && (
            <div className="absolute top-3 left-1/2 -translate-x-1/2 z-10">
              <div className="bg-white/70 backdrop-blur-sm rounded-full px-4 py-1.5 flex items-center gap-2 text-sm text-[var(--text-secondary)]">
                <Icon name="face.neutral" size={20} />
                <span>{t('calibration.instruction')}</span>
              </div>
            </div>
          )}

          {/* No face warning */}
          {isCalibrating && !faceDetected && (
            <div className="absolute top-3 left-1/2 -translate-x-1/2 z-10">
              <div className="bg-yellow-50/90 backdrop-blur-sm rounded-full px-4 py-1.5 flex items-center gap-2 text-sm text-[var(--warning)] animate-pulse">
                <Icon name="face.eyes" size={20} />
                <span>{t('calibration.noFace')}</span>
              </div>
            </div>
          )}

          {/* Ring timer countdown */}
          {isCalibrating && (
            <div className="absolute inset-0 flex items-center justify-center">
              <RingTimer secondsLeft={secondsLeft} />
            </div>
          )}

          {/* Loading overlay */}
          {loading && !error && (
            <div className="absolute inset-0 flex items-center justify-center bg-white/70">
              <div className="text-center">
                <div className="w-8 h-8 border-3 border-black/10 border-t-[var(--accent-teal)] rounded-full animate-spin mx-auto mb-3" />
                <span className="text-[var(--text-secondary)] text-sm">{t('calibration.starting')}</span>
              </div>
            </div>
          )}
          {error && (
            <div className="absolute inset-0 flex items-center justify-center bg-white/70">
              <span className="text-[var(--danger)] text-sm px-4 text-center">{t(error as TranslationKey)}</span>
            </div>
          )}
        </div>

        {/* Result card — after successful calibration */}
        {showResultCard && (
          <div className="w-[480px] glass-card-strong rounded-xl p-4 mb-6">
            <div className="flex items-center gap-2">
              <span
                className="w-6 h-6 rounded-full flex items-center justify-center text-sm font-bold"
                style={{ color: 'var(--success)', backgroundColor: 'rgba(45,159,94,0.12)' }}
              >
                ✓
              </span>
              <h3 className="text-sm font-bold text-[var(--text-primary)]">
                {t('calibration.completeMsg')}
              </h3>
            </div>
            {featureRows}
          </div>
        )}

        {/* Failed card */}
        {showFailedCard && (
          <div className="w-[480px] glass-card-strong rounded-xl p-4 mb-6" style={{ borderColor: 'rgba(217,68,82,0.25)' }}>
            <div className="flex items-center gap-2 mb-2">
              <Icon name="status.warning" size={20} />
              <h3 className="text-sm font-bold text-[var(--danger)]">
                {t('calibration.failedMsg')}
              </h3>
            </div>
            <p className="text-sm text-[var(--text-secondary)]">
              {t('calibration.failedHint')}
            </p>
          </div>
        )}

        {/* Saved calibration card */}
        {showSavedCard && calibrationData && (
          <div className="w-[480px] bg-[var(--surface-panel)] border border-[var(--border)] rounded-xl p-4 mb-6">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-[var(--text-primary)]">
                {t('calibration.savedTitle')}
              </h3>
              {calibrationData.timestamp && (
                <span className="text-xs text-[var(--text-muted)]">
                  {new Date(calibrationData.timestamp).toLocaleDateString()}
                </span>
              )}
            </div>
            {featureRows}
          </div>
        )}

        {/* Buttons: result → redo + continue */}
        {showResultCard && (
          <div className="flex gap-3">
            <button
              onClick={handleStartCalibration}
              className="px-8 py-3 bg-[var(--surface-card)] border border-[var(--border)] rounded-xl font-semibold text-[var(--text-secondary)] hover:border-[var(--border-hover)] hover:text-[var(--text-primary)] transition-colors"
            >
              {t('calibration.redo')}
            </button>
            <button
              onClick={handleContinue}
              className="px-8 py-3 bg-[var(--accent-teal)] text-black font-bold rounded-xl transition-all duration-150 hover:brightness-110 active:scale-[0.98]"
            >
              {t('calibration.continue')}
            </button>
          </div>
        )}

        {/* Buttons: failed → retry */}
        {showFailedCard && (
          <button
            onClick={handleStartCalibration}
            className="px-8 py-3 bg-[var(--accent-teal)] text-black font-bold rounded-xl transition-all duration-150 hover:brightness-110 active:scale-[0.98]"
          >
            {t('calibration.retry')}
          </button>
        )}

        {/* Buttons: initial → start / use saved / back */}
        {!isCalibrating && !showResultCard && !showFailedCard && (
          <div className="flex gap-3">
            {(hasSaved || !!error) && (
              <button
                onClick={() => {
                  soundManager.play(hasSaved ? 'navForward' : 'navBack');
                  stopCamera();
                  setScreen(hasSaved ? AppScreen.GameSelect : AppScreen.Nickname);
                }}
                className="px-8 py-3 bg-[var(--surface-card)] border border-[var(--border)] rounded-xl font-semibold text-[var(--text-secondary)] hover:border-[var(--border-hover)] hover:text-[var(--text-primary)] transition-colors"
              >
                {hasSaved ? t('calibration.useSaved') : t('common.back')}
              </button>
            )}
            <button
              onClick={handleStartCalibration}
              disabled={loading || !!error}
              className="px-8 py-3 bg-[var(--accent-teal)] text-black font-bold rounded-xl transition-all duration-150 hover:brightness-110 active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {hasSaved ? t('calibration.redo') : t('calibration.title')}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

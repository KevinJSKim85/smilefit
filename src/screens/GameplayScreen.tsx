import { useEffect, useMemo, useCallback } from 'react';
import { useAppContext } from '../context/AppContext';
import { useCamera } from '../hooks/useCamera';
import { useSharedLandmarker } from '../context/DetectionContext';
import { useFaceDetection } from '../hooks/useFaceDetection';
import { AppScreen, GameType } from '../types/app';
import { BalloonGame } from '../games/balloon/BalloonGame';
import { TetrisGame } from '../games/tetris/TetrisGame';
import { CameraPreview } from '../components/CameraPreview';
import { useTranslation } from '../i18n';

export function GameplayScreen() {
  const { selectedGame, calibrationData, setLastScore, setScreen } = useAppContext();
  const { t } = useTranslation();

  const { videoRef, start: startCamera, isReady: cameraReady } = useCamera();
  const { landmarker, isLoading: landmarkerLoading } = useSharedLandmarker();

  const detection = useFaceDetection({
    videoRef,
    landmarker,
    calibration: calibrationData,
    enabled: cameraReady && !!landmarker,
  });

  // Derive playing state instead of syncing with effect
  const isPlaying = useMemo(() => cameraReady && !!landmarker, [cameraReady, landmarker]);

  // Start camera on mount
  useEffect(() => {
    startCamera();
  }, [startCamera]);

  const handleGameOver = useCallback(
    (score: number) => {
      setLastScore(score);
      setScreen(AppScreen.GameOver);
    },
    [setLastScore, setScreen]
  );

  const loading = landmarkerLoading || !cameraReady;

  const hintKey = selectedGame === GameType.Balloon
    ? 'gameplay.hint.balloon' as const
    : 'gameplay.hint.tetris' as const;

  const tetrisHints = useMemo(() => [
    t('tetris.hint.leftWink'),
    t('tetris.hint.rightWink'),
    t('tetris.hint.smile'),
    t('tetris.hint.doubleWink'),
  ], [t]);

  return (
    <div className="min-h-screen bg-[var(--bg)] flex items-center justify-center p-4 relative">
      {/* Loading overlay */}
      {loading && (
        <div className="absolute inset-0 z-20 flex items-center justify-center bg-[var(--bg)]">
          <div className="glass-card rounded-2xl px-8 py-6 text-center">
            <div className="w-12 h-12 border-4 border-black/10 border-t-[var(--accent-teal)] rounded-full animate-spin mx-auto mb-4" />
            <p className="text-[var(--text-muted)]">{t('common.loading')}</p>
          </div>
        </div>
      )}

      {/* Game canvas */}
      {selectedGame === GameType.Balloon && (
        <BalloonGame
          smileIntensity={detection.smileState.emaScore}
          isRunning={isPlaying}
          onGameOver={handleGameOver}
        />
      )}

      {selectedGame === GameType.Tetris && (
        <TetrisGame
          leftWink={detection.winkState.leftWink}
          rightWink={detection.winkState.rightWink}
          doubleWink={detection.winkState.doubleWink}
          isSmiling={detection.smileState.isSmiling}
          isRunning={isPlaying}
          onGameOver={handleGameOver}
          controlHints={tetrisHints}
        />
      )}

      {/* Camera preview — always mounted so videoRef is available */}
      <CameraPreview videoRef={videoRef} show={!loading} />

      {/* Bottom instruction pill — glass treatment to match app visual language */}
      {!loading && (
        <div className="absolute bottom-5 left-1/2 -translate-x-1/2 z-10">
          <div className="glass-card px-6 py-2.5 rounded-full text-[15px] text-[var(--text-secondary)]">
            {t(hintKey)}
          </div>
        </div>
      )}
    </div>
  );
}

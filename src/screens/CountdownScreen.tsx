import { useState, useEffect } from 'react';
import { useAppContext } from '../context/AppContext';
import { useTranslation } from '../i18n';
import { AppScreen, GameType } from '../types/app';
import { soundManager } from '../audio/SoundManager';
import { useCamera } from '../hooks/useCamera';
import { CameraPreview } from '../components/CameraPreview';
import { FluidBackground } from '../components/FluidBackground';
import type { FluidVariant } from '../components/FluidBackground';
import { DecoShapes } from '../components/DecoShapes';

export function CountdownScreen() {
  const { selectedGame, setScreen } = useAppContext();
  const { t } = useTranslation();
  const [count, setCount] = useState(3);
  // Key forces CSS animation to replay on each count change
  const [animKey, setAnimKey] = useState(0);

  const { videoRef, start: startCamera } = useCamera();

  // Start camera so player can see themselves during countdown
  useEffect(() => {
    startCamera();
  }, [startCamera]);

  useEffect(() => {
    if (count === 0) {
      soundManager.play('countdownGo');
      const timer = setTimeout(() => setScreen(AppScreen.Gameplay), 500);
      return () => clearTimeout(timer);
    }
    soundManager.play('countdownBeep');
    const timer = setTimeout(() => {
      setCount((c) => c - 1);
      setAnimKey((k) => k + 1);
    }, 1000);
    return () => clearTimeout(timer);
  }, [count, setScreen]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-transparent relative overflow-hidden">
      <FluidBackground
        variant={(selectedGame === GameType.Tetris ? 'countdownTetris' : 'countdownBalloon') as FluidVariant}
        intensity={(3 - count) / 3}
      />
      <DecoShapes variant="countdown" countdownScale={(3 - count) / 3} />
      {/* Number + hint — single centered group with burst wrapping all */}
      <div className="relative flex flex-col items-center justify-center z-10">
        {/* Radial burst — large enough to wrap number + hint text */}
        <div
          key={`burst-${animKey}`}
          className="absolute rounded-full"
          style={{
            width: '80vmin',
            height: '80vmin',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            background: 'radial-gradient(circle, rgba(43,168,154,0.16) 0%, rgba(43,168,154,0.06) 40%, transparent 70%)',
            animation: 'scaleIn 0.4s ease-out',
          }}
        />

        <div
          key={animKey}
          className={count === 0 ? 'text-9xl font-extrabold gradient-text relative' : 'text-9xl font-extrabold text-[var(--accent-teal)] relative'}
          style={{ animation: 'countPulse 0.4s ease-out' }}
        >
          {count > 0 ? count : t('countdown.go')}
        </div>

        {count > 0 && (
          <p className="mt-6 text-[var(--text-muted)] text-xl relative">
            {selectedGame === GameType.Balloon
              ? t('countdown.hint.balloon')
              : t('countdown.hint.tetris')}
          </p>
        )}
      </div>

      <CameraPreview videoRef={videoRef} />
    </div>
  );
}

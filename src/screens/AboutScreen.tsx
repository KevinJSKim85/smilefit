import { useAppContext } from '../context/AppContext';
import { useTranslation } from '../i18n';
import { AppScreen } from '../types/app';
import { soundManager } from '../audio/SoundManager';
import { FluidBackground } from '../components/FluidBackground';
import { Logo } from '../components/Logo';

export function AboutScreen() {
  const { setScreen } = useAppContext();
  const { t } = useTranslation();

  return (
    <div className="min-h-screen flex flex-col bg-transparent text-[var(--text-primary)] relative overflow-hidden">
      <FluidBackground variant="start" />

      <div className="flex-1 flex flex-col items-center justify-center relative z-10 px-6">
        <Logo size={100} variant="main" className="mb-3" />

        <h1 className="text-4xl font-extrabold mb-6 gradient-text">
          {t('about.title')}
        </h1>

        <p className="text-[var(--text-secondary)] text-lg text-center max-w-[520px] mb-10 leading-relaxed">
          {t('about.description')}
        </p>

        <button
          onClick={() => { soundManager.play('navForward'); setScreen(AppScreen.Start); }}
          className="px-10 py-3 rounded-xl text-base font-semibold bg-[var(--accent-teal)] text-black transition-all duration-150 hover:brightness-110 hover:shadow-lg hover:-translate-y-0.5 active:scale-[0.98]"
        >
          {t('about.back')}
        </button>
      </div>
    </div>
  );
}

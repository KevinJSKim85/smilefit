import { useAppContext } from '../context/AppContext';
import { useTranslation } from '../i18n';
import { AppScreen } from '../types/app';
import { soundManager } from '../audio/SoundManager';
import { FluidBackground } from '../components/FluidBackground';
import { DecoShapes } from '../components/DecoShapes';
import { Icon } from '../components/Icons';
import { Logo } from '../components/Logo';

export function StartScreen() {
  const { setScreen } = useAppContext();
  const { t } = useTranslation();

  return (
    <div className="min-h-screen flex flex-col bg-transparent text-[var(--text-primary)] relative overflow-hidden">
      <FluidBackground variant="start" />
      <DecoShapes variant="start" />

      {/* Main content — vertically centered */}
      <div className="flex-1 flex flex-col items-center justify-center relative z-10">
        <Logo size={150} variant="main" className="mb-0 stagger-1" />

        <h1 className="text-8xl font-extrabold mb-4 gradient-text stagger-1">
          {t('start.title')}
        </h1>

        <p className="text-[var(--text-secondary)] text-xl mb-10 tracking-wide stagger-2">
          {t('start.subtitle')}
        </p>

        {/* How it works — face control explanation */}
        <div className="flex gap-10 mb-12 stagger-3">
          {([
            { icon: 'face.smile' as const, label: t('start.howSmile') },
            { icon: 'face.wink' as const, label: t('start.howWink') },
            { icon: 'face.blink' as const, label: t('start.howBlink') },
          ]).map((item) => (
            <div key={item.icon} className="flex flex-col items-center gap-3 max-w-[180px]">
              <div className="w-[72px] h-[72px] rounded-full bg-[var(--surface-card)] border border-[var(--border)] flex items-center justify-center shadow-sm">
                <Icon name={item.icon} size={40} />
              </div>
              <span className="text-sm text-[var(--text-muted)] text-center leading-snug">{item.label}</span>
            </div>
          ))}
        </div>

        {/* Game preview cards */}
        <div className="flex gap-5 mb-12 stagger-3">
          <div className="flex items-center gap-4 px-6 py-4 glass-card rounded-xl">
            <Icon name="game.balloon" size={36} />
            <div>
              <div className="text-base font-semibold">{t('game.balloon.name')}</div>
              <div className="text-xs text-[var(--text-muted)]">{t('game.balloon.difficulty')}</div>
            </div>
          </div>
          <div className="flex items-center gap-4 px-6 py-4 glass-card rounded-xl">
            <Icon name="game.tetris" size={36} />
            <div>
              <div className="text-base font-semibold">{t('game.tetris.name')}</div>
              <div className="text-xs text-[var(--text-muted)]">{t('game.tetris.difficulty')}</div>
            </div>
          </div>
        </div>

        {/* Primary CTA */}
        <button
          onClick={() => { soundManager.play('navForward'); setScreen(AppScreen.Nickname); }}
          className="px-16 py-5 rounded-xl text-xl font-bold bg-[var(--accent-teal)] text-black transition-all duration-150 hover:brightness-110 hover:shadow-lg hover:-translate-y-0.5 active:scale-[0.98] btn-shimmer gradient-border stagger-4"
        >
          {t('start.play')}
        </button>

        <p className="mt-6 text-[var(--text-muted)] text-sm tracking-widest uppercase stagger-4">
          {t('start.noTouch')}
        </p>
      </div>

      {/* Footer — Instagram + About Us */}
      <footer className="relative z-10 flex items-center justify-center gap-6 pb-6 stagger-4">
        <a
          href="https://www.instagram.com/"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2 text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors text-sm"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
            <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
            <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" />
          </svg>
          {t('start.instagram')}
        </a>
        <span className="text-[var(--text-secondary)] opacity-30">|</span>
        <button
          onClick={() => { soundManager.play('navForward'); setScreen(AppScreen.About); }}
          className="flex items-center gap-2 text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors text-sm"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
            <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
          </svg>
          {t('start.aboutUs')}
        </button>
      </footer>
    </div>
  );
}

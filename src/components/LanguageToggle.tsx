import { useAppContext } from '../context/AppContext';

export function LanguageToggle() {
  const { language, setLanguage } = useAppContext();

  return (
    <button
      onClick={() => setLanguage(language === 'ko' ? 'en' : 'ko')}
      className="px-4 py-1.5 rounded-full bg-[var(--surface-card)] border border-[var(--border)] text-sm font-semibold text-[var(--text-secondary)] hover:border-[var(--border-hover)] hover:text-[var(--text-primary)] transition-colors"
    >
      {language === 'ko' ? 'EN' : 'KO'}
    </button>
  );
}

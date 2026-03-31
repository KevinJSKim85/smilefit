import { useState, useEffect, useRef } from 'react';
import { useAppContext } from '../context/AppContext';
import { useTranslation } from '../i18n';
import { AppScreen } from '../types/app';
import { soundManager } from '../audio/SoundManager';
import { isProfane } from '../services/profanityFilter';
import { detectCountry } from '../services/geolocation';
import { COMMON_COUNTRIES, countryCodeToFlag } from '../utils/countries';
import { FluidBackground } from '../components/FluidBackground';
import { DecoShapes } from '../components/DecoShapes';

export function NicknameScreen() {
  const { nickname, setNickname, country, setCountry, language, setScreen } = useAppContext();
  const { t } = useTranslation();
  const [input, setInput] = useState(nickname);
  const [error, setError] = useState('');
  const [showCountryPicker, setShowCountryPicker] = useState(false);
  const pickerRef = useRef<HTMLDivElement>(null);

  // Close country picker on outside click
  useEffect(() => {
    if (!showCountryPicker) return;
    const handleClick = (e: MouseEvent) => {
      if (pickerRef.current && !pickerRef.current.contains(e.target as Node)) {
        setShowCountryPicker(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [showCountryPicker]);

  // Auto-detect country on first visit (if not already set)
  useEffect(() => {
    if (!country) {
      detectCountry().then((code) => {
        if (code) setCountry(code);
      });
    }
  }, [country, setCountry]);

  const handleConfirm = () => {
    const trimmed = input.trim();
    if (!trimmed) {
      setError(t('nickname.empty'));
      return;
    }
    if (isProfane(trimmed)) {
      setError(t('nickname.profanity'));
      return;
    }
    setNickname(trimmed);
    soundManager.play('navForward');
    setScreen(AppScreen.Calibration);
  };

  const countryName = COMMON_COUNTRIES.find((c) => c.code === country);
  const displayCountry = country
    ? `${countryCodeToFlag(country)} ${countryName ? (language === 'ko' ? countryName.nameKo : countryName.nameEn) : country}`
    : t('nickname.country');

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-transparent text-[var(--text-primary)] p-4 relative overflow-hidden">
      <FluidBackground variant="nickname" />
      <DecoShapes variant="nickname" />
      <div className="w-full max-w-lg glass-card-strong rounded-2xl p-10 stagger-1 relative z-10">
        {nickname && (
          <p className="text-[var(--text-secondary)] text-base text-center mb-2">{t('nickname.welcomeBack')}</p>
        )}
        <h2 className="text-3xl font-bold text-center mb-8">{t('nickname.title')}</h2>

        <input
          type="text"
          value={input}
          onChange={(e) => {
            setInput(e.target.value);
            setError('');
          }}
          onKeyDown={(e) => e.key === 'Enter' && handleConfirm()}
          placeholder={t('nickname.placeholder')}
          className="w-full px-6 py-4 bg-[var(--surface-card)] border border-[var(--border)] rounded-xl text-center text-xl focus:outline-none focus:border-[var(--accent-teal)] focus:shadow-[0_0_0_3px_rgba(43,168,154,0.15)] transition-all placeholder:text-[var(--text-muted)]"
          maxLength={20}
          autoFocus
        />

        {error && <p className="text-[var(--danger)] text-sm mt-2 text-center">{error}</p>}

        {/* Country selector */}
        <div ref={pickerRef} className="relative mt-4 flex justify-center">
          <button
            onClick={() => { soundManager.play('buttonClick'); setShowCountryPicker(!showCountryPicker); }}
            className="px-5 py-2 bg-[var(--surface-card)] border border-[var(--border)] rounded-xl text-sm text-[var(--text-secondary)] hover:border-[var(--border-hover)] transition-colors"
          >
            {displayCountry}
          </button>

          {showCountryPicker && (
            <div className="absolute top-full mt-2 w-72 max-h-60 overflow-y-auto bg-[var(--surface-panel)] border border-[var(--border)] rounded-xl shadow-xl z-10">
              {COMMON_COUNTRIES.map((c) => (
                <button
                  key={c.code}
                  onClick={() => {
                    soundManager.play('buttonClick');
                    setCountry(c.code);
                    setShowCountryPicker(false);
                  }}
                  className={`w-full px-4 py-2 text-left text-sm hover:bg-[var(--surface-card-hover)] transition-colors flex items-center gap-2 ${
                    c.code === country ? 'bg-[var(--surface-card)] text-[var(--text-primary)]' : 'text-[var(--text-secondary)]'
                  }`}
                >
                  <span>{countryCodeToFlag(c.code)}</span>
                  <span>{language === 'ko' ? c.nameKo : c.nameEn}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Primary action */}
        <button
          onClick={handleConfirm}
          className="w-full mt-6 py-4 text-lg bg-[var(--accent-teal)] text-black font-bold rounded-xl transition-all duration-150 hover:brightness-110 active:scale-[0.98]"
        >
          {t('nickname.confirm')}
        </button>
      </div>
    </div>
  );
}

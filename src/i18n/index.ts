import { useAppContext } from '../context/AppContext';
import { ko } from './ko';
import { en } from './en';

export type TranslationKey = keyof typeof ko;

const dictionaries = { ko, en } as const;

export function useTranslation() {
  const { language } = useAppContext();
  const dict = dictionaries[language];

  function t(key: TranslationKey): string {
    return dict[key] ?? key;
  }

  return { t, language };
}

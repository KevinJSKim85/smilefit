import { useState, useCallback } from 'react';

export function useLocalStorage<T>(
  key: string,
  defaultValue: T
): [T, (val: T) => void, () => void] {
  const [storedValue, setStoredValue] = useState<T>(() => {
    try {
      const item = window.localStorage.getItem(key);
      return item ? (JSON.parse(item) as T) : defaultValue;
    } catch {
      return defaultValue;
    }
  });

  const setValue = useCallback(
    (value: T) => {
      setStoredValue(value);
      try {
        window.localStorage.setItem(key, JSON.stringify(value));
      } catch {
        // localStorage full or unavailable
      }
    },
    [key]
  );

  const removeValue = useCallback(() => {
    setStoredValue(defaultValue);
    try {
      window.localStorage.removeItem(key);
    } catch {
      // ignore
    }
  }, [key, defaultValue]);

  return [storedValue, setValue, removeValue];
}

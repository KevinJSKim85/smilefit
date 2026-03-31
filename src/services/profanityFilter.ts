import { Filter } from 'bad-words';
import KoFilter from 'badwords-ko';

const enFilter = new Filter();
const koFilter = new KoFilter();

/** Returns true if the input contains profanity (EN or KO). */
export function isProfane(text: string): boolean {
  return enFilter.isProfane(text) || koFilter.isProfane(text);
}

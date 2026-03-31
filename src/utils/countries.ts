// ISO 3166-1 alpha-2 country codes to flag emoji + name
const COUNTRY_FLAG_OFFSET = 0x1F1E6 - 'A'.charCodeAt(0);

export function countryCodeToFlag(code: string): string {
  const upper = code.toUpperCase();
  if (upper.length !== 2) return '';
  return String.fromCodePoint(
    upper.charCodeAt(0) + COUNTRY_FLAG_OFFSET,
    upper.charCodeAt(1) + COUNTRY_FLAG_OFFSET
  );
}

export const COMMON_COUNTRIES: { code: string; nameKo: string; nameEn: string }[] = [
  { code: 'KR', nameKo: '대한민국', nameEn: 'South Korea' },
  { code: 'US', nameKo: '미국', nameEn: 'United States' },
  { code: 'JP', nameKo: '일본', nameEn: 'Japan' },
  { code: 'CN', nameKo: '중국', nameEn: 'China' },
  { code: 'GB', nameKo: '영국', nameEn: 'United Kingdom' },
  { code: 'DE', nameKo: '독일', nameEn: 'Germany' },
  { code: 'FR', nameKo: '프랑스', nameEn: 'France' },
  { code: 'CA', nameKo: '캐나다', nameEn: 'Canada' },
  { code: 'AU', nameKo: '호주', nameEn: 'Australia' },
  { code: 'IN', nameKo: '인도', nameEn: 'India' },
  { code: 'BR', nameKo: '브라질', nameEn: 'Brazil' },
  { code: 'MX', nameKo: '멕시코', nameEn: 'Mexico' },
  { code: 'TH', nameKo: '태국', nameEn: 'Thailand' },
  { code: 'VN', nameKo: '베트남', nameEn: 'Vietnam' },
  { code: 'PH', nameKo: '필리핀', nameEn: 'Philippines' },
  { code: 'SG', nameKo: '싱가포르', nameEn: 'Singapore' },
  { code: 'TW', nameKo: '대만', nameEn: 'Taiwan' },
  { code: 'ID', nameKo: '인도네시아', nameEn: 'Indonesia' },
  { code: 'MY', nameKo: '말레이시아', nameEn: 'Malaysia' },
  { code: 'IT', nameKo: '이탈리아', nameEn: 'Italy' },
  { code: 'ES', nameKo: '스페인', nameEn: 'Spain' },
  { code: 'RU', nameKo: '러시아', nameEn: 'Russia' },
  { code: 'NZ', nameKo: '뉴질랜드', nameEn: 'New Zealand' },
  { code: 'SE', nameKo: '스웨덴', nameEn: 'Sweden' },
  { code: 'NL', nameKo: '네덜란드', nameEn: 'Netherlands' },
];

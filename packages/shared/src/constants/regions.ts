export interface SteamRegion {
  code: string;
  name: string;
  nameEn: string;
  currency: string;
  currencySymbol: string;
}

export const STEAM_REGIONS: SteamRegion[] = [
  { code: 'RU', name: 'Россия', nameEn: 'Russia', currency: 'RUB', currencySymbol: '₽' },
  { code: 'KZ', name: 'Казахстан', nameEn: 'Kazakhstan', currency: 'KZT', currencySymbol: '₸' },
  { code: 'TR', name: 'Турция', nameEn: 'Turkey', currency: 'TRY', currencySymbol: '₺' },
  { code: 'AR', name: 'Аргентина', nameEn: 'Argentina', currency: 'ARS', currencySymbol: 'ARS$' },
  { code: 'BR', name: 'Бразилия', nameEn: 'Brazil', currency: 'BRL', currencySymbol: 'R$' },
  { code: 'UA', name: 'Украина', nameEn: 'Ukraine', currency: 'UAH', currencySymbol: '₴' },
  { code: 'PL', name: 'Польша', nameEn: 'Poland', currency: 'PLN', currencySymbol: 'zł' },
  { code: 'US', name: 'США', nameEn: 'USA', currency: 'USD', currencySymbol: '$' },
  { code: 'EU', name: 'Евросоюз', nameEn: 'EU', currency: 'EUR', currencySymbol: '€' },
  { code: 'GB', name: 'Великобритания', nameEn: 'UK', currency: 'GBP', currencySymbol: '£' },
];

export const EXCHANGE_RATES: Record<string, number> = {
  USD: 1,
  EUR: 1.08,
  GBP: 1.27,
  RUB: 0.011,
  KZT: 0.002,
  TRY: 0.031,
  UAH: 0.024,
  PLN: 0.25,
  BRL: 0.2,
  ARS: 0.0011,
  CNY: 0.14,
  JPY: 0.0067,
  INR: 0.012,
};

// Convert country code to flag emoji
export function countryCodeToFlag(code: string): string {
  if (!code || code.length !== 2) return '';
  const codePoints = code
    .toUpperCase()
    .split('')
    .map((char) => 0x1f1e6 + char.charCodeAt(0) - 65);
  return String.fromCodePoint(...codePoints);
}

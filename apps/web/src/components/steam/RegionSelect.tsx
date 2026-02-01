import { STEAM_REGIONS, countryCodeToFlag } from '@tarmaks/shared';
import { useTranslation } from 'react-i18next';

interface RegionSelectProps {
  value: string;
  onChange: (value: string) => void;
}

export function RegionSelect({ value, onChange }: RegionSelectProps) {
  const { t, i18n } = useTranslation('steam');
  const isRu = i18n.language === 'ru';

  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-full h-9 px-3 py-1 text-sm border border-input bg-background rounded-md focus:outline-none focus:ring-2 focus:ring-ring"
    >
      <option value="">{t('region.select')}</option>
      {STEAM_REGIONS.map((region) => (
        <option key={region.code} value={region.code}>
          {countryCodeToFlag(region.code)} {isRu ? region.name : region.nameEn} (
          {region.currencySymbol})
        </option>
      ))}
    </select>
  );
}

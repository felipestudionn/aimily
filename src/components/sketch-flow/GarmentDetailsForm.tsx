'use client';

import { GarmentDetails, GarmentType } from '@/types/tech-pack';
import { useTranslation } from '@/i18n';

interface GarmentDetailsFormProps {
  details: GarmentDetails;
  onChange: (details: GarmentDetails) => void;
}

const GARMENT_TYPE_KEYS: { value: GarmentType; key: keyof typeof import('@/i18n/en').en.sketchFlowPage }[] = [
  { value: 'top', key: 'typeTop' },
  { value: 'blouse', key: 'typeBlouse' },
  { value: 'shirt', key: 'typeShirt' },
  { value: 'jacket', key: 'typeJacket' },
  { value: 'blazer', key: 'typeBlazer' },
  { value: 'dress', key: 'typeDress' },
  { value: 'pants', key: 'typePants' },
  { value: 'skirt', key: 'typeSkirt' },
  { value: 'set', key: 'typeSet' },
  { value: 'coat', key: 'typeCoat' },
  { value: 'other', key: 'typeOther' },
];

const SEASONS = [
  'SS26',
  'PF26',
  'Resort 2026',
  'FW26',
  'SS27',
  'FW27',
];

export default function GarmentDetailsForm({ details, onChange }: GarmentDetailsFormProps) {
  const t = useTranslation();
  const update = (field: keyof GarmentDetails, value: string) => {
    onChange({ ...details, [field]: value });
  };

  return (
    <div>
      <h3 className="text-lg font-semibold text-gray-900 mb-1">{t.sketchFlowPage.garmentDetails}</h3>
      <p className="text-sm text-gray-500 mb-4">{t.sketchFlowPage.garmentDetailsDesc}</p>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">{t.sketchFlowPage.garmentType}</label>
          <select
            value={details.garmentType}
            onChange={(e) => update('garmentType', e.target.value)}
            className="w-full h-10 px-3 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-gray-900/10 focus:border-gray-400"
          >
            <option value="">{t.sketchFlowPage.selectType}</option>
            {GARMENT_TYPE_KEYS.map((gt) => (
              <option key={gt.value} value={gt.value}>{t.sketchFlowPage[gt.key]}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">{t.sketchFlowPage.season}</label>
          <select
            value={details.season}
            onChange={(e) => update('season', e.target.value)}
            className="w-full h-10 px-3 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-gray-900/10 focus:border-gray-400"
          >
            <option value="">{t.sketchFlowPage.selectSeason}</option>
            {SEASONS.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">{t.sketchFlowPage.styleName}</label>
          <input
            type="text"
            value={details.styleName}
            onChange={(e) => update('styleName', e.target.value)}
            placeholder={t.sketchFlowPage.styleNamePlaceholder}
            className="w-full h-10 px-3 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900/10 focus:border-gray-400 placeholder:text-gray-400"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">{t.sketchFlowPage.mainFabric}</label>
          <input
            type="text"
            value={details.fabric}
            onChange={(e) => update('fabric', e.target.value)}
            placeholder={t.sketchFlowPage.mainFabricPlaceholder}
            className="w-full h-10 px-3 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900/10 focus:border-gray-400 placeholder:text-gray-400"
          />
        </div>
        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-gray-700 mb-1">{t.sketchFlowPage.additionalNotes}</label>
          <textarea
            value={details.additionalNotes}
            onChange={(e) => update('additionalNotes', e.target.value)}
            placeholder={t.sketchFlowPage.additionalNotesPlaceholder}
            rows={3}
            className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-gray-900/10 focus:border-gray-400 placeholder:text-gray-400"
          />
        </div>
      </div>
    </div>
  );
}

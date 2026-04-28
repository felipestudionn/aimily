'use client';

import { useTranslation } from '@/i18n';
import { SiteFooter } from '@/components/layout/SiteFooter';

export default function TermsPage() {
  const t = useTranslation();

  return (
    <div className="min-h-screen bg-white">
      <div className="pt-28 pb-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl mx-auto">
          <h1 className="text-4xl font-bold mb-4">{t.termsPage.title}</h1>
          <p className="text-sm text-gray-500 mb-10">{t.termsPage.lastUpdated}</p>

          <div className="prose prose-lg max-w-none">

            {/* ─── Sección 1 ─── */}
            <h2 className="text-2xl font-semibold mt-10 mb-4">{t.termsPage.s1Title}</h2>
            <p>{t.termsPage.s1Text}</p>
            <p>{t.termsPage.s1Text2}</p>
            <ul className="list-disc pl-6 mb-4">
              <li>{t.termsPage.s1Item1}</li>
              <li>{t.termsPage.s1Item2}</li>
              <li>{t.termsPage.s1Item3}</li>
            </ul>

            {/* ─── Sección 2 ─── */}
            <h2 className="text-2xl font-semibold mt-10 mb-4">{t.termsPage.s2Title}</h2>
            <p>{t.termsPage.s2Text}</p>
            <ul className="list-disc pl-6 mb-4">
              <li>{t.termsPage.s2Item1}</li>
              <li>{t.termsPage.s2Item2}</li>
              <li>{t.termsPage.s2Item3}</li>
              <li>{t.termsPage.s2Item4}</li>
            </ul>
            <p>{t.termsPage.s2Text2}</p>

            {/* ─── Sección 3 ─── */}
            <h2 className="text-2xl font-semibold mt-10 mb-4">{t.termsPage.s3Title}</h2>
            <p>{t.termsPage.s3Text}</p>
            <ul className="list-disc pl-6 mb-4">
              <li>{t.termsPage.s3Item1}</li>
              <li>{t.termsPage.s3Item2}</li>
              <li>{t.termsPage.s3Item3}</li>
              <li>{t.termsPage.s3Item4}</li>
            </ul>
            <p>{t.termsPage.s3Text2}</p>

            {/* ─── Sección 4 ─── */}
            <h2 className="text-2xl font-semibold mt-10 mb-4">{t.termsPage.s4Title}</h2>
            <p>{t.termsPage.s4Text}</p>
            <ul className="list-disc pl-6 mb-4">
              <li><strong>{t.termsPage.s4Item1Trial}</strong>{t.termsPage.s4Item1Desc}</li>
              <li><strong>{t.termsPage.s4Item2Starter}</strong>{t.termsPage.s4Item2Desc}</li>
              <li><strong>{t.termsPage.s4Item3Pro}</strong>{t.termsPage.s4Item3Desc}</li>
              <li><strong>{t.termsPage.s4Item4Ent}</strong>{t.termsPage.s4Item4Desc}</li>
            </ul>
            <p>{t.termsPage.s4VatNote}</p>
            <p>{t.termsPage.s4Text2}</p>

            <h3 className="text-xl font-semibold mt-6 mb-3">{t.termsPage.s4_1Title}</h3>
            <p>
              {t.termsPage.s4_1Text}{' '}
              <a href="/account" className="text-primary hover:underline">{t.termsPage.s4_1AccountLink}</a>
              {t.termsPage.s4_1TextCont}
            </p>
            <ul className="list-disc pl-6 mb-4">
              <li>{t.termsPage.s4_1Item1}</li>
              <li>{t.termsPage.s4_1Item2}</li>
              <li>{t.termsPage.s4_1Item3}</li>
            </ul>

            <h3 className="text-xl font-semibold mt-6 mb-3">{t.termsPage.s4_2Title}</h3>
            <p>
              {t.termsPage.s4_2Text}{' '}
              <a href="/account" className="text-primary hover:underline">{t.termsPage.s4_2AccountLink}</a>
              {t.termsPage.s4_2TextCont}
            </p>

            {/* ─── Sección 5 ─── */}
            <h2 className="text-2xl font-semibold mt-10 mb-4">{t.termsPage.s5Title}</h2>
            <p>{t.termsPage.s5Text}</p>
            <ul className="list-disc pl-6 mb-4">
              <li>{t.termsPage.s5Item1}</li>
              <li>{t.termsPage.s5Item2}</li>
              <li>{t.termsPage.s5Item3}</li>
              <li>{t.termsPage.s5Item4}</li>
              <li>{t.termsPage.s5Item5}</li>
            </ul>

            {/* ─── Sección 6 — CRITICAL LEGAL SECTION ─── */}
            <h2 className="text-2xl font-semibold mt-10 mb-4">{t.termsPage.s6Title}</h2>
            <p className="font-medium text-gray-800">{t.termsPage.s6Intro}</p>
            <p>{t.termsPage.s6Text}</p>
            <ul className="list-disc pl-6 mb-4 space-y-1">
              <li>{t.termsPage.s6Item1}</li>
              <li>{t.termsPage.s6Item2}</li>
              <li>{t.termsPage.s6Item3}</li>
              <li>{t.termsPage.s6Item4}</li>
              <li>{t.termsPage.s6Item5}</li>
              <li>{t.termsPage.s6Item6}</li>
              <li>{t.termsPage.s6Item7}</li>
              <li>{t.termsPage.s6Item8}</li>
              <li>{t.termsPage.s6Item9}</li>
            </ul>
            <div className="bg-amber-50 border border-amber-300 rounded-md p-4 mb-4">
              <p className="font-semibold text-amber-900">{t.termsPage.s6Warning}</p>
            </div>

            {/* ─── Sección 7 ─── */}
            <h2 className="text-2xl font-semibold mt-10 mb-4">{t.termsPage.s7Title}</h2>
            <p>{t.termsPage.s7Text}</p>
            <ul className="list-disc pl-6 mb-4">
              <li>{t.termsPage.s7Item1}</li>
              <li>{t.termsPage.s7Item2}</li>
              <li>{t.termsPage.s7Item3}</li>
              <li>{t.termsPage.s7Item4}</li>
              <li>{t.termsPage.s7Item5}</li>
              <li>{t.termsPage.s7Item6}</li>
              <li>{t.termsPage.s7Item7}</li>
              <li>{t.termsPage.s7Item8}</li>
              <li>{t.termsPage.s7Item9}</li>
            </ul>

            {/* ─── Sección 8 ─── */}
            <h2 className="text-2xl font-semibold mt-10 mb-4">{t.termsPage.s8Title}</h2>
            <p>{t.termsPage.s8Text}</p>
            <ul className="list-disc pl-6 mb-4">
              <li>{t.termsPage.s8Item1}</li>
              <li>{t.termsPage.s8Item2}</li>
              <li>{t.termsPage.s8Item3}</li>
              <li>{t.termsPage.s8Item4}</li>
              <li>{t.termsPage.s8Item5}</li>
            </ul>

            {/* ─── Sección 9 ─── */}
            <h2 className="text-2xl font-semibold mt-10 mb-4">{t.termsPage.s9Title}</h2>
            <p>{t.termsPage.s9Text}</p>
            <ul className="list-disc pl-6 mb-4">
              <li>{t.termsPage.s9Item1}</li>
              <li>{t.termsPage.s9Item2}</li>
              <li>{t.termsPage.s9Item3}</li>
              <li>{t.termsPage.s9Item4}</li>
              <li>{t.termsPage.s9Item5}</li>
            </ul>
            <p>{t.termsPage.s9Text2}</p>

            {/* ─── Sección 10 ─── */}
            <h2 className="text-2xl font-semibold mt-10 mb-4">{t.termsPage.s10Title}</h2>
            <p>{t.termsPage.s10Text}</p>
            <ul className="list-disc pl-6 mb-4">
              <li>{t.termsPage.s10Item1}</li>
              <li>{t.termsPage.s10Item2}</li>
              <li>{t.termsPage.s10Item3}</li>
              <li>{t.termsPage.s10Item4}</li>
              <li>{t.termsPage.s10Item5}</li>
              <li>{t.termsPage.s10Item6}</li>
            </ul>
            <p className="text-sm text-gray-600 italic">{t.termsPage.s10Note}</p>

            {/* ─── Sección 11 ─── */}
            <h2 className="text-2xl font-semibold mt-10 mb-4">{t.termsPage.s11Title}</h2>
            <p>{t.termsPage.s11Text}</p>
            <ul className="list-disc pl-6 mb-4">
              <li>{t.termsPage.s11Item1}</li>
              <li>{t.termsPage.s11Item2}</li>
              <li>{t.termsPage.s11Item3}</li>
              <li>{t.termsPage.s11Item4}</li>
              <li>{t.termsPage.s11Item5}</li>
            </ul>

            {/* ─── Sección 12 ─── */}
            <h2 className="text-2xl font-semibold mt-10 mb-4">{t.termsPage.s12Title}</h2>
            <p>{t.termsPage.s12Text}</p>
            <ul className="list-disc pl-6 mb-4">
              <li>{t.termsPage.s12Item1}</li>
              <li>{t.termsPage.s12Item2}</li>
              <li>{t.termsPage.s12Item3}</li>
              <li>{t.termsPage.s12Item4}</li>
            </ul>
            <p>{t.termsPage.s12Text2}</p>

            {/* ─── Sección 13 ─── */}
            <h2 className="text-2xl font-semibold mt-10 mb-4">{t.termsPage.s13Title}</h2>
            <p>{t.termsPage.s13Text}</p>
            <ul className="list-disc pl-6 mb-4">
              <li>{t.termsPage.s13Item1}</li>
              <li>{t.termsPage.s13Item2}</li>
              <li>
                {t.termsPage.s13Item3}{' '}
                <a href="mailto:legal@aimily.app" className="text-primary hover:underline">
                  legal@aimily.app
                </a>
              </li>
              <li>{t.termsPage.s13Item4}</li>
            </ul>

            {/* ─── Sección 14 ─── */}
            <h2 className="text-2xl font-semibold mt-10 mb-4">{t.termsPage.s14Title}</h2>
            <p>{t.termsPage.s14Text}</p>
            <ul className="list-disc pl-6 mb-4">
              <li>{t.termsPage.s14Item1}</li>
              <li>{t.termsPage.s14Item2}</li>
              <li>{t.termsPage.s14Item3}</li>
              <li>{t.termsPage.s14Item4}</li>
            </ul>
            <p>{t.termsPage.s14Text2}</p>
            <p>{t.termsPage.s14Text3}</p>

            {/* ─── Sección 15 ─── */}
            <h2 className="text-2xl font-semibold mt-10 mb-4">{t.termsPage.s15Title}</h2>
            <p>{t.termsPage.s15Text}</p>

            <h3 className="text-xl font-semibold mt-6 mb-3">{t.termsPage.s15_1Title}</h3>
            <p>{t.termsPage.s15_1Text}</p>

            <h3 className="text-xl font-semibold mt-6 mb-3">{t.termsPage.s15_2Title}</h3>
            <p>{t.termsPage.s15_2Text}</p>

            <h3 className="text-xl font-semibold mt-6 mb-3">{t.termsPage.s15_3Title}</h3>
            <p>{t.termsPage.s15_3Text}</p>

            <p className="text-sm text-gray-600 italic mt-4">{t.termsPage.s15Note}</p>

            {/* ─── Sección 16 ─── */}
            <h2 className="text-2xl font-semibold mt-10 mb-4">{t.termsPage.s16Title}</h2>
            <p>{t.termsPage.s16Text}</p>

            {/* ─── Sección 17 ─── */}
            <h2 className="text-2xl font-semibold mt-10 mb-4">{t.termsPage.s17Title}</h2>
            <p>{t.termsPage.s17Text}</p>

            {/* ─── Sección 18 ─── */}
            <h2 className="text-2xl font-semibold mt-10 mb-4">{t.termsPage.s18Title}</h2>
            <p>{t.termsPage.s18Text}</p>
            <p>{t.termsPage.s18Text2}</p>

            {/* ─── Sección 19 ─── */}
            <h2 className="text-2xl font-semibold mt-10 mb-4">{t.termsPage.s19Title}</h2>
            <p>{t.termsPage.s19Text}</p>
            <ul className="list-none pl-0 mb-4 space-y-1">
              <li>
                <a href="mailto:legal@aimily.app" className="text-primary hover:underline">
                  {t.termsPage.s19Email}
                </a>
              </li>
              <li>{t.termsPage.s19Company}</li>
              <li>{t.termsPage.s19Nif}</li>
              <li>{t.termsPage.s19Address}</li>
              <li>
                <a href="https://www.aimily.app" className="text-primary hover:underline" target="_blank" rel="noopener noreferrer">
                  {t.termsPage.s19Domain}
                </a>
              </li>
            </ul>
            <p className="text-sm text-gray-500">{t.termsPage.s19Text2}</p>

          </div>
        </div>
      </div>
      <SiteFooter variant="light" />
    </div>
  );
}

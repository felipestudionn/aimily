'use client';

import { useTranslation } from '@/i18n';

export default function PrivacyPage() {
  const t = useTranslation();

  return (
    <div className="min-h-screen bg-white">
      <div className="pt-28 pb-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl mx-auto">
          <h1 className="text-4xl font-bold mb-4">{t.privacyPage.title}</h1>
          <p className="text-sm text-gray-500 mb-10">{t.privacyPage.lastUpdated}</p>

          <div className="prose prose-lg max-w-none">

            {/* ─── Section 1 ─── */}
            <h2 className="text-2xl font-semibold mt-10 mb-4">{t.privacyPage.s1Title}</h2>
            <p>{t.privacyPage.s1Text}</p>

            {/* ─── Section 2 ─── */}
            <h2 className="text-2xl font-semibold mt-10 mb-4">{t.privacyPage.s2Title}</h2>
            <h3 className="text-xl font-semibold mt-6 mb-3">{t.privacyPage.s2_1Title}</h3>
            <ul className="list-disc pl-6 mb-4">
              <li>{t.privacyPage.s2_1Item1}</li>
              <li>{t.privacyPage.s2_1Item2}</li>
              <li>{t.privacyPage.s2_1Item3}</li>
              <li>{t.privacyPage.s2_1Item4}</li>
              <li>{t.privacyPage.s2_1Item5}</li>
            </ul>
            <h3 className="text-xl font-semibold mt-6 mb-3">{t.privacyPage.s2_2Title}</h3>
            <p>{t.privacyPage.s2_2Text}</p>
            <ul className="list-disc pl-6 mb-4">
              <li>{t.privacyPage.s2_2Item1}</li>
              <li>{t.privacyPage.s2_2Item2}</li>
              <li>{t.privacyPage.s2_2Item3}</li>
            </ul>
            <p>{t.privacyPage.s2_2Note}</p>

            {/* ─── Section 3 ─── */}
            <h2 className="text-2xl font-semibold mt-10 mb-4">{t.privacyPage.s3Title}</h2>
            <p>{t.privacyPage.s3Text}</p>
            <ul className="list-disc pl-6 mb-4">
              <li>{t.privacyPage.s3Item1}</li>
              <li>{t.privacyPage.s3Item2}</li>
              <li>{t.privacyPage.s3Item3}</li>
              <li>{t.privacyPage.s3Item4}</li>
              <li>{t.privacyPage.s3Item5}</li>
              <li>{t.privacyPage.s3Item6}</li>
            </ul>
            <div className="bg-blue-50 border border-blue-200 rounded-md p-4 mb-4">
              <p className="text-sm text-blue-900">{t.privacyPage.s3AINote}</p>
            </div>

            {/* ─── Section 4 ─── */}
            <h2 className="text-2xl font-semibold mt-10 mb-4">{t.privacyPage.s4Title}</h2>
            <p>{t.privacyPage.s4Text}</p>
            <ul className="list-disc pl-6 mb-4">
              <li><strong>{t.privacyPage.s4OpenAI}</strong>{t.privacyPage.s4OpenAIDesc}</li>
              <li><strong>{t.privacyPage.s4Supabase}</strong>{t.privacyPage.s4SupabaseDesc}</li>
              <li><strong>{t.privacyPage.s4Stripe}</strong>{t.privacyPage.s4StripeDesc}</li>
              <li><strong>{t.privacyPage.s4Google}</strong>{t.privacyPage.s4GoogleDesc}</li>
              <li><strong>{t.privacyPage.s4Anthropic}</strong>{t.privacyPage.s4AnthropicDesc}</li>
              <li><strong>{t.privacyPage.s4Perplexity}</strong>{t.privacyPage.s4PerplexityDesc}</li>
              <li><strong>{t.privacyPage.s4Resend}</strong>{t.privacyPage.s4ResendDesc}</li>
              <li><strong>{t.privacyPage.s4Vercel}</strong>{t.privacyPage.s4VercelDesc}</li>
              <li>{t.privacyPage.s4LawItem}</li>
            </ul>
            <p>{t.privacyPage.s4Note}</p>

            {/* ─── Section 5 ─── */}
            <h2 className="text-2xl font-semibold mt-10 mb-4">{t.privacyPage.s5Title}</h2>
            <p>
              {t.privacyPage.s5Text1}{' '}
              <a href="https://stripe.com/privacy" className="text-primary hover:underline" target="_blank" rel="noopener noreferrer">
                {t.privacyPage.s5StripeLink}
              </a>{' '}
              {t.privacyPage.s5Text2}
            </p>

            {/* ─── Section 6 ─── */}
            <h2 className="text-2xl font-semibold mt-10 mb-4">{t.privacyPage.s6Title}</h2>
            <p>{t.privacyPage.s6Text}</p>
            <ul className="list-disc pl-6 mb-4">
              <li>{t.privacyPage.s6Item1}</li>
              <li>{t.privacyPage.s6Item2}</li>
              <li>{t.privacyPage.s6Item3}</li>
              <li>{t.privacyPage.s6Item4}</li>
              <li>{t.privacyPage.s6Item5}</li>
            </ul>

            {/* ─── Section 7 ─── */}
            <h2 className="text-2xl font-semibold mt-10 mb-4">{t.privacyPage.s7Title}</h2>
            <p>{t.privacyPage.s7Text}</p>

            {/* ─── Section 8 ─── */}
            <h2 className="text-2xl font-semibold mt-10 mb-4">{t.privacyPage.s8Title}</h2>

            <h3 className="text-xl font-semibold mt-6 mb-3">{t.privacyPage.s8GDPRTitle}</h3>
            <p>{t.privacyPage.s8GDPRText}</p>
            <ul className="list-disc pl-6 mb-4">
              <li><strong>{t.privacyPage.s8Access}</strong>{t.privacyPage.s8AccessDesc}</li>
              <li><strong>{t.privacyPage.s8Rectification}</strong>{t.privacyPage.s8RectificationDesc}</li>
              <li>
                <strong>{t.privacyPage.s8Erasure}</strong>{t.privacyPage.s8ErasureDesc}{' '}
                <a href="/account" className="text-primary hover:underline">{t.privacyPage.s8AccountLink}</a>
              </li>
              <li><strong>{t.privacyPage.s8Portability}</strong>{t.privacyPage.s8PortabilityDesc}</li>
              <li><strong>{t.privacyPage.s8Objection}</strong>{t.privacyPage.s8ObjectionDesc}</li>
              <li><strong>{t.privacyPage.s8Restriction}</strong>{t.privacyPage.s8RestrictionDesc}</li>
              <li>{t.privacyPage.s8Pinterest}</li>
            </ul>
            <p>
              {t.privacyPage.s8ExerciseText}{' '}
              <a href="/account" className="text-primary hover:underline">{t.privacyPage.s8AccountLink}</a>{' '}
              {t.privacyPage.s8ExerciseTextCont}
            </p>
            <p>{t.privacyPage.s8AEPDText}</p>

            <h3 className="text-xl font-semibold mt-6 mb-3">{t.privacyPage.s8CCPATitle}</h3>
            <p>{t.privacyPage.s8CCPAText}</p>
            <ul className="list-disc pl-6 mb-4">
              <li>{t.privacyPage.s8CCPAItem1}</li>
              <li>{t.privacyPage.s8CCPAItem2}</li>
              <li>{t.privacyPage.s8CCPAItem3}</li>
              <li>{t.privacyPage.s8CCPAItem4}</li>
              <li>{t.privacyPage.s8CCPAItem5}</li>
            </ul>

            <h3 className="text-xl font-semibold mt-6 mb-3">{t.privacyPage.s8LGPDTitle}</h3>
            <p>{t.privacyPage.s8LGPDText}</p>

            <h3 className="text-xl font-semibold mt-6 mb-3">{t.privacyPage.s8LATAMTitle}</h3>
            <p>{t.privacyPage.s8LATAMText}</p>

            {/* ─── Section 9 ─── */}
            <h2 className="text-2xl font-semibold mt-10 mb-4">{t.privacyPage.s9Title}</h2>
            <p>{t.privacyPage.s9Text}</p>

            {/* ─── Section 10 ─── */}
            <h2 className="text-2xl font-semibold mt-10 mb-4">{t.privacyPage.s10Title}</h2>
            <p>{t.privacyPage.s10Text}</p>

            {/* ─── Section 11 ─── */}
            <h2 className="text-2xl font-semibold mt-10 mb-4">{t.privacyPage.s11Title}</h2>
            <p>{t.privacyPage.s11Text}</p>

            {/* ─── Section 12 ─── */}
            <h2 className="text-2xl font-semibold mt-10 mb-4">{t.privacyPage.s12Title}</h2>
            <p>{t.privacyPage.s12Text}</p>
            <ul className="list-none pl-0 mb-4 space-y-1">
              <li>{t.privacyPage.s12Company}</li>
              <li>{t.privacyPage.s12NIF}</li>
              <li>{t.privacyPage.s12Address}</li>
              <li>{t.privacyPage.s12DPO}</li>
              <li>{t.privacyPage.s12AEPD}</li>
            </ul>

            {/* ─── Section 13 ─── */}
            <h2 className="text-2xl font-semibold mt-10 mb-4">{t.privacyPage.s13Title}</h2>
            <p>
              {t.privacyPage.s13Text}{' '}
              <a href="mailto:privacy@aimily.app" className="text-primary hover:underline">
                {t.privacyPage.s13Email}
              </a>
            </p>

            {/* ─── Section 14 ─── */}
            <h2 className="text-2xl font-semibold mt-10 mb-4">{t.privacyPage.s14Title}</h2>
            <p>{t.privacyPage.s14Text}</p>

          </div>
        </div>
      </div>
    </div>
  );
}

'use client';

import { useTranslation } from '@/i18n';

export default function PrivacyPage() {
  const t = useTranslation();

  return (
    <div className="min-h-screen bg-white">
      {/* Content */}
      <div className="pt-28 pb-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl mx-auto">
          <h1 className="text-4xl font-bold mb-8">{t.privacyPage.title}</h1>
          <p className="text-sm text-gray-600 mb-8">{t.privacyPage.lastUpdated}</p>

          <div className="prose prose-lg">
            <h2 className="text-2xl font-semibold mt-8 mb-4">{t.privacyPage.s1Title}</h2>
            <p>{t.privacyPage.s1Text}</p>

            <h2 className="text-2xl font-semibold mt-8 mb-4">{t.privacyPage.s2Title}</h2>
            <h3 className="text-xl font-semibold mt-6 mb-3">{t.privacyPage.s2_1Title}</h3>
            <ul className="list-disc pl-6 mb-4">
              <li>{t.privacyPage.s2_1Item1}</li>
              <li>{t.privacyPage.s2_1Item2}</li>
              <li>{t.privacyPage.s2_1Item3}</li>
            </ul>

            <h3 className="text-xl font-semibold mt-6 mb-3">{t.privacyPage.s2_2Title}</h3>
            <p>{t.privacyPage.s2_2Text}</p>
            <ul className="list-disc pl-6 mb-4">
              <li>{t.privacyPage.s2_2Item1}</li>
              <li>{t.privacyPage.s2_2Item2}</li>
              <li>{t.privacyPage.s2_2Item3}</li>
            </ul>
            <p>{t.privacyPage.s2_2Note}</p>

            <h2 className="text-2xl font-semibold mt-8 mb-4">{t.privacyPage.s3Title}</h2>
            <ul className="list-disc pl-6 mb-4">
              <li>{t.privacyPage.s3Item1}</li>
              <li>{t.privacyPage.s3Item2}</li>
              <li>{t.privacyPage.s3Item3}</li>
              <li>{t.privacyPage.s3Item4}</li>
            </ul>

            <h2 className="text-2xl font-semibold mt-8 mb-4">{t.privacyPage.s4Title}</h2>
            <p>{t.privacyPage.s4Text}</p>
            <ul className="list-disc pl-6 mb-4">
              <li><strong>{t.privacyPage.s4Supabase}</strong>{t.privacyPage.s4SupabaseDesc}</li>
              <li><strong>{t.privacyPage.s4Stripe}</strong>{t.privacyPage.s4StripeDesc}</li>
              <li><strong>{t.privacyPage.s4Google}</strong>{t.privacyPage.s4GoogleDesc}</li>
              <li><strong>{t.privacyPage.s4Anthropic}</strong>{t.privacyPage.s4AnthropicDesc}</li>
              <li><strong>{t.privacyPage.s4Resend}</strong>{t.privacyPage.s4ResendDesc}</li>
              <li><strong>{t.privacyPage.s4Vercel}</strong>{t.privacyPage.s4VercelDesc}</li>
              <li>{t.privacyPage.s4LawItem}</li>
            </ul>
            <p>{t.privacyPage.s4Note}</p>

            <h2 className="text-2xl font-semibold mt-8 mb-4">{t.privacyPage.s5Title}</h2>
            <p>
              {t.privacyPage.s5Text1}{" "}
              <a href="https://stripe.com/privacy" className="text-primary hover:underline" target="_blank" rel="noopener noreferrer">
                {t.privacyPage.s5StripeLink}
              </a>{" "}
              {t.privacyPage.s5Text2}
            </p>

            <h2 className="text-2xl font-semibold mt-8 mb-4">{t.privacyPage.s6Title}</h2>
            <p>{t.privacyPage.s6Text}</p>

            <h2 className="text-2xl font-semibold mt-8 mb-4">{t.privacyPage.s7Title}</h2>
            <p>{t.privacyPage.s7Text}</p>

            <h2 className="text-2xl font-semibold mt-8 mb-4">{t.privacyPage.s8Title}</h2>
            <p>{t.privacyPage.s8Text}</p>
            <ul className="list-disc pl-6 mb-4">
              <li>
                <strong>{t.privacyPage.s8Access}</strong>{t.privacyPage.s8AccessDesc}{" "}
                <a href="/account" className="text-primary hover:underline">{t.privacyPage.s8AccountLink}</a>
              </li>
              <li><strong>{t.privacyPage.s8Rectification}</strong>{t.privacyPage.s8RectificationDesc}</li>
              <li>
                <strong>{t.privacyPage.s8Erasure}</strong>{t.privacyPage.s8ErasureDesc}{" "}
                <a href="/account" className="text-primary hover:underline">{t.privacyPage.s8AccountLink}</a>
              </li>
              <li><strong>{t.privacyPage.s8Portability}</strong>{t.privacyPage.s8PortabilityDesc}</li>
              <li><strong>{t.privacyPage.s8Objection}</strong>{t.privacyPage.s8ObjectionDesc}</li>
              <li>{t.privacyPage.s8Pinterest}</li>
            </ul>
            <p>
              {t.privacyPage.s8ExerciseText}{" "}
              <a href="/account" className="text-primary hover:underline">{t.privacyPage.s8AccountLink}</a>{" "}
              {t.privacyPage.s8ExerciseTextCont}
            </p>

            <h2 className="text-2xl font-semibold mt-8 mb-4">{t.privacyPage.s9Title}</h2>
            <p>{t.privacyPage.s9Text}</p>

            <h2 className="text-2xl font-semibold mt-8 mb-4">{t.privacyPage.s10Title}</h2>
            <p>
              {t.privacyPage.s10Text}{" "}
              <a href="mailto:privacy@aimily.app" className="text-primary hover:underline">
                privacy@aimily.app
              </a>
            </p>

            <h2 className="text-2xl font-semibold mt-8 mb-4">{t.privacyPage.s11Title}</h2>
            <p>{t.privacyPage.s11Text}</p>
          </div>
        </div>
      </div>
    </div>
  );
}

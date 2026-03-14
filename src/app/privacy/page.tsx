'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useTranslation } from '@/i18n';
import { useLanguage } from '@/contexts/LanguageContext';

export default function PrivacyPage() {
  const t = useTranslation();
  const { language, setLanguage } = useLanguage();

  return (
    <div className="min-h-screen bg-white">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-6 md:px-10 py-5 bg-white/80 backdrop-blur-sm border-b border-gray-100">
        <div className="flex items-center gap-8">
          <Link href="/" className="flex items-center">
            <Image
              src="/images/aimily-logo-black.png"
              alt="aimily"
              width={774}
              height={96}
              className="object-contain h-5 w-auto"
              priority
              unoptimized
            />
          </Link>
          <div className="hidden md:flex items-center gap-6">
            <Link href="/discover" className="text-gray-400 text-xs font-medium tracking-widest uppercase hover:text-gray-900 transition-colors">
              {t.common.discover}
            </Link>
            <Link href="/meet-aimily" className="text-gray-400 text-xs font-medium tracking-widest uppercase hover:text-gray-900 transition-colors">
              {t.common.meetAimily}
            </Link>
            <Link href="/contact" className="text-gray-400 text-xs font-medium tracking-widest uppercase hover:text-gray-900 transition-colors">
              {t.common.contact}
            </Link>
          </div>
        </div>
        <div className="flex items-center gap-6">
          {/* Language toggle */}
          <div className="flex border border-gray-200 overflow-hidden">
            <button
              onClick={() => setLanguage('en')}
              className={`px-2 py-1 text-[10px] font-semibold tracking-wide transition-colors ${
                language === 'en' ? 'bg-gray-900 text-white' : 'text-gray-400 hover:text-gray-600'
              }`}
            >
              EN
            </button>
            <button
              onClick={() => setLanguage('es')}
              className={`px-2 py-1 text-[10px] font-semibold tracking-wide transition-colors ${
                language === 'es' ? 'bg-gray-900 text-white' : 'text-gray-400 hover:text-gray-600'
              }`}
            >
              ES
            </button>
          </div>
          <Link href="/" className="text-gray-400 text-xs font-medium tracking-widest uppercase hover:text-gray-900 transition-colors">
            {t.common.home}
          </Link>
        </div>
      </nav>

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

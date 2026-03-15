'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useTranslation } from '@/i18n';
import { useLanguage, type Language } from '@/contexts/LanguageContext';

export default function TermsPage() {
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
          <select
            value={language}
            onChange={(e) => setLanguage(e.target.value as Language)}
            className="bg-transparent text-[10px] font-semibold tracking-[0.12em] uppercase cursor-pointer border border-gray-200 rounded px-2 py-1 text-gray-700 transition-colors focus:outline-none"
          >
            <option value="en">EN</option>
            <option value="es">ES</option>
            <option value="fr">FR</option>
            <option value="it">IT</option>
            <option value="de">DE</option>
          </select>
          <Link href="/" className="text-gray-400 text-xs font-medium tracking-widest uppercase hover:text-gray-900 transition-colors">
            {t.common.home}
          </Link>
        </div>
      </nav>

      {/* Content */}
      <div className="pt-28 pb-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl mx-auto">
          <h1 className="text-4xl font-bold mb-8">{t.termsPage.title}</h1>
          <p className="text-sm text-gray-600 mb-8">{t.termsPage.lastUpdated}</p>

          <div className="prose prose-lg">
            <h2 className="text-2xl font-semibold mt-8 mb-4">{t.termsPage.s1Title}</h2>
            <p>{t.termsPage.s1Text}</p>

            <h2 className="text-2xl font-semibold mt-8 mb-4">{t.termsPage.s2Title}</h2>
            <p>{t.termsPage.s2Text}</p>
            <ul className="list-disc pl-6 mb-4">
              <li>{t.termsPage.s2Item1}</li>
              <li>{t.termsPage.s2Item2}</li>
              <li>{t.termsPage.s2Item3}</li>
              <li>{t.termsPage.s2Item4}</li>
            </ul>

            <h2 className="text-2xl font-semibold mt-8 mb-4">{t.termsPage.s3Title}</h2>
            <p>{t.termsPage.s3Text}</p>
            <ul className="list-disc pl-6 mb-4">
              <li>{t.termsPage.s3Item1}</li>
              <li>{t.termsPage.s3Item2}</li>
              <li>{t.termsPage.s3Item3}</li>
            </ul>

            <h2 className="text-2xl font-semibold mt-8 mb-4">{t.termsPage.s4Title}</h2>
            <p>{t.termsPage.s4Text}</p>
            <ul className="list-disc pl-6 mb-4">
              <li>{t.termsPage.s4Item1}</li>
              <li>{t.termsPage.s4Item2}</li>
              <li>{t.termsPage.s4Item3}</li>
              <li>{t.termsPage.s4Item4}</li>
            </ul>

            <h2 className="text-2xl font-semibold mt-8 mb-4">{t.termsPage.s5Title}</h2>
            <p>{t.termsPage.s5Text}</p>
            <ul className="list-disc pl-6 mb-4">
              <li>{t.termsPage.s5Item1}</li>
              <li>{t.termsPage.s5Item2}</li>
              <li>{t.termsPage.s5Item3}</li>
              <li>{t.termsPage.s5Item4}</li>
              <li>{t.termsPage.s5Item5}</li>
            </ul>

            <h2 className="text-2xl font-semibold mt-8 mb-4">{t.termsPage.s6Title}</h2>
            <p>{t.termsPage.s6Text}</p>
            <ul className="list-disc pl-6 mb-4">
              <li><strong>{t.termsPage.s6Item1Trial}</strong>{t.termsPage.s6Item1Desc}</li>
              <li><strong>{t.termsPage.s6Item2Starter}</strong>{t.termsPage.s6Item2Desc}</li>
              <li><strong>{t.termsPage.s6Item3Pro}</strong>{t.termsPage.s6Item3Desc}</li>
              <li><strong>{t.termsPage.s6Item4Ent}</strong>{t.termsPage.s6Item4Desc}</li>
            </ul>
            <p>{t.termsPage.s6VatNote}</p>

            <h3 className="text-xl font-semibold mt-6 mb-3">{t.termsPage.s6_1Title}</h3>
            <p>
              {t.termsPage.s6_1Text}{" "}
              <a href="/account" className="text-primary hover:underline">{t.termsPage.s6_1AccountLink}</a>
              {t.termsPage.s6_1TextCont}
            </p>
            <ul className="list-disc pl-6 mb-4">
              <li>{t.termsPage.s6_1Item1}</li>
              <li>{t.termsPage.s6_1Item2}</li>
              <li>{t.termsPage.s6_1Item3}</li>
            </ul>

            <h3 className="text-xl font-semibold mt-6 mb-3">{t.termsPage.s6_2Title}</h3>
            <p>
              {t.termsPage.s6_2Text}{" "}
              <a href="/account" className="text-primary hover:underline">{t.termsPage.s6_2AccountLink}</a>
              {t.termsPage.s6_2TextCont}
            </p>

            <h2 className="text-2xl font-semibold mt-8 mb-4">{t.termsPage.s7Title}</h2>
            <p>{t.termsPage.s7Text}</p>

            <h2 className="text-2xl font-semibold mt-8 mb-4">{t.termsPage.s8Title}</h2>
            <p>{t.termsPage.s8Text}</p>

            <h2 className="text-2xl font-semibold mt-8 mb-4">{t.termsPage.s9Title}</h2>
            <p>{t.termsPage.s9Text}</p>

            <h2 className="text-2xl font-semibold mt-8 mb-4">{t.termsPage.s10Title}</h2>
            <p>{t.termsPage.s10Text}</p>

            <h2 className="text-2xl font-semibold mt-8 mb-4">{t.termsPage.s11Title}</h2>
            <p>{t.termsPage.s11Text}</p>

            <h2 className="text-2xl font-semibold mt-8 mb-4">{t.termsPage.s12Title}</h2>
            <p>
              {t.termsPage.s12Text}{" "}
              <a href="mailto:legal@aimily.app" className="text-primary hover:underline">
                legal@aimily.app
              </a>
            </p>

            <h2 className="text-2xl font-semibold mt-8 mb-4">{t.termsPage.s13Title}</h2>
            <p>{t.termsPage.s13Text}</p>
          </div>
        </div>
      </div>
    </div>
  );
}

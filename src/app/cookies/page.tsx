'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useTranslation } from '@/i18n';
import { useLanguage, type Language } from '@/contexts/LanguageContext';

export default function CookiesPage() {
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
          <h1 className="text-4xl font-bold mb-8">{t.cookiesPage.title}</h1>
          <p className="text-sm text-gray-600 mb-8">{t.cookiesPage.lastUpdated}</p>

          <div className="prose prose-lg">
            <h2 className="text-2xl font-semibold mt-8 mb-4">{t.cookiesPage.s1Title}</h2>
            <p>{t.cookiesPage.s1Text}</p>

            <h2 className="text-2xl font-semibold mt-8 mb-4">{t.cookiesPage.s2Title}</h2>
            <p>{t.cookiesPage.s2Text}</p>
            <ul className="list-disc pl-6 mb-4">
              <li><strong>{t.cookiesPage.s2Essential}</strong>{t.cookiesPage.s2EssentialDesc}</li>
              <li><strong>{t.cookiesPage.s2Functional}</strong>{t.cookiesPage.s2FunctionalDesc}</li>
              <li><strong>{t.cookiesPage.s2Analytics}</strong>{t.cookiesPage.s2AnalyticsDesc}</li>
            </ul>

            <h2 className="text-2xl font-semibold mt-8 mb-4">{t.cookiesPage.s3Title}</h2>
            <p>{t.cookiesPage.s3Text}</p>
            <ul className="list-disc pl-6 mb-4">
              <li><strong>{t.cookiesPage.s3Token1}</strong>{t.cookiesPage.s3Token1Desc}</li>
              <li><strong>{t.cookiesPage.s3Token2}</strong>{t.cookiesPage.s3Token2Desc}</li>
            </ul>

            <h2 className="text-2xl font-semibold mt-8 mb-4">{t.cookiesPage.s4Title}</h2>
            <p>{t.cookiesPage.s4Text}</p>
            <ul className="list-disc pl-6 mb-4">
              <li><strong>{t.cookiesPage.s4Supabase}</strong>{t.cookiesPage.s4SupabaseDesc}</li>
              <li><strong>{t.cookiesPage.s4Vercel}</strong>{t.cookiesPage.s4VercelDesc}</li>
              <li><strong>{t.cookiesPage.s4Google}</strong>{t.cookiesPage.s4GoogleDesc}</li>
            </ul>

            <h2 className="text-2xl font-semibold mt-8 mb-4">{t.cookiesPage.s5Title}</h2>
            <p>{t.cookiesPage.s5Text1}</p>
            <p>{t.cookiesPage.s5Text2}</p>
            <ul className="list-disc pl-6 mb-4">
              <li>{t.cookiesPage.s5Item1}</li>
              <li>{t.cookiesPage.s5Item2}</li>
              <li>{t.cookiesPage.s5Item3}</li>
              <li>{t.cookiesPage.s5Item4}</li>
              <li>{t.cookiesPage.s5Item5}</li>
            </ul>

            <h2 className="text-2xl font-semibold mt-8 mb-4">{t.cookiesPage.s6Title}</h2>
            <p>{t.cookiesPage.s6Text}</p>
            <ul className="list-disc pl-6 mb-4">
              <li>{t.cookiesPage.s6Item1}</li>
              <li>{t.cookiesPage.s6Item2}</li>
              <li>{t.cookiesPage.s6Item3}</li>
              <li>{t.cookiesPage.s6Item4}</li>
            </ul>

            <h2 className="text-2xl font-semibold mt-8 mb-4">{t.cookiesPage.s7Title}</h2>
            <p>{t.cookiesPage.s7Text}</p>

            <h2 className="text-2xl font-semibold mt-8 mb-4">{t.cookiesPage.s8Title}</h2>
            <p>
              {t.cookiesPage.s8Text}{" "}
              <a href="mailto:studionn.agency@gmail.com" className="text-primary hover:underline">
                studionn.agency@gmail.com
              </a>
            </p>
            <p className="mt-2">{t.cookiesPage.s8Company}</p>
          </div>
        </div>
      </div>
    </div>
  );
}

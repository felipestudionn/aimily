'use client';

import Link from 'next/link';
import Image from 'next/image';
import { Mail, Phone, MapPin, Linkedin, Instagram, ArrowUpRight } from 'lucide-react';

const TEAM = [
  {
    name: 'Felipe Martinez Cutillas',
    role: 'Co-Founder / Creative & Strategy',
    description:
      'Product merchandising expert with experience at Zara, Nike, and Karl Lagerfeld. Felipe brings strategic vision and a deep understanding of consumer behaviour to every project.',
    linkedin: 'https://www.linkedin.com/in/felipe-martinez-cutillas/',
  },
  {
    name: 'Noelia Noguera Pardo',
    role: 'Co-Founder / Creative & Product',
    description:
      'Creative and product specialist with a background in trend research and collection development at leading global fashion brands. Noelia shapes the creative direction and product architecture.',
    linkedin: 'https://www.linkedin.com/in/noelia-noguera-pardo/',
  },
];

export default function ContactPage() {
  return (
    <div className="min-h-screen bg-carbon">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-6 md:px-10 py-5 bg-carbon/80 backdrop-blur-sm">
        <div className="flex items-center gap-8">
          <Link href="/" className="flex items-center">
            <Image
              src="/images/aimily-logo-white.png"
              alt="aimily"
              width={774}
              height={96}
              className="object-contain h-5 w-auto brightness-[0.95] sepia-[0.15]"
              priority
              unoptimized
            />
          </Link>
          <div className="hidden md:flex items-center gap-6">
            <Link href="/discover" className="text-gris/60 text-xs font-medium tracking-widest uppercase hover:text-crema transition-colors">
              Discover
            </Link>
            <Link href="/contact" className="text-crema text-xs font-medium tracking-widest uppercase">
              Contact
            </Link>
          </div>
        </div>
        <div className="flex items-center gap-6">
          <Link href="/" className="text-gris/60 text-xs font-medium tracking-widest uppercase hover:text-crema transition-colors">
            Home
          </Link>
        </div>
      </nav>

      {/* ─── HERO ─── */}
      <section className="relative pt-32 pb-20 px-6">
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: `linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)`,
            backgroundSize: '60px 60px',
          }}
        />
        <div className="relative z-10 max-w-4xl mx-auto text-center">
          <p className="text-gris/50 text-xs font-medium tracking-[0.25em] uppercase mb-6 animate-fade-in-up">
            Get in touch
          </p>
          <h1 className="text-crema text-4xl sm:text-5xl md:text-6xl font-light tracking-tight leading-[1.1] mb-8 animate-fade-in-up animate-delay-100">
            We want to be part of{' '}
            <span className="italic">your success</span>
          </h1>
          <p className="text-gris text-lg font-light tracking-wide leading-relaxed max-w-xl mx-auto animate-fade-in-up animate-delay-200">
            aimily is built and maintained by StudioNN Agency — a fashion strategy consultancy based in Spain.
          </p>
        </div>
      </section>

      {/* ─── CONTACT INFO ─── */}
      <section className="relative py-20 px-6 border-t border-gris/10">
        <div className="max-w-5xl mx-auto">
          <div className="grid md:grid-cols-3 gap-px bg-gris/10">
            <a
              href="mailto:studionn.agency@gmail.com"
              className="bg-carbon p-10 group hover:bg-carbon/80 transition-colors"
            >
              <Mail className="h-5 w-5 text-gris/40 mb-5 group-hover:text-crema transition-colors" />
              <p className="text-gris/50 text-xs font-medium tracking-[0.2em] uppercase mb-2">Email</p>
              <p className="text-crema text-sm font-light">studionn.agency@gmail.com</p>
            </a>
            <a
              href="tel:+34646907470"
              className="bg-carbon p-10 group hover:bg-carbon/80 transition-colors"
            >
              <Phone className="h-5 w-5 text-gris/40 mb-5 group-hover:text-crema transition-colors" />
              <p className="text-gris/50 text-xs font-medium tracking-[0.2em] uppercase mb-2">Phone</p>
              <p className="text-crema text-sm font-light">+34 646 907 470</p>
            </a>
            <div className="bg-carbon p-10 group">
              <MapPin className="h-5 w-5 text-gris/40 mb-5" />
              <p className="text-gris/50 text-xs font-medium tracking-[0.2em] uppercase mb-2">Location</p>
              <p className="text-crema text-sm font-light">Spain</p>
            </div>
          </div>
        </div>
      </section>

      {/* ─── SOCIAL ─── */}
      <section className="relative py-12 px-6">
        <div className="max-w-5xl mx-auto flex flex-wrap justify-center gap-6">
          <a
            href="https://www.instagram.com/studionn_agency/"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 text-gris/40 text-xs font-medium tracking-widest uppercase hover:text-crema transition-colors"
          >
            <Instagram className="h-4 w-4" />
            Instagram
            <ArrowUpRight className="h-3 w-3" />
          </a>
          <a
            href="https://www.linkedin.com/company/studionn/"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 text-gris/40 text-xs font-medium tracking-widest uppercase hover:text-crema transition-colors"
          >
            <Linkedin className="h-4 w-4" />
            LinkedIn
            <ArrowUpRight className="h-3 w-3" />
          </a>
          <a
            href="https://studionnagency.com"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 text-gris/40 text-xs font-medium tracking-widest uppercase hover:text-crema transition-colors"
          >
            <ArrowUpRight className="h-4 w-4" />
            studionnagency.com
          </a>
        </div>
      </section>

      {/* ─── TEAM ─── */}
      <section className="relative py-32 px-6 border-t border-gris/10">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-20">
            <p className="text-gris/50 text-xs font-medium tracking-[0.25em] uppercase mb-6">
              The team
            </p>
            <h2 className="text-crema text-3xl sm:text-4xl md:text-5xl font-light tracking-tight leading-[1.15]">
              Meet the founders
            </h2>
          </div>
          <div className="grid md:grid-cols-2 gap-px bg-gris/10">
            {TEAM.map((member) => (
              <div key={member.name} className="bg-carbon p-10 md:p-12">
                <div className="flex items-start justify-between mb-6">
                  <div>
                    <h3 className="text-crema text-xl font-medium tracking-tight mb-1">
                      {member.name}
                    </h3>
                    <p className="text-gris/50 text-xs font-medium tracking-[0.15em] uppercase">
                      {member.role}
                    </p>
                  </div>
                  <a
                    href={member.linkedin}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-gris/30 hover:text-crema transition-colors"
                  >
                    <Linkedin className="h-4 w-4" />
                  </a>
                </div>
                <p className="text-gris/60 text-sm font-light leading-relaxed">
                  {member.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── ABOUT STUDIONN ─── */}
      <section className="relative py-32 px-6 bg-crema">
        <div className="max-w-3xl mx-auto text-center">
          <p className="text-carbon/40 text-xs font-medium tracking-[0.25em] uppercase mb-6">
            About StudioNN Agency
          </p>
          <h2 className="text-carbon text-3xl sm:text-4xl font-light tracking-tight leading-[1.15] mb-8">
            Experts in translating trends to{' '}
            <span className="italic">bestselling products</span>
          </h2>
          <p className="text-texto/60 text-base md:text-lg font-light leading-relaxed mb-6">
            StudioNN Agency is a fashion and product strategy consultancy specializing in trend research, collection merchandising, brand building, and digital content creation. With backgrounds at Zara, Nike, and Karl Lagerfeld, our team brings a consumer-centric, data-driven approach to every project.
          </p>
          <p className="text-texto/60 text-base md:text-lg font-light leading-relaxed mb-10">
            The consumer, the product, and a strategic approach to merchandising are the pillars of our blueprint. aimily is the technological evolution of this expertise — making world-class fashion consulting accessible to every brand.
          </p>
          <a
            href="https://studionnagency.com"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 text-carbon text-xs font-medium tracking-[0.15em] uppercase border border-carbon px-8 py-3 hover:bg-carbon hover:text-crema transition-colors"
          >
            Visit StudioNN Agency
            <ArrowUpRight className="h-3.5 w-3.5" />
          </a>
        </div>
      </section>

      {/* ─── FOOTER ─── */}
      <footer className="border-t border-gris/10 py-10 px-6">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-2">
            <Image
              src="/images/aimily-logo-white.png"
              alt="aimily"
              width={774}
              height={96}
              className="object-contain h-4 w-auto opacity-40"
              unoptimized
            />
          </div>
          <div className="flex items-center gap-6">
            <Link href="/terms" className="text-gris/30 text-[10px] font-medium tracking-widest uppercase hover:text-gris/60 transition-colors">
              Terms
            </Link>
            <Link href="/privacy" className="text-gris/30 text-[10px] font-medium tracking-widest uppercase hover:text-gris/60 transition-colors">
              Privacy
            </Link>
            <Link href="/cookies" className="text-gris/30 text-[10px] font-medium tracking-widest uppercase hover:text-gris/60 transition-colors">
              Cookies
            </Link>
          </div>
          <p className="text-gris/20 text-[10px] tracking-widest uppercase">
            &copy; {new Date().getFullYear()} StudioNN Agency
          </p>
        </div>
      </footer>
    </div>
  );
}

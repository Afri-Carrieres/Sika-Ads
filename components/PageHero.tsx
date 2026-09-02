import React from 'react';

interface PageHeroProps {
  badge: string;
  title: React.ReactNode;
  subtitle?: string;
  accent?: 'teal' | 'indigo' | 'red';
  children?: React.ReactNode;
}

const BADGE_STYLES: Record<'teal' | 'indigo' | 'red', string> = {
  teal: 'bg-[#128785]/10 border-[#128785]/25 text-[#2dd4bf]',
  indigo: 'bg-indigo-500/10 border-indigo-500/25 text-indigo-400',
  red: 'bg-red-500/10 border-red-500/20 text-red-500',
};

const PageHero: React.FC<PageHeroProps> = ({ badge, title, subtitle, accent = 'teal', children }) => {
  return (
    <section className="relative py-24 sm:py-28 overflow-hidden bg-slate-950">
      <div className="absolute -top-24 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-indigo-600/20 rounded-full blur-[140px] pointer-events-none" />
      <div className="container mx-auto px-6 relative z-10">
        <div className="max-w-3xl">
          <span
            className={`inline-block px-4 py-2 rounded-full border text-[10px] font-black uppercase tracking-[0.2em] mb-6 ${BADGE_STYLES[accent]}`}
          >
            {badge}
          </span>
          <h1 className="font-heading text-4xl md:text-6xl font-bold text-white leading-tight mb-6">{title}</h1>
          {subtitle && (
            <p className="text-lg text-slate-400 leading-relaxed max-w-2xl font-medium">{subtitle}</p>
          )}
          {children}
        </div>
      </div>
    </section>
  );
};

export default PageHero;

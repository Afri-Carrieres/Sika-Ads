import React from 'react';

interface PageHeroProps {
  badge: string;
  title: React.ReactNode;
  subtitle?: string;
  accent?: 'teal' | 'indigo' | 'red';
  children?: React.ReactNode;
}

const BADGE_STYLES: Record<'teal' | 'indigo' | 'red', string> = {
  teal: 'bg-[#128686]/10 border-[#128686]/25 text-[#7FD1D1]',
  indigo: 'bg-[#128686]/10 border-[#128686]/25 text-[#7FD1D1]',
  red: 'bg-red-500/10 border-red-500/20 text-red-400',
};

const PageHero: React.FC<PageHeroProps> = ({ badge, title, subtitle, accent = 'teal', children }) => {
  return (
    <section className="relative py-24 sm:py-28 overflow-hidden bg-[#062127]">
      <div className="absolute -top-24 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-[#128686]/25 rounded-full blur-[140px] pointer-events-none" />
      <div className="container mx-auto px-6 relative z-10">
        <div className="max-w-3xl">
          <span
            className={`inline-block px-4 py-2 rounded-full border text-[10px] font-bold uppercase tracking-[0.2em] mb-6 ${BADGE_STYLES[accent]}`}
          >
            {badge}
          </span>
          <h1 className="font-heading text-4xl md:text-6xl font-bold text-white leading-tight mb-6">{title}</h1>
          {subtitle && (
            <p className="text-lg text-[#A9DADA] leading-relaxed max-w-2xl font-medium">{subtitle}</p>
          )}
          {children}
        </div>
      </div>
    </section>
  );
};

export default PageHero;

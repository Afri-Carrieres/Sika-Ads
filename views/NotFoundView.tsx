import React, { useEffect } from 'react';
import { ArrowRight, House, SearchX } from 'lucide-react';
import { useLocation } from 'react-router-dom';
import Footer from '../components/Footer';
import MarketingHeader, { MarketingView } from '../components/MarketingHeader';
import SEOHead from '../components/SEOHead';

interface NotFoundViewProps {
    onNavigate: (view: MarketingView) => void;
    onStart: () => void;
}

const NotFoundView: React.FC<NotFoundViewProps> = ({ onNavigate, onStart }) => {
    const { pathname } = useLocation();

    useEffect(() => {
        const robots = document.createElement('meta');
        robots.name = 'robots';
        robots.content = 'noindex, nofollow';
        document.head.appendChild(robots);
        return () => robots.remove();
    }, []);

    return (
        <div className="flex min-h-screen flex-col bg-white">
            <SEOHead
                title="Page introuvable | Sika Ads"
                description="Cette page n'existe pas ou n'est plus disponible. Retrouvez les services de Sika Ads depuis l'accueil."
                canonicalPath={pathname}
            />
            <MarketingHeader
                onNavigate={onNavigate}
                onStart={onStart}
                active={null}
            />

            <main className="flex flex-1 flex-col pt-16 sm:pt-20">
                <section className="relative flex flex-1 items-center overflow-hidden bg-[#062127] px-5 py-16 text-white sm:px-8 sm:py-20">
                    <div className="pointer-events-none absolute inset-0 opacity-20" aria-hidden="true">
                        <div className="absolute -right-20 top-1/2 h-80 w-80 -translate-y-1/2 rounded-full border border-[#7FD1D1]/40 sm:right-[8%] sm:h-[28rem] sm:w-[28rem]" />
                        <div className="absolute -right-10 top-1/2 h-64 w-64 -translate-y-1/2 rounded-full border border-[#7FD1D1]/30 sm:right-[11%] sm:h-80 sm:w-80" />
                    </div>

                    <div className="relative mx-auto grid w-full max-w-6xl items-center gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(280px,0.8fr)] lg:gap-16">
                        <div>
                            <p className="mb-4 break-all font-mono text-center text-xs text-slate-400" aria-label={`Adresse demandée : ${pathname}`}>
                                URL not found: {pathname}
                            </p>
                            <div className="flex items-center justify-center" aria-hidden="true">
                                <img
                                    src="/404-search.svg"
                                    alt=""
                                    className="w-full max-w-[24rem]"
                                    width="440"
                                    height="340"
                                    decoding="async"
                                    draggable={false}
                                />
                            </div>
                            <h1 className="max-w-2xl text-3xl font-bold leading-tight sm:text-4xl md:text-5xl">
                                Cette page est introuvable.
                            </h1>
                            <p className="mt-5 max-w-xl text-base leading-relaxed text-slate-300 sm:text-lg">
                                Le lien a peut-être changé ou l’adresse contient une erreur. Vous pouvez retourner à l’accueil ou contacter notre équipe.
                            </p>

                            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                                <button
                                    type="button"
                                    onClick={() => onNavigate('landing')}
                                    className="inline-flex min-h-12 items-center justify-center gap-2 rounded-lg bg-[#F65E06] px-5 py-3 text-sm font-bold text-white transition-colors hover:bg-[#D14E04] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-[#062127]"
                                >
                                    <House size={17} aria-hidden="true" /> Retour à l’accueil
                                </button>
                                {/* <button
                                    type="button"
                                    onClick={() => onNavigate('contact')}
                                    className="inline-flex min-h-12 items-center justify-center gap-2 rounded-lg border border-white/30 px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7FD1D1]"
                                    >
                                    Contacter l’équipe <ArrowRight size={17} aria-hidden="true" />
                                </button> */}
                            </div>
                        </div>
                        {/* ne plus l'afficher sur mobile */}
                        <p className="mb-4 inline-flex flex-col justify-content text-center min-w-full  gap-2 font-bold text-xl uppercase text-[#7FD1D1] hidden md:hidden lg:flex" aria-hidden="true">
                            {/* <SearchX size={16} aria-hidden="true" /> */}
                            Erreur
                            <span className="font-heading text-9xl font-bold leading-none text-white sm:text-[12rem]">404</span>
                        </p>
                    </div>
                </section>
            </main>

            <Footer onNavigate={onNavigate} />
        </div>
    );
};

export default NotFoundView;

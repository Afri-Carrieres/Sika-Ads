import React, { useState, useEffect } from 'react';
import { ChevronUp } from 'lucide-react';

interface ScrollToTopProps {
  threshold?: number;
}

export const ScrollToTop: React.FC<ScrollToTopProps> = ({ threshold = 350 }) => {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const toggleVisibility = () => {
      if (window.scrollY > threshold) {
        setVisible(true);
      } else {
        setVisible(false);
      }
    };

    window.addEventListener('scroll', toggleVisibility, { passive: true });
    return () => window.removeEventListener('scroll', toggleVisibility);
  }, [threshold]);

  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: 'smooth',
    });
  };

  return (
    <button
      type="button"
      onClick={scrollToTop}
      aria-label="Retourner en haut de la page"
      className={`fixed bottom-6 right-6 z-40 p-3.5 rounded-2xl shadow-xl transition-all duration-300 transform flex items-center justify-center cursor-pointer border border-white/20 focus:outline-none focus-visible:ring-2 focus-visible:ring-white group ${
        visible
          ? 'opacity-100 translate-y-0 scale-100 pointer-events-auto'
          : 'opacity-0 translate-y-6 scale-90 pointer-events-none'
      }`}
      style={{
        backgroundColor: '#ea580c',
        boxShadow: '0 8px 30px rgba(234, 88, 12, 0.45)',
      }}
    >
      <ChevronUp className="w-5 h-5 text-white transition-transform duration-200 group-hover:-translate-y-1" />
    </button>
  );
};

export default ScrollToTop;

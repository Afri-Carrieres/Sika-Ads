import React, { useEffect } from 'react';

interface SEOHeadProps {
  title?: string;
  description?: string;
  canonicalPath?: string;
  ogImage?: string;
  type?: string;
  keywords?: string;
}

const DEFAULT_TITLE = "SikaAds Togo | Gagnez de l'argent avec vos Statuts WhatsApp & Facebook";
const DEFAULT_DESCRIPTION = "SikaAds Togo connecte les annonceurs et les ambassadeurs pour publier des campagnes sur WhatsApp et Facebook, générer des vues et recevoir ses paiements rapidement.";
const DEFAULT_IMAGE = "https://www.sika-ads.com/Web-Icon.png";
const DOMAIN = "https://www.sika-ads.com";

export const SEOHead: React.FC<SEOHeadProps> = ({
  title = DEFAULT_TITLE,
  description = DEFAULT_DESCRIPTION,
  canonicalPath = '/',
  ogImage = DEFAULT_IMAGE,
  type = 'website',
  keywords,
}) => {
  useEffect(() => {
    // 1. Update Title
    document.title = title;

    // 2. Helper to set or create meta tag
    const setMeta = (attr: 'name' | 'property', key: string, content: string) => {
      let el = document.querySelector(`meta[${attr}="${key}"]`);
      if (el) {
        el.setAttribute('content', content);
      } else {
        el = document.createElement('meta');
        el.setAttribute(attr, key);
        el.setAttribute('content', content);
        document.head.appendChild(el);
      }
    };

    // 3. Update Standard Meta Tags
    setMeta('name', 'description', description);
    if (keywords) {
      setMeta('name', 'keywords', keywords);
    }

    // 4. Update Open Graph Tags
    const canonicalUrl = `${DOMAIN}${canonicalPath.startsWith('/') ? canonicalPath : `/${canonicalPath}`}`;
    setMeta('property', 'og:title', title);
    setMeta('property', 'og:description', description);
    setMeta('property', 'og:type', type);
    setMeta('property', 'og:image', ogImage);
    setMeta('property', 'og:url', canonicalUrl);
    setMeta('property', 'og:site_name', 'SikaAds');

    // 5. Update Twitter Card Tags
    setMeta('name', 'twitter:title', title);
    setMeta('name', 'twitter:description', description);
    setMeta('name', 'twitter:image', ogImage);
    setMeta('name', 'twitter:card', 'summary_large_image');

    // 6. Update Canonical Link
    let link = document.querySelector('link[rel="canonical"]');
    if (link) {
      link.setAttribute('href', canonicalUrl);
    } else {
      link = document.createElement('link');
      link.setAttribute('rel', 'canonical');
      link.setAttribute('href', canonicalUrl);
      document.head.appendChild(link);
    }
  }, [title, description, canonicalPath, ogImage, type, keywords]);

  return null;
};

export default SEOHead;

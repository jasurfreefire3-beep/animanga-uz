import type { Manga } from '../types.js';

interface DefaultSEOOptions {
  title?: string;
  description?: string;
  canonicalUrl?: string;
  image?: string;
}

/**
 * Sets or updates a <meta> tag in <head>
 */
function setMetaTag(name: string, content: string, isProperty = false) {
  if (typeof document === 'undefined') return;
  const attribute = isProperty ? 'property' : 'name';
  let element = document.querySelector(`meta[${attribute}="${name}"]`) as HTMLMetaElement | null;
  if (!element) {
    element = document.createElement('meta');
    element.setAttribute(attribute, name);
    document.head.appendChild(element);
  }
  element.setAttribute('content', content);
}

/**
 * Sets or updates the <link rel="canonical"> tag in <head>
 */
function setCanonicalTag(url: string) {
  if (typeof document === 'undefined') return;
  let element = document.querySelector('link[rel="canonical"]') as HTMLLinkElement | null;
  if (!element) {
    element = document.createElement('link');
    element.setAttribute('rel', 'canonical');
    document.head.appendChild(element);
  }
  element.setAttribute('href', url);
}

/**
 * Injects or updates Schema.org JSON-LD script
 */
function setJsonLd(id: string, json: object) {
  if (typeof document === 'undefined') return;
  let element = document.getElementById(id) as HTMLScriptElement | null;
  if (!element) {
    element = document.createElement('script');
    element.id = id;
    element.type = 'application/ld+json';
    document.head.appendChild(element);
  }
  element.textContent = JSON.stringify(json, null, 2);
}

/**
 * Professional SEO update for Manga Detail Page
 * Configures: Title, Tavsif (description), Canonical URL, Ball (rating),
 * OpenGraph, Twitter Cards, and Schema.org ComicSeries/AggregateRating
 */
export function setMangaSEO(manga: Manga, commentsCount = 0) {
  if (typeof document === 'undefined' || !manga) return;

  const origin = window.location.origin;
  const canonicalUrl = `${origin}/manga/${manga.id}`;
  const ratingScore = Number(manga.rating || 5.0).toFixed(1);
  const viewsCount = Number(manga.views || 0).toLocaleString();
  const genresList = manga.genres || 'Manga, Sarguzasht, Fantastika';
  const cleanDescription = (manga.description || `${manga.title} mangasining o'zbekcha tarjimasi.`)
    .replace(/\s+/g, ' ')
    .trim();

  // 1. Title with Manga Name and Rating Ball
  const seoTitle = `${manga.title} - O'zbek tilida o'qish (Reyting: ${ratingScore}★) | AniManga Uz`;
  document.title = seoTitle;

  // 2. Tavsif (Rich Meta Description)
  const seoDescription = `${manga.title} mangasini o'zbek tilida bepul va yuqori sifatda mutolaa qiling. Janrlari: ${genresList}. Reytingi: ${ratingScore}/5 ball (${viewsCount} marta o'qilgan). ${cleanDescription.slice(0, 150)}...`;
  setMetaTag('description', seoDescription);

  // 3. Keywords & Canonical URL
  const keywords = `${manga.title}, ${manga.title} o'zbek tilida, ${manga.alternative_titles || ''}, ${genresList}, manga o'zbekcha, manhwa uzbek, wiwi uz, animanga, ${manga.type || 'manga'}`;
  setMetaTag('keywords', keywords);
  setCanonicalTag(canonicalUrl);

  // Rating meta
  setMetaTag('rating', ratingScore);

  // 4. OpenGraph (Facebook, Telegram, WhatsApp previews)
  setMetaTag('og:title', `${manga.title} - O'zbek tilida o'qish (Reyting: ${ratingScore}★)`, true);
  setMetaTag('og:description', seoDescription, true);
  setMetaTag('og:type', 'books.book', true);
  setMetaTag('og:url', canonicalUrl, true);
  setMetaTag('og:image', manga.cover_image, true);
  setMetaTag('og:image:alt', `${manga.title} muqovasi - Reyting: ${ratingScore}★`, true);
  setMetaTag('og:site_name', 'AniManga Uz', true);
  setMetaTag('og:locale', 'uz_UZ', true);

  // 5. Twitter Card
  setMetaTag('twitter:card', 'summary_large_image');
  setMetaTag('twitter:title', `${manga.title} - AniManga Uz (Reyting: ${ratingScore}★)`);
  setMetaTag('twitter:description', seoDescription);
  setMetaTag('twitter:image', manga.cover_image);
  setMetaTag('twitter:image:alt', `${manga.title} muqovasi`);

  // 6. Schema.org JSON-LD Structured Data with AggregateRating (Ball) & ComicSeries
  const ratingCount = Math.max(15, Math.round((manga.views || 40) / 3));
  const reviewCount = Math.max(5, commentsCount || 8);

  const schemaData = {
    '@context': 'https://schema.org',
    '@type': 'ComicSeries',
    '@id': canonicalUrl,
    name: manga.title,
    alternativeHeadline: manga.alternative_titles || undefined,
    description: cleanDescription,
    url: canonicalUrl,
    image: {
      '@type': 'ImageObject',
      url: manga.cover_image,
      caption: `${manga.title} o'zbek tilida manga muqovasi`,
    },
    genre: genresList.split(',').map((g) => g.trim()).filter(Boolean),
    inLanguage: 'uz',
    datePublished: manga.release_year ? `${manga.release_year}-01-01` : undefined,
    author: {
      '@type': 'Person',
      name: manga.author || 'AniManga Uz Translations',
    },
    publisher: {
      '@type': 'Organization',
      name: 'AniManga Uz',
      url: origin,
      logo: {
        '@type': 'ImageObject',
        url: 'https://files.catbox.moe/adt7bt.png',
      },
    },
    aggregateRating: {
      '@type': 'AggregateRating',
      ratingValue: parseFloat(ratingScore),
      bestRating: 5,
      worstRating: 1,
      ratingCount: ratingCount,
      reviewCount: reviewCount,
    },
  };

  setJsonLd('manga-jsonld', schemaData);
}

/**
 * Resets SEO to the default site configuration
 */
export function resetDefaultSEO(options?: DefaultSEOOptions) {
  if (typeof document === 'undefined') return;

  const origin = window.location.origin;
  const title = options?.title || "AniManga Uz - O'zbek tilida Manga, Manhwa va Manhua o'qish platformasi";
  const description = options?.description || "Eng sara manga, manhwa va manhuani o'zbek tilida bepul va yuqori sifatda o'qing. Yangi boblar har kuni!";
  const canonicalUrl = options?.canonicalUrl || `${origin}/`;
  const image = options?.image || 'https://files.catbox.moe/adt7bt.png';

  document.title = title;
  setMetaTag('description', description);
  setMetaTag('keywords', "manga o'zbek tilida, manhwa uzbek, manhua uzb, wiwi uz, animanga, yangi boblar, bepul manga");
  setCanonicalTag(canonicalUrl);

  setMetaTag('og:title', title, true);
  setMetaTag('og:description', description, true);
  setMetaTag('og:type', 'website', true);
  setMetaTag('og:url', canonicalUrl, true);
  setMetaTag('og:image', image, true);
  setMetaTag('og:site_name', 'AniManga Uz', true);

  setMetaTag('twitter:card', 'summary_large_image');
  setMetaTag('twitter:title', title);
  setMetaTag('twitter:description', description);
  setMetaTag('twitter:image', image);

  // Remove manga specific JSON-LD or set website schema
  const existingScript = document.getElementById('manga-jsonld');
  if (existingScript) {
    existingScript.remove();
  }

  const websiteSchema = {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: 'AniManga Uz',
    url: origin,
    description: description,
    potentialAction: {
      '@type': 'SearchAction',
      target: `${origin}/manga?q={search_term_string}`,
      'query-input': 'required name=search_term_string',
    },
  };

  setJsonLd('website-jsonld', websiteSchema);
}

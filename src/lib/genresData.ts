import type { Manga, Genre } from '../types.js';

export interface GenreItem {
  id: number;
  name: string;
  slug: string;
  image: string;
  gradient: string;
  manga_count: number;
}

export const OFFICIAL_GENRES: Omit<GenreItem, 'manga_count'>[] = [
  {
    id: 1,
    name: 'Harakat',
    slug: 'action',
    gradient: 'from-[#6c5ce7]/40 to-[#6c5ce7]/10 border-[#6c5ce7]/30 text-[#a29bfe]',
    image: 'https://img1.wallspic.com/crops/3/2/0/0/8/180023/180023-vegeta_dragon_ball-vegeta-goku-dragon_ball-dragon-2560x1440.jpg',
  },
  {
    id: 2,
    name: 'Sarguzasht',
    slug: 'adventure',
    gradient: 'from-[#fd79a8]/40 to-[#fd79a8]/10 border-[#fd79a8]/30 text-[#fd79a8]',
    image: 'https://assets.teenvogue.com/photos/6942f362a0bae21e1e23f324/16:9/w_2560%2Cc_limit/FBJ_S2_TEASER%2520KV_3x3_3000x3000.jpg',
  },
  {
    id: 3,
    name: 'Komediya',
    slug: 'comedy',
    gradient: 'from-[#00cec9]/40 to-[#00cec9]/10 border-[#00cec9]/30 text-[#00cec9]',
    image: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTW8qsh41jrCAQACGA99arKRr9X8M8lcXeXDSMOKgHAUBUAavQhu7YDJRI&s=10',
  },
  {
    id: 4,
    name: 'Drama',
    slug: 'drama',
    gradient: 'from-[#fdcb6e]/40 to-[#fdcb6e]/10 border-[#fdcb6e]/30 text-[#fdcb6e]',
    image: 'https://static0.cbrimages.com/wordpress/wp-content/uploads/2022/05/darling-in-the-franx.jpg',
  },
  {
    id: 5,
    name: 'Fantastika',
    slug: 'fantasy',
    gradient: 'from-[#e17055]/40 to-[#e17055]/10 border-[#e17055]/30 text-[#fab1a0]',
    image: 'https://img2.wallspic.com/crops/8/9/6/6/7/176698/176698-izuku_midoriya-my_hero_ones_justice-my_hero_academia-all_might-anime_art-2560x1440.jpg',
  },
  {
    id: 6,
    name: "Qo'rqinchli",
    slug: 'horror',
    gradient: 'from-[#00b894]/40 to-[#00b894]/10 border-[#00b894]/30 text-[#55efc4]',
    image: 'https://w0.peakpx.com/wallpaper/915/216/HD-wallpaper-horror-anime-girl-anime-dark-girls-horror-nightmare-scary.jpg',
  },
  {
    id: 7,
    name: 'Romantika',
    slug: 'romance',
    gradient: 'from-[#a29bfe]/40 to-[#a29bfe]/10 border-[#a29bfe]/30 text-[#a29bfe]',
    image: 'https://i.redd.it/8ji81ihyfc0a1.png',
  },
  {
    id: 8,
    name: 'Ilmiy Fantastika',
    slug: 'sci-fi',
    gradient: 'from-[#e84393]/40 to-[#e84393]/10 border-[#e84393]/30 text-[#fd79a8]',
    image: 'https://xonomax.com/cdn/shop/files/599987.jpg?v=1728393535',
  },
  {
    id: 9,
    name: 'Hayotiy',
    slug: 'slice-of-life',
    gradient: 'from-[#6c5ce7]/40 to-[#6c5ce7]/10 border-[#6c5ce7]/30 text-[#a29bfe]',
    image: 'https://rukmini1.flixcart.com/image/1500/1500/l09w8sw0/poster/8/r/c/large-haikyuu-combo-poster-101-rshcomboposter101-original-imagc3kz85sqktwf.jpeg?q=70',
  },
  {
    id: 10,
    name: 'Triller',
    slug: 'thriller',
    gradient: 'from-[#fd79a8]/40 to-[#fd79a8]/10 border-[#fd79a8]/30 text-[#fd79a8]',
    image: 'https://static0.cbrimages.com/wordpress/wp-content/uploads/2023/01/the-best-psychological-thriller-anime.jpg',
  },
];

/**
 * Calculates consistent genre metadata and manga counts across the entire application
 */
export function getStandardGenres(mangas: Manga[], apiGenres?: Genre[]): GenreItem[] {
  return OFFICIAL_GENRES.map((base) => {
    const apiMatch = apiGenres?.find(
      (g) => g.slug.toLowerCase() === base.slug.toLowerCase()
    );

    const slugLower = base.slug.toLowerCase();
    const nameLower = base.name.toLowerCase();

    // Dynamically calculate accurate manga count matching mangas in the DB
    const count = mangas.filter((m) => {
      const gSlugs = (m.genre_slugs || '').toLowerCase();
      const gNames = (m.genres || '').toLowerCase();
      return (
        gSlugs.includes(slugLower) ||
        gNames.includes(slugLower) ||
        gNames.includes(nameLower)
      );
    }).length;

    return {
      id: apiMatch?.id || base.id,
      name: base.name,
      slug: base.slug,
      image: apiMatch?.image || base.image,
      gradient: base.gradient,
      manga_count: count,
    };
  });
}

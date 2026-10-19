import localFont from 'next/font/local';

export const bebas = localFont({
  src: '../fonts/hardwood/bebas-neue-latin-400-normal.woff2',
  variable: '--font-bebas',
  display: 'swap',
  weight: '400',
  adjustFontFallback: false,
});

export const inter = localFont({
  src: [
    { path: '../fonts/hardwood/inter-latin-400-normal.woff2', weight: '400', style: 'normal' },
    { path: '../fonts/hardwood/inter-latin-600-normal.woff2', weight: '600', style: 'normal' },
    { path: '../fonts/hardwood/inter-latin-800-normal.woff2', weight: '800', style: 'normal' },
  ],
  variable: '--font-inter',
  display: 'swap',
});

export const plex = localFont({
  src: [
    {
      path: '../fonts/hardwood/ibm-plex-sans-condensed-latin-500-normal.woff2',
      weight: '500',
      style: 'normal',
    },
    {
      path: '../fonts/hardwood/ibm-plex-sans-condensed-latin-700-normal.woff2',
      weight: '700',
      style: 'normal',
    },
  ],
  variable: '--font-plex',
  display: 'swap',
});

export const kalam = localFont({
  src: '../fonts/hardwood/kalam-latin-700-normal.woff2',
  variable: '--font-kalam',
  display: 'swap',
  weight: '700',
});

export const dseg7 = localFont({
  src: '../fonts/hardwood/dseg7.woff2',
  variable: '--font-dseg7',
  display: 'swap',
  weight: '700',
  adjustFontFallback: false,
});

export const dseg14 = localFont({
  src: '../fonts/hardwood/dseg14.woff2',
  variable: '--font-dseg14',
  display: 'swap',
  weight: '700',
  adjustFontFallback: false,
});

export const hardwoodFontClassName = [
  bebas.variable,
  inter.variable,
  plex.variable,
  kalam.variable,
  dseg7.variable,
  dseg14.variable,
].join(' ');

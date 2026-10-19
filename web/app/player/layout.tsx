import { Archivo, Courier_Prime, Fraunces, Kalam } from 'next/font/google';
import '@/styles/scouting.css';

const fraunces = Fraunces({
  subsets: ['latin'],
  weight: ['400', '800'],
  style: ['normal', 'italic'],
  variable: '--font-fraunces',
  display: 'swap',
});

const archivo = Archivo({
  subsets: ['latin'],
  axes: ['wdth'],
  variable: '--font-archivo',
  display: 'swap',
});

const courierPrime = Courier_Prime({
  subsets: ['latin'],
  weight: ['400', '700'],
  style: ['normal', 'italic'],
  variable: '--font-courier-prime',
  display: 'swap',
});

const kalam = Kalam({
  subsets: ['latin'],
  weight: ['400', '700'],
  variable: '--font-kalam',
  display: 'swap',
});

export default function PlayerLayout({ children }: { children: React.ReactNode }) {
  return (
    <div
      data-scouting
      className={`${fraunces.variable} ${archivo.variable} ${courierPrime.variable} ${kalam.variable}`}
    >
      {children}
    </div>
  );
}

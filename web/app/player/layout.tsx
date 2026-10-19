import { hardwoodFontClassName } from '@/app/hardwood-fonts';
import '@/styles/hardwood.css';

export default function PlayerLayout({ children }: { children: React.ReactNode }) {
  return (
    <div data-hardwood className={hardwoodFontClassName}>
      {children}
    </div>
  );
}

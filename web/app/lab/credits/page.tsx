import { PhotoCreditsLink } from '@/components/deck/PhotoCredits';
import { loadCreditsMarkdown, loadHardwoodCreditsMarkdown } from '@/lib/deck/credits.server';

export default function CreditsPage() {
  const markdown = `${loadHardwoodCreditsMarkdown()}\n\n${loadCreditsMarkdown()}`;

  return (
    <div className="relative min-h-screen px-10 py-10">
      <div className="hardwood-floor" />
      <p className="lab relative z-10 m-0">
        <PhotoCreditsLink href="/lab" />
      </p>
      <article className="card relative z-10 mx-auto mt-6 max-w-3xl px-10 py-10">
        {renderCredits(markdown)}
      </article>
    </div>
  );
}

function renderCredits(markdown: string) {
  const blocks = markdown.trim().split(/\n{2,}/);
  return blocks.map((block, index) => {
    if (block.startsWith('# ')) {
      return (
        <h1 key={index} className="slide-title mt-0 mb-4 text-[56px]">
          {block.replace(/^#\s+/, '')}
        </h1>
      );
    }
    if (block.startsWith('## ')) {
      return (
        <h2 key={index} className="slide-title mt-8 mb-2 text-[36px]">
          {block.replace(/^##\s+/, '')}
        </h2>
      );
    }
    const lines = block.split('\n');
    if (lines.every((line) => line.startsWith('- ') || line.startsWith('**'))) {
      return (
        <ul key={index} className="font-inter m-0 list-disc pl-5 text-[16px] leading-relaxed">
          {lines
            .filter((line) => line.startsWith('- '))
            .map((line) => (
              <li key={line}>{stripMd(line.slice(2))}</li>
            ))}
        </ul>
      );
    }
    return (
      <p key={index} className="font-inter mt-0 mb-4 text-[16px] leading-relaxed">
        {stripMd(block)}
      </p>
    );
  });
}

function stripMd(text: string): string {
  return text
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/`([^`]+)`/g, '$1');
}

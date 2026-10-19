import { PhotoCreditsLink } from '@/components/deck/PhotoCredits';
import { loadCreditsMarkdown } from '@/lib/deck/credits.server';

export default function CreditsPage() {
  const markdown = loadCreditsMarkdown();

  return (
    <div className="desk px-10 py-10">
      <p className="font-archivo m-0 text-[13px] tracking-wide uppercase">
        <PhotoCreditsLink href="/lab" />
      </p>
      <article className="sheet mx-auto mt-6 max-w-3xl [transform:none] px-10 py-10">
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
        <h1 key={index} className="font-fraunces mt-0 mb-4 text-[40px]">
          {block.replace(/^#\s+/, '')}
        </h1>
      );
    }
    if (block.startsWith('## ')) {
      return (
        <h2 key={index} className="font-fraunces mt-8 mb-2 text-[28px]">
          {block.replace(/^##\s+/, '')}
        </h2>
      );
    }
    const lines = block.split('\n');
    if (lines.every((line) => line.startsWith('- ') || line.startsWith('**'))) {
      return (
        <ul key={index} className="font-courier m-0 list-disc pl-5 text-[15px] leading-relaxed">
          {lines
            .filter((line) => line.startsWith('- '))
            .map((line) => (
              <li key={line}>{stripMd(line.slice(2))}</li>
            ))}
        </ul>
      );
    }
    return (
      <p key={index} className="font-courier mt-0 mb-4 text-[15px] leading-relaxed">
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

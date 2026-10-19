'use client';

import { useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';

type CoachLinkCardProps = {
  url: string;
};

export function CoachLinkCard({ url }: CoachLinkCardProps) {
  const [copied, setCopied] = useState(false);

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  }

  return (
    <div className="coach-link" data-coach-link>
      <QRCodeSVG
        value={url}
        size={56}
        bgColor="#0b0b0c"
        fgColor="#f4f1ea"
        level="M"
        marginSize={0}
        title="Coach join QR"
      />
      <input
        readOnly
        value={url}
        aria-label="Coach join link"
        data-coach-link-url
        spellCheck={false}
      />
      <button type="button" data-coach-copy onClick={() => void copyLink()}>
        {copied ? 'Copied' : 'Copy'}
      </button>
    </div>
  );
}

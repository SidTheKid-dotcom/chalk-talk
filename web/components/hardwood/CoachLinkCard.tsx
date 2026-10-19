'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { QRCodeSVG } from 'qrcode.react';

type CoachLinkCardProps = {
  url: string;
  occupied?: boolean;
};

function hardwoodHost(): HTMLElement {
  return document.querySelector('[data-hardwood]') ?? document.body;
}

export function CoachLinkCard({ url, occupied = false }: CoachLinkCardProps) {
  const [open, setOpen] = useState(!occupied);
  const [copied, setCopied] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    setOpen(!occupied);
    setCopied(false);
  }, [url, occupied]);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  }

  const modal =
    open && mounted ? (
      <div className="coach-link-overlay" data-coach-link role="presentation">
        <button
          type="button"
          className="coach-link-scrim"
          aria-label="Close coach invite"
          onClick={() => setOpen(false)}
        />
        <div
          className="coach-link-panel"
          role="dialog"
          aria-modal="true"
          aria-labelledby="coach-link-title"
        >
          <button
            type="button"
            className="coach-link-close"
            aria-label="Close"
            onClick={() => setOpen(false)}
          >
            ×
          </button>
          <p className="coach-link-kicker">Head coach</p>
          <h2 id="coach-link-title">Scan to join the film room</h2>
          <p className="coach-link-copy">
            Phone on https. Tap Join as coach, then allow mic and camera.
          </p>
          <div className="coach-link-qr">
            <QRCodeSVG
              value={url}
              size={220}
              bgColor="#f4f1ea"
              fgColor="#0b0b0c"
              level="M"
              marginSize={2}
              title="Coach join QR"
            />
          </div>
          <input
            readOnly
            value={url}
            aria-label="Coach join link"
            data-coach-link-url
            spellCheck={false}
          />
          <button type="button" data-coach-copy onClick={() => void copyLink()}>
            {copied ? 'Copied' : 'Copy link'}
          </button>
        </div>
      </div>
    ) : null;

  return (
    <>
      <button
        type="button"
        className="coach-link-chip"
        data-coach-link-open
        onClick={() => setOpen(true)}
      >
        Coach QR
      </button>
      {modal ? createPortal(modal, hardwoodHost()) : null}
    </>
  );
}

'use client';

import { useState } from 'react';

export default function CopyButton({ text, label = '복사' }) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      setCopied(false);
    }
  }

  return (
    <button type="button" onClick={handleCopy} className="btn-ghost">
      {copied ? '복사됨!' : label}
    </button>
  );
}

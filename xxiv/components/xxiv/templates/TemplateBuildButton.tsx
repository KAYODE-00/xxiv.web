'use client';

import { useState } from 'react';

type BuildState = 'idle' | 'creating' | 'opening';

export default function TemplateBuildButton({
  href,
  className,
}: {
  href: string;
  className?: string;
}) {
  const [state, setState] = useState<BuildState>('idle');

  const label =
    state === 'creating'
      ? 'Creating...'
      : state === 'opening'
        ? 'Opening editor...'
        : 'Build with Template';

  return (
    <button
      type="button"
      className={className}
      disabled={state !== 'idle'}
      onClick={() => {
        setState('creating');
        window.setTimeout(() => setState('opening'), 250);
        window.location.href = href;
      }}
    >
      {label}
    </button>
  );
}

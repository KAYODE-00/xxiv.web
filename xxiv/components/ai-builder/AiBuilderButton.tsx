'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import AiBuilderModal from '@/components/ai-builder/AiBuilderModal';

type AiBuilderButtonProps = {
  projectId: string;
  className?: string;
  variant?: 'primary' | 'secondary';
};

export default function AiBuilderButton({
  projectId,
  className,
  variant = 'secondary',
}: AiBuilderButtonProps) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button
        type="button"
        onClick={() => setOpen(true)}
        className={className}
        variant={variant === 'primary' ? 'white' : 'secondary'}
      >
        ✦ Build with AI
      </Button>
      <AiBuilderModal open={open} onClose={() => setOpen(false)} projectId={projectId} />
    </>
  );
}

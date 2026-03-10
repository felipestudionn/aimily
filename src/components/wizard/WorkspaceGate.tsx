'use client';

import { useState, ReactNode } from 'react';
import { useRouter } from 'next/navigation';

interface Props {
  isConfigured: boolean;
  wizard: (onComplete: () => void) => ReactNode;
  workspace: ReactNode;
}

/**
 * Generic gate: shows mini-wizard on first entry, workspace after configured.
 */
export function WorkspaceGate({ isConfigured, wizard, workspace }: Props) {
  const router = useRouter();
  const [showWizard, setShowWizard] = useState(!isConfigured);

  if (showWizard) {
    return (
      <>
        {wizard(() => {
          setShowWizard(false);
          router.refresh();
        })}
      </>
    );
  }

  return <>{workspace}</>;
}

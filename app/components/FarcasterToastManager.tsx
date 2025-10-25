'use client';

import type { ReactNode } from 'react';

interface FarcasterToastManagerProps {
  children: (props: {
    onManifestSuccess?: () => void;
    onManifestError?: (error: Error) => void;
  }) => ReactNode;
}

export default function FarcasterToastManager({ children }: FarcasterToastManagerProps) {
  return <>{children({})}</>;
}

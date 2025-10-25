'use client';

import type { ReactNode } from 'react';

interface FarcasterWrapperProps {
  children: ReactNode;
}

export default function FarcasterWrapper({ children }: FarcasterWrapperProps) {
  return <>{children}</>;
}

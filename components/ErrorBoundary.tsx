'use client';

import { AlertCircle } from 'lucide-react';

interface ErrorBoundaryProps {
  children: React.ReactNode;
}

export default function ErrorBoundary({ children }: ErrorBoundaryProps) {
  return (
    <div className="min-h-screen bg-slate-50">
      {children}
    </div>
  );
}



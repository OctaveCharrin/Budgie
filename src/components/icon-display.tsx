"use client";
import * as LucideIcons from 'lucide-react';
import type { LucideProps } from 'lucide-react';

interface IconDisplayProps extends LucideProps {
  name: string;
}

export function IconDisplay({ name, ...props }: IconDisplayProps) {
  const IconComponent = (LucideIcons as any)[name] as LucideIcons.LucideIcon;

  if (!IconComponent) {
    // Fallback icon if the specified icon name doesn't exist
    return <LucideIcons.HelpCircle {...props} />;
  }

  return <IconComponent {...props} />;
}

import type { ReactNode } from 'react';

export interface SSOProvider {
  name: string;
  provider: string;
  href: string;
  icon?: ReactNode;
  buttonLabel?: string;
}

export interface LoginLabels {
  emailLabel?: string;
  passwordLabel?: string;
  signInLabel?: string;
  forgotPasswordLabel?: string;
  consentConfirmText?: string;
  noProviderMessage?: string;
}

export interface LoginAsideConfig {
  variant?: 'color' | 'gradient' | 'image' | 'default';
  color?: string;
  gradientStart?: string;
  gradientEnd?: string;
  image?: string;
}

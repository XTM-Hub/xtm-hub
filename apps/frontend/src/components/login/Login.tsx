'use client';

import { LoginLayout } from '@/components/login/LoginLayout';
import SettingsContext from '@/components/settings/SettingsContext';

// Component
const Login = () => (
  <SettingsContext>
    <LoginLayout />
  </SettingsContext>
);

// Component export
export default Login;

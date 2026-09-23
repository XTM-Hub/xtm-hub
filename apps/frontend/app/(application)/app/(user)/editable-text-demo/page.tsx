'use client';

import { EditableTextDemoContent } from '@/components/content-translation/EditableTextDemoContent';

// Live demo of the useTranslate() + EditModeContentObserver auto-detect
// mechanism. EditModeProvider is mounted once, globally, by
// app/(application)/app/layout.tsx — edit mode here is driven by the
// xtm-edit-mode cookie (see app/edition/route.ts), available to any user
// with the BYPASS capability.
const EditableTextDemoPage = () => {
  return <EditableTextDemoContent />;
};

export default EditableTextDemoPage;

'use client';

import { EditableTextDemoContent } from '@/components/content-translation/EditableTextDemoContent';

// Demo of the useTranslate() + EditModeContentObserver auto-detect
// mechanism on the public marketing site. EditModeProvider is mounted
// once, globally, by the public root layout — edit mode here is driven by
// the xtm-edit-mode cookie (see app/edition/route.ts), not by a separate
// URL.
const EditableTextDemoPage = () => {
  return <EditableTextDemoContent />;
};

export default EditableTextDemoPage;

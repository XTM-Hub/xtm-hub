'use client';

import { EditableTextDemoContent } from '@/components/content-translation/EditableTextDemoContent';

// Demo of the useTranslate() + EditModeContentObserver auto-detect
// mechanism. Edit mode is toggled from the sidebar (Edit Translations,
// BYPASS users only), for every page at once.
const EditableTextDemoPage = () => {
  return <EditableTextDemoContent />;
};

export default EditableTextDemoPage;

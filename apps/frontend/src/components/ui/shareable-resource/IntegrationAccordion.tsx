import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@filigran/ui';
import { useTranslations } from 'next-intl';
import React from 'react';

interface IntegrationAccordionProps {
  integrationType: string;
  children: React.ReactNode;
}

const IntegrationAccordion = ({
  integrationType,
  children,
}: IntegrationAccordionProps) => {
  const t = useTranslations();

  return (
    <Accordion
      type="multiple"

      defaultValue={[integrationType]}>
      <AccordionItem value={integrationType}>
        <AccordionTrigger variant="colored">
          <div className="inline-flex items-center gap-s">
            {t(`Service.OpenctiIntegrations.Type.${integrationType}`)}
          </div>
        </AccordionTrigger>
        <AccordionContent>{children}</AccordionContent>
      </AccordionItem>
    </Accordion>
  );
};

export default IntegrationAccordion;

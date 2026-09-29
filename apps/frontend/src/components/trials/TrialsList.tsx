'use client';
import { TrialsTabQuotasPlatform } from '@/components/trials/tab/quotas/TrialsTabQuotasPlatform';
import TrialsTab from '@/components/trials/tab/TrialsTab';
import { TrialsScope, TrialsTabType } from '@/components/trials/trials.const';
import { useTranslate } from '@/hooks/use-translate';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@filigran/ui';

const TAB_TITLES: Record<TrialsTabType, string> = {
  [TrialsTabType.Cancelled]: 'TrialsDashboard.TabTitle.Cancelled',
  [TrialsTabType.Expired]: 'TrialsDashboard.TabTitle.Expired',
  [TrialsTabType.Running]: 'TrialsDashboard.TabTitle.Running',
  [TrialsTabType.Waiting]: 'TrialsDashboard.TabTitle.Waiting',
};

const QUOTAS_TAB = 'quotas';

interface TrialsListProps {
  scope: TrialsScope;
}

const TrialsList = ({ scope }: TrialsListProps) => {
  const t = useTranslate();

  return (
    <Tabs defaultValue={TrialsTabType.Waiting}>
      <TabsList>
        {Object.values(TrialsTabType).map((type) => (
          <TabsTrigger
            key={type}
            value={type}>
            {t(TAB_TITLES[type])}
          </TabsTrigger>
        ))}
        {scope.kind === 'bundle' && (
          <TabsTrigger value={QUOTAS_TAB}>
            {t('TrialsDashboard.TabTitle.Quotas')}
          </TabsTrigger>
        )}
      </TabsList>
      {Object.values(TrialsTabType).map((type) => (
        <TabsContent
          key={type}
          value={type}>
          <TrialsTab
            type={type}
            scope={scope}
          />
        </TabsContent>
      ))}
      {scope.kind === 'bundle' && (
        <TabsContent value={QUOTAS_TAB}>
          <TrialsTabQuotasPlatform />
        </TabsContent>
      )}
    </Tabs>
  );
};

export default TrialsList;

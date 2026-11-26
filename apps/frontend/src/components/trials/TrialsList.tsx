'use client';
import { TrialsTabQuotasPlatform } from '@/components/trials/tab/quotas/TrialsTabQuotasPlatform';
import TrialsTab from '@/components/trials/tab/TrialsTab';
import { TrialsTabType } from '@/components/trials/trials.const';
import { useTranslate } from '@/hooks/use-translate';
import { analyticsId } from '@/lib/analytics/analytics.ids';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@filigran/design-system';

const TAB_TITLES: Record<TrialsTabType, string> = {
  [TrialsTabType.Cancelled]: 'TrialsDashboard.TabTitle.Cancelled',
  [TrialsTabType.Expired]: 'TrialsDashboard.TabTitle.Expired',
  [TrialsTabType.Running]: 'TrialsDashboard.TabTitle.Running',
  [TrialsTabType.Waiting]: 'TrialsDashboard.TabTitle.Waiting',
};

const QUOTAS_TAB = 'quotas';

const TrialsList = () => {
  const t = useTranslate();

  return (
    <Tabs defaultValue={TrialsTabType.Waiting}>
      <TabsList>
        {Object.values(TrialsTabType).map((type) => (
          <TabsTrigger
            key={type}
            value={type}
            {...analyticsId('admin_trial_status_select')}>
            {t(TAB_TITLES[type])}
          </TabsTrigger>
        ))}
        <TabsTrigger
          value={QUOTAS_TAB}
          {...analyticsId('admin_trial_quotas_open')}>
          {t('TrialsDashboard.TabTitle.Quotas')}
        </TabsTrigger>
      </TabsList>
      {Object.values(TrialsTabType).map((type) => (
        <TabsContent
          key={type}
          value={type}
          className="pt-4">
          <TrialsTab type={type} />
        </TabsContent>
      ))}
      <TabsContent
        value={QUOTAS_TAB}
        className="pt-4">
        <TrialsTabQuotasPlatform />
      </TabsContent>
    </Tabs>
  );
};

export default TrialsList;

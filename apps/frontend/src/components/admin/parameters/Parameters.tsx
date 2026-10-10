import { Label } from '@/components/ui/label';
import { useTranslate } from '@/hooks/use-translate';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Chip,
} from '@filigran/design-system';

export const Parameters = () => {
  const t = useTranslate();
  const appVersion = process.env.NEXT_PUBLIC_APP_VERSION || '0.0.0-dev';

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3">
      <Card className="w-1-3">
        <CardHeader>
          <CardTitle as="h3">{t('App.Title')}</CardTitle>
        </CardHeader>
        <CardContent clamp={0}>
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between border-b py-2">
              <Label>{t('Parameters.Version')}</Label>
              <div>
                <Chip label={appVersion} />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

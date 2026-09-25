import { useTranslate } from '@/hooks/use-translate';
import {
  Badge,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Label,
} from '@filigran/ui';

export const Parameters = () => {
  const t = useTranslate();
  const appVersion = process.env.NEXT_PUBLIC_APP_VERSION || '0.0.0-dev';

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3">
      <Card className="w-1-3">
        <CardHeader>
          <CardTitle className="heading-lg">{t('App.Title')}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between border-b py-2">
              <Label>{t('Parameters.Version')}</Label>
              <div>
                <Badge>{appVersion}</Badge>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

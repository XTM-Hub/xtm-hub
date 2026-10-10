'use client';

import { useTranslate } from '@/hooks/use-translate';
import {
  Button,
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@filigran/design-system';

interface ProfileFormResetPasswordProps {
  onSubmit: () => void;
}

export const ProfileFormResetPassword = ({
  onSubmit,
}: ProfileFormResetPasswordProps) => {
  const t = useTranslate();
  return (
    <Card>
      <CardHeader>
        <CardTitle as="h3">{t('UserForm.Password')}</CardTitle>
      </CardHeader>
      <CardContent clamp={0}>
        {t('UserForm.ResetPassword.Sentence')}
      </CardContent>
      <CardFooter className="justify-end">
        <Button
          aria-label={t('UserForm.ResetPassword.Action')}
          onClick={onSubmit}>
          {t('UserForm.ResetPassword.Action')}
        </Button>
      </CardFooter>
    </Card>
  );
};

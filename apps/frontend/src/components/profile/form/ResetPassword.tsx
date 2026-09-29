'use client';

import { useTranslate } from '@/hooks/use-translate';
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@filigran/ui';
import { Button } from '@filigran/ui/servers';

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
        <CardTitle className="heading-lg">{t('UserForm.Password')}</CardTitle>
      </CardHeader>
      <CardContent>{t('UserForm.ResetPassword.Sentence')}</CardContent>
      <CardFooter className="flex justify-end">
        <Button
          aria-label={t('UserForm.ResetPassword.Action')}
          onClick={onSubmit}>
          {t('UserForm.ResetPassword.Action')}
        </Button>
      </CardFooter>
    </Card>
  );
};

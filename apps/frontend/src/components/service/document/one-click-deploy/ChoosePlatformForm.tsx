import { useTranslate } from '@/hooks/use-translate';
import { cn } from '@/lib/utils';
import { isEeCapableContract } from '@/utils/platform';
import { SHAREABLE_RESOURCE_TYPE_NAME_MAPPING } from '@/utils/shareable-resources/shareable-resources.types';
import { doesVersionSatisfy } from '@/utils/versioning';
import {
  AutoForm,
  FormItem,
  FormLabel,
  FormMessage,
  Input,
} from '@filigran/ui';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@filigran/ui/clients';
import { Button } from '@filigran/ui/servers';
import { documentItem_fragment$data } from '@generated/documentItem_fragment.graphql';
import { useRegisteredPlatformsFragment$data } from '@generated/useRegisteredPlatformsFragment.graphql';
import { z } from 'zod';

interface ChoosePlatformFormProps {
  documentData: documentItem_fragment$data;
  platforms: useRegisteredPlatformsFragment$data[];
  translatedPlatformIdentifier: string;
  oneClickDeploy: (platformUrl: string) => void;
  setIsOpen: (isOpen: boolean) => void;
  requiredProductVersion?: string | null;
  requiresEe?: boolean;
}

export const selectPlatformFormSchema = z.object({
  platformUrl: z.string().nonempty(),
});

const ChoosePlatformForm = ({
  documentData,
  platforms,
  translatedPlatformIdentifier,
  oneClickDeploy,
  setIsOpen,
  requiredProductVersion,
  requiresEe,
}: ChoosePlatformFormProps) => {
  const t = useTranslate();

  return (
    <div className="flex flex-col h-full justify-between gap-m">
      <div className="space-y-m">
        <h1>
          {t('Service.ShareableResources.Deploy.DeployResourceDescription', {
            resourceName: documentData.name ?? '',
            resourceType:
              SHAREABLE_RESOURCE_TYPE_NAME_MAPPING[
                documentData.type as keyof typeof SHAREABLE_RESOURCE_TYPE_NAME_MAPPING
              ],
          })}
        </h1>
        <p>
          {t('Service.ShareableResources.Deploy.DeployQuestionTag', {
            platformType: translatedPlatformIdentifier,
          })}
        </p>
      </div>
      <AutoForm
        formSchema={selectPlatformFormSchema}
        onSubmit={({ platformUrl }) => {
          oneClickDeploy(platformUrl);
        }}
        fieldConfig={{
          platformUrl: {
            fieldType: ({ field }) => (
              <FormItem>
                <>
                  {platforms.map((platform) => {
                    const isPlatformCompatible = doesVersionSatisfy({
                      givenVersion: platform.version ?? '0.0.0',
                      requiredVersion: requiredProductVersion ?? '0.0.0',
                    });

                    const isEeBlocked =
                      requiresEe && !isEeCapableContract(platform.contract);
                    const isDisabled = !isPlatformCompatible || isEeBlocked;

                    const input = (
                      <div className="flex items-center gap-2">
                        <Input
                          id={platform.id}
                          type="radio"
                          disabled={isDisabled}
                          onChange={() => field.onChange(platform.url)}
                          checked={field.value === platform.url}
                          value={platform.url}
                          className="h-4 w-4 accent-primary"
                        />
                        <FormLabel
                          htmlFor={platform.id}
                          className={cn(
                            isDisabled && 'text-content-body-base'
                          )}>
                          {platform.title}
                        </FormLabel>
                      </div>
                    );

                    if (!isDisabled) {
                      return <div key={platform.id}>{input}</div>;
                    }

                    return (
                      <TooltipProvider key={platform.id}>
                        <Tooltip>
                          <TooltipTrigger
                            className="flex"
                            onClick={(e) => e.preventDefault()}>
                            {input}
                          </TooltipTrigger>
                          <TooltipContent className="max-w-xl">
                            <p>
                              {isEeBlocked
                                ? t(
                                    'Service.ShareableResources.Deploy.EE.PlatformRequiresEE',
                                    { platformTitle: platform.title }
                                  )
                                : t(
                                    'Service.ShareableResources.Deploy.DeployIncompatibleVersion',
                                    { platformTitle: platform.title }
                                  )}
                            </p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    );
                  })}
                </>
                <FormMessage className="mt-2 text-sm text-destructive" />
              </FormItem>
            ),
          },
        }}>
        <div className="flex justify-end gap-s">
          <Button
            type="button"
            variant="secondary"
            onClick={() => {
              setIsOpen(false);
            }}>
            {t('Utils.Cancel')}
          </Button>

          <Button
            onClick={() => {
              setIsOpen(false);
            }}>
            {t('Utils.Continue')}
          </Button>
        </div>
      </AutoForm>
    </div>
  );
};

export default ChoosePlatformForm;

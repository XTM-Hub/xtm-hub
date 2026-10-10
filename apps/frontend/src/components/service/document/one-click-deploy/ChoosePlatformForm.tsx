import { FormControl, FormItem, FormMessage } from '@/components/ui/form';
import { useTranslate } from '@/hooks/use-translate';
import { isEeCapableContract } from '@/utils/platform';
import { SHAREABLE_RESOURCE_TYPE_NAME_MAPPING } from '@/utils/shareable-resources/shareable-resources.types';
import { doesVersionSatisfy } from '@/utils/versioning';
import {
  Button,
  Radio,
  RadioGroup,
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@filigran/design-system';
import { AutoForm } from '@filigran/ui';
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
  const deployQuestion = t(
    'Service.ShareableResources.Deploy.DeployQuestionTag',
    { platformType: translatedPlatformIdentifier }
  );

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
        <p>{deployQuestion}</p>
      </div>
      <AutoForm
        formSchema={selectPlatformFormSchema}
        onSubmit={({ platformUrl }) => {
          setIsOpen(false);
          oneClickDeploy(platformUrl);
        }}
        fieldConfig={{
          platformUrl: {
            fieldType: ({ field }) => (
              <FormItem>
                <FormControl>
                  <RadioGroup
                    aria-label={deployQuestion}
                    value={field.value ?? ''}
                    onValueChange={field.onChange}>
                    {platforms.map((platform) => {
                      const isPlatformCompatible = doesVersionSatisfy({
                        givenVersion: platform.version ?? '0.0.0',
                        requiredVersion: requiredProductVersion ?? '0.0.0',
                      });

                      const isEeBlocked =
                        requiresEe && !isEeCapableContract(platform.contract);
                      const isDisabled = !isPlatformCompatible || isEeBlocked;

                      const radio = (
                        <Radio
                          key={platform.id}
                          id={platform.id}
                          value={platform.url}
                          disabled={isDisabled}
                          label={platform.title}
                        />
                      );

                      if (!isDisabled) {
                        return radio;
                      }

                      return (
                        <TooltipProvider key={platform.id}>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <span
                                className="flex"
                                tabIndex={0}>
                                {radio}
                              </span>
                            </TooltipTrigger>
                            <TooltipContent>
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
                  </RadioGroup>
                </FormControl>
                <FormMessage className="mt-2" />
              </FormItem>
            ),
          },
        }}>
        <div className="flex justify-end gap-s">
          <Button
            type="button"
            priority="secondary"
            onClick={() => {
              setIsOpen(false);
            }}>
            {t('Utils.Cancel')}
          </Button>

          <Button type="submit">{t('Utils.Continue')}</Button>
        </div>
      </AutoForm>
    </div>
  );
};

export default ChoosePlatformForm;

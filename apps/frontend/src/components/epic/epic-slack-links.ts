import { AutocompleteOption } from '@/components/ui/AutocompleteInput';

export const DEFAULT_EPIC_SLACK_LINK =
  'https://filigran-community.slack.com/archives/CHNEM9NUT';

export const EPIC_SLACK_LINK_OPTIONS: AutocompleteOption[] = [
  { label: 'Filigran announcements', value: DEFAULT_EPIC_SLACK_LINK },
  {
    label: 'XTM Hub',
    value: 'https://filigran-community.slack.com/archives/C08HU35NPD4',
  },
  {
    label: 'OpenCTI announcements',
    value: 'https://filigran-community.slack.com/archives/C0BMAMQ9JKY',
  },
  {
    label: 'OpenAEV announcements',
    value: 'https://filigran-community.slack.com/archives/C0BMANSB4CW',
  },
];

export const EPIC_SLACK_LINK_REGEX =
  /^https:\/\/filigran-community\.slack\.com\/\S+$/;

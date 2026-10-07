import { cn } from '@/lib/utils';
import {
  AccountBalanceOutlinedIcon,
  AccountMultipleOutlineIcon,
  ArchiveOutlineIcon,
  BiohazardIcon,
  BiotechOutlinedIcon,
  BriefcaseEditOutlineIcon,
  BriefcaseRemoveOutlineIcon,
  BriefcaseSearchOutlineIcon,
  BugReportOutlinedIcon,
  ChessKnightIcon,
  DescriptionOutlinedIcon,
  DiamondOutlinedIcon,
  DomainOutlinedIcon,
  EventOutlinedIcon,
  FireIcon,
  FlagOutlinedIcon,
  HelpOutlinedIcon,
  HexagonOutlineIcon,
  LaptopAccountIcon,
  LockPatternIcon,
  LogoFiligranIcon,
  MapOutlinedIcon,
  PersonOutlinedIcon,
  PlaceOutlinedIcon,
  PublicOutlinedIcon,
  RouterOutlinedIcon,
  SecurityOutlinedIcon,
  SpeakerNotesOutlinedIcon,
  StorageOutlinedIcon,
  StreamOutlinedIcon,
  SurroundSoundOutlinedIcon,
  WebAssetOutlinedIcon,
  WorkspacesOutlinedIcon,
} from '@filigran/icon';
import { FunctionComponent, SVGProps } from 'react';

type IconComponent = FunctionComponent<SVGProps<SVGSVGElement>>;

interface EntityTypeOption {
  /** Canonical OpenCTI entity type value, stored in the database. */
  id: string;
  /** Human-readable label displayed to the user. */
  name: string;
}

/**
 * Applicable OpenCTI entity types for Custom Views, in the order defined by the
 * product spec. Values match the canonical OpenCTI entity type identifiers so
 * the library stays consistent with the platform.
 * NB: "Security Coverages" is intentionally excluded (marked as "later").
 */
export const ENTITY_TYPES: EntityTypeOption[] = [
  { id: 'Administrative-Area', name: 'Area' },
  { id: 'Artifact', name: 'Artifact' },
  { id: 'Attack-Pattern', name: 'Attack Pattern' },
  { id: 'Campaign', name: 'Campaign' },
  { id: 'Channel', name: 'Channel' },
  { id: 'City', name: 'City' },
  { id: 'Country', name: 'Country' },
  { id: 'Data-Source', name: 'Data Source' },
  { id: 'Event', name: 'Event' },
  { id: 'Feedback', name: 'Feedback' },
  { id: 'Grouping', name: 'Grouping' },
  { id: 'Incident', name: 'Incident' },
  { id: 'Individual', name: 'Individual' },
  { id: 'Infrastructure', name: 'Infrastructure' },
  { id: 'Intrusion-Set', name: 'Intrusion Set' },
  { id: 'Malware', name: 'Malware' },
  { id: 'Malware-Analysis', name: 'Malware Analysis' },
  { id: 'Narrative', name: 'Narrative' },
  { id: 'Stix-Cyber-Observable', name: 'Observable' },
  { id: 'Organization', name: 'Organization' },
  { id: 'Region', name: 'Region' },
  { id: 'Report', name: 'Report' },
  { id: 'Case-Rfi', name: 'Request for information' },
  { id: 'Case-Rft', name: 'Request for takedown' },
  { id: 'Sector', name: 'Sector' },
  { id: 'SecurityPlatform', name: 'Security platform' },
  { id: 'System', name: 'System' },
  { id: 'Threat-Actor-Group', name: 'Threat Actor (Group)' },
  { id: 'Threat-Actor-Individual', name: 'Threat Actor (Individual)' },
  { id: 'Tool', name: 'Tool' },
  { id: 'Vulnerability', name: 'Vulnerability' },
];

const ENTITY_TYPE_BY_ID: Record<string, EntityTypeOption> = Object.fromEntries(
  ENTITY_TYPES.map((entityType) => [entityType.id, entityType])
);

interface EntityTypeStyle {
  /** OpenCTI icon rendered for this entity type. */
  icon: IconComponent;
  /**
   * OpenCTI color for this entity type. Values mirror the OpenCTI color families
   * (see `itemColor` / `COLOR_FAMILIES` in the platform) so icons look consistent
   * with the platform.
   */
  color: string;
}

/** Presentation (icon + color) for each entity type, keyed by canonical id. */
const ENTITY_TYPE_STYLE: Record<string, EntityTypeStyle> = {
  'Administrative-Area': { icon: MapOutlinedIcon, color: '#05ACC1' },
  Artifact: { icon: ArchiveOutlineIcon, color: '#FF6F42' },
  'Attack-Pattern': { icon: LockPatternIcon, color: '#D3E157' },
  Campaign: { icon: ChessKnightIcon, color: '#FF9800' },
  Channel: { icon: SurroundSoundOutlinedIcon, color: '#F0B60A' },
  City: { icon: PlaceOutlinedIcon, color: '#05ACC1' },
  Country: { icon: FlagOutlinedIcon, color: '#05ACC1' },
  'Data-Source': { icon: StreamOutlinedIcon, color: '#D3E157' },
  Event: { icon: EventOutlinedIcon, color: '#BA88FF' },
  Feedback: { icon: BriefcaseEditOutlineIcon, color: '#EA80FC' },
  Grouping: { icon: WorkspacesOutlinedIcon, color: '#70B23B' },
  Incident: { icon: FireIcon, color: '#F96C9B' },
  Individual: { icon: PersonOutlinedIcon, color: '#BA88FF' },
  Infrastructure: { icon: RouterOutlinedIcon, color: '#FF6F42' },
  'Intrusion-Set': { icon: DiamondOutlinedIcon, color: '#FF9800' },
  Malware: { icon: BiohazardIcon, color: '#F0B60A' },
  'Malware-Analysis': { icon: BiotechOutlinedIcon, color: '#70B23B' },
  Narrative: { icon: SpeakerNotesOutlinedIcon, color: '#D3E157' },
  'Stix-Cyber-Observable': { icon: HexagonOutlineIcon, color: '#84ffff' },
  Organization: { icon: AccountBalanceOutlinedIcon, color: '#BA88FF' },
  Region: { icon: PublicOutlinedIcon, color: '#05ACC1' },
  Report: { icon: DescriptionOutlinedIcon, color: '#70B23B' },
  'Case-Rfi': { icon: BriefcaseSearchOutlineIcon, color: '#EA80FC' },
  'Case-Rft': { icon: BriefcaseRemoveOutlineIcon, color: '#EA80FC' },
  Sector: { icon: DomainOutlinedIcon, color: '#BA88FF' },
  SecurityPlatform: { icon: SecurityOutlinedIcon, color: '#F0B60A' },
  System: { icon: StorageOutlinedIcon, color: '#BA88FF' },
  'Threat-Actor-Group': { icon: AccountMultipleOutlineIcon, color: '#FF9800' },
  'Threat-Actor-Individual': { icon: LaptopAccountIcon, color: '#FF9800' },
  Tool: { icon: WebAssetOutlinedIcon, color: '#F0B60A' },
  Vulnerability: { icon: BugReportOutlinedIcon, color: '#F0B60A' },
};

export const getEntityTypeLabel = (id: string): string =>
  ENTITY_TYPE_BY_ID[id]?.name ?? id;

interface EntityTypeIconProps extends SVGProps<SVGSVGElement> {
  entityType: string;
}

/** Renders the OpenCTI icon for an entity type, with a generic fallback. */
export const EntityTypeIcon = ({
  entityType,
  style,
  ...props
}: EntityTypeIconProps) => {
  const entityStyle = ENTITY_TYPE_STYLE[entityType];
  const Icon: IconComponent = entityStyle?.icon ?? HelpOutlinedIcon;
  const color = entityStyle?.color;
  return (
    <Icon
      style={{ color, ...style }}
      {...props}
    />
  );
};

interface EntityTypeOrFiligranLogoProps {
  entityTypes?: readonly string[] | null;
  className?: string;
}

/**
 * Renders the icon of the first entity type as the resource's default logo
 * falling back to the Filigran logo when no entity type is available
 */
export const EntityTypeOrFiligranLogo = ({
  entityTypes,
  className = 'size-22',
}: EntityTypeOrFiligranLogoProps) => {
  const first = entityTypes?.[0];
  return first ? (
    <EntityTypeIcon
      entityType={first}
      className={cn('shrink-0', className)}
    />
  ) : (
    <LogoFiligranIcon className={className} />
  );
};

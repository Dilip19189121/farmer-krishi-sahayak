export interface SchemePoint {
  text: Record<string, string>;
  iconType: 'check' | 'bolt' | 'calendar';
}

export interface LocalizedScheme {
  id: string;
  categoryTag: Record<string, string>;
  categoryTagBg: string;
  categoryTagText: string;
  featureTag: Record<string, string>;
  featureIcon: string;
  iconName: string;
  title: Record<string, string>;
  subtitle: Record<string, string>;
  points: SchemePoint[];
  documents: Record<string, string>[];
  eligibility: Record<string, string>;
  categoryKey: 'all' | 'dbt' | 'insurance' | 'equipment' | 'irrigation' | 'organic' | 'credit';
  stateType: 'all' | 'central' | 'state';
  eligibilityKey: 'all' | 'small' | 'tenant' | 'women';
}


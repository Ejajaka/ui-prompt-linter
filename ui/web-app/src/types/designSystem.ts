export interface DesignTokens {
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  typography: string;
  fontSizes: string;
  spacing: string;
  borderRadius: string;
  shadows: string;
  componentStyles: string;
  buttonStyles: string;
  inputStyles: string;
  navigationPattern: string;
  responsiveBreakpoints: string;
  brandGuidelines: string;
}

export interface DesignSystem {
  id: string;
  name: string;
  projectId: string | null;
  ownerId?: string;
  tokens: DesignTokens;
  isShared: boolean;
  version?: number;
  createdAt?: string;
  updatedAt?: string;
}

export const DEFAULT_DESIGN_SYSTEM: DesignSystem = {
  id: 'builtin-vector',
  name: 'Vector default',
  projectId: null,
  tokens: {
    primaryColor: '#49686C',
    secondaryColor: '#30494B',
    accentColor: '#D1B653',
    typography: 'Plus Jakarta Sans, sans-serif',
    fontSizes: '12 / 14 / 16 / 20 / 24 / 32 px',
    spacing: '4 / 8 / 12 / 16 / 24 / 32 px',
    borderRadius: '8 px controls, 12 px cards, 16 px hero panels',
    shadows: 'Soft low-contrast elevation; avoid heavy drop shadows',
    componentStyles: 'Rounded cards, 1 px neutral borders, generous whitespace',
    buttonStyles: 'Primary filled actions; secondary outlined actions',
    inputStyles: 'Rounded inputs with visible labels and inline validation',
    navigationPattern: 'Persistent sidebar on desktop; collapsible drawer on mobile',
    responsiveBreakpoints: 'Mobile < 640 px; tablet 640–1024 px; desktop > 1024 px',
    brandGuidelines: 'Professional, calm, editorial; prioritise clarity and accessibility',
  },
  isShared: false,
};

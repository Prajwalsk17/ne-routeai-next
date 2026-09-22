/**
 * AuraNER / NER-Route AI — Mobile Design Tokens
 * 
 * Compliant with Phase 2 UX/UI Specification ("Borders of Nature & Tech")
 * Designed for high visual fidelity, dark-mode ergonomics, and minimum 48pt touch targets.
 */

export const COLORS = {
  // Forest Canvas & Surfaces
  forest500: '#080C0A', // Deepest canvas background
  forest400: '#0E1612', // Main screen viewport background
  forest300: '#14201A', // Container & navigation bar background
  forest200: '#1A2E23', // Elevated cards & modal sheets
  forest100: '#213830', // Interactive pressed / active surface state

  // Mist Typography & High-Contrast Icons
  mist: '#E2E8F0',      // Primary high-contrast text
  mistDim: '#94A3B8',   // Secondary labels & table headers
  mistMuted: '#64748B', // Captions, timestamps, disabled items

  // Semantic Accents
  orchid: '#A855F7',      // AI & Route computation
  orchidLight: '#C084FC', // Glow highlights
  teal: '#0D9488',        // Telemetry & active vehicles
  tealLight: '#14B8A6',   // Verified live tracking
  amber: '#F59E0B',       // Warnings & mountain risk
  amberLight: '#FCD34D',  // Attention banners
  danger: '#EF4444',      // Critical landslides & SOS triggers
  dangerLight: '#FCA5A5', // High severity chips
  safe: '#22C55E',        // Clear roads, delivered shipments
  safeLight: '#86EFAC',   // Success confirmations
  info: '#3B82F6',        // Checkpoints & inspection posts
  infoLight: '#93C5FD',   // Police notices
};

export const SPACING = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
};

export const TOUCH_TARGETS = {
  standard: 48,  // Minimum touch target for in-cab operation
  driving: 64,   // Critical driving action button target
};

export const TYPOGRAPHY = {
  h1: { fontSize: 24, fontWeight: '700' as const, color: COLORS.mist },
  h2: { fontSize: 20, fontWeight: '700' as const, color: COLORS.mist },
  h3: { fontSize: 16, fontWeight: '600' as const, color: COLORS.mist },
  body: { fontSize: 14, fontWeight: '400' as const, color: COLORS.mistDim },
  bodyBold: { fontSize: 14, fontWeight: '600' as const, color: COLORS.mist },
  caption: { fontSize: 12, fontWeight: '500' as const, color: COLORS.mistMuted },
  mono: { fontSize: 12, fontWeight: '600' as const, color: COLORS.mist },
};

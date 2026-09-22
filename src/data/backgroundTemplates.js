export const DEEP_BLACK_ORBS_URL = 'scene://deep-black-orbs';
export const STUDIO_WHITE_ORBS_URL = 'scene://studio-white-orbs';

export const isDarkOrbScene = (bgUrl) => {
  if (!bgUrl) return false;
  return (
    bgUrl === DEEP_BLACK_ORBS_URL ||
    bgUrl === 'scene://deep-black-orbs' ||
    bgUrl === '3d-black-orbs' ||
    bgUrl === 'deep-black-orbs'
  );
};

export const isWhiteOrbScene = (bgUrl) => {
  if (!bgUrl) return false;
  return (
    bgUrl === STUDIO_WHITE_ORBS_URL ||
    bgUrl === 'scene://studio-white-orbs' ||
    bgUrl === '3d-white-orbs' ||
    bgUrl === 'studio-white-orbs'
  );
};

export const isOrbScene = (bgUrl) => {
  return isDarkOrbScene(bgUrl) || isWhiteOrbScene(bgUrl);
};

export const SHOWCASE_TEMPLATES = [
  {
    id: 'deep-black-orbs',
    label: 'Deep Void & 3D Orbs',
    category: 'dark',
    badge: '3D Dark',
    description: 'Layered #000000 base, #1a1a1a 3D canvas void, #0f0f15 refraction backdrop wall, and glowing floating colored orbs.',
    thumb: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="200" height="150" viewBox="0 0 200 150"><rect width="200" height="150" fill="%23000000"/><rect x="15" y="12" width="170" height="126" rx="8" fill="%231a1a1a"/><rect x="30" y="24" width="140" height="102" rx="4" fill="%230f0f15"/><circle cx="70" cy="55" r="22" fill="%23ff0055" filter="drop-shadow(0 0 8px %23ff0055)" opacity="0.9"/><circle cx="135" cy="85" r="25" fill="%2300d0ff" filter="drop-shadow(0 0 10px %2300d0ff)" opacity="0.9"/><circle cx="105" cy="105" r="18" fill="%237000ff" filter="drop-shadow(0 0 8px %237000ff)" opacity="0.85"/><circle cx="130" cy="45" r="14" fill="%23ffaa00" filter="drop-shadow(0 0 6px %23ffaa00)" opacity="0.85"/></svg>',
    url: DEEP_BLACK_ORBS_URL,
  },
  {
    id: 'studio-white-orbs',
    label: 'Pure White & 3D Orbs',
    category: 'white',
    badge: '3D White',
    description: 'Layered #ffffff base, #f4f4f7 3D canvas void, #ebebf0 refraction backdrop wall, and vivid floating colored orbs.',
    thumb: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="200" height="150" viewBox="0 0 200 150"><rect width="200" height="150" fill="%23ffffff"/><rect x="15" y="12" width="170" height="126" rx="8" fill="%23f4f4f7" stroke="%23e2e2e8"/><rect x="30" y="24" width="140" height="102" rx="4" fill="%23ebebf0" stroke="%23dedee5"/><circle cx="70" cy="55" r="22" fill="%23ff0055" filter="drop-shadow(0 4px 10px rgba(255,0,85,0.45))" opacity="0.95"/><circle cx="135" cy="85" r="25" fill="%2300b4d8" filter="drop-shadow(0 4px 12px rgba(0,180,216,0.45))" opacity="0.95"/><circle cx="105" cy="105" r="18" fill="%237b2cbf" filter="drop-shadow(0 4px 10px rgba(123,44,191,0.45))" opacity="0.9"/><circle cx="130" cy="45" r="14" fill="%23ff9e00" filter="drop-shadow(0 4px 8px rgba(255,158,0,0.45))" opacity="0.9"/></svg>',
    url: STUDIO_WHITE_ORBS_URL,
  },
  {
    id: 'prismatic',
    label: 'Prismatic Spectrum',
    category: 'showcase',
    badge: 'Dispersion',
    description: 'Vibrant chromatic spectrum specifically engineered to showcase Snell’s Law RGB dispersion splitting.',
    thumb: 'https://images.unsplash.com/photo-1550684848-fac1c5b4e853?q=80&w=200&auto=format&fit=crop',
    url: 'https://images.unsplash.com/photo-1550684848-fac1c5b4e853?q=80&w=2000&auto=format&fit=crop',
  },
  {
    id: 'geometric',
    label: 'Geometric Optics',
    category: 'showcase',
    badge: 'Refraction',
    description: 'High-contrast abstract curves and grids demonstrating surface curvature lensing and bezel distortion.',
    thumb: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=200&auto=format&fit=crop',
    url: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=2000&auto=format&fit=crop',
  },
  {
    id: 'cyber-fluid',
    label: 'Cyber Neon Fluid',
    category: 'showcase',
    badge: 'Specular & Blur',
    description: 'Luminous fluid waves demonstrating dynamic Blinn-Phong specular glints and Poisson disk depth blur.',
    thumb: 'https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?q=80&w=200&auto=format&fit=crop',
    url: 'https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?q=80&w=2000&auto=format&fit=crop',
  },
  {
    id: 'studio-white',
    label: 'Studio Minimal White',
    category: 'white',
    badge: 'White Showcase',
    description: 'Clean architectural white space showcasing physical drop shadows, edge bevel highlights, and clear caustics on pure white.',
    thumb: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?q=80&w=200&auto=format&fit=crop',
    url: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?q=80&w=2000&auto=format&fit=crop',
  },
  {
    id: 'obsidian-dark',
    label: 'Obsidian Void Dark',
    category: 'dark',
    badge: 'Dark Showcase',
    description: 'Deep midnight obsidian showcasing specular highlights, inner rim glow, and glass reflections against pure dark/black.',
    thumb: 'https://images.unsplash.com/photo-1550684376-efcbd6e3f031?q=80&w=200&auto=format&fit=crop',
    url: 'https://images.unsplash.com/photo-1550684376-efcbd6e3f031?q=80&w=2000&auto=format&fit=crop',
  },
];

export const CLASSIC_TEMPLATES = [
  {
    id: 'interior',
    label: 'Interior Architecture',
    category: 'classic',
    thumb: 'https://images.unsplash.com/photo-1618221195710-dd6b41faaea6?q=80&w=200&auto=format&fit=crop',
    url: 'https://images.unsplash.com/photo-1618221195710-dd6b41faaea6?q=80&w=2000&auto=format&fit=crop',
  },
  {
    id: 'living-room',
    label: 'Modern Minimal Room',
    category: 'classic',
    thumb: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDpqTFc884FyMsQhl9lwUt32PFm3dZece4gVanjFehViV9s7KCfEK0e8_SaZf3aknQlPSB62rfFykmn7hJHsN063jFhhSEoTxgYjK4SrD0NVKLq6csnTGphx6-PlqBQJbs--1FlhR_cxo-930lt1zpmbxgzpn8GInD3twDZKIOHDxnAlpQ83VPkgmV1ARPuJL7dpgdhAjV-WarCfim6xKBGZOwZU2w9iHkz7C7mi9lTN2SX4ka3OEjgUA',
    url: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDpqTFc884FyMsQhl9lwUt32PFm3dZece4gVanjFehViV9s7KCfEK0e8_SaZf3aknQlPSB62rfFykmn7hJHsN063jFhhSEoTxgYjK4SrD0NVKLq6csnTGphx6-PlqBQJbs--1FlhR_cxo-930lt1zpmbxgzpn8GInD3twDZKIOHDxnAlpQ83VPkgmV1ARPuJL7dpgdhAjV-WarCfim6xKBGZOwZU2w9iHkz7C7mi9lTN2SX4ka3OEjgUA',
  },
];

export const ALL_TEMPLATES = [...SHOWCASE_TEMPLATES, ...CLASSIC_TEMPLATES];
export const DEFAULT_BG = SHOWCASE_TEMPLATES[0].url;

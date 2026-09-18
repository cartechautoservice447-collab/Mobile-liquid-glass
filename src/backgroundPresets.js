export const BACKGROUND_PRESETS = [
  {
    id: 'default',
    label: 'Current Stage',
    description: 'Keep the existing blue/violet stage.',
    preview: 'linear-gradient(145deg,#2d5fd8 0%,#183d98 43%,#20183f 78%,#641b70 100%)',
    background: 'radial-gradient(circle at 18% 10%, rgba(80,119,248,.70) 0%, transparent 44%),radial-gradient(circle at 84% 28%, rgba(92,57,205,.68) 0%, transparent 42%),radial-gradient(circle at 72% 90%, rgba(36,119,143,.60) 0%, transparent 48%),linear-gradient(145deg,#2d5fd8 0%,#183d98 43%,#20183f 78%,#641b70 100%)',
  },
  {
    id: 'aurora-luxe',
    label: 'Aurora Luxe',
    description: 'Purple + emerald + sapphire — static 2K.',
    preview: 'radial-gradient(circle at 18% 10%,#7647ff 0%,transparent 44%),radial-gradient(circle at 84% 28%,#00c98d 0%,transparent 40%),radial-gradient(circle at 72% 90%,#2368ff 0%,transparent 48%),linear-gradient(145deg,#090f1d,#10234d 52%,#24144e)',
    background: 'radial-gradient(circle at 18% 10%, rgba(118,71,255,.78) 0%, transparent 44%),radial-gradient(circle at 84% 28%, rgba(0,201,141,.68) 0%, transparent 40%),radial-gradient(circle at 72% 90%, rgba(35,104,255,.78) 0%, transparent 48%),linear-gradient(145deg,#090f1d 0%,#10234d 52%,#24144e 100%)',
  },
  {
    id: 'emerald-sapphire',
    label: 'Emerald Sapphire',
    description: 'Deep emerald, cyan and royal violet.',
    preview: 'radial-gradient(circle at 82% 16%,#00c2a8 0%,transparent 42%),radial-gradient(circle at 12% 62%,#2e6bff 0%,transparent 44%),radial-gradient(circle at 76% 88%,#7436ff 0%,transparent 46%),linear-gradient(145deg,#061519,#083d55 50%,#0a1233)',
    background: 'radial-gradient(circle at 82% 16%, rgba(0,194,168,.72) 0%, transparent 42%),radial-gradient(circle at 12% 62%, rgba(46,107,255,.78) 0%, transparent 44%),radial-gradient(circle at 76% 88%, rgba(116,54,255,.72) 0%, transparent 46%),linear-gradient(145deg,#061519 0%,#083d55 50%,#0a1233 100%)',
  },
  {
    id: 'royal-violet',
    label: 'Royal Violet',
    description: 'Luxury indigo and violet with cool cyan.',
    preview: 'radial-gradient(circle at 20% 16%,#8b5cf6 0%,transparent 43%),radial-gradient(circle at 78% 48%,#4f46e5 0%,transparent 46%),radial-gradient(circle at 42% 92%,#22d3ee 0%,transparent 44%),linear-gradient(145deg,#0e071b,#2a124f 52%,#11143b)',
    background: 'radial-gradient(circle at 20% 16%, rgba(139,92,246,.72) 0%, transparent 43%),radial-gradient(circle at 78% 48%, rgba(79,70,229,.70) 0%, transparent 46%),radial-gradient(circle at 42% 92%, rgba(34,211,238,.58) 0%, transparent 44%),linear-gradient(145deg,#0e071b 0%,#2a124f 52%,#11143b 100%)',
  },
  {
    id: 'arctic-amethyst',
    label: 'Arctic Amethyst',
    description: 'Sapphire blue, amethyst and soft magenta.',
    preview: 'radial-gradient(circle at 12% 18%,#38bdf8 0%,transparent 42%),radial-gradient(circle at 82% 20%,#a855f7 0%,transparent 44%),radial-gradient(circle at 58% 88%,#ec4899 0%,transparent 48%),linear-gradient(145deg,#081522,#173c72 52%,#3a154e)',
    background: 'radial-gradient(circle at 12% 18%, rgba(56,189,248,.66) 0%, transparent 42%),radial-gradient(circle at 82% 20%, rgba(168,85,247,.70) 0%, transparent 44%),radial-gradient(circle at 58% 88%, rgba(236,72,153,.52) 0%, transparent 48%),linear-gradient(145deg,#081522 0%,#173c72 52%,#3a154e 100%)',
  },
];

export const BACKGROUND_PRESET_VALUES = BACKGROUND_PRESETS.map((preset) => preset.id);

export function getBackgroundPreset(id) {
  return BACKGROUND_PRESETS.find((preset) => preset.id === id) || BACKGROUND_PRESETS[0];
}

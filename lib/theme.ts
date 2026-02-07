// Centralized color palette for charts and UI accents
export const PALETTE = {
  primary: '#0ea5ff',
  primaryDark: '#0369a1',
  accent: '#7dd3fc',
  muted: '#94a3b8',
};

// A modest color scale to use for categorical bars. Keep it limited and
// repeating so charts look cohesive.
export const COLOR_SCALE = [
  '#75afed', '#5a96d7', '#4a8cd3', '#1c62ac','#104c8c', '#093360', '#062444', '#02162c' 
];

export function getColor(index: number) {
  return COLOR_SCALE[index % COLOR_SCALE.length];
}

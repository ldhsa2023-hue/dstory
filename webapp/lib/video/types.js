// Shared vocabulary across all video generation providers. Adding a new
// provider (Kling, Runway, Seedance, ...) means adding a string here plus a
// new file under lib/video/providers/ — nothing else in this list changes.
export const VIDEO_PROVIDERS = [
  { id: 'higgsfield', name: 'Higgsfield' },
  { id: 'google-flow', name: 'Google Flow / Veo' },
  { id: 'generic', name: 'Generic' },
];

export const GENERATION_MODES = [
  { id: 'image-to-video', name: 'Image → Video' },
  { id: 'start-end-frame', name: 'Start + End Frame' },
  { id: 'ingredients', name: 'Ingredients' },
  { id: 'text-to-video', name: 'Text → Video' },
];

export const INGREDIENT_TYPES = [
  'CHARACTER', 'FOOD', 'OBJECT', 'ENVIRONMENT', 'VEHICLE', 'CREATURE', 'PROP', 'OTHER',
];

export const AUDIO_INTENTS = ['NATURAL_ONLY', 'DIALOGUE', 'SFX', 'FULL_AUDIO', 'NO_PREFERENCE'];

export function isKnownProvider(id) {
  return VIDEO_PROVIDERS.some((p) => p.id === id);
}

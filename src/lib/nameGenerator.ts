const adjectives = [
  'able', 'abstract', 'acoustic', 'active', 'adventurous', 'aesthetic',
  'agile', 'alive', 'ambitious', 'ancient', 'angular', 'animated',
  'anonymous', 'archaic', 'arduous', 'artful', 'artificial', 'artistic',
  'astute', 'audacious', 'austere', 'avant-garde', 'beautiful', 'beloved',
  'biblical', 'blazing', 'bleak', 'blissful', 'bold', 'bombastic',
  'bouncy', 'brave', 'breathtaking', 'breezy', 'bright', 'brilliant',
  'brisk', 'broad', 'brutal', 'buoyant', 'busy', 'calm',
  'careful', 'casual', 'catchy', 'cathartic', 'cavernous', 'celestial',
  'cerebral', 'chaotic', 'charged', 'charismatic', 'cheerful', 'choppy',
  'chromatic', 'cinematic', 'circular', 'classic', 'clean', 'clear',
  'clever', 'cold', 'collective', 'colorful', 'complex', 'confident',
  'contemplative', 'cool', 'cosmic', 'creative', 'cryptic', 'curious',
  'cutting-edge', 'cyclic', 'dark', 'dazzling', 'deep', 'delicate',
  'delirious', 'desolate', 'determined', 'dexterous', 'diaphanous', 'distant',
  'distinct', 'distorted', 'divergent', 'dreamy', 'dynamic', 'eager',
  'earnest', 'earthy', 'eccentric', 'ecstatic', 'effortless', 'elastic',
  'electric', 'elegant', 'elemental', 'elevated', 'elliptical', 'eloquent',
  'emotional', 'emotive', 'emphatic', 'endless', 'energetic', 'enormous',
  'ephemeral', 'epic', 'ethereal', 'euphoric', 'exact', 'excellent',
  'experimental', 'explosive', 'fluid', 'focused', 'frantic', 'free',
  'fresh', 'frozen', 'grand', 'golden', 'glorious', 'haunted',
  'hazy', 'heroic', 'hypnotic', 'idiosyncratic', 'imaginative', 'immediate',
  'impulsive', 'incisive', 'incandescent', 'incredible', 'indelible', 'infinite',
  'innovative', 'intense', 'intimate', 'intricate', 'intriguing', 'intuitive',
  'inventive', 'invisible', 'iridescent', 'kaleidoscopic', 'keen', 'kinetic',
  'large', 'lavish', 'lean', 'legendary', 'light', 'lively',
  'lofty', 'lucid', 'luminous', 'lush', 'lyrical', 'majestic',
  'massive', 'masterful', 'melodic', 'mercurial', 'messy', 'metallic',
  'minimal', 'modern', 'monolithic', 'moody', 'murky', 'musical',
  'mysterious', 'mythical', 'nebulous', 'nocturnal', 'noisy', 'oblique',
  'obsessive', 'opulent', 'organic', 'original', 'ornate', 'panoramic',
  'paradoxical', 'passionate', 'peaceful', 'peculiar', 'perfect', 'perpetual',
  'philosophical', 'physical', 'playful', 'poetic', 'poignant', 'polished',
  'potent', 'powerful', 'primal', 'primordial', 'profound', 'psychedelic',
  'pure', 'quiet', 'radiant', 'rampant', 'raw', 'resonant',
  'rich', 'rigid', 'rousing', 'sacred', 'serene', 'sharp',
  'shimmering', 'silent', 'sleek', 'slow', 'soft', 'solemn',
  'soulful', 'spacious', 'spectacular', 'spectral', 'still', 'strange',
  'striking', 'strong', 'sublime', 'subtle', 'sumptuous', 'sweeping',
  'symbolic', 'tangled', 'tender', 'timeless', 'transcendent', 'tremendous',
  'turbulent', 'twilight', 'twisted', 'unique', 'vast', 'vibrant',
  'vivid', 'volatile', 'vulnerable', 'warm', 'wild', 'wistful',
  'wondrous', 'radiant', 'youthful', 'zealous',
];

const synonyms = [
  'canvas', 'sketch', 'draft', 'drawing', 'painting', 'composition',
  'tableau', 'fresco', 'blueprint', 'diagram', 'doodle', 'illustration',
  'portrait', 'collage', 'study', 'rendering', 'vision', 'concept',
  'creation', 'design', 'panel', 'slate', 'folio', 'frame',
  'plate', 'mural', 'mosaic', 'outline', 'spread', 'work',
  'piece', 'scene', 'surface', 'board', 'gallery', 'studio',
];

const pick = <T>(arr: T[]) => arr[Math.floor(Math.random() * arr.length)];

const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

export const generateBoardName = () =>
  `${capitalize(pick(adjectives))} ${capitalize(pick(synonyms))}`;

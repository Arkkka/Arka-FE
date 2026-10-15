export const GO_NO_GO_STIMULI = ['WAYANG', 'BATIK', 'CANDI', 'MONAS', 'ANGKLUNG'] as const;

export type GoNoGoStimulus = (typeof GO_NO_GO_STIMULI)[number];

interface StimulusAsset {
  src: string;
  alt: string;
}

export const GO_NO_GO_STIMULUS_LABELS: Record<GoNoGoStimulus, string> = {
  WAYANG: 'Wayang',
  BATIK: 'Batik',
  CANDI: 'Candi',
  MONAS: 'Monas',
  ANGKLUNG: 'Angklung',
};

const STIMULUS_ASSETS: Record<GoNoGoStimulus, readonly StimulusAsset[]> = {
  WAYANG: [
    { src: '/images/game-mode2/wayang-1.png', alt: 'Wayang kulit berwarna emas' },
    { src: '/images/game-mode2/wayang-2.png', alt: 'Wayang kulit berwarna hitam dan emas' },
    { src: '/images/game-mode2/wayang-3.png', alt: 'Wayang kulit varian ketiga' },
    { src: '/images/game-mode2/wayang-4.png', alt: 'Wayang kulit varian keempat' },
  ],
  BATIK: [
    { src: '/images/game-mode2/batik-1.png', alt: 'Kain batik cokelat bermotif parang' },
    { src: '/images/game-mode2/batik-2.png', alt: 'Kain batik biru bermotif bunga' },
    { src: '/images/game-mode2/batik-3.png', alt: 'Kain batik bermotif kawung' },
    { src: '/images/game-mode2/batik-4.png', alt: 'Kain batik bermotif mega mendung' },
  ],
  CANDI: [
    { src: '/images/game-mode2/candi-borobudur.png', alt: 'Candi Borobudur' },
    { src: '/images/game-mode2/candi-prambanan.png', alt: 'Candi Prambanan' },
    { src: '/images/game-mode2/candi-sewu.png', alt: 'Candi Sewu' },
    { src: '/images/game-mode2/candi-mendut.png', alt: 'Candi Mendut' },
  ],
  MONAS: [
    { src: '/images/game-mode2/monas-1.png', alt: 'Monumen Nasional tampak depan' },
    { src: '/images/game-mode2/monas-2.png', alt: 'Monumen Nasional tampak dekat' },
    { src: '/images/game-mode2/monas-3.png', alt: 'Monumen Nasional tampak lurus' },
    { src: '/images/game-mode2/monas-4.png', alt: 'Monumen Nasional dari sudut rendah' },
  ],
  ANGKLUNG: [
    { src: '/images/game-mode2/angklung-1.png', alt: 'Angklung bambu tampak depan' },
    { src: '/images/game-mode2/angklung-2.png', alt: 'Angklung bambu tampak samping' },
    { src: '/images/game-mode2/angklung-3.png', alt: 'Angklung enam tabung tampak depan' },
    { src: '/images/game-mode2/angklung-4.png', alt: 'Angklung delapan tabung tampak samping' },
  ],
};

function stableHash(value: string): number {
  let hash = 2_166_136_261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16_777_619);
  }
  return hash >>> 0;
}

export function goNoGoStimulusAsset(stimulus: GoNoGoStimulus, seed: string): StimulusAsset {
  const variants = STIMULUS_ASSETS[stimulus];
  return variants[stableHash(`${seed}:${stimulus}`) % variants.length]!;
}

export function goNoGoStimulusAssetAt(stimulus: GoNoGoStimulus, assetIndex: number): StimulusAsset {
  const asset = STIMULUS_ASSETS[stimulus][assetIndex];
  if (!asset) throw new RangeError(`Asset stimulus tidak tersedia: ${stimulus}/${assetIndex}`);
  return asset;
}

export function goNoGoTargetAudioUrl(stimulus: GoNoGoStimulus): string {
  return `/audio/game-mode2/targets/${stimulus.toLowerCase()}.m4a`;
}

export const GO_NO_GO_IMAGE_URLS = Object.values(STIMULUS_ASSETS).flatMap((variants) =>
  variants.map((asset) => asset.src),
);

let preloadPromise: Promise<void> | null = null;

export function preloadGoNoGoImages(): Promise<void> {
  preloadPromise ??= Promise.all(
    GO_NO_GO_IMAGE_URLS.map(
      (src) =>
        new Promise<void>((resolve, reject) => {
          const image = new Image();
          image.onload = () => {
            void image.decode().catch(() => undefined).finally(resolve);
          };
          image.onerror = () => reject(new Error(`Gambar stimulus gagal dimuat: ${src}`));
          image.src = src;
        }),
    ),
  ).then(() => undefined);
  return preloadPromise;
}

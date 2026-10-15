import type { GameMode } from '@/schemas';
import {
  eyesEmoji,
  musicalNotesEmoji,
  tangerineEmoji,
  dingDongReference,
  goNoGoReference,
  perasJerukReference,
} from '@/assets';

export const GAME_MODES = [
  {
    mode: 'MOTOR_GRIP',
    title: 'Peras Jeruk',
    detail: 'Peras jeruk selama 30 detik. Semakin kuat genggaman, semakin banyak jus dan poin.',
    device: 'Genggam alat',
    capability: 'FSR',
    illustration: perasJerukReference,
    emoji: tangerineEmoji,
    color: '#d67b1f',
    softColor: '#fff0df',
  },
  {
    mode: 'GO_NO_GO',
    title: 'Go-No-Go',
    detail: 'Latihan perhatian dengan menggenggam hanya saat Wayang muncul.',
    device: 'Genggam alat',
    capability: 'FSR',
    illustration: goNoGoReference,
    emoji: eyesEmoji,
    color: '#3b628b',
    softColor: '#e5f3fc',
  },
  {
    mode: 'SEQUENCE_MEMORY',
    title: 'Ding Dong Dong',
    detail: 'Latihan mengingat urutan melalui empat tombol fisik.',
    device: 'Empat tombol fisik',
    capability: 'BUTTONS_4',
    illustration: dingDongReference,
    emoji: musicalNotesEmoji,
    color: '#399267',
    softColor: '#e8f7ef',
  },
] as const;

export function isGameMode(value: string | undefined): value is GameMode {
  return value === 'MOTOR_GRIP' || value === 'GO_NO_GO' || value === 'SEQUENCE_MEMORY';
}

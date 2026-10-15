import {
  Activity,
  Brain,
  CheckCircle2,
  CircleOff,
  CircleX,
  Clock3,
  Flag,
  Gauge,
  Hand,
  Layers3,
  RotateCcw,
  Target,
  Trophy,
  type LucideIcon,
} from 'lucide-react';
import type { GameMetrics } from '@/schemas';
import { fruitLabel } from './SqueezableFruit.tsx';

type Tone = 'amber' | 'blue' | 'green' | 'orange' | 'purple' | 'red';

type ResultStat = {
  icon: LucideIcon;
  label: string;
  tone: Tone;
  value: string | number;
};

const toneClasses: Record<Tone, string> = {
  amber: 'bg-[#fff7dc] text-[#9a6a00]',
  blue: 'bg-[#e5f3fc] text-[#245f9f]',
  green: 'bg-[#e8f7ef] text-[#267452]',
  orange: 'bg-[#fff4e7] text-[#a94f12]',
  purple: 'bg-[#f2edff] text-[#6547a8]',
  red: 'bg-danger-soft text-danger',
};

function getStats(metrics: GameMetrics, score: number): ResultStat[] {
  if (metrics.mode === 'MOTOR_GRIP') {
    return [
      { icon: Trophy, label: 'Skor', tone: 'amber', value: score },
      { icon: Target, label: 'Jeruk & referensi', tone: 'green', value: `${fruitLabel(metrics.fruitVariant)} · ${metrics.targetKilograms.toFixed(2)} kg` },
      { icon: Gauge, label: 'Beban puncak', tone: 'orange', value: metrics.gripSamples.length > 0 ? `${metrics.peakKilograms.toFixed(2)} kg` : '—' },
      { icon: Activity, label: 'Beban rata-rata', tone: 'blue', value: `${metrics.averageKilograms.toFixed(2)} kg` },
      { icon: Clock3, label: 'Tahanan kontinu', tone: 'purple', value: `${(metrics.continuousHoldMs / 1000).toFixed(1)} dtk` },
      { icon: metrics.targetCompleted ? CheckCircle2 : CircleX, label: 'Hasil & waktu', tone: metrics.targetCompleted ? 'green' : 'red', value: `${metrics.targetCompleted ? 'Target tercapai' : 'Waktu habis'} · ${(metrics.sessionElapsedMs / 1000).toFixed(1)} dtk` },
    ];
  }

  if (metrics.mode === 'GO_NO_GO') {
    return [
      { icon: Trophy, label: 'Skor', tone: 'amber', value: score },
      { icon: Target, label: 'Akurasi keseluruhan', tone: 'blue', value: `${Math.round(metrics.accuracyPercent)}%` },
      { icon: Clock3, label: 'Reaksi rata-rata', tone: 'purple', value: metrics.meanHitReactionMs === null ? '—' : `${Math.round(metrics.meanHitReactionMs)} ms` },
      { icon: CheckCircle2, label: 'Respons benar', tone: 'green', value: metrics.hits + metrics.correctRejections },
      { icon: CircleOff, label: 'Target terlewat', tone: 'orange', value: metrics.misses },
      { icon: Hand, label: 'Genggaman keliru', tone: 'red', value: metrics.falsePositives },
    ];
  }

  return [
    { icon: Trophy, label: 'Skor', tone: 'amber', value: score },
    { icon: Brain, label: 'Rentang ingatan', tone: 'purple', value: `Level ${metrics.maxSequenceLength}` },
    { icon: Layers3, label: 'Level selesai', tone: 'green', value: metrics.completedLevels },
    { icon: Clock3, label: 'Respons pertama rata-rata', tone: 'blue', value: metrics.meanFirstResponseMs === null ? '—' : `${Math.round(metrics.meanFirstResponseMs)} ms` },
    { icon: RotateCcw, label: 'Percobaan salah', tone: 'red', value: metrics.wrongAttempts },
    { icon: Flag, label: 'Alasan selesai', tone: 'orange', value: metrics.completionReason === 'LEVEL_CAP_REACHED' ? 'Semua level selesai' : 'Kesempatan habis' },
  ];
}

export function ResultStats({ metrics, score }: { metrics: GameMetrics; score: number }) {
  return (
    <dl className="mt-5 grid grid-cols-2 gap-3 lg:grid-cols-3">
      {getStats(metrics, score).map(({ icon: Icon, label, tone, value }) => (
        <div className="min-w-0 rounded-md border-2 border-divider bg-white p-4" key={label}>
          <div className="flex items-center gap-3">
            <span aria-hidden className={`grid size-10 shrink-0 place-items-center rounded-full ${toneClasses[tone]}`}><Icon className="size-5" /></span>
            <dt className="text-sm leading-tight font-bold text-muted">{label}</dt>
          </div>
          <dd className="mt-3 ml-0 break-words text-2xl leading-tight font-black tabular-nums sm:text-3xl">{value}</dd>
        </div>
      ))}
    </dl>
  );
}

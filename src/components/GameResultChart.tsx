import { m, useReducedMotion } from 'framer-motion';
import type { GameMetrics } from '@/schemas';

function EmptyChart({ message }: { message: string }) {
  return <section className="mt-7 grid min-h-48 place-items-center rounded-md border-2 border-divider bg-white p-6 text-center text-muted"><div><p className="m-0 text-lg font-black">Data grafik belum tersedia</p><p className="mt-2 mb-0">{message}</p></div></section>;
}

function SequenceLatencyChart({ metrics }: { metrics: Extract<GameMetrics, { mode: 'SEQUENCE_MEMORY' }> }) {
  const reduceMotion = useReducedMotion();
  const latencyData = metrics.levelLatencies;
  if (latencyData.length === 0) return <EmptyChart message="Grafik akan muncul setelah level permainan selesai." />;
  const width = 720;
  const height = 280;
  const left = 62;
  const right = 34;
  const top = 46;
  const bottom = 52;
  const plotWidth = width - left - right;
  const plotHeight = height - top - bottom;
  const maxLatency = Math.max(2_000, ...latencyData.map((point) => point.latencyMs));
  const points = latencyData.map((point, index) => ({ ...point, x: left + (index / Math.max(latencyData.length - 1, 1)) * plotWidth, y: top + plotHeight - (point.latencyMs / maxLatency) * plotHeight }));
  const line = points.map((point) => `${point.x},${point.y}`).join(' ');
  return (
    <section aria-labelledby="sequence-chart-title" className="mt-5 w-full overflow-hidden rounded-md border-2 border-divider bg-white p-5 sm:p-6">
      <div className="flex flex-wrap items-end justify-between gap-3"><div><p className="m-0 text-sm font-black tracking-[0.08em] text-[#3b628b] uppercase">Perkembangan memori</p><h2 className="mt-2 mb-0 text-2xl font-black" id="sequence-chart-title">Waktu reaksi setiap level</h2><p className="mt-2 mb-0 text-sm font-bold text-muted">Garis yang turun menunjukkan respons semakin cepat.</p></div><span className="rounded-full bg-[#e5f3fc] px-4 py-2 text-sm font-black text-[#245f9f]">{latencyData.length} level tercatat</span></div>
      <div className="mt-6 overflow-x-auto"><svg aria-label="Grafik garis waktu reaksi setiap level" className="h-auto min-w-[35rem] w-full" role="img" viewBox={`0 0 ${width} ${height}`}>{[0, 0.25, 0.5, 0.75, 1].map((ratio) => { const value = maxLatency * (1 - ratio); const y = top + plotHeight * ratio; return <g key={ratio}><line stroke="#dbe8f2" strokeDasharray={ratio === 1 ? undefined : '5 6'} strokeWidth="1.5" x1={left} x2={left + plotWidth} y1={y} y2={y} /><text fill="#625f54" fontSize="12" fontWeight="700" textAnchor="end" x={left - 10} y={y + 4}>{Math.round(value)} ms</text></g>; })}{points.length > 1 && <m.polyline animate={{ pathLength: 1, opacity: 1 }} fill="none" initial={reduceMotion ? { pathLength: 1, opacity: 1 } : { pathLength: 0, opacity: 0 }} points={line} stroke="#3b628b" strokeLinecap="round" strokeLinejoin="round" strokeWidth="5" transition={{ duration: 0.8, ease: 'easeOut' }} />}{points.map((point, index) => <m.g animate={{ opacity: 1, scale: 1 }} initial={reduceMotion ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0.45 }} key={`${point.level}-${index}`} style={{ transformBox: 'fill-box', transformOrigin: 'center' }} transition={{ delay: reduceMotion ? 0 : index * 0.1, duration: 0.25 }}><circle cx={point.x} cy={point.y} fill="white" r="7" stroke="#3b628b" strokeWidth="4" /><text fill="#171711" fontSize="13" fontWeight="900" textAnchor="middle" x={point.x} y={point.y - 16}>{Math.round(point.latencyMs)} ms</text><text fill="#625f54" fontSize="13" fontWeight="700" textAnchor="middle" x={point.x} y={height - 15}>Level {point.level}</text></m.g>)}</svg></div>
      <table className="sr-only"><caption>Waktu reaksi setiap level</caption><thead><tr><th>Level</th><th>Milidetik</th></tr></thead><tbody>{latencyData.map((point, index) => <tr key={`${point.level}-${index}`}><td>{point.level}</td><td>{Math.round(point.latencyMs)}</td></tr>)}</tbody></table>
    </section>
  );
}

function MotorGripChart({ metrics }: { metrics: Extract<GameMetrics, { mode: 'MOTOR_GRIP' }> }) {
  const reduceMotion = useReducedMotion();
  if (metrics.gripSamples.length === 0) return <EmptyChart message="Data kilogram per detik belum tersedia untuk sesi ini." />;
  const width = 720;
  const height = 240;
  const left = 62;
  const right = 62;
  const top = 28;
  const bottom = 46;
  const plotWidth = width - left - right;
  const plotHeight = height - top - bottom;
  const durationSeconds = Math.max(1, Math.ceil(metrics.sessionElapsedMs / 1_000), metrics.gripSamples.at(-1)?.elapsedSecond ?? 1);
  const maxKilograms = Math.max(5, Math.ceil(metrics.peakKilograms));
  const ticks = Array.from({ length: 6 }, (_, index) => maxKilograms * index / 5);
  const points = metrics.gripSamples.map((sample) => ({ ...sample, x: left + ((sample.elapsedSecond - 1) / Math.max(durationSeconds - 1, 1)) * plotWidth, y: top + plotHeight - (sample.kilograms / maxKilograms) * plotHeight }));
  const line = points.map((point) => `${point.x},${point.y}`).join(' ');
  const targetY = top + plotHeight - (metrics.targetKilograms / maxKilograms) * plotHeight;
  return (
    <section aria-labelledby="grip-chart-title" className="mt-5 w-full overflow-hidden rounded-md border-2 border-divider bg-white p-5 sm:p-6">
      <div className="text-center"><p className="m-0 text-sm font-black tracking-[0.08em] text-[#b85b16] uppercase">Kekuatan per detik</p><h2 className="mt-2 mb-0 text-2xl font-black" id="grip-chart-title">Grafik genggaman selama {durationSeconds} detik</h2><p className="mt-2 mb-0 text-sm font-bold text-muted">Rata-rata {metrics.averageKilograms.toFixed(2)} kg · Referensi skor {metrics.targetKilograms.toFixed(2)} kg</p></div>
      <div className="mt-6 overflow-x-auto"><svg aria-label="Grafik garis kilogram genggaman setiap detik" className="h-auto min-w-[36rem] w-full" role="img" viewBox={`0 0 ${width} ${height}`}>{ticks.map((kg) => { const y = top + plotHeight - (kg / maxKilograms) * plotHeight; return <g key={kg}><line stroke="#dbe8f2" strokeDasharray={kg === 0 ? undefined : '5 6'} strokeWidth="1.5" x1={left} x2={left + plotWidth} y1={y} y2={y} /><text fill="#625f54" fontSize="13" fontWeight="700" textAnchor="end" x={left - 9} y={y + 4}>{kg} kg</text></g>; })}<line stroke="#399267" strokeDasharray="8 6" strokeWidth="2.5" x1={left} x2={left + plotWidth} y1={targetY} y2={targetY} /><text fill="#276b4a" fontSize="12" fontWeight="900" textAnchor="end" x={left + plotWidth} y={Math.max(14, targetY - 7)}>Referensi {metrics.targetKilograms.toFixed(2)} kg</text><m.polyline animate={{ pathLength: 1, opacity: 1 }} fill="none" initial={reduceMotion ? { pathLength: 1, opacity: 1 } : { pathLength: 0, opacity: 0 }} points={line} stroke="#d67b1f" strokeLinecap="round" strokeLinejoin="round" strokeWidth="5" transition={{ duration: 0.85 }} />{points.map((point) => <circle cx={point.x} cy={point.y} fill="white" key={point.elapsedSecond} r="3.5" stroke="#d67b1f" strokeWidth="2" />)}<text fill="#625f54" fontSize="13" fontWeight="700" x={left} y={height - 12}>1 detik</text><text fill="#625f54" fontSize="13" fontWeight="700" textAnchor="end" x={left + plotWidth} y={height - 12}>{durationSeconds} detik</text></svg></div>
      <table className="sr-only"><caption>Berat genggaman setiap detik</caption><thead><tr><th>Detik</th><th>Kilogram</th></tr></thead><tbody>{metrics.gripSamples.map((sample) => <tr key={sample.elapsedSecond}><td>{sample.elapsedSecond}</td><td>{sample.kilograms.toFixed(2)}</td></tr>)}</tbody></table>
    </section>
  );
}

function GoNoGoChart({ metrics }: { metrics: Extract<GameMetrics, { mode: 'GO_NO_GO' }> }) {
  const reduceMotion = useReducedMotion();
  const levels = metrics.levelBreakdown.length === 2 ? metrics.levelBreakdown : [];
  if (levels.length === 0) return <EmptyChart message="Rincian per level belum tersedia untuk sesi ini." />;
  const overall = [{ label: 'Jawaban benar', value: metrics.hits + metrics.correctRejections, color: '#399267' }, { label: 'Terlewat', value: metrics.misses, color: '#e7b82c' }, { label: 'Jawaban keliru', value: metrics.falsePositives, color: '#dc4c3f' }];
  let offset = 0;
  const segments = overall.map((item) => { const ratio = item.value / Math.max(metrics.totalTrials, 1); const segment = { ...item, ratio, offset }; offset += ratio; return segment; });
  const gradient = segments.map((item) => `${item.color} ${item.offset * 100}% ${(item.offset + item.ratio) * 100}%`).join(', ');
  return (
    <section aria-labelledby="attention-chart-title" className="mt-5 w-full overflow-hidden rounded-md border-2 border-divider bg-white p-5 sm:p-6">
      <div className="text-center"><p className="m-0 text-sm font-black tracking-[0.08em] text-[#245f9f] uppercase">Komposisi atensi</p><h2 className="mt-1 mb-0 text-2xl font-black" id="attention-chart-title">Ringkasan dan perbandingan level</h2><p className="mt-1 mb-0 text-sm font-bold text-muted">Level 2 mempercepat pergantian gambar dari 3 detik menjadi 2 detik.</p></div>
      <div className="mt-5 grid items-stretch gap-5 lg:grid-cols-[13rem_1fr]">
        <div className="grid place-items-center rounded-md bg-canvas/45 p-4 text-center"><m.div animate={{ opacity: 1, scale: 1 }} aria-label={`Akurasi keseluruhan ${Math.round(metrics.accuracyPercent)} persen`} className="grid size-40 place-items-center rounded-full" initial={reduceMotion ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0.8 }} role="img" style={{ background: `conic-gradient(${gradient})` }}><div className="grid size-25 place-items-center rounded-full bg-white"><span><strong className="block text-3xl">{Math.round(metrics.accuracyPercent)}%</strong><span className="text-xs font-bold text-muted">keseluruhan</span></span></div></m.div><ul className="mt-4 mb-0 grid w-full list-none gap-2 p-0 text-left">{overall.map((item) => <li className="flex items-center justify-between gap-3 text-sm" key={item.label}><span className="flex items-center gap-2 font-bold"><span aria-hidden className="size-2.5 rounded-full" style={{ backgroundColor: item.color }} />{item.label}</span><strong>{item.value}</strong></li>)}</ul></div>
        <div className="grid overflow-hidden rounded-md border-2 border-divider sm:grid-cols-2">{levels.map((level, index) => { const correct = level.hits + level.correctRejections; const rows = [{ label: 'Jawaban benar', value: correct, color: '#399267' }, { label: 'Terlewat', value: level.misses, color: '#e7b82c' }, { label: 'Jawaban keliru', value: level.falsePositives, color: '#dc4c3f' }]; return <m.article animate={{ opacity: 1, y: 0 }} className={`p-4 text-center ${index === 1 ? 'border-t-2 border-divider sm:border-t-0 sm:border-l-2' : ''}`} initial={reduceMotion ? { opacity: 1, y: 0 } : { opacity: 0, y: 10 }} key={level.level} transition={{ delay: index * 0.12 }}><p className="m-0 text-sm font-black tracking-[0.08em] text-[#245f9f] uppercase">Level {level.level}</p><div className="mt-2 flex items-end justify-center gap-2"><strong className="text-4xl">{Math.round(level.accuracyPercent)}%</strong><span className="pb-1 text-xs font-bold text-muted">akurasi</span></div><p className="mt-1 mb-0 text-sm font-bold text-muted">{level.stimulusDurationMs / 1000} detik per gambar</p><ul className="mt-4 mb-0 grid list-none gap-2.5 p-0 text-left">{rows.map((row) => <li className="grid grid-cols-[1fr_auto] items-center gap-3" key={row.label}><span><span className="flex items-center gap-2 text-sm font-bold"><span aria-hidden className="size-2.5 rounded-full" style={{ backgroundColor: row.color }} />{row.label}</span><span className="mt-1 block h-1.5 overflow-hidden rounded-full bg-divider"><span className="block h-full rounded-full" style={{ backgroundColor: row.color, width: `${(row.value / Math.max(level.totalTrials, 1)) * 100}%` }} /></span></span><strong>{row.value}</strong></li>)}</ul><p className="mt-4 mb-0 rounded-sm bg-canvas px-3 py-2 text-xs font-bold text-muted">Reaksi: <strong className="text-ink">{level.meanHitReactionMs === null ? '—' : `${Math.round(level.meanHitReactionMs)} ms`}</strong></p></m.article>; })}</div>
      </div>
    </section>
  );
}

export function GameResultChart({ metrics }: { metrics: GameMetrics }) {
  if (metrics.mode === 'MOTOR_GRIP') return <MotorGripChart metrics={metrics} />;
  if (metrics.mode === 'GO_NO_GO') return <GoNoGoChart metrics={metrics} />;
  return <SequenceLatencyChart metrics={metrics} />;
}

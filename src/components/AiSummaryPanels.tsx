import { FileDown, Sparkles } from 'lucide-react';
import { useId, useState } from 'react';
import type { AiSummaryDto } from '@/schemas';
import { API_ENDPOINTS, apiUrl } from '@/constants';
import { buttonClassName } from './ui/button/button.tsx';

type Audience = 'participant' | 'clinician';

const AUDIENCES: readonly { id: Audience; label: string }[] = [
  { id: 'participant', label: 'Peserta' },
  { id: 'clinician', label: 'Dokter' },
];

function normalizeSummaryText(text: string): string {
  return text.replace(
    /persentase akurasi\s+(\d+(?:[.,]\d+)?)\s+pada\s+(\d+)\s+total percobaan/giu,
    'akurasi $1% pada total $2 percobaan',
  );
}

export function SummaryLoading({ overall = false }: { overall?: boolean }) {
  return (
    <section aria-atomic="true" aria-live="polite" className="overflow-hidden rounded-md border-2 border-divider bg-white" role="status">
      <div className="flex items-center gap-4 p-5 sm:p-6">
        <span aria-hidden className="relative grid size-12 shrink-0 place-items-center rounded-full bg-brand-soft">
          <span className="absolute inset-1 motion-safe:animate-spin rounded-full border-2 border-transparent border-t-accent" />
          <Sparkles className="size-5 text-accent" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="m-0 font-black text-ink">{overall ? 'Menyiapkan ringkasan keseluruhan' : 'Menyiapkan ringkasan sesi'}</p>
          <p className="mt-1 mb-0 text-sm font-bold text-muted">Hasil permainan sudah tersimpan. Ringkasan dibuat otomatis dan akan tampil sebentar lagi.</p>
          <div aria-hidden className="mt-3 flex gap-1.5"><span className="size-2 motion-safe:animate-pulse rounded-full bg-accent" /><span className="size-2 motion-safe:animate-pulse rounded-full bg-accent [animation-delay:180ms]" /><span className="size-2 motion-safe:animate-pulse rounded-full bg-accent [animation-delay:360ms]" /></div>
        </div>
      </div>
    </section>
  );
}

export function AiSummaryPanels({ sessionId, summary }: { sessionId?: string; summary: AiSummaryDto }) {
  const [audience, setAudience] = useState<Audience>('participant');
  const tabsId = useId();
  if (summary.status === 'PENDING') return <SummaryLoading />;
  if (summary.status !== 'READY') return <section aria-live="polite" className="rounded-md border-2 border-divider bg-white p-5 text-center font-bold text-muted">Ringkasan belum tersedia untuk sesi ini.</section>;
  const active = summary[audience];
  const participantPoints = summary.participant.observations.length > 0
    ? summary.participant.observations
    : [summary.participant.summaryText];

  return (
    <section aria-labelledby={`${tabsId}-title`} className="overflow-hidden rounded-md border-2 border-divider bg-white">
      <div className="border-b-2 border-divider px-4 pt-4 sm:px-5">
        <p className="m-0 text-xs font-black tracking-[0.08em] text-accent uppercase" id={`${tabsId}-title`}>Ringkasan sesi</p>
        <div aria-label="Pilih ringkasan" className="mt-3 flex gap-2" role="tablist">
          {AUDIENCES.map((item) => (
            <button
              aria-controls={`${tabsId}-panel`}
              aria-selected={audience === item.id}
              className={`min-h-11 border-0 border-b-4 bg-transparent px-4 text-sm font-black transition ${audience === item.id ? 'border-accent text-accent' : 'border-transparent text-muted hover:text-ink'}`}
              id={`${tabsId}-${item.id}`}
              key={item.id}
              onClick={() => setAudience(item.id)}
              role="tab"
              type="button"
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>
      <div aria-labelledby={`${tabsId}-${audience}`} className="p-4 sm:p-5" id={`${tabsId}-panel`} role="tabpanel" tabIndex={0}>
        {audience === 'participant' ? <div><div className="flex items-center gap-3 rounded-sm bg-brand-soft px-4 py-3"><Sparkles aria-hidden className="size-5 shrink-0 text-accent" /><p className="m-0 font-black">Poin permainanmu</p></div><ul className="mt-4 mb-0 grid list-none gap-3 p-0">{participantPoints.map((point, index) => <li className="flex items-start gap-3 rounded-sm border-2 border-divider bg-canvas/45 p-4" key={`${index}-${point}`}><span aria-hidden className="grid size-8 shrink-0 place-items-center rounded-full bg-accent font-black text-white">{index + 1}</span><span className="pt-1 text-base leading-6 font-bold">{normalizeSummaryText(point)}</span></li>)}</ul></div> : <><p className="m-0 text-base leading-7 font-bold">{normalizeSummaryText(active.summaryText)}</p>{active.observations.length > 0 && <ul className="mt-3 mb-0 grid gap-2 pl-5 text-sm leading-6 text-muted">{active.observations.map((observation) => <li key={observation}>{normalizeSummaryText(observation)}</li>)}</ul>}</>}
        {sessionId && <div className="mt-5 flex justify-end"><a className={buttonClassName('secondary')} href={apiUrl(API_ENDPOINTS.games.sessionReport(sessionId, audience))}><FileDown aria-hidden className="size-5" />Unduh PDF {audience === 'participant' ? 'peserta' : 'dokter'}</a></div>}
      </div>
    </section>
  );
}

import { ChevronLeft, ChevronRight } from 'lucide-react';

function paginationItems(page: number, totalPages: number): Array<number | 'ellipsis-start' | 'ellipsis-end'> {
  if (totalPages <= 5) return Array.from({ length: totalPages }, (_, index) => index + 1);
  if (page <= 3) return [1, 2, 3, 'ellipsis-end', totalPages];
  if (page >= totalPages - 2) return [1, 'ellipsis-start', totalPages - 2, totalPages - 1, totalPages];
  return [1, 'ellipsis-start', page, 'ellipsis-end', totalPages];
}

interface PaginationProps {
  page: number;
  totalPages: number;
  totalItems: number;
  itemLabel: string;
  onPageChange: (page: number) => void | Promise<void>;
  loading?: boolean;
}

export function Pagination({ page, totalPages, totalItems, itemLabel, onPageChange, loading = false }: PaginationProps) {
  const safeTotalPages = Math.max(totalPages, 1);
  return (
    <nav aria-label={`Pagination ${itemLabel}`} className="mt-8 flex flex-col items-center justify-between gap-4 border-t-2 border-divider pt-5 sm:flex-row">
      <p className="m-0 text-center text-sm font-bold text-muted sm:text-left">Halaman {page} dari {safeTotalPages} · {totalItems} {itemLabel}</p>
      <div className="flex flex-wrap items-center justify-center gap-1.5">
        <button aria-label="Halaman sebelumnya" className="inline-flex size-11 items-center justify-center rounded-sm border-0 bg-transparent font-black transition hover:bg-divider disabled:cursor-not-allowed disabled:opacity-35 sm:w-auto sm:px-3" disabled={page <= 1 || loading} onClick={() => void onPageChange(page - 1)} type="button"><ChevronLeft aria-hidden className="size-5" /><span className="hidden sm:inline">Sebelumnya</span></button>
        {paginationItems(page, safeTotalPages).map((item) => typeof item === 'number' ? (
          <button aria-current={page === item ? 'page' : undefined} aria-label={`Halaman ${item} dari ${safeTotalPages}`} className={`grid size-11 place-items-center rounded-sm border-0 font-black transition ${page === item ? 'bg-ink text-white' : 'bg-transparent hover:bg-divider'}`} disabled={loading} key={item} onClick={() => void onPageChange(item)} type="button">{item}</button>
        ) : <span aria-hidden className="grid size-9 place-items-center font-black text-muted" key={item}>…</span>)}
        <button aria-label="Halaman berikutnya" className="inline-flex size-11 items-center justify-center rounded-sm border-0 bg-transparent font-black transition hover:bg-divider disabled:cursor-not-allowed disabled:opacity-35 sm:w-auto sm:px-3" disabled={page >= safeTotalPages || loading} onClick={() => void onPageChange(page + 1)} type="button"><span className="hidden sm:inline">{loading ? 'Memuat…' : 'Berikutnya'}</span><ChevronRight aria-hidden className="size-5" /></button>
      </div>
    </nav>
  );
}

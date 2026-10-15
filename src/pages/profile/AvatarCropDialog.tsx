import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/index.ts';
import { avatarDataUrl, drawAvatarCrop, type AvatarCrop } from '@/lib/avatar.ts';

interface AvatarCropDialogProps {
  file: File;
  onCancel: () => void;
  onComplete: (image: string) => void;
}

export function AvatarCropDialog({ file, onCancel, onComplete }: AvatarCropDialogProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [bitmap, setBitmap] = useState<ImageBitmap | null>(null);
  const [crop, setCrop] = useState<AvatarCrop>({ zoom: 1, x: 0, y: 0 });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    let loaded: ImageBitmap | null = null;
    void createImageBitmap(file).then((next) => {
      loaded = next;
      if (active) setBitmap(next);
      else next.close();
    });
    return () => {
      active = false;
      loaded?.close();
    };
  }, [file]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const context = canvas?.getContext('2d');
    if (canvas && context && bitmap) drawAvatarCrop(context, bitmap, canvas.width, crop);
  }, [bitmap, crop]);

  return (
    <div aria-labelledby="crop-title" aria-modal="true" className="fixed inset-0 z-[100] grid place-items-center bg-ink/65 p-4" role="dialog">
      <div className="max-h-[calc(100dvh-2rem)] w-full max-w-lg overflow-y-auto rounded-lg bg-white p-6 text-ink sm:p-8">
        <h2 className="m-0 text-3xl font-black tracking-[-0.04em]" id="crop-title">Sesuaikan foto</h2>
        <p className="mt-2 mb-0 text-base text-muted">Atur posisi foto agar pas di dalam avatar.</p>

        <canvas aria-label="Pratinjau potongan foto profil" className="mx-auto mt-6 aspect-square h-auto w-full max-w-64 rounded-full bg-divider" height="256" ref={canvasRef} role="img" width="256" />

        <div className="mt-7 grid gap-5">
          <label className="grid gap-2 text-base font-bold">Perbesar
            <input max="3" min="1" onChange={(event) => setCrop((current) => ({ ...current, zoom: Number(event.target.value) }))} step="0.05" type="range" value={crop.zoom} />
          </label>
          <label className="grid gap-2 text-base font-bold">Posisi horizontal
            <input max="1" min="-1" onChange={(event) => setCrop((current) => ({ ...current, x: Number(event.target.value) }))} step="0.05" type="range" value={crop.x} />
          </label>
          <label className="grid gap-2 text-base font-bold">Posisi vertikal
            <input max="1" min="-1" onChange={(event) => setCrop((current) => ({ ...current, y: Number(event.target.value) }))} step="0.05" type="range" value={crop.y} />
          </label>
        </div>

        {error && <p className="mt-4 mb-0 text-base font-bold text-danger" role="alert">{error}</p>}
        <div className="mt-7 grid gap-3 sm:grid-cols-2">
          <Button disabled={busy} onClick={onCancel} variant="secondary">Batal</Button>
          <Button disabled={busy || !bitmap} onClick={async () => {
            setBusy(true);
            setError('');
            try {
              onComplete(await avatarDataUrl(file, crop));
            } catch (nextError) {
              setError(nextError instanceof Error ? nextError.message : 'Foto belum dapat diproses.');
              setBusy(false);
            }
          }}>{busy ? 'Memproses…' : 'Gunakan foto'}</Button>
        </div>
      </div>
    </div>
  );
}

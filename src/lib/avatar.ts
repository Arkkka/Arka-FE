const MAX_UPLOAD_BYTES = 5 * 1024 * 1024;
const AVATAR_SIZE = 192;
const MAX_ENCODED_LENGTH = 48_000;
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

export interface AvatarCrop {
  zoom: number;
  x: number;
  y: number;
}

export function validateAvatarFile(file: File): void {
  if (!ALLOWED_TYPES.includes(file.type)) throw new Error('Pilih gambar JPG, PNG, atau WebP.');
  if (file.size > MAX_UPLOAD_BYTES) throw new Error('Ukuran foto maksimal 5 MB.');
}

export function drawAvatarCrop(
  context: CanvasRenderingContext2D,
  bitmap: ImageBitmap,
  outputSize: number,
  crop: AvatarCrop,
): void {
  const cropSize = Math.min(bitmap.width, bitmap.height) / crop.zoom;
  const sourceX = ((crop.x + 1) / 2) * (bitmap.width - cropSize);
  const sourceY = ((crop.y + 1) / 2) * (bitmap.height - cropSize);
  context.clearRect(0, 0, outputSize, outputSize);
  context.drawImage(bitmap, sourceX, sourceY, cropSize, cropSize, 0, 0, outputSize, outputSize);
}

export async function avatarDataUrl(file: File, crop: AvatarCrop): Promise<string> {
  validateAvatarFile(file);
  const bitmap = await createImageBitmap(file);
  try {
    const canvas = document.createElement('canvas');
    canvas.width = AVATAR_SIZE;
    canvas.height = AVATAR_SIZE;
    const context = canvas.getContext('2d');
    if (!context) throw new Error('Foto belum dapat diproses.');
    drawAvatarCrop(context, bitmap, AVATAR_SIZE, crop);
    const result = canvas.toDataURL('image/jpeg', 0.7);
    if (result.length > MAX_ENCODED_LENGTH) throw new Error('Foto masih terlalu besar setelah diproses.');
    return result;
  } finally {
    bitmap.close();
  }
}

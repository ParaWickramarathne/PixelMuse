export type OutputFormat = 'image/jpeg' | 'image/png' | 'image/webp';
export type Result = { blob: Blob; url: string; width: number; height: number; quality: number; downloaded: boolean };
export type ImageItem = { id: string; file: File; url: string; width: number; height: number; result?: Result; status: 'ready' | 'processing' | 'done' | 'error'; error?: string };
export const MAX_FILE_SIZE = 20 * 1024 * 1024;
export const formatBytes = (bytes: number) => bytes < 1024 ? `${bytes} B` : bytes < 1048576 ? `${(bytes / 1024).toFixed(1)} KB` : `${(bytes / 1048576).toFixed(2)} MB`;
export const formatName = (mime: string) => mime.split('/')[1]?.toUpperCase().replace('JPEG', 'JPG') || 'Image';
export function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => { const image = new Image(); image.onload = () => resolve(image); image.onerror = () => reject(new Error('This image could not be read. Please try another file.')); image.src = url; });
}
export async function readFile(file: File): Promise<ImageItem> {
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) throw new Error(`${file.name}: please choose a JPG, PNG, or WebP image.`);
  if (file.size > MAX_FILE_SIZE) throw new Error(`${file.name}: this file is larger than 20 MB.`);
  const url = URL.createObjectURL(file);
  try { const image = await loadImage(url); if (image.width * image.height > 60_000_000) throw new Error('This image is too large to safely process. Please use an image under 60 megapixels.'); return { id: crypto.randomUUID(), file, url, width: image.width, height: image.height, status: 'ready' }; }
  catch (error) { URL.revokeObjectURL(url); throw error; }
}
export async function optimize(item: ImageItem, options: { quality: number; format: OutputFormat; width: number; height: number }): Promise<Result> {
  const { width, height, format, quality } = options;
  if (!Number.isInteger(width) || !Number.isInteger(height) || width < 1 || height < 1 || width > 16384 || height > 16384 || width * height > 40_000_000) throw new Error('Choose dimensions between 1 and 16,384 pixels, with a total below 40 megapixels.');
  const image = await loadImage(item.url);
  const canvas = document.createElement('canvas'); canvas.width = width; canvas.height = height;
  const context = canvas.getContext('2d'); if (!context) throw new Error('Your browser could not create an image canvas.');
  if (format === 'image/jpeg') { context.fillStyle = '#ffffff'; context.fillRect(0, 0, width, height); }
  context.imageSmoothingEnabled = true; context.imageSmoothingQuality = 'high'; context.drawImage(image, 0, 0, width, height);
  const blob = await new Promise<Blob>((resolve, reject) => canvas.toBlob(value => value ? resolve(value) : reject(new Error('Unable to encode this image. Try smaller dimensions.')), format, quality / 100));
  canvas.width = 0; canvas.height = 0;
  if (blob.type !== format) throw new Error('Your browser does not support this output format. Please choose PNG or JPEG.');
  return { blob, url: URL.createObjectURL(blob), width, height, quality, downloaded: false };
}
export async function demoFile(): Promise<File> {
  const canvas = document.createElement('canvas'); canvas.width = 1800; canvas.height = 1200;
  const c = canvas.getContext('2d')!;
  const sky = c.createLinearGradient(0, 0, 0, 1200); sky.addColorStop(0, '#b1a0d4'); sky.addColorStop(.55, '#f7c8af'); sky.addColorStop(1, '#746b9d'); c.fillStyle = sky; c.fillRect(0, 0, 1800, 1200);
  c.fillStyle = '#fff1d2'; c.beginPath(); c.arc(1260, 320, 86, 0, Math.PI * 2); c.fill();
  const mountain = (points: number[][], color: string) => { c.fillStyle = color; c.beginPath(); c.moveTo(0, 1200); points.forEach(([x,y]) => c.lineTo(x,y)); c.lineTo(1800,1200); c.fill(); };
  mountain([[0,690],[190,490],[360,640],[660,300],[960,690],[1200,470],[1550,730],[1800,440]], '#8b80ae');
  mountain([[0,780],[310,540],[680,830],[950,530],[1240,880],[1630,550],[1800,660]], '#645d8c');
  mountain([[0,890],[330,810],[630,970],[960,870],[1370,980],[1800,870]], '#444665');
  const lake = c.createLinearGradient(0, 960, 0, 1200); lake.addColorStop(0, '#b4a5be'); lake.addColorStop(1, '#73668f'); c.fillStyle = lake; c.fillRect(0, 980, 1800, 220);
  for (let i = 0; i < 80; i++) { c.fillStyle = `rgba(255,228,209,${.06 + (i % 4) * .03})`; c.fillRect((i * 137) % 1800, 980 + (i * 43) % 220, 40 + i * 2, 2); }
  const blob = await new Promise<Blob>(resolve => canvas.toBlob(b => resolve(b!), 'image/png'));
  return new File([blob], 'lavender-alpine.png', { type: 'image/png' });
}

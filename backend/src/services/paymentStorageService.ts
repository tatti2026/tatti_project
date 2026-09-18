import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Store uploads in backend/uploads/payments
const UPLOADS_DIR = path.resolve(__dirname, '../../uploads/payments');

// Ensure directory exists
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

export function getUploadsDir(): string {
  return UPLOADS_DIR;
}

export async function savePaymentScreenshot(
  paymentId: string,
  screenshotData: string
): Promise<{ filePath: string; screenshotUrl: string }> {
  let buffer: Buffer;
  let extension = 'png';

  if (screenshotData.startsWith('data:')) {
    const matches = screenshotData.match(/^data:image\/([a-zA-Z0-9+]+);base64,(.+)$/);
    if (matches && matches.length === 3) {
      extension = matches[1] === 'jpeg' ? 'jpg' : matches[1];
      buffer = Buffer.from(matches[2], 'base64');
    } else {
      const parts = screenshotData.split(';base64,');
      buffer = Buffer.from(parts[1] || screenshotData, 'base64');
    }
  } else {
    buffer = Buffer.from(screenshotData, 'base64');
  }

  const filename = `payment_${paymentId}_${Date.now()}.${extension}`;
  const filePath = path.join(UPLOADS_DIR, filename);

  await fs.promises.writeFile(filePath, buffer);

  // Return relative or API URL to retrieve the screenshot
  const screenshotUrl = `/api/payments/${paymentId}/screenshot`;

  return {
    filePath,
    screenshotUrl,
  };
}

export function findScreenshotFile(filePath: string): boolean {
  return fs.existsSync(filePath);
}

import { VercelRequest, VercelResponse } from '@vercel/node';

export default function handler(req: VercelRequest, res: VercelResponse) {
  // Return a simple health status
  res.status(200).json({ status: 'UP' });
} 
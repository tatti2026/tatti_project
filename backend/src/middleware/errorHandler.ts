import type { Request, Response, NextFunction } from 'express';

export function errorHandler(err: Error, req: Request, res: Response, _next: NextFunction) {
  console.error('[API Error]:', err.message);
  res.status(500).json({
    error: err.message || 'Internal Server Error',
    status: 500,
  });
}

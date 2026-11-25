import { Logger } from '@nestjs/common';
import type { NextFunction, Request, Response } from 'express';
import {
  REQUEST_ID_HEADER,
  resolveRequestId,
  runWithRequestId,
} from './request-context';

const accessLogger = new Logger('HTTP');

/**
 * Primer middleware de la API:
 * 1. Toma o genera el id de la petición y lo devuelve en X-Request-Id (el front puede mostrarlo
 *    al reportar un error, y con él se encuentra el detalle en el log).
 * 2. Corre el resto de la petición con ese id en contexto (lo ven el logger y el filtro de errores).
 * 3. Al terminar, deja una línea de acceso: método, ruta SIN query string (puede llevar tokens),
 *    estado y duración. Los chequeos de salud que salen bien no se loguean: son uno cada 30 s.
 */
export function requestIdMiddleware(options: { accessLog: boolean }) {
  return (req: Request, res: Response, next: NextFunction) => {
    const requestId = resolveRequestId(req.headers['x-request-id']);
    res.setHeader(REQUEST_ID_HEADER, requestId);
    const start = process.hrtime.bigint();
    runWithRequestId(requestId, () => {
      if (options.accessLog) {
        res.on('finish', () => {
          const path = req.originalUrl.split('?')[0];
          if (res.statusCode < 400 && path.startsWith('/health')) return;
          const ms = Number(process.hrtime.bigint() - start) / 1e6;
          accessLogger.log({
            msg: `${req.method} ${path} ${res.statusCode} ${ms.toFixed(0)} ms`,
            method: req.method,
            path,
            status: res.statusCode,
            ms: Math.round(ms),
          });
        });
      }
      next();
    });
  };
}

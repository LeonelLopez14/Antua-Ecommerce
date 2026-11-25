import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import type { Response } from 'express';
import { currentRequestId } from './request-context';

/** Errores de los middlewares de Express (body-parser, multer…): traen status y `expose`. */
interface ExpressHttpError {
  status?: number;
  statusCode?: number;
  expose?: boolean;
  type?: string;
}

/** Mensajes propios para los errores de Express: el original es técnico y en inglés. */
const EXPRESS_MESSAGES: Record<number, string> = {
  400: 'El cuerpo del pedido no es válido.',
  413: 'El pedido es demasiado grande.',
  415: 'Tipo de contenido no admitido.',
};

export const GENERIC_ERROR =
  'Ocurrió un error inesperado. Si se repite, escribinos con este código.';

/**
 * Filtro global: toda respuesta de error lleva `requestId` (el mismo de la cabecera X-Request-Id).
 *
 * - HttpException (validación, 401, 404, 409…): el cuerpo de siempre, que el front ya interpreta.
 * - Errores de Express con status 4xx (JSON roto, cuerpo grande): un mensaje propio, sin el texto
 *   técnico del parser.
 * - Cualquier otra cosa (un error de la base, un bug): 500 con un mensaje genérico. El detalle y el
 *   stack van SOLO al log, nunca a la respuesta: ni rutas internas ni mensajes de MySQL. Fuera de
 *   producción, la respuesta suma `detail` con el mensaje del error, para depurar.
 */
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger('Errores');

  constructor(private readonly production: boolean) {}

  catch(exception: unknown, host: ArgumentsHost) {
    const res = host.switchToHttp().getResponse<Response>();
    const requestId = currentRequestId();

    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const body = exception.getResponse();
      if (status >= 500) this.logger.error(exception);
      const payload =
        typeof body === 'string' ? { statusCode: status, message: body } : body;
      res.status(status).json({ ...payload, requestId });
      return;
    }

    const httpError = exception as ExpressHttpError | null;
    const status = httpError?.status ?? httpError?.statusCode;
    if (
      typeof status === 'number' &&
      status >= 400 &&
      status < 500 &&
      httpError?.expose !== false
    ) {
      res.status(status).json({
        statusCode: status,
        message: EXPRESS_MESSAGES[status] ?? 'Pedido no válido.',
        requestId,
      });
      return;
    }

    this.logger.error(exception);
    res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      message: GENERIC_ERROR,
      requestId,
      ...(!this.production && exception instanceof Error
        ? { detail: exception.message }
        : {}),
    });
  }
}

import { ConsoleLogger, LoggerService, LogLevel } from '@nestjs/common';
import { currentRequestId } from './request-context';
import { redact, redactText } from './redact';

type Level = Exclude<LogLevel, 'verbose'> | 'verbose';
type Write = (line: string, toStderr: boolean) => void;

const defaultWrite: Write = (line, toStderr) =>
  (toStderr ? process.stderr : process.stdout).write(`${line}\n`);

const looksLikeStack = (value: unknown): value is string =>
  typeof value === 'string' && /\n\s+at /.test(value);

/**
 * Logger de la API (main.ts lo instala con app.useLogger).
 *
 * - Producción (`json: true`): una línea JSON por evento, fácil de filtrar con `docker logs … | jq`:
 *   {"time","level","context","requestId","msg", …campos, "stack"?}.
 * - Desarrollo: el formato de siempre de Nest, con el id de la petición al final.
 *
 * Todo pasa por redact(): contraseñas, tokens, cabeceras de autorización y emails completos no
 * llegan nunca al log, aunque alguien loguee un objeto entero por descuido.
 */
export class AppLogger implements LoggerService {
  private readonly pretty = new ConsoleLogger();

  constructor(
    private readonly json: boolean,
    private readonly write: Write = defaultWrite,
  ) {}

  log(message: unknown, ...params: unknown[]) {
    this.emit('log', message, params);
  }
  error(message: unknown, ...params: unknown[]) {
    this.emit('error', message, params);
  }
  warn(message: unknown, ...params: unknown[]) {
    this.emit('warn', message, params);
  }
  debug(message: unknown, ...params: unknown[]) {
    this.emit('debug', message, params);
  }
  verbose(message: unknown, ...params: unknown[]) {
    this.emit('verbose', message, params);
  }
  fatal(message: unknown, ...params: unknown[]) {
    this.emit('fatal', message, params);
  }

  private emit(level: Level, message: unknown, params: unknown[]) {
    // Como ConsoleLogger: el último parámetro de texto es el contexto; en error, uno con
    // forma de stack es el stack.
    const rest = [...params];
    const context =
      typeof rest[rest.length - 1] === 'string' &&
      !looksLikeStack(rest[rest.length - 1])
        ? (rest.pop() as string)
        : undefined;
    let stack = rest.find(looksLikeStack);
    if (message instanceof Error) stack ??= message.stack;
    const requestId = currentRequestId();
    const clean = redact(message);

    if (!this.json) {
      const msg = (clean as { msg?: unknown } | null)?.msg;
      const text =
        typeof clean === 'string'
          ? clean
          : typeof msg === 'string'
            ? msg
            : JSON.stringify(clean);
      const line = requestId ? `${text} [${requestId}]` : text;
      const args: unknown[] = [line];
      if (level === 'error' && stack) args.push(redactText(stack));
      if (context) args.push(context);
      (this.pretty[level] as (...a: unknown[]) => void).apply(
        this.pretty,
        args,
      );
      return;
    }

    const fields =
      clean !== null && typeof clean === 'object' && !Array.isArray(clean)
        ? (clean as Record<string, unknown>)
        : { msg: clean };
    const entry = {
      time: new Date().toISOString(),
      level,
      ...(context ? { context } : {}),
      ...(requestId ? { requestId } : {}),
      ...fields,
      ...(stack ? { stack: redactText(stack) } : {}),
    };
    this.write(JSON.stringify(entry), level === 'error' || level === 'fatal');
  }
}

/** JSON en producción, o si se pide con LOG_FORMAT=json (por ejemplo, para probarlo en desarrollo). */
export function createAppLogger(env: NodeJS.ProcessEnv = process.env) {
  return new AppLogger(
    env.NODE_ENV === 'production' || env.LOG_FORMAT === 'json',
  );
}

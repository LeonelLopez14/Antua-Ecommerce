import { WebhookSignatureValidator } from 'mercadopago';

interface SignatureInput {
  signature: string | undefined;
  requestId: string | undefined;
  dataId: string | undefined;
  secret: string;
}

/**
 * Verifica la firma con el validador del SDK oficial. No se usa la tolerancia de tiempo: la
 * unidad de `ts` no está clara en la documentación, y repetir un aviso no tiene efecto (es idempotente).
 */
export function isValidWebhookSignature({
  signature,
  requestId,
  dataId,
  secret,
}: SignatureInput): boolean {
  try {
    WebhookSignatureValidator.validate({
      xSignature: signature,
      xRequestId: requestId,
      dataId,
      secret,
    });
    return true;
  } catch {
    return false;
  }
}

import { createHmac } from 'node:crypto';
import { isValidWebhookSignature } from './webhook-signature';

const SECRET = 'secreto';
const DATA_ID = '123456';
const REQUEST_ID = 'req-1';
const TS = '1704908010';

const sign = (secret: string, dataId = DATA_ID) =>
  createHmac('sha256', secret)
    .update(`id:${dataId};request-id:${REQUEST_ID};ts:${TS};`)
    .digest('hex');

const check = (signature: string | undefined, dataId = DATA_ID) =>
  isValidWebhookSignature({
    signature,
    requestId: REQUEST_ID,
    dataId,
    secret: SECRET,
  });

describe('firma del webhook', () => {
  it('acepta una firma correcta', () => {
    expect(check(`ts=${TS},v1=${sign(SECRET)}`)).toBe(true);
  });

  it('rechaza otra clave, un id cambiado, un formato roto o la falta de firma', () => {
    expect(check(`ts=${TS},v1=${sign('otra-clave')}`)).toBe(false);
    expect(check(`ts=${TS},v1=${sign(SECRET)}`, '999')).toBe(false);
    expect(check('cualquier-cosa')).toBe(false);
    expect(check(undefined)).toBe(false);
  });
});

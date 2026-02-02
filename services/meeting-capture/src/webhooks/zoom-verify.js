import crypto from 'crypto';

export function verifyZoomWebhook(req, secret) {
  const signature = req.get('x-zm-signature');
  const timestamp = req.get('x-zm-request-timestamp');

  if (!signature || !timestamp) return false;

  const rawBody = req.rawBody || JSON.stringify(req.body);
  const message = `v0:${timestamp}:${rawBody}`;
  const hash = crypto.createHmac('sha256', secret).update(message).digest('hex');
  const expected = `v0=${hash}`;
  return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature));
}

export function buildZoomChallengeResponse(payload, secret) {
  const message = payload?.payload?.plainToken;
  if (!message) return null;
  const hash = crypto.createHmac('sha256', secret).update(message).digest('hex');
  return {
    plainToken: message,
    encryptedToken: hash,
  };
}

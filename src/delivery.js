/**
 * Channel transports. Each returns { ok } or { ok:false, permanent, error }; permanent failures are not retried.
 * Without credentials a channel either logs (development / explicitly allowed pilots) or reports itself unavailable.
 */
export async function createTransports(delivery, { testing = false } = {}) {
  const sent = [];
  const log = channel => async message => {
    sent.push({ channel, ...message });
    if (!testing)
      console.log(
        JSON.stringify({
          delivery: channel,
          to: mask(message.destination),
          subject: message.subject,
          body: message.body,
        }),
      );
    return { ok: true };
  };
  let email = delivery.allowLog || testing ? log('email') : null;
  if (delivery.smtpUrl && !testing) {
    const { createTransport } = await import('nodemailer');
    const smtp = createTransport({
      url: delivery.smtpUrl,
      connectionTimeout: 15000,
      greetingTimeout: 15000,
      socketTimeout: 30000,
    });
    email = async m => {
      try {
        await smtp.sendMail({ from: delivery.from, to: m.destination, subject: m.subject, text: m.body });
        return { ok: true };
      } catch (e) {
        return {
          ok: false,
          permanent: e.responseCode >= 500 && e.responseCode < 600 && e.responseCode !== 552,
          error: e.message,
        };
      }
    };
  }
  let sms = delivery.allowLog || testing ? log('sms') : null;
  if (delivery.sms?.provider === 'twilio' && !testing) {
    const { accountSid, authToken, from } = delivery.sms;
    sms = async m => {
      const response = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`, {
        method: 'POST',
        headers: { Authorization: `Basic ${Buffer.from(`${accountSid}:${authToken}`).toString('base64')}` },
        body: new URLSearchParams({ To: m.destination, From: from, Body: m.body }),
        signal: AbortSignal.timeout(15000),
      }).catch(e => ({ ok: false, status: 0, error: e }));
      if (response.ok) return { ok: true };
      return {
        ok: false,
        permanent: response.status >= 400 && response.status < 500 && response.status !== 429,
        error: `Twilio HTTP ${response.status}`,
      };
    };
  }
  const push = testing
    ? log('push')
    : async m => {
        const response = await fetch('https://exp.host/--/api/v2/push/send', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Accept: 'application/json',
            ...(delivery.expoAccessToken ? { Authorization: `Bearer ${delivery.expoAccessToken}` } : {}),
          },
          body: JSON.stringify({
            to: m.destination,
            title: m.subject,
            body: m.body,
            data: m.data,
            sound: 'default',
          }),
          signal: AbortSignal.timeout(15000),
        }).catch(() => null);
        if (!response) return { ok: false, permanent: false, error: 'Push service unreachable' };
        const ticket = (await response.json().catch(() => null))?.data;
        if (response.ok && ticket?.status === 'ok') return { ok: true };
        const reason = ticket?.details?.error ?? `HTTP ${response.status}`;
        return {
          ok: false,
          permanent: reason === 'DeviceNotRegistered' || reason === 'InvalidCredentials',
          unregister: reason === 'DeviceNotRegistered',
          error: reason,
        };
      };
  return { email, sms, push, sent };
}
const mask = value =>
  value.includes('@') ? value.replace(/^(.).*(@.*)$/, '$1***$2') : value.replace(/.(?=.{3})/g, '*');

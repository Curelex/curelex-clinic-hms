import axios from 'axios';

export async function verifyTurnstile(token, remoteIp) {
  if (!token) {
    return { success: false, error: 'missing-token' };
  }
  try {
    const params = new URLSearchParams();
    params.append('secret', process.env.TURNSTILE_SECRET_KEY);
    params.append('response', token);
    if (remoteIp) params.append('remoteip', remoteIp);

    const { data } = await axios.post(
      'https://challenges.cloudflare.com/turnstile/v0/siteverify',
      params
    );

    return data; // { success: true/false, ... }
  } catch (err) {
    console.error('Turnstile verification request failed:', err.message);
    return { success: false, error: 'verification-request-failed' };
  }
}

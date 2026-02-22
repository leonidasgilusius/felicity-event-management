export async function verifyCaptcha(req, res, next) {
  try {

    const captchaToken = req.body?.captchaToken;
    if (!captchaToken || typeof captchaToken !== 'string') {
      return res.status(400).json({ message: 'CAPTCHA token is required.' });
    }

    const secret = process.env.CAPTCHA_SECRET_KEY;
    if (!secret) {
        console.log('CAPTCHA_SECRET_KEY is missing')
        return res.status(500).json({ message: 'Something went wrong' });
    }
    
    const verifyUrl = 'https://www.google.com/recaptcha/api/siteverify'

    const body = new URLSearchParams();
    body.append('secret', secret);
    body.append('response', captchaToken);
    if (req.ip) body.append('remoteip', req.ip);

    const response = await fetch(verifyUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body,
    });

    if (!response.ok) {
      return res.status(502).json({ message: 'Failed to verify CAPTCHA.' });
    }

    const result = await response.json();
    if (!result.success) {
      return res.status(403).json({ message: 'CAPTCHA verification failed.' });
    }

    return next();
  } catch (error) {
    console.error('[verifyCaptcha]', error);
    return res.status(500).json({ message: 'Server error while verifying CAPTCHA.' });
  }
}

import tls from 'tls';

const DEFAULT_SMTP_PORT = 465;
const DEFAULT_SMTP_CONNECT_TIMEOUT_MS = 10_000;
const DEFAULT_SMTP_RESPONSE_TIMEOUT_MS = 10_000;

const getBoolEnv = (value: string | undefined, defaultValue: boolean) => {
  if (value === undefined) {
    return defaultValue;
  }

  return value === 'true' || value === '1';
};

const readResponse = (socket: tls.TLSSocket): Promise<string> => {
  return new Promise((resolve, reject) => {
    let buffer = '';
    const responseTimeoutMs = Number(
      process.env.SMTP_RESPONSE_TIMEOUT_MS ?? DEFAULT_SMTP_RESPONSE_TIMEOUT_MS
    );
    const responseTimeout = setTimeout(() => {
      cleanup();
      reject(new Error(`SMTP response timeout after ${responseTimeoutMs}ms`));
    }, responseTimeoutMs);

    const onData = (chunk: Buffer) => {
      buffer += chunk.toString('utf8');

      const lines = buffer.split('\r\n').filter(Boolean);
      if (lines.length === 0) {
        return;
      }

      const lastLine = lines[lines.length - 1];
      if (/^\d{3} /.test(lastLine)) {
        cleanup();
        resolve(buffer);
      }
    };

    const onError = (error: Error) => {
      cleanup();
      reject(error);
    };

    const cleanup = () => {
      clearTimeout(responseTimeout);
      socket.off('data', onData);
      socket.off('error', onError);
    };

    socket.on('data', onData);
    socket.on('error', onError);
  });
};

const writeCommand = async (
  socket: tls.TLSSocket,
  command: string,
  expectedCodes: string[]
) => {
  socket.write(`${command}\r\n`);
  const response = await readResponse(socket);

  const isExpected = expectedCodes.some((code) => response.startsWith(code));
  if (!isExpected) {
    throw new Error(`SMTP command failed for "${command}": ${response}`);
  }

  return response;
};

const sendUsingSmtp = async (email: string, otp: string) => {
  const smtpHost = process.env.SMTP_HOST;
  const smtpPort = Number(process.env.SMTP_PORT ?? DEFAULT_SMTP_PORT);
  const smtpUser = process.env.SMTP_USER;
  const smtpPass = process.env.SMTP_PASS;
  const mailFrom = process.env.MAIL_FROM;
  const smtpSecure = getBoolEnv(process.env.SMTP_SECURE, true);
  const smtpConnectTimeoutMs = Number(
    process.env.SMTP_CONNECT_TIMEOUT_MS ?? DEFAULT_SMTP_CONNECT_TIMEOUT_MS
  );

  if (!smtpHost || !smtpUser || !smtpPass || !mailFrom) {
    throw new Error('SMTP is not fully configured. Missing SMTP_HOST/SMTP_USER/SMTP_PASS/MAIL_FROM');
  }

  const subject = 'Verify your email - Planner OTP';
  const textBody = `Your OTP is ${otp}. It will expire in 10 minutes.`;
  const htmlBody = `<p>Your OTP is <strong>${otp}</strong>.</p><p>It will expire in 10 minutes.</p>`;

  const socket = tls.connect({
    host: smtpHost,
    port: smtpPort,
    rejectUnauthorized: true,
    servername: smtpHost,
    timeout: smtpConnectTimeoutMs,
  });

  await new Promise<void>((resolve, reject) => {
    const onTimeout = () => {
      cleanup();
      socket.destroy(new Error(`SMTP connect timeout after ${smtpConnectTimeoutMs}ms`));
    };

    const onSecureConnect = () => {
      cleanup();
      resolve();
    };

    const onError = (error: Error) => {
      cleanup();
      reject(error);
    };

    const cleanup = () => {
      socket.off('timeout', onTimeout);
      socket.off('secureConnect', onSecureConnect);
      socket.off('error', onError);
    };

    socket.once('timeout', onTimeout);
    socket.once('secureConnect', onSecureConnect);
    socket.once('error', onError);
  });

  try {
    const greeting = await readResponse(socket);
    if (!greeting.startsWith('220')) {
      throw new Error(`SMTP greeting failed: ${greeting}`);
    }

    await writeCommand(socket, `EHLO ${process.env.SMTP_CLIENT_NAME ?? 'planner-backend'}`, ['250']);

    await writeCommand(socket, 'AUTH LOGIN', ['334']);
    await writeCommand(socket, Buffer.from(smtpUser).toString('base64'), ['334']);
    await writeCommand(socket, Buffer.from(smtpPass).toString('base64'), ['235']);

    await writeCommand(socket, `MAIL FROM:<${mailFrom}>`, ['250']);
    await writeCommand(socket, `RCPT TO:<${email}>`, ['250', '251']);
    await writeCommand(socket, 'DATA', ['354']);

    const data = [
      `From: Planner <${mailFrom}>`,
      `To: <${email}>`,
      `Subject: ${subject}`,
      'MIME-Version: 1.0',
      'Content-Type: text/html; charset=UTF-8',
      '',
      htmlBody,
      '',
      textBody,
    ].join('\r\n');

    socket.write(`${data}\r\n.\r\n`);
    const dataResponse = await readResponse(socket);
    if (!dataResponse.startsWith('250')) {
      throw new Error(`SMTP DATA failed: ${dataResponse}`);
    }

    await writeCommand(socket, 'QUIT', ['221']);
  } finally {
    socket.end();
  }

  if (!smtpSecure) {
    console.warn('SMTP_SECURE is disabled, but this sender currently expects SMTPS (port 465).');
  }
};

export const sendOtpEmail = async (email: string, otp: string) => {
  const provider = process.env.MAIL_PROVIDER ?? 'log';
  const fallbackToLogOnError = getBoolEnv(
    process.env.MAIL_FALLBACK_TO_LOG_ON_ERROR,
    process.env.NODE_ENV !== 'production'
  );

  if (provider === 'log') {
    console.log(`📧 OTP for ${email}: ${otp}`);
    return { delivered: false, mode: 'log' as const };
  }

  if (provider !== 'smtp') {
    throw new Error(`Unsupported MAIL_PROVIDER: ${provider}`);
  }

  try {
    await sendUsingSmtp(email, otp);
    return { delivered: true, mode: 'smtp' as const };
  } catch (error) {
    if (!fallbackToLogOnError) {
      throw error;
    }

    console.error('SMTP send failed, falling back to log mode:', error);
    console.log(`📧 OTP for ${email}: ${otp}`);
    return { delivered: false, mode: 'log' as const };
  }
};

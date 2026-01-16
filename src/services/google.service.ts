import { OAuth2Client } from 'google-auth-library';

const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

export interface GoogleUserPayload {
  email: string;
  name: string;
}

export const verifyGoogleToken = async (
  idToken: string
): Promise<GoogleUserPayload | null> => {
  try {
    const ticket = await client.verifyIdToken({
      idToken,
      audience: process.env.GOOGLE_CLIENT_ID,
    });

    const payload = ticket.getPayload();
    if (!payload || !payload.email || !payload.name) {
      return null;
    }

    return {
      email: payload.email,
      name: payload.name,
    };
  } catch (error) {
    console.error('Google token verification failed', error);
    return null;
  }
};

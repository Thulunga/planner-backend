import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { User } from '../models/user.model';
import { Otp } from '../models/otp.model';
import { generateAccessToken } from '../config/jwt';
import { verifyGoogleToken } from '../services/google.service';

export const register = async (req: Request, res: Response) => {
  try {
    const { name, email, password, phone } = req.body;

    // 1. Basic validation
    if (!name || !email || !password) {
      return res.status(400).json({
        message: 'Name, email and password are required',
      });
    }

    // 2. Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(409).json({
        message: 'Email already registered',
      });
    }

    // 3. Hash password
    const passwordHash = await bcrypt.hash(password, 10);

    // 4. Create user (email not verified yet)
    await User.create({
      name,
      email,
      phone: phone || null,
      passwordHash,
      authProvider: 'local',
      emailVerified: false,
    });

    // 5. Generate OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    // 6. Store OTP (valid for 10 minutes)
    await Otp.create({
      email,
      otp,
      expiresAt: new Date(Date.now() + 10 * 60 * 1000),
    });

    // 7. TEMP: log OTP (email service comes next)
    console.log(`📧 OTP for ${email}: ${otp}`);

    return res.status(201).json({
      message: 'Registration successful. OTP sent to email.',
    });
  } catch (error) {
    console.error('Register error:', error);
    return res.status(500).json({
      message: 'Something went wrong',
    });
  }
};

export const verifyEmailOtp = async (req: Request, res: Response) => {
  try {
    const { email, otp } = req.body;

    // 1. Validate input
    if (!email || !otp) {
      return res.status(400).json({
        message: 'Email and OTP are required',
      });
    }

    // 2. Find OTP record
    const otpRecord = await Otp.findOne({ email, otp });

    if (!otpRecord) {
      return res.status(400).json({
        message: 'Invalid OTP',
      });
    }

    // 3. Check expiry
    if (otpRecord.expiresAt < new Date()) {
      await Otp.deleteMany({ email });
      return res.status(400).json({
        message: 'OTP expired. Please register again.',
      });
    }

    // 4. Verify user email
    const user = await User.findOne({ email });

    if (!user) {
      return res.status(404).json({
        message: 'User not found',
      });
    }

    if (user.emailVerified) {
      return res.status(400).json({
        message: 'Email already verified',
      });
    }

    user.emailVerified = true;
    await user.save();

    // 5. Cleanup OTPs
    await Otp.deleteMany({ email });

    return res.status(200).json({
      message: 'Email verified successfully',
    });
  } catch (error) {
    console.error('Verify email error:', error);
    return res.status(500).json({
      message: 'Something went wrong',
    });
  }
};

export const resendEmailOtp = async (req: Request, res: Response) => {
  try {
    const { email } = req.body;

    // 1. Validate input
    if (!email) {
      return res.status(400).json({
        message: 'Email is required',
      });
    }

    // 2. Check user
    const user = await User.findOne({ email });

    if (!user) {
      return res.status(404).json({
        message: 'User not found',
      });
    }

    if (user.emailVerified) {
      return res.status(400).json({
        message: 'Email already verified',
      });
    }

    // 3. Cooldown check (latest OTP)
    const lastOtp = await Otp.findOne({ email }).sort({ createdAt: -1 });

    if (lastOtp) {
      const secondsSinceLastOtp =
        (Date.now() - lastOtp.createdAt.getTime()) / 1000;

      if (secondsSinceLastOtp < 60) {
        return res.status(429).json({
          message: `Please wait ${Math.ceil(
            60 - secondsSinceLastOtp
          )} seconds before requesting a new OTP`,
        });
      }
    }

    // 4. Delete old OTPs
    await Otp.deleteMany({ email });

    // 5. Generate new OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    // 6. Store OTP (10 min expiry)
    await Otp.create({
      email,
      otp,
      expiresAt: new Date(Date.now() + 10 * 60 * 1000),
    });

    // 7. TEMP: log OTP
    console.log(`📧 RESEND OTP for ${email}: ${otp}`);

    return res.status(200).json({
      message: 'OTP resent successfully',
    });
  } catch (error) {
    console.error('Resend OTP error:', error);
    return res.status(500).json({
      message: 'Something went wrong',
    });
  }
};

export const login = async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    // 1. Validate input
    if (!email || !password) {
      return res.status(400).json({
        message: 'Email and password are required',
      });
    }

    // 2. Find user
    const user = await User.findOne({ email });

    if (!user) {
      return res.status(401).json({
        message: 'Invalid email or password',
      });
    }

    // 3. Prevent password login for Google users
    if (user.authProvider === 'google') {
      return res.status(400).json({
        message: 'Please login using Google',
      });
    }

    if (!user.passwordHash) {
      return res.status(401).json({
        message: 'Invalid email or password',
      });
    }

    // 4. Compare password
    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      return res.status(401).json({
        message: 'Invalid email or password',
      });
    }

    // 5. Check email verification
    if (!user.emailVerified) {
      return res.status(403).json({
        message: 'Email not verified',
      });
    }

    // 6. Generate JWT
    const token = generateAccessToken(user.id);

    // 7. Respond
    return res.status(200).json({
      message: 'Login successful',
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone,
      },
    });
  } catch (error) {
    console.error('Login error:', error);
    return res.status(500).json({
      message: 'Something went wrong',
    });
  }
};

export const googleLogin = async (req: Request, res: Response) => {
  try {
    const { idToken } = req.body;

    if (!idToken) {
      return res.status(400).json({
        message: 'Google ID token is required',
      });
    }

    // 1. Verify token with Google
    const googleUser = await verifyGoogleToken(idToken);
    if (!googleUser) {
      return res.status(401).json({
        message: 'Invalid Google token',
      });
    }

    const { email, name } = googleUser;

    // 2. Find existing user
    let user = await User.findOne({ email });

    // 3. Create user if not exists
    if (!user) {
      user = await User.create({
        name,
        email,
        authProvider: 'google',
        emailVerified: true,
        passwordHash: null,
      });
    }

    // 4. Generate JWT
    const token = generateAccessToken(user.id);

    return res.status(200).json({
      message: 'Login successful',
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone,
      },
    });
  } catch (error) {
    console.error('Google login error:', error);
    return res.status(500).json({
      message: 'Something went wrong',
    });
  }
};

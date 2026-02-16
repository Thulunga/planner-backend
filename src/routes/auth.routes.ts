import { Router } from 'express';
import { getAuthMe, googleLogin, login, register, resendEmailOtp, verifyEmailOtp } from '../controllers/auth.controller';
import { authMiddleware } from '../middlewares/auth.middleware';

const router = Router();

router.post('/register', register);
router.post('/verify-email', verifyEmailOtp);
router.post('/resend-email-otp', resendEmailOtp);
router.post('/login', login);
router.post('/google', googleLogin);
router.get('/me', authMiddleware, getAuthMe);

export default router;

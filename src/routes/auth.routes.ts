import { Router } from 'express';
import { googleLogin, login, register, resendEmailOtp, verifyEmailOtp } from '../controllers/auth.controller';

const router = Router();

router.post('/register', register);
router.post('/verify-email', verifyEmailOtp);
router.post('/resend-email-otp', resendEmailOtp);
router.post('/login', login);
router.post('/google', googleLogin);

export default router;

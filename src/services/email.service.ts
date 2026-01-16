export const sendOtpEmail = async (email: string, otp: string) => {
  console.log(`OTP for ${email}: ${otp}`);
  // Later: Nodemailer / SES / SendGrid
};

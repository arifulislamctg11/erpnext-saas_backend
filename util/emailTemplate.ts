

export const getOtpEmailTemplate = (otp: any) => {
    const subject = 'ERP Next: Password Reset Request'
    const email_Body = `<h1>Reset Password</h1>
    <h2>Hello,</h2>
    <p>We have received your reset password request!</p>
    <p></p>
    <p>Here is your Reset Password OTP</p>
    <p></p>
    <p>Your temporary password: ${otp}</p>
    <p>If you did not request for a password reset, you can safely ignore this email. Only a person with access to your email can reset your account password.</p>
    </div>`
    const emailTemplate = {
        subject,
        email_Body
    }
    return emailTemplate
}
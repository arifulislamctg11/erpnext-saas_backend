
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


export const subscriptionEmailTemp = (subObj: any) => {
    const subject = 'Your Subscription is Confirmed'
    const email_Body = `<h2>Dear Customer</h2>
    <h4>Thank you for subscribing to ${subObj?.planName}</h4>
    <p></p>
    <p>Subscription Details:</p>
    <p>Price: ${subObj?.amount}</p>
    <p>Plan Name: ${subObj?.planName}</p>
    <p>Activate Date: ${subObj?.currentPeriodStart}</p>
    <p>Expire Date: ${subObj?.currentPeriodEnd}</p>
    <p></p>
    </div>`
    const emailTemplate = {
        subject,
        email_Body
    }
    return emailTemplate
}
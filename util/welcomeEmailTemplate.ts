export const getWelcomeEmailTemplate = (firstName: string, companyName: string, email:any) => {
    const subject = 'Welcome to ERP Next SaaS Platform'
    const email_Body = `<h1>Welcome to ERP Next SaaS!</h1>
    <h2>Hello ${firstName},</h2>
    <p>Welcome to our ERP Next SaaS platform! We're excited to have you and <strong>${companyName}</strong> on board.</p>
    <p></p>
    <p>Your account has been successfully created and you can now:</p>
    <p>  Your username ${email} is This is your temporary password : <b>My$ecureP@ssw0rd </b> <p>
    
   
    <p></p>
    <p>If you have any questions or need assistance getting started, please don't hesitate to reach out to our support team.</p>
    <p></p>
    <p>Thank you for choosing our platform!</p>
    <p></p>
    <p>Best regards,<br>The ERP Next SaaS Team</p>
    </div>`
    const emailTemplate = {
        subject,
        email_Body
    }
    return emailTemplate
}

export const getWelcomeEmailTemplate2 = (firstName: string, companyName: string, email: any) => {
    const subject = 'Welcome to ERP Next SaaS Platform';
    const email_Body = `
    <h1>Welcome to ERP Next SaaS!</h1>
    <h2>Hello ${firstName},</h2>
    <p>Welcome to our ERP Next SaaS platform! We're excited to have you and <strong>${companyName}</strong> on board.</p>
    <p>Your account has been successfully created.</p>    
    <p>
      <a href="https://innovatun-4d675.web.app/login" 
         style="display: inline-block; padding: 12px 24px; font-size: 16px; color: #ffffff; background-color: #007bff; text-decoration: none; border-radius: 4px;">
         Get Started
      </a>
    </p>
    <!-- Button End -->

    <p>If you have any questions or need assistance getting started, please don't hesitate to reach out to our support team.</p>
    <p>Thank you for choosing our platform!</p>
    <p>Best regards,<br>The ERP Next SaaS Team</p>`;

    const emailTemplate = {
        subject,
        email_Body
    };
    return emailTemplate;
};


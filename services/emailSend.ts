import dotenv from "dotenv";
import nodemailer, { type TransportOptions } from 'nodemailer'
dotenv.config();

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: process.env.SMTP_PORT,
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_APP_PASS,
  },
} as TransportOptions);

export async function sendEmail(to: any, subject: any, html: any) {
  try{
   
    const info = await transporter.sendMail({
      from: process.env.EMAIL_FROM,
      to,
      subject,
      html,
    });
    
    return true;

  } catch (e) {
    console.log("email send error ===>", e);
    return { status: "error"};
  }
}


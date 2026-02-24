import dotenv from 'dotenv'

dotenv.config()

import nodemailer from 'nodemailer';



const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.SMTP_PORT || '587', 10),
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

transporter.verify(function(error, success) {
    if (error) {
        console.log('SMTP connection failed:', error);
    } else {
        console.log('SMTP connection successful!');
    }
});

async function sendmail() {
    await transporter.sendMail( {
    from: `<${process.env.SMTP_USER}>`,

    to: 'leongiluk@gmail.com',

    subject: `hey`,

    html: '<p>hello world</p>'

  })
}

sendmail()
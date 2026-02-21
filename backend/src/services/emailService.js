import nodemailer from 'nodemailer';
import QRCode from 'qrcode';

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.SMTP_PORT || '587', 10),
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});


export async function sendTicketEmail({ toEmail, participantName, eventTitle, ticketId, startDate, location }) {
  
  const qrDataUrl = await QRCode.toDataURL(ticketId, { width: 200 });
  
  const qrBase64 = qrDataUrl.split(',')[1];

  const formattedDate = startDate
    ? new Date(startDate).toLocaleString('en-IN', { dateStyle: 'full', timeStyle: 'short' })
    : 'TBA';

  const payload = `
    <div style="max-width:480px;border:1px solid #eee;border-radius:12px;padding:32px">
      <h2 style="color:#667eea">Felicity</h2>
      <h3>You're registered for <em>${eventTitle}</em>!</h3>

      <p>Hi ${participantName},</p>
      <p>Here is your ticket. Present the QR code at the entrance.</p>

      <table style="margin:16px 0">
        <tr><td><strong>Ticket ID:</strong></td><td>${ticketId}</td></tr>
        <tr><td><strong>Event:</strong></td><td>${eventTitle}</td></tr>
        <tr><td><strong>Date:</strong></td><td>${formattedDate}</td></tr>
        ${location ? `<tr><td><strong>Venue:</strong></td><td>${location}</td></tr>` : ''}
      </table>

      <img src="cid:qrcode" alt="QR Code" style="width:180px;height:180px" />
      
      <p style="color:#999;font-size:12px;margin-top:24px">This is an automated email from Felicity Event Management website.</p>
    </div>
  `

  const mailOptions = {
    from: `"Felicity Events" <${process.env.SMTP_USER}>`,

    to: toEmail,

    subject: `Your ticket for ${eventTitle}`,

    html: payload,

    attachments: [{
      filename: 'ticket-qr.png',
      content: qrBase64,
      encoding: 'base64',
      cid: 'qrcode',
    }]

  }

  await transporter.sendMail( mailOptions );
}


export async function sendMerchandiseEmail({ toEmail, participantName, eventTitle, ticketId, totalPrice }) {
  const qrDataUrl = await QRCode.toDataURL(ticketId, { width: 200 });
  const qrBase64 = qrDataUrl.split(',')[1];

  const payload = `
    <div style="max-width:480px;border:1px solid #eee;border-radius:12px;padding:32px">
      <h2 style="color: #667eea">Felicity</h2>
      <h3>Order confirmed for <em>${eventTitle}</em></h3>
      <p>Hi ${participantName},</p>
      <p>Your purchase is confirmed. Show this QR code when collecting your item.</p>
      <table style="margin:16px 0">
        <tr><td><strong>Order ID:</strong></td><td>${ticketId}</td></tr>
        <tr><td><strong>Item:</strong></td><td>${eventTitle}</td></tr>
        ${totalPrice != null ? `<tr><td><strong>Total:</strong></td><td>₹${totalPrice}</td></tr>` : ''}
      </table>
      <img src="cid:qrcode" alt="QR Code" style="width:180px;height:180px" />
      <p style="color: #999;font-size:12px;margin-top:24px">This is an automated email from Felicity Event Management.</p>
    </div>
  `

  const mailOptions = {
    from: `"Felicity Events" <${process.env.SMTP_USER}>`,
    to: toEmail,
    subject: `Order confirmed — ${eventTitle}`,
    html: payload,
    attachments: [{
      filename: 'order-qr.png',
      content: qrBase64,
      encoding: 'base64',
      cid: 'qrcode',
    }],
  }

  await transporter.sendMail(mailOptions);
}

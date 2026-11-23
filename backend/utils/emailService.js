const nodemailer = require('nodemailer');

// Create transporter from environment variables
const createTransporter = () => {
  const port = parseInt(process.env.SMTP_PORT || '587');
  const config = {
    host: process.env.SMTP_HOST,
    port: port,
    secure: process.env.SMTP_SECURE === 'true', // true for 465, false for other ports
  };

  // For port 25 (standard SMTP), disable TLS completely
  if (port === 25) {
    config.secure = false;
    config.requireTLS = false;
    config.ignoreTLS = true;
  }

  // For localhost connections, disable TLS verification
  if (config.host === 'localhost' || config.host === '127.0.0.1') {
    config.tls = {
      rejectUnauthorized: false
    };
  }

  // Only add auth if user and pass are provided
  if (process.env.SMTP_USER && process.env.SMTP_PASS) {
    config.auth = {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    };
  }

  return nodemailer.createTransport(config);
};

// Escape HTML to prevent XSS
function escapeHtml(text) {
  if (!text) return '';
  const map = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;'
  };
  return text.toString().replace(/[&<>"']/g, m => map[m]);
}

// Wigilia 2026 (24 grudnia 2026)
const EVENT_LABEL = 'Wigilia 2026';
const EVENT_DATE = new Date('2026-12-24T18:00:00+01:00');

// Ile dni do Wigilii (null gdy juz po terminie)
const daysToEvent = (now = new Date()) => {
  const diff = Math.ceil((EVENT_DATE.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  return diff > 0 ? diff : null;
};

const pluralDays = (n) => (n === 1 ? 'dzień' : 'dni');

// Szablon maila: tabele + style inline (Gmail/Outlook ignoruja wiekszosc CSS z <style>)
const createEmailTemplate = (person, assignedPerson, baseUrl) => {
  const personLink = `${baseUrl}/person/${person.linkId}`;
  const safePersonName = escapeHtml(person.name);
  const safeLink = escapeHtml(personLink);
  const days = daysToEvent();
  const countdown = days
    ? `<p style="margin:0 0 6px;font-size:13px;letter-spacing:2px;text-transform:uppercase;color:#f4c95d;">Do Wigilii zostało ${days} ${pluralDays(days)}</p>`
    : '';

  return `<!DOCTYPE html>
<html lang="pl">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="color-scheme" content="light">
  <title>${EVENT_LABEL} - Mikołajki</title>
</head>
<body style="margin:0;padding:0;background-color:#0c2218;font-family:'Segoe UI',Helvetica,Arial,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#0c2218;">
    <tr>
      <td align="center" style="padding:28px 12px;">
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="width:100%;max-width:600px;">

          <!-- Nagłówek -->
          <tr>
            <td align="center" style="background-color:#7d0c20;background-image:linear-gradient(135deg,#b3122f 0%,#7d0c20 100%);border-radius:20px 20px 0 0;padding:34px 24px 26px;">
              ${countdown}
              <h1 style="margin:0;font-family:Georgia,'Times New Roman',serif;font-size:32px;line-height:1.2;color:#fff6e5;">🎄 ${EVENT_LABEL} 🎄</h1>
              <p style="margin:10px 0 0;font-size:15px;color:#ffe9b8;">Mikołajkowe losowanie prezentów</p>
            </td>
          </tr>

          <!-- Złota listwa -->
          <tr><td style="height:4px;line-height:4px;font-size:0;background-color:#f4c95d;background-image:linear-gradient(90deg,#d9a521,#fff1c1,#d9a521);">&nbsp;</td></tr>

          <!-- Treść -->
          <tr>
            <td style="background-color:#fff6e5;padding:32px 30px 10px;color:#2a2a2a;font-size:16px;line-height:1.6;">
              <p style="margin:0 0 14px;font-size:18px;">Ho, ho, ho! Cześć <strong>${safePersonName}</strong> 🎅</p>
              <p style="margin:0 0 14px;">Losowanie zostało zakończone. Twoja wylosowana osoba już na Ciebie czeka, ale to <strong>tajemnica</strong> – zobaczysz ją tylko pod swoim osobistym linkiem.</p>
              <p style="margin:0;">Zajrzyj też, co ta osoba chciałaby znaleźć pod choinką. 🎁</p>
            </td>
          </tr>

          <!-- Przycisk -->
          <tr>
            <td align="center" style="background-color:#fff6e5;padding:22px 30px 10px;">
              <table role="presentation" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td align="center" bgcolor="#b3122f" style="border-radius:999px;background-color:#b3122f;">
                    <a href="${safeLink}" target="_blank" style="display:inline-block;padding:15px 36px;font-size:16px;font-weight:bold;color:#ffffff;text-decoration:none;border-radius:999px;border:2px solid #f4c95d;">Zobacz swoje losowanie 🎁</a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Link tekstowy -->
          <tr>
            <td style="background-color:#fff6e5;padding:14px 30px 30px;color:#6b6b6b;font-size:12px;line-height:1.5;text-align:center;word-break:break-all;">
              Przycisk nie działa? Skopiuj ten link do przeglądarki:<br>
              <a href="${safeLink}" style="color:#1f6b4a;">${safeLink}</a>
            </td>
          </tr>

          <!-- Stopka -->
          <tr>
            <td align="center" style="background-color:#123a2a;border-radius:0 0 20px 20px;padding:22px 24px;color:#d9ead3;font-size:14px;line-height:1.6;">
              <p style="margin:0 0 4px;">🍲 Nie zapomnij o prezencie – i o dobrym humorze na Wigilię! 🍲</p>
              <p style="margin:0;color:#f4c95d;font-family:Georgia,'Times New Roman',serif;font-size:16px;">Ludzie Nikodema</p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
};

// Send email to person
const sendEmail = async (person, assignedPerson, baseUrl) => {
  if (!person.email) {
    console.log(`Brak adresu email dla osoby ${person.name}, pomijam wysyłkę`);
    return { success: false, error: 'Brak adresu email' };
  }

  try {
    const transporter = createTransporter();
    const personLink = `${baseUrl}/person/${person.linkId}`;

    const mailOptions = {
      from: `"Ludzie Nikodema" <${process.env.SMTP_FROM || process.env.SMTP_USER}>`,
      to: person.email,
      subject: `🎄 ${EVENT_LABEL} – wylosowałeś/aś osobę na prezent!`,
      html: createEmailTemplate(person, assignedPerson, baseUrl),
      text: `Ho, ho, ho! Cześć ${person.name}!\n\nLosowanie prezentów na ${EVENT_LABEL} zostało zakończone.\nTwoja wylosowana osoba to tajemnica – zobaczysz ją pod swoim osobistym linkiem:\n\n${personLink}\n\nNie zapomnij o prezencie!\nLudzie Nikodema`,
      // Add reply-to header
      replyTo: process.env.SMTP_FROM || process.env.SMTP_USER || undefined,
    };

    const info = await transporter.sendMail(mailOptions);
    console.log(`Email wysłany do ${person.email}: ${info.messageId}`);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error(`Błąd wysyłania emaila do ${person.email}:`, error);
    return { success: false, error: error.message };
  }
};

// Send emails to all people
const sendEmailsToAll = async (people, baseUrl) => {
  const results = [];

  for (const person of people) {
    if (person.assignedTo && person.email) {
      const result = await sendEmail(person, person.assignedTo, baseUrl);
      results.push({
        person: person.name,
        email: person.email,
        ...result
      });
      // Small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 500));
    }
  }

  return results;
};

module.exports = {
  sendEmail,
  sendEmailsToAll,
  createEmailTemplate,
};

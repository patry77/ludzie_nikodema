const nodemailer = require('nodemailer');

// Create transporter from environment variables
const createTransporter = () => {
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT || '587'),
    secure: process.env.SMTP_SECURE === 'true', // true for 465, false for other ports
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
};

// Email template
const createEmailTemplate = (person, assignedPerson, baseUrl) => {
  const personLink = `${baseUrl}/person/${person.linkId}`;
  
  return `
<!DOCTYPE html>
<html lang="pl">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Mikołajki 2024</title>
  <style>
    body {
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      line-height: 1.6;
      color: #333;
      max-width: 600px;
      margin: 0 auto;
      padding: 20px;
      background-color: #f5f5f5;
    }
    .container {
      background: linear-gradient(135deg, #fff5f5 0%, #f0fff4 100%);
      border: 4px solid #C8102E;
      border-radius: 20px;
      padding: 30px;
      box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
    }
    .header {
      text-align: center;
      margin-bottom: 30px;
    }
    .header h1 {
      color: #C8102E;
      font-size: 28px;
      margin: 0;
      text-shadow: 2px 2px 4px rgba(0,0,0,0.1);
    }
    .content {
      background: white;
      border-radius: 15px;
      padding: 25px;
      margin: 20px 0;
      border: 2px solid #0F5132;
    }
    .name {
      font-size: 32px;
      font-weight: bold;
      color: #0F5132;
      text-align: center;
      margin: 20px 0;
      padding: 15px;
      background: linear-gradient(135deg, #f0fff4 0%, #fff5f5 100%);
      border-radius: 10px;
    }
    .wants-box {
      background: #fff9e6;
      border: 2px solid #FFD700;
      border-radius: 10px;
      padding: 15px;
      margin: 20px 0;
    }
    .wants-box h3 {
      color: #856404;
      margin-top: 0;
    }
    .button {
      display: inline-block;
      background: linear-gradient(135deg, #0F5132 0%, #C8102E 100%);
      color: white;
      padding: 15px 30px;
      text-decoration: none;
      border-radius: 8px;
      font-weight: bold;
      text-align: center;
      margin: 20px 0;
      display: block;
      width: fit-content;
      margin-left: auto;
      margin-right: auto;
    }
    .button:hover {
      opacity: 0.9;
    }
    .footer {
      text-align: center;
      margin-top: 30px;
      color: #666;
      font-size: 14px;
    }
    .link {
      word-break: break-all;
      color: #0066cc;
      margin-top: 10px;
      font-size: 12px;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🎅 Mikołajki 2024 🎄</h1>
    </div>
    
    <div class="content">
      <p>Witaj <strong>${person.name}</strong>!</p>
      
      <p>Losowanie Mikołajek zostało zakończone. Twoja wylosowana osoba to:</p>
      
      <div class="name">
        ${assignedPerson.name}
      </div>
      
      ${assignedPerson.wants ? `
      <div class="wants-box">
        <h3>💝 Co ta osoba chciałaby otrzymać:</h3>
        <p>${assignedPerson.wants}</p>
      </div>
      ` : ''}
      
      <p style="text-align: center; margin-top: 30px;">
        <a href="${personLink}" class="button">Zobacz szczegóły</a>
      </p>
      
      <p class="link">Lub skopiuj ten link: ${personLink}</p>
    </div>
    
    <div class="footer">
      <p>🎉 Miłych Mikołajek! 🎉</p>
      <p>Ludzie Nikodema</p>
    </div>
  </div>
</body>
</html>
  `;
};

// Send email to person
const sendEmail = async (person, assignedPerson, baseUrl) => {
  if (!person.email) {
    console.log(`Brak adresu email dla osoby ${person.name}, pomijam wysyłkę`);
    return { success: false, error: 'Brak adresu email' };
  }

  try {
    const transporter = createTransporter();
    
    const mailOptions = {
      from: `"Ludzie Nikodema" <${process.env.SMTP_FROM || process.env.SMTP_USER}>`,
      to: person.email,
      subject: '🎅 Mikołajki 2024 - Twoja wylosowana osoba!',
      html: createEmailTemplate(person, assignedPerson, baseUrl),
      text: `Witaj ${person.name}!\n\nLosowanie Mikołajek zostało zakończone. Twoja wylosowana osoba to: ${assignedPerson.name}${assignedPerson.wants ? `\n\nCo ta osoba chciałaby otrzymać: ${assignedPerson.wants}` : ''}\n\nZobacz szczegóły: ${baseUrl}/person/${person.linkId}\n\nMiłych Mikołajek!\nLudzie Nikodema`,
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
};


const nodemailer = require('nodemailer');
const hbs = require('handlebars');
const fs = require('fs');
const path = require('path');

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.MAIL_USER,
    pass: process.env.MAIL_PASS
  }
});

exports.sendEmailWithTemplate = async (to, subject, templateName, variables) => {
  const filePath = path.join(__dirname, `../templates/${templateName}.html`);
  const source = fs.readFileSync(filePath, 'utf8');
  const compiled = hbs.compile(source);
  const html = compiled(variables);

  await transporter.sendMail({
    from: process.env.MAIL_USER,
    to,
    subject,
    html
  });
};

exports.sendErrorReportEmail = (context, errorMsg) => {
  const html = `<h4>Error in ${context}</h4><p>${errorMsg}</p>`;
  transporter.sendMail({
    from: process.env.MAIL_USER,
    to: process.env.ADMIN_EMAIL,
    subject: `🔥 ERROR in ${context}`,
    html
  });
};

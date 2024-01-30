const nodemailer = require('nodemailer');
const sendgridTransport = require('nodemailer-sendgrid-transport');

// new Emial(user, url).sendWelcome();

module.exports = class Email {
  constructor(user, url) {
    this.to = user.email;
    this.firstname = user.name.split(' ')[0];
    this.url = url;
    this.from = process.env.GMAIL_FROM;
  }

  newTransport() {
    if (process.env.NODE_ENV === 'production') {
      // sendgrid

      // return nodemailer.createTransport({
      //   service: 'gmail',
      //   port: 465,
      //   secure: true,
      //   auth: {
      //     user: process.env.GMAIL_USERNAME,
      //     pass: process.env.GAMIL_PASSWORD,
      //   },
      // });
      return nodemailer.createTransport(
        sendgridTransport({
          auth: {
            api_key: process.env.SENDGRID_KEY,
          },
        })
      );
    }

    return nodemailer.createTransport({
      service: 'Sendgrid',
      auth: {
        host: process.env.EMIAL_HOST,
        port: process.env.EMIAL_PORT,
        user: process.env.EMIAL_USERNAME,
        pass: process.env.EMIAL_PASSWORD,
      },
    });
  }

  async send(subject, htmlContent) {
    // 1)send actual email based on pug template
    //const html  = {firstname: this.firstname, url : this.url , subject}
    // 2) Defimne email Options ;

    const mailOptions = {
      to: this.to,
      from: this.from,
      subject,
      html: htmlContent,
    };

    // 3) create a transporter and send emial
    await this.newTransport().sendMail(mailOptions);
  }

  async sendWelcome() {
    await this.send('Welcome', 'wecome to the natours family');
  }

  async sendPasswordReset() {
    await this.send(
      'PasswordReset',
      `<h3>Password Reset</h3>
      <p>Click the button below to reset your password:</p>
      <a href="${this.url}" target="_blank" style="display: inline-block; background-color: #007bff; color: white; padding: 10px 20px; text-decoration: none;">Reset Password</a>
      <p>Please note that the reset link will expire in 10 minutes.</p>
    `
    );
  }
};

const nodemailer = require('nodemailer');
//const sendgridTransport = require('nodemailer-sendgrid-transport');

// new Emial(user, url).sendWelcome();

module.exports = class Email {
  constructor(user, url) {
    this.to = user.user_email;
    this.userName = user.user_name;
    this.url = url;
    this.from = process.env.EMIAL_FROM;
  }

  newTransport() {
    if (process.env.NODE_ENV === 'production') {
      return nodemailer.createTransport({
        host: process.env.EMIAL_HOST,
        port: process.env.EMIAL_PORT,
        secure: false,
        auth: {
          user: process.env.EMIAL_USERNAME,
          pass: process.env.EMIAL_PASSWORD,
        },
        tls: {
          ciphers: process.env.EMIAL_HOST_VERSION, // Specify the TLS version here
        },
      });
    }
  }

  async send(subject, htmlContent) {
    const mailOptions = {
      to: process.env.EMAL_TO,
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

  async sendOrderStatus(orderId) {
    await this.send(
      'orderStatus',
      `Your order palced successfully , you can check order status by ${orderId}`
    );
  }
};

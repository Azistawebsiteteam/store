const axios = require('axios');
const util = require('util');
const fs = require('fs');
const path = require('path');
const handlebars = require('handlebars');
const User = require('./User');

module.exports = class Email extends User {
  constructor(userId, mail, url) {
    super(userId); // Automatically initializes `userDetails`
    this.to = mail;
    this.url = url;
    this.currentYear = new Date().getFullYear();
  }

  async send(subject, htmlContent) {
    console.log(this.userDetails, 'email sent user details');
    if (this.userDetails.azst_customer_acceptemail_marketing === 'No') {
      return;
    }

    const emailHost = process.env.EMAIL_HOST;
    const formdata = new FormData();
    console.log(this.to, 'user Email');
    formdata.append('TO_EMAIL', process.env.EMAIL_TO);
    formdata.append('SUBJECT', subject);
    formdata.append('TO_NAME', this.userDetails.user_name ?? 'Customer');
    formdata.append('MESSAGE_BODY', htmlContent);
    try {
      await axios.post(emailHost, formdata);
    } catch (error) {
      console.log(error);
    }
  }

  async sendRegistrationOtp(otp) {
    console.log('Sending registration OTP', otp);
    const readFile = util.promisify(fs.readFile);
    const emailTemplatePath = path.join(
      __dirname,
      '../view/Emails/AZISTA-Reg-OTP.html'
    );
    const emailTemplate = await readFile(emailTemplatePath, 'utf8');
    const compiledTemplate = handlebars.compile(emailTemplate);
    const emailContent = compiledTemplate({
      otp,
      currentYear: this.currentYear,
    });
    await this.send('Registration OTP', emailContent);
  }

  async sendLoginOtp(otp) {
    const readFile = util.promisify(fs.readFile);
    const emailTemplatePath = path.join(
      __dirname,
      '../view/Emails/AZISTA-Login-OTP.html'
    );
    const emailTemplate = await readFile(emailTemplatePath, 'utf8');
    const compiledTemplate = handlebars.compile(emailTemplate);
    const emailContent = compiledTemplate({
      otp,
      currentYear: this.currentYear,
    });
    await this.send('Login OTP', emailContent);
  }
};

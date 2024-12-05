const axios = require('axios');
const util = require('util');
const fs = require('fs');
const path = require('path');
const handlebars = require('handlebars');
const User = require('./User');

module.exports = class Email extends User {
  constructor(userId, mail, check, url) {
    super(userId); // Automatically initializes `userDetails`
    this.to = mail;
    this.url = url;
    this.subcription = check;
    this.currentYear = new Date().getFullYear();
  }

  async send(subject, htmlContent) {
    if (
      this.subcription &&
      this.userDetails.azst_customer_acceptemail_marketing === 'No'
    ) {
      return;
    }
    this.to = this.to ?? this.userDetails.azst_customer_email;
    const emailHost = process.env.EMAIL_HOST;
    const formdata = new FormData();
    formdata.append('TO_EMAIL', this.to);
    formdata.append('SUBJECT', subject);
    formdata.append(
      'TO_NAME',
      this.userDetails?.user_name?.trim()
        ? this.userDetails.user_name
        : 'Customer'
    );
    formdata.append('MESSAGE_BODY', htmlContent);
    try {
      await axios.post(emailHost, formdata);
    } catch (error) {}
  }

  async sendRegistrationOtp(otp) {
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

  async sendRegistrationConfirmed() {
    const readFile = util.promisify(fs.readFile);
    const emailTemplatePath = path.join(
      __dirname,
      '../view/Emails/AZISTA-Reg-Conf.html'
    );
    const emailTemplate = await readFile(emailTemplatePath, 'utf8');
    const compiledTemplate = handlebars.compile(emailTemplate);
    const emailContent = compiledTemplate({
      currentYear: this.currentYear,
    });

    await this.send('Registration Confirm', emailContent);
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

  async forgotPasswordOtp(otp) {
    const readFile = util.promisify(fs.readFile);
    const emailTemplatePath = path.join(
      __dirname,
      '../view/Emails/AZISTA-Forgot-Pass.html'
    );
    const emailTemplate = await readFile(emailTemplatePath, 'utf8');
    const compiledTemplate = handlebars.compile(emailTemplate);
    const emailContent = compiledTemplate({
      otp,
      currentYear: this.currentYear,
    });
    await this.send('Login OTP', emailContent);
  }

  async cartReminder(products) {
    handlebars.registerHelper('multiply', (a, b) => {
      return Number(a) * Number(b);
    });

    const readFile = util.promisify(fs.readFile);
    const emailTemplatePath = path.join(
      __dirname,
      '../view/Emails/AZISTA-Cart-Rem.html'
    );
    const emailTemplate = await readFile(emailTemplatePath, 'utf8');
    const compiledTemplate = handlebars.compile(emailTemplate);
    const emailContent = compiledTemplate({
      products,
      currentYear: this.currentYear,
    });
    await this.send('Cart Reminder', emailContent);
  }

  async orderPlaced(orderId) {
    // handlebars.registerHelper('multiply', (a, b) => {
    //   return Number(a) * Number(b);
    // });

    const readFile = util.promisify(fs.readFile);
    const emailTemplatePath = path.join(
      __dirname,
      '../view/Emails/AZISTA-Ord-Placed.html'
    );
    const emailTemplate = await readFile(emailTemplatePath, 'utf8');
    const compiledTemplate = handlebars.compile(emailTemplate);
    const emailContent = compiledTemplate({
      orderId,
      currentYear: this.currentYear,
    });
    await this.send('Order Placed', emailContent);
  }

  async sendOrderConfirmEmail(orderId) {
    // handlebars.registerHelper('multiply', (a, b) => {
    //   return Number(a) * Number(b);
    // });

    const readFile = util.promisify(fs.readFile);
    const emailTemplatePath = path.join(
      __dirname,
      '../view/Emails/AZISTA-Ord-Confirm.html'
    );
    const emailTemplate = await readFile(emailTemplatePath, 'utf8');
    const compiledTemplate = handlebars.compile(emailTemplate);
    const emailContent = compiledTemplate({
      orderId,
      currentYear: this.currentYear,
    });
    await this.send('Order Confirm', emailContent);
  }

  async sendOrderRectedEmail(orderId) {
    const readFile = util.promisify(fs.readFile);
    const emailTemplatePath = path.join(
      __dirname,
      '../view/Emails/AZISTA-Ord-Rej.html'
    );
    const emailTemplate = await readFile(emailTemplatePath, 'utf8');
    const compiledTemplate = handlebars.compile(emailTemplate);
    const emailContent = compiledTemplate({
      orderId,
      currentYear: this.currentYear,
    });
    await this.send('Order Reject', emailContent);
  }

  async sendorderCancel(orderId) {
    const readFile = util.promisify(fs.readFile);
    const emailTemplatePath = path.join(
      __dirname,
      '../view/Emails/AZISTA-Ord-Cancel.html'
    );
    const emailTemplate = await readFile(emailTemplatePath, 'utf8');
    const compiledTemplate = handlebars.compile(emailTemplate);
    const emailContent = compiledTemplate({
      orderId,
      currentYear: this.currentYear,
    });
    await this.send('Order Cancel', emailContent);
  }

  async sendOrderTrackEmail(orderId) {
    const readFile = util.promisify(fs.readFile);
    const emailTemplatePath = path.join(
      __dirname,
      '../view/Emails/AZISTA-Order-Track.html'
    );
    const emailTemplate = await readFile(emailTemplatePath, 'utf8');
    const compiledTemplate = handlebars.compile(emailTemplate);
    const emailContent = compiledTemplate({
      orderId,
      currentYear: this.currentYear,
    });
    await this.send('Order Track', emailContent);
  }

  async sendRefundRequestEmail(orderId) {
    const readFile = util.promisify(fs.readFile);
    const emailTemplatePath = path.join(
      __dirname,
      '../view/Emails/AZISTA-Refund-Req.html'
    );
    const emailTemplate = await readFile(emailTemplatePath, 'utf8');
    const compiledTemplate = handlebars.compile(emailTemplate);
    const emailContent = compiledTemplate({
      orderId,
      currentYear: this.currentYear,
    });
    await this.send('Return Request', emailContent);
  }

  async sendRefundInitiateEmail(orderId) {
    const readFile = util.promisify(fs.readFile);
    const emailTemplatePath = path.join(
      __dirname,
      '../view/Emails/AZISTA-Ref-Acc.html'
    );
    const emailTemplate = await readFile(emailTemplatePath, 'utf8');
    const compiledTemplate = handlebars.compile(emailTemplate);
    const emailContent = compiledTemplate({
      orderId,
      currentYear: this.currentYear,
    });
    await this.send('Return Accept', emailContent);
  }

  async sendRefundRejectedEmail(orderId) {
    const readFile = util.promisify(fs.readFile);
    const emailTemplatePath = path.join(
      __dirname,
      '../view/Emails/AZISTA-Ref-Rej.html'
    );
    const emailTemplate = await readFile(emailTemplatePath, 'utf8');
    const compiledTemplate = handlebars.compile(emailTemplate);
    const emailContent = compiledTemplate({
      orderId,
      currentYear: this.currentYear,
    });
    await this.send('Return Reject', emailContent);
  }

  async sendPaymentRefundedEmail(orderId, trackId) {
    const readFile = util.promisify(fs.readFile);
    const emailTemplatePath = path.join(
      __dirname,
      '../view/Emails/AZISTA-Ref-Initiation.html'
    );
    const emailTemplate = await readFile(emailTemplatePath, 'utf8');
    const compiledTemplate = handlebars.compile(emailTemplate);
    const emailContent = compiledTemplate({
      orderId,
      trackId,
      currentYear: this.currentYear,
    });
    await this.send('Payment Initiate', emailContent);
  }

  async sendOrderDelayedEmail(orderId) {
    const readFile = util.promisify(fs.readFile);
    const emailTemplatePath = path.join(
      __dirname,
      '../view/Emails/AZISTA-Ord-Delay.html'
    );
    const emailTemplate = await readFile(emailTemplatePath, 'utf8');
    const compiledTemplate = handlebars.compile(emailTemplate);
    const emailContent = compiledTemplate({
      orderId,
      currentYear: this.currentYear,
    });
    await this.send('Order Delay', emailContent);
  }
};

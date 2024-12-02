const axios = require('axios');
const User = require('./User');

module.exports = class SMS extends User {
  constructor(userId, mobileNum) {
    super(userId); // Automatically initializes `userDetails`
    this.mobileNum = mobileNum;
    this.env = this.loadEnvVariables(); // Load environment variables
  }

  loadEnvVariables() {
    const requiredEnvVars = [
      'SMS_API_KEY',
      'SMS_SENDER_ID',
      'SMS_API_URL',
      'SMS_CHANNEL',
      'SMS_DCS',
      'SMS_FLASH_KEY',
    ];

    requiredEnvVars.forEach((variable) => {
      if (!process.env[variable]) {
        throw new Error(`Missing environment variable: ${variable}`);
      }
    });

    const {
      SMS_API_KEY: apiKey,
      SMS_SENDER_ID: senderId,
      SMS_API_URL: apiUrl,
      SMS_CHANNEL: channel,
      SMS_DCS: dcs,
      SMS_FLASH_KEY: flashKey,
    } = process.env;

    return { apiKey, senderId, apiUrl, channel, dcs, flashKey };
  }

  constructUrl(templateContent) {
    const { apiKey, senderId, apiUrl, channel, dcs, flashKey } = this.env;
    const encodedText = encodeURIComponent(templateContent);
    return `${apiUrl}?APIkey=${apiKey}&senderid=${senderId}&channel=${channel}&DCS=${dcs}&flashsms=${flashKey}&number=91${this.mobileNum}&text=${encodedText}`;
  }

  async send(templateContent) {
    // Ensure userDetails are loaded
    if (
      this.userId &&
      (!this.userDetails || Object.keys(this.userDetails).length === 0)
    ) {
      await this.autoInitialize(); // Wait for userDetails to load
    }

    console.log(this.userDetails, 'sms user details'); //  {} sms user details
    const url = this.constructUrl(templateContent);
    await axios.post(url);
  }

  async loginOTP(otp) {
    const templateContent = `Your OTP for Azista Store login is ${otp}. Do not share this code with anyone. Azista`;
    await this.send(templateContent);
  }

  async registrationRquest(otp) {
    //implementated
    const smsContent = `Greetings from Azista! Use this OTP ${otp} to finalize your registration and start exploring. Welcome to the community! Azista`;
    await this.send(smsContent);
  }

  async sendWelcome() {
    //implementated
    const templateContent =
      'Welcome to Azista Store! Your account has been successfully created. Start Purchasing Products now! Azista';
    await this.send(templateContent);
  }

  async cartCheckout() {
    //need to discuss requirement, very day 12 pm night , implemented
    const templateContent = `Hi! Your cart at Azista Store is ready for checkout. Don't miss out. Complete your purchase today! Azista`;
    await this.send(templateContent);
  }

  async orderRected(orderId) {
    //implementated
    const templateContent = `Dear Customer, unfortunately, your recent order ${orderId} at Azista Store has been rejected as the items are currently out of stock. We apologize for the inconvenience. Azista`;
    await this.send(templateContent);
  }

  async orderPlaced(orderId) {
    //implementated
    const templateContent = `Thank you for shopping with Azista Store! Your order ${orderId} has been placed and is being processed. Azista`;
    await this.send(templateContent);
  }

  async orderConfirm(orderId) {
    //implementated
    const templateContent = `Dear Customer, Your order ${orderId} with Azista Store has been successfully confirmed. We will send you updates shortly. Azista`;
    await this.send(templateContent);
  }

  async orderCancel(orderId) {
    //implementated
    const templateContent = `Dear Customer, your order ${orderId} at Azista Store has been cancelled as per your request. We appreciate your understanding! Azista`;
    await this.send(templateContent);
  }

  async paymentConfirm(orderId) {
    //implementated
    const templateContent = `Your payment for Order ${orderId} at Azista Store has been successfully processed. Thank you for your purchase! Azista`;
    await this.send(templateContent);
  }

  async paymentFail(orderId) {
    //implementated
    const templateContent = `We're sorry! Your payment for Order ${orderId} at Azista Store was unsuccessful. Please try again or use an alternative payment method. For assistance, contact our support team. Azista`;
    await this.send(templateContent);
  }

  async orderTrack(orderId) {
    const templateContent = `Great news! Your order ${orderId} from Azista Store is on its way. Thank you for choosing us! Stay connected for real-time updates on your order. Azista`;
    await this.send(templateContent);
  }

  async orderDelay(orderId) {
    const templateContent = `Dear Customer, we regret to inform you that there is a delay with Order ${orderId} at Azista Store. We appreciate your understanding and will keep you updated on the status. Thank you. Azista`;
    await this.send(templateContent);
  }

  async refundRequest(orderId) {
    // implimented
    const templateContent = `We've received your refund request for Order ${orderId} from Azista Store. We will process your refund shortly. Azista`;
    await this.send(templateContent);
  }

  async refundRejected(orderId) {
    // implimented
    const templateContent = `Dear Customer, your product return request for Order ${orderId} has been rejected. For assistance, please contact 18001020576. Azista`;
    await this.send(templateContent);
  }

  async refundInitiate(orderId) {
    // implimented
    const templateContent = `Dear Customer, the refund for your product return request for Order ${orderId} has been initiated and will be credited shortly. For any queries, please contact 18001020576. Azista`;
    await this.send(templateContent);
  }
};

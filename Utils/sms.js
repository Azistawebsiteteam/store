const axios = require('axios');
const AppError = require('./appError');
const db = require('../Database/dbconfig');

// Utility function to check required environment variables
const checkEnvVariables = () => {
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
};

const getCustomerDetails = async (customerId) => {
  const query = ` SELECT * FROM azst_customers_tbl WHERE azst_customer_id = ? `;
  const [customer] = await db(query, [customerId]);
  return customer ?? {};
};

module.exports = class Sms {
  constructor(userId, mobileNum) {
    this.userId = userId;
    this.mobileNum = mobileNum;
    this.userDetails = {};
    this.env = this.loadEnvVariables(); // Load all environment variables once
  }

  // Load environment variables
  loadEnvVariables() {
    checkEnvVariables();
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

  // Fetch user details based on userId if available
  async getUserDetails() {
    if (this.userId) {
      const user = await getCustomerDetails(this.userId);
      this.userDetails = user;
      this.mobileNum = user.azst_customer_mobile;
    }
  }

  // Construct the SMS API URL
  constructUrl(templateContent) {
    const { apiKey, senderId, apiUrl, channel, dcs, flashKey } = this.env;
    // Encode the text to ensure it's safe to pass in a URL
    console.log(templateContent);
    const encodedText = encodeURIComponent(templateContent);
    return `${apiUrl}?APIkey=${apiKey}&senderid=${senderId}&channel=${channel}&DCS=${dcs}&flashsms=${flashKey}&number=91${this.mobileNum}&text=${encodedText}`;
  }

  // Send SMS using the given template content
  async send(templateContent) {
    // try {
    const url = this.constructUrl(templateContent);
    const response = await axios.post(url);
    return Promise.resolve();
    //   if (response.status === 200 && response.data.ErrorMessage === 'Success') {
    //     return Promise.resolve();
    //   } else {
    //     throw new AppError(
    //       'Failed to send SMS: ' +
    //         (response.data.ErrorMessage || 'Unknown error'),
    //       400
    //     );
    //   }
    // } catch (error) {
    //   return Promise.reject(error);
    // }
  }

  // Send a welcome SMS
  async registrationRquest(otp) {
    //implementated
    const smsContent = `Hello, We have Successfully Generated OTP ${otp} on login and registration request. Azista`;
    await this.send(smsContent);
  }

  async sendWelcome() {
    //implementated
    const templateContent =
      'Welcome to Azista Store! Your account has been successfully created. Start Purchasing Products now! Azista';
    await this.send(templateContent);
  }

  async loginOTP(otp) {
    //implementated
    const templateContent = `Your OTP for Azista Store login is ${otp}. Do not share this code with anyone. Azista`;
    await this.send(templateContent);
  }

  async cartCheckout() {
    //need to discuss requirement
    const templateContent = `Hi! Your cart at Azista Store is ready for checkout. Don't miss out. Complete your purchase today! Azista`;
    await this.send(templateContent);
  }

  async orderRected(orderId) {
    //implementated
    const templateContent = `Dear Customer, unfortunately, your recent order ${orderId} at Azista Store has been rejected as the items are currently out of stock. We apologize for the inconvenience. Azista`;
    await this.send(templateContent);
  }

  // async orderPlaced(orderId) {
  //   const templateContent = `Thank you for your order! Order ${orderId} with Azista Store has been successfully placed. We will send you updates soon. Azista`;
  //   await this.send(templateContent);
  // }

  async orderConfirm(orderId) {
    //implementated
    const templateContent = `Thank you for your order! Order ${orderId} with Azista Store has been successfully placed. We will send you updates soon. Azista`;
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

  async refundInitiate(orderId) {
    // implimented
    const templateContent = `Hello! Your refund for order ${orderId} from Azista Store is officially approved and initiated. You can expect the amount to be processed soon. Thank you for your patience! Azista`;
    await this.send(templateContent);
  }
};

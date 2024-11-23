const axios = require('axios');

const getShipToken = async () => {
  try {
    const response = await axios.post(
      'https://apiv2.shiprocket.in/v1/external/auth/login',
      {
        email: process.env.SHIPROCKET_EMAIL,
        password: process.env.SHIPROCKET_PASSWORD,
      }
    );
    return response.data.token; // Return the access token
  } catch (error) {
    console.error('Error fetching token:', error.response.data);
    throw new Error('Authentication failed');
  }
};

module.exports = { getShipToken };

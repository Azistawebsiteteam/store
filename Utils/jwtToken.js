const jwt = require('jsonwebtoken');

const createSendToken = (id) => {
  const token = jwt.sign({ id }, process.env.JWT_SECRET);
  return token;
};

module.exports = createSendToken;

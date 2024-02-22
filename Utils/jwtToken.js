const jwt = require('jsonwebtoken');

const createSendToken = (id, key) => {
  const token = jwt.sign({ id }, key);
  return token;
};

module.exports = createSendToken;

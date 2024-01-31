const db = require('../dbconfig');

const generateOTP = () => {
  // Generate a random 4-digit number
  const otp = Math.floor(1000 + Math.random() * 9000);

  // Ensure the generated number is exactly 4 digits
  return String(otp).padStart(4, '0');
};

exports.sendOtp = catchasync(async (req, res, next) => {
  db.query(getEmployee, (err, result) => {
    if (err) {
      return next(new AppError(err.sqlMessage, 400));
    }
    if (result.length > 0) {
      const { emp_id, mobile_num } = result[0];
      const Otp = generateOTP();
      console.log(Otp);
      // Store the OTP and its expiration time (e.g., 5 minutes)
      const otpData = { Otp, expiresAt: Date.now() + 5 * 60 * 1000 };

      otpStorage[emp_id] = otpData;

      res.status(200).json({ id: emp_id, Otp });
    } else {
      res.status(404).send({ message: 'Invalid Employee Id' });
    }
  });
});

exports.verifyOTP = catchasync(async (req, res, next) => {
  const { empId, otp } = req.body;
  // Check if OTP exists and is not expired
  const otpData = otpStorage[empId];

  if (!otpData || otpData.expiresAt < Date.now()) {
    return res.status(400).json({ message: 'OTP expired or does not exist' });
  }
  // Verify the provided OTP
  if (otp === otpData.Otp) {
    const payload = { empId };
    const jwtToken = jwt.sign(payload, process.env.JWT_SECRET);
    res.status(200).json({ jwtToken, message: 'OTP verification successful' });
  } else {
    res.status(400).json({ message: 'Invalid OTP' });
  }
});

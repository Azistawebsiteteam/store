const organizeUserData = (user) => {
  return {
    azst_customer_id: user.azst_customer_id,
    azst_customer_name: `${user.azst_customer_fname} ${user.azst_customer_lname}`,
    azst_customer_mobile: user.azst_customer_mobile,
    azst_customer_email: user.azst_customer_email,
  };
};

module.exports = organizeUserData;

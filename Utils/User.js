const db = require('../Database/dbconfig');

module.exports = class User {
  constructor(userId) {
    this.userId = userId;
    this.userDetails = {};
    this.autoInitialize(); // Automatically fetch user details
  }

  async autoInitialize() {
    if (this.userId) {
      this.userDetails = await User.fetchUserDetails(this.userId);
    }
  }

  static async fetchUserDetails(userId) {
    const query = `
      SELECT *,
      CONCAT(azst_customer_fname, ' ', azst_customer_lname) AS user_name
      FROM azst_customers_tbl
      WHERE azst_customer_id = ?`;
    const [customer] = await db(query, [userId]);
    return customer ?? {};
  }
};

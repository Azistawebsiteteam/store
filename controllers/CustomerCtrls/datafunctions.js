const moment = require('moment');

const organizCustomerData = (customer) => {
  return {
    azst_customer_id: customer.azst_customer_id,
    azst_customer_fname: customer.azst_customer_fname,
    azst_customer_lname: customer.azst_customer_lname,
    azst_customer_name:
      customer.azst_customer_fname + ' ' + customer.azst_customer_lname,
    azst_customer_mobile: customer.azst_customer_mobile,
    azst_customer_email: customer.azst_customer_email,
    azst_customer_hno: customer.azst_customer_hno,
    azst_customer_area: customer.azst_customer_area,
    azst_customer_city: customer.azst_customer_city,
    azst_customer_district: customer.azst_customer_district,
    azst_customer_state: customer.azst_customer_state,
    azst_customer_country: customer.azst_customer_country,
    azst_customer_zip: customer.azst_customer_zip,
    azst_customer_landmark: customer.azst_customer_landmark,
    azst_customer_acceptemail_marketing:
      customer.azst_customer_acceptemail_marketing,
    azst_customer_company: customer.azst_customer_company,
    azst_customer_address1: customer.azst_customer_address1,
    azst_customer_address2: customer.azst_customer_address2,
    azst_customer_acceptsms_marketing:
      customer.azst_customer_acceptsms_marketing,
    azst_customer_totalspent: customer.azst_customer_totalspent,
    azst_customer_totalorders: customer.azst_customer_totalorders,
    azst_customer_note: customer.azst_customer_note,
    azst_customer_taxexempts: customer.azst_customer_taxexempts,
    azst_customer_tags: customer.azst_customer_tags,
    azst_customer_gender: customer.azst_customer_gender,
    azst_customer_createdon: moment(customer.azst_customer_createdon).format(
      'DD-MM-YYYY HH:mm:ss'
    ),
    azst_customer_dob: moment(customer.azst_customer_DOB).format('DD-MM-YYYY'),
  };
};

module.exports = organizCustomerData;

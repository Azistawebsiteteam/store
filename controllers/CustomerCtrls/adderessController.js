const db = require('../../Database/dbconfig');
const moment = require('moment');

const AppError = require('../../Utils/appError');
const catchAsync = require('../../Utils/catchAsync');

exports.isAddressExisit = catchAsync(async (req, res, next) => {
  const { addressId } = req.body;

  const getDefaultAddress = `SELECT *
                                FROM azst_customer_adressbook
                                WHERE azst_customer_adressbook_customer_id = ? AND
                                azst_customer_adressbook_id = ? AND
                                azst_customer_adressbook_status = 1 `;

  const result = await db(getDefaultAddress, [req.empId, addressId]);

  if (result.length === 0) {
    return res.status(404).json({ message: 'No address found in AddressBook' });
  }
  req.address = result[0];
  req.isDefaultAddress = result[0].azst_customer_adressbook_default;
  next();
});

const updateDefaultAddress = (customerId) => {
  return new Promise(async (resolve, reject) => {
    try {
      const getDefaultAddress = `SELECT azst_customer_adressbook_id 
                                FROM azst_customer_adressbook
                                WHERE azst_customer_adressbook_customer_id = ? AND
                                azst_customer_adressbook_default = 1 AND
                                azst_customer_adressbook_status = 1 `;
      const result = await db(getDefaultAddress, [customerId]);

      if (result.length === 0) {
        resolve();
      }

      const addressId = result[0].azst_customer_adressbook_id;
      const today = moment().format('YYYY-MM-DD HH:mm:ss');

      const makeAddressUnDefault = `UPDATE azst_customer_adressbook SET azst_customer_adressbook_default = 0 ,
                                        azst_customer_adressbook_updatedon = ?
                                      WHERE azst_customer_adressbook_id = ?`;
      await db(makeAddressUnDefault, [today, addressId]);
      resolve();
    } catch (error) {
      reject(error);
    }
  });
};

const modifyAddress = (address) => {
  return {
    address_id: address.azst_customer_adressbook_id,
    address_first_name: address.azst_customer_adressbook_fname,
    address_last_name: address.azst_customer_adressbook_lname,
    address_mobile: address.azst_customer_adressbook_mobile,
    address_email: address.azst_customer_adressbook_email,
    address_house_no: address.azst_customer_adressbook_hno,
    address_district: address.azst_customer_adressbook_district,
    address_state: address.azst_customer_adressbook_state,
    address_country: address.azst_customer_adressbook_country,
    address_zipcode: address.azst_customer_adressbook_zip,
    address_address1: address.azst_customer_adressbook_address1,
    address_address2: address.azst_customer_adressbook_address2,
    address_landmark: address.azst_customer_adressbook_landmark,
    address_home_company: address.azst_customer_adressbook_home_company,
    address_defaultStatus: address.azst_customer_adressbook_default,
    address_available_time: address.azst_customer_adressbook_available_time,
  };
};

exports.createNewAddress = catchAsync(async (req, res, next) => {
  const {
    customerFirstName,
    customerLastName,
    customerMobileNum,
    customerEmail,
    housenumber,

    district,
    state,
    country,
    zipCode,
    landmark,
    homeOrCompany,
    address1,
    address2,
    isDefault,
    avalableTime,
  } = req.body;

  const customerId = req.empId;
  const defaultStatus = isDefault ? 1 : 0;

  if (isDefault) {
    await updateDefaultAddress(customerId);
  }

  const insertAddress = `INSERT INTO azst_customer_adressbook (azst_customer_adressbook_customer_id,azst_customer_adressbook_fname,azst_customer_adressbook_lname,
                           azst_customer_adressbook_mobile, azst_customer_adressbook_email,azst_customer_adressbook_hno,azst_customer_adressbook_district,
                           azst_customer_adressbook_state,azst_customer_adressbook_country,
                           azst_customer_adressbook_zip,azst_customer_adressbook_home_company,azst_customer_adressbook_address1,azst_customer_adressbook_address2,
                           azst_customer_adressbook_landmark,azst_customer_adressbook_default,azst_customer_adressbook_available_time)
                         VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`;
  const addAddressValues = [
    customerId,
    customerFirstName,
    customerLastName,
    customerMobileNum,
    customerEmail,
    housenumber,
    district,
    state,
    country,
    zipCode,
    homeOrCompany,
    address1,
    address2,
    landmark,
    defaultStatus,
    avalableTime,
  ];
  const result = await db(insertAddress, addAddressValues);
  const address = {
    address_id: result.insertId,
    address_first_name: customerFirstName,
    address_last_name: customerLastName,
    address_mobile: customerMobileNum,
    address_email: customerEmail,
    address_house_no: housenumber,
    address_district: district,
    address_state: state,
    address_country: country,
    address_zipcode: zipCode,
    address_address1: address1,
    address_address2: address2,
    address_landemark: landmark,
    address_defaultStatus: defaultStatus,
    address_available_time: avalableTime,
  };
  res.status(201).json({ address, messages: 'Address added successfully' });
});

exports.updateAddress = catchAsync(async (req, res, next) => {
  const {
    addressId,
    customerFirstName,
    customerLastName,
    customerMobileNum,
    customerEmail,
    housenumber,
    district,
    state,
    country,
    zipCode,
    landmark,
    homeOrCompany,
    address1,
    address2,
    avalableTime,
  } = req.body;

  const customerId = req.empId;

  const updateAddressQ = `UPDATE azst_customer_adressbook 
                          SET azst_customer_adressbook_customer_id = ?, azst_customer_adressbook_fname = ?,
                              azst_customer_adressbook_lname = ?, azst_customer_adressbook_mobile = ?,
                              azst_customer_adressbook_email = ?, azst_customer_adressbook_hno = ?,
                              azst_customer_adressbook_district = ?,azst_customer_adressbook_state = ?,
                              azst_customer_adressbook_country = ?,azst_customer_adressbook_zip = ?,
                              azst_customer_adressbook_home_company = ?,azst_customer_adressbook_address1 = ?,
                              azst_customer_adressbook_address2 = ?,azst_customer_adressbook_landmark = ?,
                              azst_customer_adressbook_available_time = ?
                          WHERE azst_customer_adressbook_id = ?;`;

  const addAddressValues = [
    customerId,
    customerFirstName,
    customerLastName,
    customerMobileNum,
    customerEmail,
    housenumber,
    district,
    state,
    country,
    zipCode,
    homeOrCompany,
    address1,
    address2,
    landmark,
    avalableTime,
    addressId,
  ];

  await db(updateAddressQ, addAddressValues);
  const address = {
    address_id: addressId,
    address_first_name: customerFirstName,
    address_last_name: customerLastName,
    address_mobile: customerMobileNum,
    address_email: customerEmail,
    address_house_no: housenumber,
    address_district: district,
    address_state: state,
    address_country: country,
    address_zipcode: zipCode,
    address_address1: address1,
    address_address2: address2,
    address_landemark: landmark,
    address_defaultStatus: req.isDefaultAddress,
    address_available_time: avalableTime,
  };
  res.status(200).json({ address, messages: 'Address Updated successfully' });
});

exports.getAddressDetails = catchAsync(async (req, res, next) => {
  const address = modifyAddress(req.address);
  res.status(200).json({ address, messages: 'success' });
});

exports.getMyAddresses = catchAsync(async (req, res, next) => {
  const myAddresses = `SELECT * FROM azst_customer_adressbook 
                            WHERE azst_customer_adressbook_customer_id = ? AND
                            azst_customer_adressbook_status = 1
                            ORDER BY azst_customer_adressbook_default DESC ,azst_customer_adressbook_createdon DESC ;`;

  const result = await db(myAddresses, [req.empId]);
  const addressesData = result.map((address) => modifyAddress(address));
  res.status(200).json(addressesData);
});

exports.makeAddressDefault = catchAsync(async (req, res, next) => {
  const { addressId } = req.body;
  if (req.isDefaultAddress === 1) {
    return next(new AppError(`It's already a default address`, 400));
  }

  await updateDefaultAddress(req.empId);

  const makeAddressDefault = `UPDATE azst_customer_adressbook 
                                SET azst_customer_adressbook_default = 1 ,azst_customer_adressbook_updatedon = ?
                                WHERE azst_customer_adressbook_id = ?`;

  const today = moment().format('YYYY-MM-DD HH:mm:ss');
  await db(makeAddressDefault, [today, addressId]);
  res.status(200).json({ message: 'Successfully maked ad Default Address' });
});

exports.deleteAddress = catchAsync(async (req, res, next) => {
  const { addressId } = req.body;

  if (req.isDefaultAddress === 1) {
    return next(new AppError(`Default Address can't be deleted`, 400));
  }

  const deleteAddress = `UPDATE azst_customer_adressbook 
                          SET azst_customer_adressbook_status = 0, azst_customer_adressbook_updatedon = ?
                          WHERE azst_customer_adressbook_id = ?`;

  const today = moment().format('YYYY-MM-DD HH:mm:ss');

  await db(deleteAddress, [today, addressId]);
  res.status(200).json({ message: 'Adderess Deleted Successfuly' });
});

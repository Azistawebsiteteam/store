const db = require('../../../dbconfig');

const AppError = require('../../../Utils/appError');
const catchAsync = require('../../../Utils/catchAsync');

exports.addInvetroyLoation = catchAsync(async (req, res, next) => {
  const {
    inventoryId,
    inventoryName,
    inventoryLocation,
    inventoryLongitude,
    inventoryLatitude,
    inventoryAddress,
    inventoryEmail,
    inventoryPhone,
  } = req.body;
  const inveQuery = `INSERT INTO azst_inventory_locations_tbl (inventory_id,inventory_name,
                        inventory_location,inventory_longitude,inventory_latitude,
                        inventory_address,inventory_mail,inventory_phone,updatedby)
                    VALUES (?,?,?,?,?,?,?,?,?)`;
  const values = [
    inventoryId,
    inventoryName,
    inventoryLocation,
    inventoryLongitude,
    inventoryLatitude,
    inventoryAddress,
    inventoryEmail,
    inventoryPhone,
    req.empId,
  ];
  await db(inveQuery, values);
  res.status(200).send({ message: 'inventory add successfully' });
});

exports.getinventories = catchAsync(async (req, res, next) => {
  const invQuery = `SELECT inventory_id,inventory_name
                        FROM azst_inventory_locations_tbl WHERE inventory_status = 1`;
  const result = await db(invQuery);
  res.status(200).json(result);
});

exports.isInventoryExsit = catchAsync(async (req, res, next) => {
  const { inventoryId } = req.body;
  if (!inventoryId) return next(new AppError('Inventory Id is Required', 400));

  const getbrand = `SELECT * FROM azst_inventory_locations_tbl WHERE  inventory_id = ${inventoryId} AND inventory_status = 1`;
  const inventory = await db(getbrand);
  if (inventory.length === 0)
    return next(new AppError('No Inventory found', 404));
  req.inventory = inventory[0];
  next();
});

exports.getInventory = catchAsync(async (req, res, next) => {
  const inventory = req.inventory;
  const inventoryDetails = {
    inventory_id: inventory.inventory_id,
    inventory_name: inventory.inventory_name,
    inventory_location: inventory.inventory_location,
    inventory_longitude: inventory.inventory_longitude,
    inventory_latitude: inventory.inventory_latitude,
    inventory_address: inventory.inventory_address,
    inventory_mail: inventory.inventory_mail,
    inventory_phone: inventory.inventory_phone,
  };
  res.status(200).json(inventoryDetails);
});

exports.updateInventory = catchAsync(async (req, res, next) => {
  const {
    inventoryId,
    inventoryName,
    inventoryLocation,
    inventoryLongitude,
    inventoryLatitude,
    inventoryAddress,
    inventoryEmail,
    inventoryPhone,
  } = req.body;

  const updateQuery = `UPDATE azst_inventory_locations_tbl SET inventory_name =?,
                        inventory_location =?,inventory_longitude =?,inventory_latitude =?,
                        inventory_address =?,inventory_mail=?,inventory_phone=?,updatedby=?
                       WHERE inventory_id = ?`;
  const values = [
    inventoryName,
    inventoryLocation,
    inventoryLongitude,
    inventoryLatitude,
    inventoryAddress,
    inventoryEmail,
    inventoryPhone,
    req.empId,
    inventoryId,
  ];
  await db(updateQuery, values);
  res.status(200).send({
    message: 'inventory Details Updated successfully ' + inventoryName,
  });
});

exports.deleteInventory = catchAsync(async (req, res, next) => {
  const { inventoryId } = req.body;
  const deletecollection =
    'UPDATE azst_inventory_locations_tbl SET inventory_status = 0, updatedby=? WHERE inventory_id = ? ';
  const values = [req.empId, inventoryId];

  await db(deletecollection, values);
  res.status(200).json({ message: 'inventory deleted Successfully ' });
});

const schedule = require('node-schedule');
const { abandonmentCartUsers } = require('../controllers/Cart/getProducts');

// Schedule job to run every day at 11:50:55 PM
const job = schedule.scheduleJob('55 50 23 * * *', () => {
  //abandonmentCartUsers();
});

// Job is running every 5 minutes
// const Cjob = schedule.scheduleJob('*/1 * * * *', () => {
//   console.log('job is running');
//   //abandonmentCartUsers();
// });

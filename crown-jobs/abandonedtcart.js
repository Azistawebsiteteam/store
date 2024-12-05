const schedule = require('node-schedule');
const { abandonmentCartUsers } = require('../controllers/Cart/getProducts');

// Schedule job to run every day at 11:50:55 PM
// const job = schedule.scheduleJob('55 50 23 * * *', () => {
//   const req = {
//     protocol: 'https',
//     get: (header) => {
//       if (header === 'host') {
//         return 'yourdomain.com';
//       }
//       return '';
//     },
//   };

//   const res = {};
//   const next = () => {};

//   // abandonmentCartUsers(req, res, next);
// });

// Job is running every 5 minutes
// const Cjob = schedule.scheduleJob('*/1 * * * *', () => {
//   console.log('job is running');
//   const req = {
//     protocol: 'https',
//     get: (header) => {
//       if (header === 'host') {
//         return 'yourdomain.com'; // Replace with your actual domain or hostname
//       }
//       return '';
//     },
//   };

//   const res = {}; // Mock `res` if needed, but it's not actively used in your function
//   const next = () => {}; // Mock `next` as a no-op function

//   //abandonmentCartUsers(req, res, next);
// });

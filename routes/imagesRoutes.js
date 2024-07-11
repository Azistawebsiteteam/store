const express = require('express');
const path = require('path');

const router = express.Router();

// Helper function to resolve and set up static routes
function setupStaticRoute(routePath, folderName) {
  const resolvedPath = path.resolve(__dirname, `../Uploads/${folderName}`);
  router.use(routePath, express.static(resolvedPath));
}

// Set up static file serving routes
setupStaticRoute('/brand/logs', 'brandlogos');
setupStaticRoute('/product/thumbnail', 'productImages');
setupStaticRoute('/product/variantimage', 'variantImage');
setupStaticRoute('/banners', 'bannerImages');
setupStaticRoute('/collection', 'CollectionImages');
setupStaticRoute('/admin/profile', 'AdminImages');
setupStaticRoute('/popup', 'PopupImages');
setupStaticRoute('/review', 'reviewImages');
setupStaticRoute('/product', 'productImages');
setupStaticRoute('/blog', 'blogImages');

module.exports = router;

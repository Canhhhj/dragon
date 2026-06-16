# Dragon Activiti - Admin & Website Data Integration Guide

## Overview

This document describes how the Dragon Activiti e-commerce system synchronizes data between the Admin Panel (`admin.html`) and the Website (`index.html` and `giaodien.html`).

## Architecture

### Files

1. **data-bridge.js** - Core data synchronization layer
   - Manages localStorage communication between admin and website
   - Provides unified API for products, orders, promos, and settings
   - Handles data migration between legacy and new formats

2. **website-integration.js** - Website-specific integration
   - Syncs admin products to website rendering
   - Overrides checkout to capture orders in admin system
   - Listens for admin changes and updates website accordingly

3. **admin.html** - Admin Control Panel
   - Manages products, orders, customers, promos
   - Stores data in localStorage with keys: `da_prods`, `da_ord_st`, `da_promos`, `da_banner`, `da_logo`, `da_store`
   - Central state stored in `dragon_state`

4. **index.html** - Main website page
   - Homepage with product showcase
   - Reads products from admin via `dragon_state`
   - Includes data-bridge.js and website-integration.js

5. **giaodien.html** - Product listing & checkout page
   - Product catalog with search and filtering
   - Shopping cart functionality
   - Checkout and order placement
   - Includes data-bridge.js and website-integration.js

## Data Flow

### Products

```
Admin Panel (admin.html)
  ↓ (saves products)
localStorage['da_prods']
  ↓ (syncs to)
localStorage['dragon_state'].adminProducts
  ↓ (reads by)
Website (index.html / giaodien.html)
  ↓ (displays products)
Users see products with admin-managed prices, stock, status
```

### Orders

```
Website Checkout
  ↓ (user places order)
placeOrder() - saves locally
  ↓ (also calls)
DragonState.addOrder()
  ↓ (stores in)
localStorage['dragon_state'].orders
  ↓ (admin reads)
Admin Panel Orders Dashboard
  ↓ (admin can update status)
localStorage['da_ord_st']
```

### Promo Codes

```
Admin Panel
  ↓ (creates codes)
localStorage['da_promos']
  ↓ (available for checkout)
Website Checkout
  ↓ (user applies code)
DragonState.getPromoByCode()
  ↓ (calculates discount)
Order discount applied
```

### Settings

- **Logo**: `localStorage['da_logo']` → Applied to website header
- **Banner**: `localStorage['da_banner']` → Hero image, text, promo bar
- **Store Info**: `localStorage['da_store']` → Contact info on website

## localStorage Keys Reference

### Admin Panel

| Key | Purpose | Format |
|-----|---------|--------|
| `da_creds` | Admin credentials | `{username, password, display}` |
| `da_prods` | Product inventory | `[{id, name, price, stock, ...}]` |
| `da_ord_st` | Order statuses | `{orderId: status}` |
| `da_promos` | Promo codes | `[{code, pct, minOrder, exp}]` |
| `da_banner` | Banner settings | `{heroUrl, heroH1, heroSub, ...}` |
| `da_logo` | Logo settings | `{abbr, color, name, highlight}` |
| `da_store` | Store info | `{name, phone, zalo, fb, address}` |

### Website

| Key | Purpose | Format |
|-----|---------|--------|
| `dragon_activiti_cart` | Shopping cart | `[{id, name, price, qty, size}]` |
| `dragon_activiti_orders` | Order history | `[{code, items, totals, ...}]` |
| `dragon_activiti_customer` | Customer info | `{name, phone, email, address}` |
| `dragon_activiti_coupon` | Applied coupon | String (coupon code) |
| `dragon_state` | Unified state | Merged data from admin and website |

## API Reference

### DragonState Object

```javascript
// Get main state
const state = DragonState.getState();

// Get products
const products = DragonState.getAllProducts();
const adminProds = DragonState.getAdminProducts();

// Manage orders
const orders = DragonState.getOrders();
DragonState.addOrder({name, phone, items, total, ...});
DragonState.getOrderStatus(orderId);
DragonState.updateOrderStatus(orderId, 'shipped');

// Get settings
const promos = DragonState.getPromos();
const promo = DragonState.getPromoByCode('DRAGON20');
const banner = DragonState.getBannerSettings();
const logo = DragonState.getLogoSettings();
const store = DragonState.getStoreInfo();
```

### Website Integration

```javascript
// Automatically initializes on page load
window.websiteIntegration.init();

// Manual sync
window.websiteIntegration.syncAdminProducts();
window.websiteIntegration.setupCheckoutSync();
```

## Usage Instructions

### For Admin

1. **Add Products**
   - Go to Products section in admin
   - Click "Thêm sản phẩm"
   - Fill in details: name, brand, price, stock, images
   - Click "Lưu sản phẩm"
   - Products sync automatically to website

2. **Create Promo Codes**
   - Go to Promo section
   - Click "Thêm mã mới"
   - Enter code, discount %, min order
   - Save
   - Code available immediately on website

3. **Manage Orders**
   - Orders from website appear automatically in Orders tab
   - Update order status: Mới → Xử lý → Đang giao → Hoàn thành
   - View customer details and order items

4. **Update Banner**
   - Go to Banner section
   - Upload hero image or enter URL
   - Edit headline, subheading, description
   - Update topbar promo text
   - Save - changes visible immediately on website

### For Website Users

1. **Browse Products**
   - Products come from admin inventory
   - Stock and prices auto-update from admin changes

2. **Add to Cart**
   - Select size and quantity
   - Add to cart (saved locally)
   - Cart persists across browser sessions

3. **Apply Coupon**
   - Enter promo code from admin
   - Discount calculated automatically
   - Works for both percentage and free shipping promos

4. **Checkout**
   - Enter delivery info
   - Place order
   - Order sent to admin panel automatically
   - Confirmation shows order code

## Cross-Browser & Multi-Tab Support

- Changes in admin panel sync to all open website tabs automatically
- Website orders appear in admin panel in real-time
- Uses storage events for live synchronization

## Troubleshooting

### Products not showing on website
- Check: `localStorage['da_prods']` has data in admin
- Refresh website page (F5)
- Check browser console for errors in data-bridge.js

### Orders not appearing in admin
- Check: Website checkout actually calls `placeOrder()`
- Verify: `localStorage['dragon_state'].orders` exists
- Check: Admin refreshes to see new orders

### Promo codes not working
- Verify: Promo created in admin with correct code spelling
- Check: Order subtotal >= minOrder amount
- Ensure: Code hasn't expired (check expiration date)

### Sync not working across tabs
- Browser must support localStorage events (all modern browsers)
- Check: Not in private/incognito mode (some browsers limit storage)
- Try: Hard refresh (Ctrl+Shift+Delete on most browsers)

## Security Notes

- Currently using localStorage (client-side only)
- Credentials stored in plain localStorage - use simple password
- For production: Implement backend server with database
- Add authentication tokens and HTTPS encryption

## Future Enhancements

- [ ] Backend database integration
- [ ] Real-time sync with WebSockets
- [ ] Admin email notifications for new orders
- [ ] Automated inventory tracking
- [ ] Payment gateway integration
- [ ] Analytics dashboard
- [ ] Multi-language support
- [ ] SEO optimization

---

**Last Updated**: 2026-06-13
**Version**: 1.0.0

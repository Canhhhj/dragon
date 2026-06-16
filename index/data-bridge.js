/**
 * Dragon Activiti - Data Bridge
 * Synchronizes data between Admin Panel and Website
 * Handles Products, Orders, Promos, and Customer Info
 */

// ============================================================
// DRAGON STATE MANAGEMENT
// ============================================================
window.DragonState = {
  // Get or initialize the main state object
  getState() {
    try {
      return JSON.parse(localStorage.getItem('dragon_state') || '{}');
    } catch (e) {
      return {};
    }
  },

  // Save state to localStorage
  setState(data) {
    const state = this.getState();
    const merged = { ...state, ...data };
    localStorage.setItem('dragon_state', JSON.stringify(merged));
    // Trigger storage event for other tabs
    window.dispatchEvent(new StorageEvent('storage', {
      key: 'dragon_state',
      newValue: JSON.stringify(merged),
      oldValue: JSON.stringify(state)
    }));
  },

  // ============================================================
  // PRODUCTS MANAGEMENT
  // ============================================================
  getAdminProducts() {
    try {
      return JSON.parse(localStorage.getItem('da_prods') || '[]');
    } catch (e) {
      return [];
    }
  },

  setAdminProducts(products) {
    localStorage.setItem('da_prods', JSON.stringify(products));
    const state = this.getState();
    state.adminProducts = products;
    this.setState(state);
  },

  // Get all products (from admin or website fallback)
  getAllProducts() {
    const adminProds = this.getAdminProducts();
    if (adminProds && adminProds.length > 0) {
      return adminProds;
    }
    // Fallback to website products if admin has none
    const state = this.getState();
    return state.products || [];
  },

  // Sync website products to admin (includes all fields from website)
  syncWebsiteProductsToAdmin(websiteProducts) {
    if (!websiteProducts || websiteProducts.length === 0) return;
    const state = this.getState();
    state.websiteProducts = websiteProducts;
    this.setState(state);
  },

  // ============================================================
  // ORDERS MANAGEMENT
  // ============================================================
  getOrders() {
    const state = this.getState();
    return state.orders || [];
  },

  addOrder(orderData) {
    const state = this.getState();
    if (!state.orders) state.orders = [];
    
    // Create order with timestamp
    const order = {
      id: 'ORD-' + Date.now(),
      date: new Date().toISOString(),
      ...orderData
    };
    
    state.orders.push(order);
    this.setState(state);
    return order;
  },

  updateOrderStatus(orderId, status) {
    if (!window.localStorage) return false;
    const statusMap = JSON.parse(localStorage.getItem('da_ord_st') || '{}');
    statusMap[orderId] = status;
    localStorage.setItem('da_ord_st', JSON.stringify(statusMap));
    return true;
  },

  getOrderStatus(orderId) {
    if (!window.localStorage) return 'new';
    const statusMap = JSON.parse(localStorage.getItem('da_ord_st') || '{}');
    return statusMap[orderId] || 'new';
  },

  // ============================================================
  // PROMO CODES MANAGEMENT
  // ============================================================
  getPromos() {
    try {
      return JSON.parse(localStorage.getItem('da_promos') || '[]');
    } catch (e) {
      return [];
    }
  },

  getPromoByCode(code) {
    const promos = this.getPromos();
    return promos.find(p => p.code.toUpperCase() === code.toUpperCase());
  },

  // ============================================================
  // BANNER & LOGO SETTINGS
  // ============================================================
  getBannerSettings() {
    try {
      return JSON.parse(localStorage.getItem('da_banner') || '{}');
    } catch (e) {
      return {};
    }
  },

  getLogoSettings() {
    try {
      return JSON.parse(localStorage.getItem('da_logo') || '{}');
    } catch (e) {
      return {};
    }
  },

  // ============================================================
  // STORE INFO
  // ============================================================
  // ============================================================
  // BRAND MANAGEMENT
  // ============================================================
  getBrands() {
    try {
      return JSON.parse(localStorage.getItem('da_brands') || '[]');
    } catch (e) {
      return [];
    }
  },

  setBrands(brands) {
    localStorage.setItem('da_brands', JSON.stringify(brands));
    const state = this.getState();
    state.brands = brands;
    this.setState(state);
  },

  // Existing store info method follows
  getStoreInfo() {
    try {
      return JSON.parse(localStorage.getItem('da_store') || '{}');
    } catch (e) {
      return {};
    }
  },

  // ============================================================
  // CUSTOMER DATA
  // ============================================================
  saveCustomer(customerData) {
    const state = this.getState();
    state.lastCustomer = customerData;
    this.setState(state);
  },

  getCustomer() {
    const state = this.getState();
    return state.lastCustomer || {};
  },

  // ============================================================
  // CART SYNC (Website to Admin)
  // ============================================================
  syncCartToAdmin(cartData) {
    const state = this.getState();
    state.currentCart = cartData;
    this.setState(state);
  },

  // ============================================================
  // INITIALIZATION
  // ============================================================
  init() {
    // Listen for storage changes from other tabs/windows
    window.addEventListener('storage', (e) => {
      if (e.key === 'dragon_state' || e.key === 'da_prods' || e.key === 'da_promos') {
        // Trigger custom event for the website to update
        window.dispatchEvent(new CustomEvent('dragonStateChanged', {
          detail: { key: e.key }
        }));
      }
    });

    // If running on website, sync initial data
    if (window.location.pathname.includes('/index.html') || 
        window.location.pathname === '/' ||
        !window.location.pathname.includes('admin')) {
      this.initWebsiteSync();
    }
  },

  // Initialize website sync
  initWebsiteSync() {
    // Make products available to website
    window.addEventListener('dragonStateChanged', () => {
      // Website will handle product refresh
      if (window.refreshProductList) {
        window.refreshProductList();
      }
    });
  }
};

// ============================================================
// LEGACY DATA MIGRATION
// ============================================================
window.DragonLegacy = {
  // Migrate website cart to admin orders on checkout
  migrateCartToOrder() {
    const cartKey = 'dragon_activiti_cart';
    const orderKey = 'dragon_activiti_orders';
    const customerKey = 'dragon_activiti_customer';
    const couponKey = 'dragon_activiti_coupon';

    try {
      const cart = JSON.parse(localStorage.getItem(cartKey) || '[]');
      const customer = JSON.parse(localStorage.getItem(customerKey) || '{}');
      const coupon = localStorage.getItem(couponKey) || '';

      if (cart.length > 0 && customer.name) {
        // Calculate totals
        const subtotal = cart.reduce((sum, item) => sum + (item.price * item.qty), 0);
        const promos = window.DragonState.getPromos();
        const promoData = promos.find(p => p.code === coupon);
        
        let discount = 0;
        if (promoData) {
          if (promoData.free_ship && subtotal >= promoData.minOrder) {
            discount = 30000; // Shipping cost
          } else if (promoData.pct && subtotal >= promoData.minOrder) {
            discount = Math.round(subtotal * promoData.pct / 100);
          }
        }

        const shipping = subtotal >= 500000 ? 0 : 30000;
        const total = subtotal + shipping - discount;

        // Create order
        const order = window.DragonState.addOrder({
          name: customer.name,
          phone: customer.phone,
          email: customer.email || '',
          address: customer.address || '',
          items: cart.map(item => ({
            id: item.id,
            name: item.name,
            price: item.price,
            qty: item.qty,
            size: item.size
          })),
          subtotal,
          discount,
          shipping,
          total,
          coupon: coupon || null,
          notes: customer.notes || ''
        });

        // Clear website cart
        localStorage.removeItem(cartKey);
        localStorage.removeItem(couponKey);

        return order;
      }
    } catch (e) {
      console.error('Error migrating cart to order:', e);
    }
    return null;
  }
};

// ============================================================
// AUTO INITIALIZE ON LOAD
// ============================================================
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    window.DragonState.init();
  });
} else {
  window.DragonState.init();
}

// ============================================================
// EXPORT FOR MODULE SYSTEMS
// ============================================================
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { DragonState, DragonLegacy };
}

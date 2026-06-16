/**
 * Dragon Activiti - Integration Test & Setup
 * Run this in browser console to verify all connections are working
 */

window.dragonTest = {
  // Colors for console output
  colors: {
    success: 'color: #22c55e; font-weight: bold;',
    error: 'color: #ef4444; font-weight: bold;',
    warning: 'color: #f97316; font-weight: bold;',
    info: 'color: #3b82f6; font-weight: bold;',
    reset: 'color: inherit;'
  },

  log(msg, type = 'info') {
    const style = this.colors[type] || this.colors.info;
    console.log(`%c[Dragon Integration] ${msg}`, style);
  },

  // Test all connections
  runTests() {
    console.clear();
    this.log('🚀 Dragon Activiti Integration Test Suite', 'info');
    console.log('');

    this.testDataBridge();
    this.testState();
    this.testProducts();
    this.testOrders();
    this.testPromos();
    this.testSettings();
    this.testWebsiteIntegration();

    console.log('');
    this.log('✅ All tests completed!', 'success');
    this.showSummary();
  },

  testDataBridge() {
    this.log('Testing Data Bridge...', 'info');
    
    if (typeof window.DragonState === 'undefined') {
      this.log('❌ DragonState not found!', 'error');
      this.log('  → Make sure data-bridge.js is loaded', 'warning');
      return;
    }
    
    this.log('✓ DragonState available', 'success');
  },

  testState() {
    this.log('Testing State Management...', 'info');
    
    try {
      const state = window.DragonState.getState();
      this.log(`✓ State retrieved (${Object.keys(state).length} keys)`, 'success');
      
      // Test setState
      window.DragonState.setState({ test: true });
      const updated = window.DragonState.getState();
      if (updated.test) {
        this.log('✓ setState working', 'success');
        delete updated.test;
        window.localStorage.setItem('dragon_state', JSON.stringify(updated));
      }
    } catch (e) {
      this.log(`❌ State test failed: ${e.message}`, 'error');
    }
  },

  testProducts() {
    this.log('Testing Products Sync...', 'info');
    
    try {
      const adminProds = window.DragonState.getAdminProducts();
      this.log(`✓ Admin products: ${adminProds.length} items`, 'success');
      
      if (adminProds.length > 0) {
        const first = adminProds[0];
        this.log(`  → First product: "${first.name}" - ${first.price.toLocaleString('vi-VN')}đ`, 'reset');
      } else {
        this.log('  ⚠ No products in admin yet', 'warning');
      }

      const allProds = window.DragonState.getAllProducts();
      this.log(`✓ All products available: ${allProds.length} items`, 'success');
    } catch (e) {
      this.log(`❌ Products test failed: ${e.message}`, 'error');
    }
  },

  testOrders() {
    this.log('Testing Orders Sync...', 'info');
    
    try {
      const orders = window.DragonState.getOrders();
      this.log(`✓ Orders: ${orders.length} total`, 'success');
      
      if (orders.length > 0) {
        const recent = orders[0];
        this.log(`  → Latest: ${recent.name} - ${recent.total?.toLocaleString('vi-VN')}đ`, 'reset');
      }

      // Test adding an order
      const testOrder = window.DragonState.addOrder({
        name: 'Test Order',
        phone: '0900000000',
        email: 'test@example.com',
        address: 'Test Address',
        items: [],
        total: 0,
        notes: 'Test integration'
      });

      if (testOrder.id) {
        this.log('✓ Order creation working', 'success');
        // Clean up
        const state = window.DragonState.getState();
        state.orders = state.orders.filter(o => o.id !== testOrder.id);
        window.DragonState.setState(state);
      }
    } catch (e) {
      this.log(`❌ Orders test failed: ${e.message}`, 'error');
    }
  },

  testPromos() {
    this.log('Testing Promo Codes...', 'info');
    
    try {
      const promos = window.DragonState.getPromos();
      this.log(`✓ Promos: ${promos.length} codes available`, 'success');
      
      promos.forEach(p => {
        const discount = p.free_ship ? 'Free Ship' : p.pct + '%';
        this.log(`  → ${p.code}: ${discount} (Min: ${p.minOrder.toLocaleString('vi-VN')}đ)`, 'reset');
      });

      // Test getting promo by code
      if (promos.length > 0) {
        const code = promos[0].code;
        const found = window.DragonState.getPromoByCode(code);
        if (found) {
          this.log(`✓ Promo lookup working (found "${code}")`, 'success');
        }
      }
    } catch (e) {
      this.log(`❌ Promos test failed: ${e.message}`, 'error');
    }
  },

  testSettings() {
    this.log('Testing Settings...', 'info');
    
    try {
      const banner = window.DragonState.getBannerSettings();
      if (Object.keys(banner).length > 0) {
        this.log(`✓ Banner settings loaded (${Object.keys(banner).length} properties)`, 'success');
      } else {
        this.log('⚠ No banner settings configured yet', 'warning');
      }

      const logo = window.DragonState.getLogoSettings();
      if (Object.keys(logo).length > 0) {
        this.log(`✓ Logo settings loaded: ${logo.name} ${logo.highlight}`, 'success');
      } else {
        this.log('⚠ No logo settings configured yet', 'warning');
      }

      const store = window.DragonState.getStoreInfo();
      if (store.name) {
        this.log(`✓ Store info: ${store.name} - ${store.phone}`, 'success');
      }
    } catch (e) {
      this.log(`❌ Settings test failed: ${e.message}`, 'error');
    }
  },

  testWebsiteIntegration() {
    this.log('Testing Website Integration...', 'info');
    
    if (typeof window.websiteIntegration === 'undefined') {
      this.log('⚠ Website integration not loaded (only for website pages)', 'warning');
      return;
    }

    this.log('✓ Website integration script loaded', 'success');

    if (typeof window.products !== 'undefined') {
      this.log(`✓ Products array initialized: ${window.products.length} items`, 'success');
    } else {
      this.log('⚠ Products array not found (may load after page render)', 'warning');
    }
  },

  showSummary() {
    const state = window.DragonState.getState();
    console.table({
      'Admin Products': window.DragonState.getAdminProducts().length,
      'Total Orders': window.DragonState.getOrders().length,
      'Promo Codes': window.DragonState.getPromos().length,
      'State Keys': Object.keys(state).length,
      'LocalStorage Size': this.getStorageSize() + ' KB'
    });
  },

  getStorageSize() {
    let total = 0;
    for (let key in window.localStorage) {
      if (window.localStorage.hasOwnProperty(key)) {
        total += window.localStorage[key].length + key.length;
      }
    }
    return (total / 1024).toFixed(2);
  },

  // Setup demo data for testing
  setupDemoData() {
    this.log('Setting up demo data...', 'info');

    // Add demo products
    const demoProducts = [
      {
        id: Date.now(),
        name: 'Nike Air Force 1 White Demo',
        brand: 'Nike',
        price: 2500000,
        oldPrice: 3200000,
        stock: 15,
        status: 'available',
        img: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=400&q=80',
        desc: 'Classic white sneaker',
        sizes: '38,39,40,41,42,43,44',
        tags: 'white, classic'
      }
    ];
    
    window.DragonState.setAdminProducts(demoProducts);
    this.log('✓ Demo product added', 'success');

    // Add demo order
    const demoOrder = window.DragonState.addOrder({
      name: 'Khách Demo',
      phone: '0909123456',
      email: 'demo@example.com',
      address: '123 Demo Street, City',
      items: [{ name: 'Demo Shoe', price: 2500000, qty: 1 }],
      total: 2500000
    });
    this.log('✓ Demo order added', 'success');
  },

  // Clear all test data
  clearAllData() {
    if (confirm('Are you sure? This will clear ALL data from localStorage!')) {
      window.localStorage.clear();
      this.log('✓ All data cleared', 'success');
      window.location.reload();
    }
  },

  // Show help
  help() {
    console.clear();
    this.log('Dragon Integration - Console Commands', 'info');
    console.log(`
Available commands:

  dragonTest.runTests()           - Run all integration tests
  dragonTest.setupDemoData()      - Add demo products and orders
  dragonTest.clearAllData()       - Clear all localStorage data
  dragonTest.help()               - Show this message

State Access:
  DragonState.getState()          - Get main state
  DragonState.getAdminProducts()  - Get products
  DragonState.getOrders()         - Get orders
  DragonState.getPromos()         - Get promo codes
  DragonState.getBannerSettings() - Get banner config
  DragonState.getLogoSettings()   - Get logo config
  DragonState.getStoreInfo()      - Get store info

Examples:
  // View all products
  console.table(DragonState.getAdminProducts());

  // View all orders
  console.table(DragonState.getOrders());

  // Get specific promo
  DragonState.getPromoByCode('FS2026');

  // Create test order
  DragonState.addOrder({
    name: 'John Doe',
    phone: '0909123456',
    email: 'john@example.com',
    address: '123 Main St',
    items: [],
    total: 1000000
  });
    `);
  }
};

// Auto-show help on first load
console.log('%c💡 Type: dragonTest.help() for commands', 'color: #f97316; font-size: 12px;');

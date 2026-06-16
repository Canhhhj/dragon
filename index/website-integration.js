/**
 * Dragon Activiti - Website to Admin Integration
 * Syncs ALL product data from admin and orders back to admin
 */

const DEFAULT_NAV_BRANDS = [
  { id: 'm-home', name: 'Trang chủ', logo: '', showOnNav: true, type: 'link' },
  { id: 'b-nike', name: 'Nike', logo: '', showOnNav: true, type: 'brand' },
  { id: 'b-adidas', name: 'Adidas', logo: '', showOnNav: true, type: 'brand' },
  { id: 'b-mlb', name: 'MLB', logo: '', showOnNav: true, type: 'brand' },
  { id: 'b-puma', name: 'Puma', logo: '', showOnNav: true, type: 'brand' },
  { id: 'b-fila', name: 'Fila', logo: '', showOnNav: true, type: 'brand' },
  { id: 'b-nb', name: 'New Balance', logo: '', showOnNav: true, type: 'brand' },
  { id: 'b-onitsuka', name: 'Onitsuka', logo: '', showOnNav: true, type: 'brand' },
  { id: 'b-jeep', name: 'Jeep', logo: '', showOnNav: true, type: 'brand' },
  { id: 'b-asics', name: 'Asics', logo: '', showOnNav: true, type: 'brand' },
  { id: 'b-mizuno', name: 'Mizuno', logo: '', showOnNav: true, type: 'brand' },
  { id: 'b-kamito', name: 'Kamito', logo: '', showOnNav: true, type: 'brand' },
  { id: 'b-lining', name: 'Li-ning', logo: '', showOnNav: true, type: 'brand' },
  { id: 'b-yonex', name: 'Yonex', logo: '', showOnNav: true, type: 'brand' },
  { id: 'b-mira', name: 'Mira', logo: '', showOnNav: true, type: 'brand' },
  { id: 'b-beyono', name: 'Beyono', logo: '', showOnNav: true, type: 'brand' },
  { id: 'b-kawasaki', name: 'Kawasaki', logo: '', showOnNav: true, type: 'brand' },
  { id: 'm-khac', name: 'Giày Khác', logo: '', showOnNav: true, type: 'link' },
  { id: 'm-bongchuyen', name: 'Giày Bóng Chuyền', logo: '', showOnNav: true, type: 'link' },
  { id: 'm-quanao', name: 'Quần Áo / Phụ Kiện', logo: '', showOnNav: true, type: 'link' },
  { id: 'm-nuochoa', name: 'Nước Hoa', logo: '', showOnNav: true, type: 'link' },
  { id: 'm-order', name: 'Hàng Order', logo: '', showOnNav: true, type: 'link' },
  { id: 'm-blog', name: 'Blog', logo: '', showOnNav: true, type: 'link' }
];

// Initialize website with admin products and data
window.websiteIntegration = {
  ensureNavBrands() {
    let brands = [];
    try { brands = JSON.parse(localStorage.getItem('da_brands') || '[]'); } catch (e) {}

    let needsSave = false;

    if (!brands.length || !brands.some(b => b.id === 'm-home')) {
      brands = JSON.parse(JSON.stringify(DEFAULT_NAV_BRANDS));
      needsSave = true;
    } else if (!localStorage.getItem('da_brands_merged_v3')) {
      DEFAULT_NAV_BRANDS.forEach(def => {
        const exists = brands.some(b =>
          b.id === def.id
          || (b.name && def.name && b.name.toLowerCase() === def.name.toLowerCase())
        );
        if (!exists) {
          brands.push(JSON.parse(JSON.stringify(def)));
          needsSave = true;
        }
      });
      localStorage.setItem('da_brands_merged_v3', 'true');
    }

    brands.forEach(b => {
      if (b.showOnNav === false) {
        b.showOnNav = true;
        needsSave = true;
      }
    });

    if (needsSave) {
      localStorage.setItem('da_brands', JSON.stringify(brands));
      if (window.DragonState) window.DragonState.setBrands(brands);
    }

    return brands;
  },

  init() {
    // Wait for DragonState to be available
    if (typeof window.DragonState === 'undefined') {
      setTimeout(() => this.init(), 50);
      return;
    }

    console.log('[integration] Initializing website integration');

    // Import products from website to admin if not already done
    this.importProductsFromWeb();

    // Sync products from admin
    this.syncAdminProductsToPage();

    // Sync brand, logo and banner settings from admin
    this.syncBrandAndBannerToPage();

    // Sync brand nav bar from admin
    this.syncBrandsToNavBar();

    // Sync website data to admin (if running on website)
    this.syncWebsiteDataToAdmin();

    // Listen for admin changes
    window.addEventListener('dragonStateChanged', () => {
      this.syncAdminProductsToPage();
      this.syncBrandAndBannerToPage();
      this.syncBrandsToNavBar();
    });

    // Auto-sync website state periodically
    setInterval(() => this.syncWebsiteDataToAdmin(), 5000);

    // Override checkout to sync to admin
    this.setupCheckoutSync();
    
    console.log('[integration] Initialization complete');
  },

  // Sync admin brands to the website navigation bar
  syncBrandsToNavBar() {
    if (typeof window.DragonState === 'undefined') return;
    const brands = this.ensureNavBrands();
    if (!brands.length) return;

    const navWrap = document.querySelector('.nav-wrap');
    if (!navWrap) return;
    const nav = navWrap.querySelector('nav');
    if (!nav) return;

    console.log('[integration] syncBrandsToNavBar - brands:', brands.length);

    // Clear existing navigation links entirely!
    nav.innerHTML = '';

    const INFO_LINK_IDS = ['m-quanao', 'm-nuochoa', 'm-order', 'm-blog'];

    // Render exactly based on the brands array
    brands.filter(b => b.showOnNav !== false).forEach(b => {
      const a = document.createElement('a');
      a.href = '#';

      // Determine display name
      let displayName = b.name;
      if(b.type !== 'link' && !displayName.toLowerCase().startsWith('giày')) {
        displayName = 'Giày ' + displayName;
      }
      a.textContent = displayName;

      // Find the actual brand target for filtering
      let filterTarget = b.name;
      if (b.id === 'm-khac') filterTarget = 'Khác';
      else if (b.id === 'm-bongchuyen') filterTarget = 'Bóng Chuyền';

      // Determine if this nav link should be active based on window.currentBrandFilter
      const currentFilter = window.currentBrandFilter || 'all';
      const normTarget = (b.id === 'm-home' ? 'all' : filterTarget).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace('giay ', '').trim();
      const normFilter = currentFilter.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace('giay ', '').trim();

      if (normTarget === normFilter || (b.id === 'm-home' && (normFilter === 'all' || normFilter === 'trang chu'))) {
        a.classList.add('active');
      }

      if (INFO_LINK_IDS.includes(b.id)) {
        a.setAttribute('data-info-link', '1');
        a.onclick = (e) => {
          e.preventDefault();
          nav.querySelectorAll('a').forEach(n => n.classList.remove('active'));
          a.classList.add('active');
          if (typeof openModal === 'function') {
            openModal(displayName, '<div class="empty-state">Nội dung thông tin/sản phẩm đã sẵn sàng để thay bằng dữ liệu thật khi có sản phẩm.</div>');
          }
        };
      } else if (b.id === 'm-home') {
        a.setAttribute('data-brand', 'all');
        a.onclick = (e) => {
          e.preventDefault();
          nav.querySelectorAll('a').forEach(n => n.classList.remove('active'));
          a.classList.add('active');
          window.currentBrandFilter = 'all';
          if (typeof window.filterBrandNav === 'function') window.filterBrandNav('all');
          else if (typeof window.filterProducts === 'function') window.filterProducts('all');
        };
      } else {
        a.setAttribute('data-brand', filterTarget);
        a.onclick = (e) => {
          e.preventDefault();
          nav.querySelectorAll('a').forEach(n => n.classList.remove('active'));
          a.classList.add('active');
          window.currentBrandFilter = filterTarget;
          if (typeof window.filterBrandNav === 'function') window.filterBrandNav(filterTarget);
          else if (typeof window.filterProducts === 'function') window.filterProducts(filterTarget);
        };
      }

      nav.appendChild(a);
    });

    if (typeof window.initNavScroll === 'function') {
      window.initNavScroll();
      setTimeout(() => window.initNavScroll(), 200);
    }
  },


  // Load admin products and update the page
  syncAdminProductsToPage() {
    const adminProducts = window.DragonState.getAdminProducts();
    console.log('[integration] syncAdminProductsToPage - admin products:', adminProducts?.length || 0);
    
    if (!adminProducts) return;

    // Try to update window.products if it exists
    if (typeof window.products !== 'undefined' && Array.isArray(window.products)) {
      console.log('[integration] Updating window.products from', window.products.length, 'to', adminProducts.length);
      
      window.products = adminProducts.map(prod => ({
        id: prod.id ? String(prod.id) : String(prod.name).replace(/\s+/g, '-').toLowerCase(),
        name: prod.name,
        img: prod.img || 'https://via.placeholder.com/300',
        img2: prod.img2 || '',
        img3: prod.img3 || '',
        price: prod.price,
        oldPrice: prod.oldPrice || 0,
        soldOut: prod.status === 'soldout',
        brand: prod.brand || 'Khác',
        discount: prod.oldPrice && prod.price ? Math.round((1 - prod.price / prod.oldPrice) * 100) : 0,
        sale: false,
        sizes: (prod.sizes || '38,39,40,41,42,43,44').split(',').filter(s => s.trim()),
        stock: prod.stock || 10,
        sku: prod.id || 'SKU-' + Date.now(),
        desc: prod.desc || '',
        details: prod.details || [],
        tags: prod.tags || '',
        status: prod.status,
        card: null
      }));
      
      console.log('[integration] window.products updated to:', window.products.length);

      // Trigger dynamic re-render on the page
      if (typeof window.renderProductGrid === 'function') {
        window.renderProductGrid();
      }

      // Sync the sale/hot deals section too
      this.renderSaleSection();
    } else {
      console.log('[integration] window.products not yet defined');
    }
  },

  // Sync Logo, Brand, and Banner settings from admin state to page
  syncBrandAndBannerToPage() {
    if (typeof window.DragonState === 'undefined') return;
    const state = window.DragonState.getState();
    console.log('[integration] syncBrandAndBannerToPage', state);

    if (state.logo) {
      document.querySelectorAll('.brand-mark').forEach(el => {
        el.textContent = state.logo.abbr || 'DA';
        if (state.logo.color) {
          el.style.background = `linear-gradient(145deg, ${state.logo.color}, ${state.logo.color}aa)`;
        }
      });
      document.querySelectorAll('.brand-logo > span:last-child').forEach(el => {
        el.innerHTML = `${state.logo.name || 'Dragon'} <span>${state.logo.highlight || 'Activiti'}</span>`;
      });
    }

    if (state.banner) {
      const heroVisualImg = document.querySelector('.hero-visual img');
      if (heroVisualImg && state.banner.heroUrl) heroVisualImg.src = state.banner.heroUrl;
      
      if (state.banner.heroH1 !== undefined) {
        const heroH1 = document.querySelector('h1');
        if (heroH1) {
          heroH1.innerHTML = `${state.banner.heroH1 || ''}<br><span class="hero-highlight">${state.banner.heroSub || ''}</span>`;
        }
      }
      
      if (state.banner.heroDesc !== undefined) {
        const heroP = document.querySelector('.hero-text p:not(.hero-eyebrow)');
        if (heroP) heroP.textContent = state.banner.heroDesc;
      }
      
      if (state.banner.topbarText !== undefined) {
        const topbarText = document.querySelector('.topbar-text');
        if (topbarText) topbarText.textContent = state.banner.topbarText;
      }
      
      if (state.banner.topbarCode !== undefined) {
        const topbarPill = document.querySelector('.topbar-pill');
        if (topbarPill) {
          topbarPill.textContent = state.banner.topbarCode;
          if (!state.banner.topbarCode) {
            topbarPill.style.display = 'none';
          } else {
            topbarPill.style.display = '';
          }
        }
      }
      
      if (state.banner.topbarColor) {
        const topbar = document.querySelector('.topbar');
        if (topbar) topbar.style.background = state.banner.topbarColor;
      }
    }
  },

  // Render the sale / hot deals section dynamically
  renderSaleSection() {
    const saleGrid = document.querySelector('#sale-section .product-grid');
    if (!saleGrid) return;
    if (typeof window.products === 'undefined' || !Array.isArray(window.products)) return;

    // Helper functions for localized rendering
    const fmtMoney = (val) => {
      return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(val);
    };
    const escHtml = (value) => {
      return String(value ?? '').replace(/[&<>"']/g, char => ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;'
      }[char]));
    };

    // Filter products that are on sale (have discount > 0 or oldPrice > price) or are sold out
    // Slice to show up to 8 items
    const saleProducts = window.products.filter(p => p.discount > 0 || p.oldPrice > p.price || p.soldOut).slice(0, 8);

    if (saleProducts.length === 0) {
      saleGrid.innerHTML = '<div class="empty-state" style="grid-column: 1/-1; text-align: center; color: var(--muted); padding: 40px 0;">Không có sản phẩm khuyến mãi nào.</div>';
      return;
    }

    let html = '';
    saleProducts.forEach(p => {
      html += `
        <div class="product-card" data-id="${p.id}">
          <div class="product-img">
            <img src="${p.img}" alt="${escHtml(p.name)}" onerror="this.src='https://placehold.co/300x300/f8f8f8/ccc?text=Giay'"/>
            ${p.soldOut ? '<span class="badge-soldout">Hết hàng</span>' : ''}
            ${p.status === 'preorder' ? '<span class="badge-preorder">Đặt trước</span>' : ''}
            ${p.discount > 0 ? `<span class="badge-sale">-${p.discount}%</span>` : ''}
          </div>
          <div class="product-info">
            <div class="product-name">${p.name}</div>
            <div class="product-price">
              ${p.price ? `<span class="price-new">${fmtMoney(p.price)}</span>` : '<span class="price-soldout">Liên hệ</span>'}
              ${p.oldPrice > p.price ? `<span class="price-old">${fmtMoney(p.oldPrice)}</span>` : ''}
            </div>
          </div>
          <button class="add-cart-btn ${p.soldOut ? 'disabled' : ''}" ${p.soldOut ? 'disabled' : ''}>${p.soldOut ? 'HẾT HÀNG' : 'THÊM VÀO GIỎ'}</button>
        </div>
      `;
    });

    saleGrid.innerHTML = html;

    // Attach click listeners to dynamically rendered cards and buttons
    const cards = [...saleGrid.querySelectorAll('.product-card')];
    cards.forEach(card => {
      const productId = card.dataset.id;
      card.style.cursor = 'pointer';
      card.addEventListener('click', event => {
        if (event.target.closest('.add-cart-btn')) return;
        if (typeof window.renderProductDetail === 'function') {
          window.renderProductDetail(productId);
        }
      });
      const btn = card.querySelector('.add-cart-btn:not(.disabled)');
      if (btn) {
        btn.addEventListener('click', (e) => {
          e.stopPropagation();
          if (typeof window.addToCart === 'function') {
            window.addToCart(productId);
          }
        });
      }
    });
  },

  // Sync ALL website data back to admin
  syncWebsiteDataToAdmin() {
    if (typeof window.DragonState === 'undefined') return;

    try {
      const state = window.DragonState.getState();

      // Sync website cart
      if (typeof window.state !== 'undefined' && window.state.cart) {
        state.websiteCart = JSON.parse(JSON.stringify(window.state.cart));
      }

      // Sync website customer data
      if (typeof window.state !== 'undefined' && window.state.customer) {
        state.websiteCustomer = JSON.parse(JSON.stringify(window.state.customer));
      }

      // Sync website orders
      if (typeof window.state !== 'undefined' && window.state.orders) {
        state.websiteOrders = JSON.parse(JSON.stringify(window.state.orders));
      }

      // Sync website coupon
      if (typeof window.state !== 'undefined' && window.state.coupon) {
        state.websiteCoupon = window.state.coupon;
      }

      // Sync ALL website products (including variants not in admin)
      if (typeof window.products !== 'undefined' && window.products && window.products.length > 0) {
        state.websiteProductList = window.products.map(p => ({
          id: p.id,
          name: p.name,
          brand: p.brand,
          price: p.price,
          oldPrice: p.oldPrice,
          stock: p.stock,
          soldOut: p.soldOut,
          img: p.img,
          img2: p.img2,
          img3: p.img3,
          sizes: p.sizes,
          tags: p.tags,
          discount: p.discount,
          status: p.status
        }));
      }

      // Also sync legacy storage keys
      const legacyCart = JSON.parse(localStorage.getItem('dragon_activiti_cart') || '[]');
      const legacyOrders = JSON.parse(localStorage.getItem('dragon_activiti_orders') || '[]');
      const legacyCustomer = JSON.parse(localStorage.getItem('dragon_activiti_customer') || '{}');
      const legacyCoupon = localStorage.getItem('dragon_activiti_coupon') || '';

      if (legacyCart.length > 0) {
        state.legacyCart = legacyCart;
      }
      if (legacyOrders.length > 0) {
        state.legacyOrders = legacyOrders;
      }
      if (Object.keys(legacyCustomer).length > 0) {
        state.legacyCustomer = legacyCustomer;
      }
      if (legacyCoupon) {
        state.legacyCoupon = legacyCoupon;
      }

      window.DragonState.setState(state);
    } catch (e) {
      // Silently handle errors
      console.error('Sync error:', e);
    }
  },

  // Setup order sync
  setupCheckoutSync() {
    // Wait for placeOrder function to be defined
    if (typeof window.placeOrder === 'undefined') {
      setTimeout(() => this.setupCheckoutSync(), 100);
      return;
    }

    // Override the original placeOrder function
    const originalPlaceOrder = window.placeOrder;
    window.placeOrder = function(form) {
      // Call original
      originalPlaceOrder(form);

      // Also sync to admin with ALL order details
      if (typeof window.DragonState !== 'undefined') {
        const data = Object.fromEntries(new FormData(form).entries());
        const totals = window.cartTotals ? window.cartTotals() : { subtotal: 0, discount: 0, shipping: 0, total: 0 };
        
        const order = window.DragonState.addOrder({
          name: data.name,
          phone: data.phone,
          email: data.email || '',
          address: data.address || '',
          items: window.state && window.state.cart ? window.state.cart.map(item => ({
            id: item.id,
            name: item.name,
            price: item.price,
            qty: item.qty,
            size: item.size,
            img: item.img
          })) : [],
          subtotal: totals.subtotal,
          discount: totals.discount,
          shipping: totals.shipping,
          total: totals.total,
          notes: data.note || '',
          payment: data.payment || 'COD',
          coupon: window.state?.coupon || ''
        });

        // Sync to state immediately
        window.websiteIntegration.syncWebsiteDataToAdmin();

        console.log('Order synced to admin:', order);
      }
    };
  },

  // Import website hardcoded products to Admin Panel database (localStorage)
  importProductsFromWeb() {
    // Check if we have already imported products
    if (localStorage.getItem('da_imported_from_web') === 'true') {
      return;
    }

    // Get the products currently parsed from the HTML (in window.products)
    if (typeof window.products === 'undefined' || !Array.isArray(window.products) || window.products.length === 0) {
      return;
    }

    console.log('[integration] Importing products from website to admin...');
    
    // Get existing admin products
    let adminProds = [];
    try {
      adminProds = JSON.parse(localStorage.getItem('da_prods') || '[]');
    } catch(e) {}

    // Merge: for each website product, if it's not in adminProds (by name), add it.
    let importedCount = 0;
    window.products.forEach(p => {
      const exists = adminProds.some(ap => ap.name.trim().toLowerCase() === p.name.trim().toLowerCase());
      if (!exists) {
        // Map website product structure to admin product structure
        const newAdminProd = {
          id: p.id || 'prod-' + Date.now() + '-' + Math.floor(Math.random() * 1000),
          name: p.name,
          brand: p.brand || 'Khác',
          price: p.price || 0,
          oldPrice: p.oldPrice || 0,
          stock: p.stock || 10,
          status: p.soldOut ? 'soldout' : 'available',
          img: p.img || '',
          img2: p.img2 || '',
          img3: p.img3 || '',
          desc: p.desc || (p.brand + ' chính hãng, phong cách thể thao'),
          details: p.details && p.details.length > 0 ? p.details : [
            p.brand + ' chính hãng',
            'Thiết kế thời trang, êm ái',
            'Phù hợp nhiều hoạt động thể thao & dạo phố'
          ],
          sizes: p.sizes ? p.sizes.join(',') : '38,39,40,41,42,43,44',
          tags: p.tags || ''
        };
        adminProds.push(newAdminProd);
        importedCount++;
      }
    });

    if (importedCount > 0) {
      localStorage.setItem('da_prods', JSON.stringify(adminProds));
      // Also update the main state
      const state = window.DragonState.getState();
      state.adminProducts = adminProds;
      window.DragonState.setState(state);
      console.log(`[integration] Successfully imported ${importedCount} products to Admin Panel!`);
    }

    localStorage.setItem('da_imported_from_web', 'true');
  }
};

// Start integration when ready - after all scripts and products variable initialized
setTimeout(() => {
  console.log('[integration] Delayed init starting...');
  console.log('[integration] window.products available:', typeof window.products !== 'undefined');
  window.websiteIntegration.init();
}, 500);


/**
 * Dragon Activiti - Website to Admin Integration
 * Syncs ALL product data from admin and orders back to admin
 */

const DEFAULT_NAV_BRANDS = [
  { id: 'm-home', name: 'Trang Chủ', logo: '', showOnNav: true, type: 'link' },
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

    // Tag every element that has a hardcoded logo / banner / topbar value
    // with .da-fouc-hide so the inline <style data-da-head-override>
    // injected from <head> can replace it with ::before / ::after content
    // sourced from dragon_state. This is what prevents the first paint
    // from showing the old hardcoded text. The matching sync*() calls
    // below strip the class once the new text is in place.
    this.markFoucElements();

    // Sync products from admin
    this.syncAdminProductsToPage();

    // Sync brand, logo and banner settings from admin
    this.syncBrandAndBannerToPage();

    // Sync brand nav bar from admin
    this.syncBrandsToNavBar();

    // Render sneaker tabs from admin config (title + visible brands)
    this.renderSneakerTabs();

    // Render footer from admin config
    this.renderFooter();

    // Render sale section on init
    setTimeout(() => this.renderSaleSection(), 300);

    // Sync website data to admin (if running on website)
    this.syncWebsiteDataToAdmin();

    // Listen for admin changes
    window.addEventListener('dragonStateChanged', () => {
      this.syncAdminProductsToPage();
      this.syncBrandAndBannerToPage();
      this.syncBrandsToNavBar();
      this.renderSneakerTabs();
      this.renderFooter();
      this.renderSaleSection();
    });

    // Listen for storage changes (cross-tab sync)
    window.addEventListener('storage', (e) => {
      if (e.key === 'dragon_state') {
        this.renderFooter();
        this.renderSaleSection();
      }
    });

    // Auto-sync website state periodically
    setInterval(() => this.syncWebsiteDataToAdmin(), 5000);

    // Override checkout to sync to admin
    this.setupCheckoutSync();

    // Reveal the body now that every sync has finished. Until this point
    // the <head> FOUC script has been keeping <html> visibility:hidden,
    // and any <style data-da-head-override> injection we did in <head>
    // has already made the hardcoded logo / banner text reflect the
    // admin-synced values from localStorage. The DOM-level syncs in
    // init() (syncBrandAndBannerToPage, renderFooter, …) keep things
    // consistent in case the CSS approach missed a field. We use a
    // double-rAF to give the browser a chance to lay out + paint with
    // the new content before we flip visibility.
    this.syncAndReveal();
  },

  // Reveal the body after every sync in init() has run. The CSS-rule
  // gate (html:not(.da-paint-ready)) and the inline style set in <head>
  // are both undone here. We also schedule a hard-fail timeout so that
  // if some sync throws, the user never stares at a blank page forever.
  syncAndReveal() {
    var dom = document.documentElement;
    var reveal = function () {
      dom.classList.add('da-paint-ready');
      dom.style.visibility = 'visible';
    };
    // Hard fallback: if for any reason the normal path is delayed more
    // than 2.5s (e.g. a CDN hiccup, a network script that hangs), reveal
    // anyway. Better to show possibly-stale data than a white page.
    setTimeout(function () {
      if (!dom.classList.contains('da-paint-ready')) {
        console.warn('[integration] reveal fallback fired (init slow)');
        reveal();
      }
    }, 2500);
    requestAnimationFrame(function () {
      requestAnimationFrame(reveal);
    });
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
          window.currentBrandKey = 'all';
          // Reset the in-place "Xem tất cả" expansion so we land on the
          // first 20 products + the "Xem tất cả" button again.
          window.sneakerExpanded = false;
          // Apply the "Trang Chủ" filter (brandKey='all' → all brands)
          // without forcing scroll, then scroll to the top so the user
          // sees the hero + sale section + the sneaker tabs in order.
          if (typeof window.applySneakerFilter === 'function') {
            window.applySneakerFilter('all', false);
          } else if (typeof window.filterBrandNav === 'function') {
            window.filterBrandNav('all', { scroll: false });
          } else if (typeof window.filterProducts === 'function') {
            window.filterProducts('all');
          }
          if (typeof window.syncBrandTabs === 'function') {
            window.syncBrandTabs('all');
          }
          if (typeof window.syncNavActive === 'function') {
            window.syncNavActive('all');
          }
          window.scrollTo({ top: 0, behavior: 'smooth' });
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

    // Keep a separate list for sale section only - don't overwrite window.products
    // (window.products already contains the hardcoded HTML product list)
    window.adminProductsForSale = adminProducts.map(prod => ({
      id: prod.id ? String(prod.id) : String(prod.name).replace(/\s+/g, '-').toLowerCase(),
      name: prod.name,
      img: prod.img || 'https://via.placeholder.com/300',
      price: prod.price,
      oldPrice: prod.oldPrice || 0,
      soldOut: prod.status === 'soldout',
      brand: prod.brand || 'Khác',
      discount: 0,
      sale: true,
      status: prod.status
    }));

    console.log('[integration] window.adminProductsForSale updated to:', window.adminProductsForSale.length);

    // Only re-render the sale/hot deals section, do NOT touch other sections
    // (other sections like "Sản phẩm mới", "Bán chạy" use window.products from HTML)
    this.renderSaleSection();
  },

  // Tag the elements whose text the inline <head> CSS is going to override
  // with .da-fouc-hide. The selector list mirrors the rules in
  // <style data-da-head-override> inside index.html. We only tag what
  // we know we can replace; any element that admin state leaves
  // untouched is left alone so its hardcoded value still renders.
  markFoucElements() {
    const state = (window.DragonState && window.DragonState.getState) ? window.DragonState.getState() : {};
    const logo = state.logo || {};
    const banner = state.banner || {};

    const tag = (selector) => {
      document.querySelectorAll(selector).forEach(el => el.classList.add('da-fouc-hide'));
    };

    if (logo.abbr || logo.color) {
      tag('.brand-mark');
    }
    if (logo.name || logo.highlight) {
      tag('.brand-logo > span:last-child');
    }
    if (banner.heroH1) tag('h1');
    if (banner.heroDesc) tag('.hero-text > p:not(.hero-eyebrow)');
    if (banner.topbarText) tag('.topbar-text');
    if (banner.topbarCode) tag('.topbar-pill');
  },

  // Sync Logo, Brand, and Banner settings from admin state to page.
  // The <head> FOUC script injected a <style data-da-head-override> that
  // hides the original hardcoded text and shows ::before/::after content
  // sourced from dragon_state in localStorage. The matching DOM nodes
  // need to be marked with the .da-fouc-hide class for those CSS rules
  // to apply. After we overwrite the text/HTML to match the admin state
  // we strip the class, so the regular CSS takes over from then on.
  syncBrandAndBannerToPage() {
    if (typeof window.DragonState === 'undefined') return;
    const state = window.DragonState.getState();
    console.log('[integration] syncBrandAndBannerToPage', state);

    const markFouc = (el) => el && el.classList.add('da-fouc-hide');
    const unmarkFouc = (el) => el && el.classList.remove('da-fouc-hide');
    const darken = (hex) => {
      const h = String(hex || '').replace('#', '');
      if (h.length !== 6) return hex || '#b71c1c';
      const r = Math.max(0, parseInt(h.slice(0, 2), 16) - 0x28);
      const g = Math.max(0, parseInt(h.slice(2, 4), 16) - 0x28);
      const b = Math.max(0, parseInt(h.slice(4, 6), 16) - 0x28);
      return '#' + [r, g, b].map(x => x.toString(16).padStart(2, '0')).join('');
    };

    if (state.logo) {
      document.querySelectorAll('.brand-mark').forEach(el => {
        markFouc(el);
        el.textContent = state.logo.abbr || 'DA';
        if (state.logo.color) {
          el.style.background = `linear-gradient(145deg, ${state.logo.color} 0%, ${darken(state.logo.color)} 100%)`;
          el.style.boxShadow = `0 4px 14px ${state.logo.color}73, inset 0 0 0 2px rgba(255,255,255,0.15)`;
        }
        // unmark after the new text is in place so the regular CSS
        // (font-size:15px, font-weight:900) renders it correctly
        unmarkFouc(el);
      });
      document.querySelectorAll('.brand-logo > span:last-child').forEach(el => {
        markFouc(el);
        el.innerHTML = `${state.logo.name || 'Dragon'} <span>${state.logo.highlight || 'Activiti'}</span>`;
        unmarkFouc(el);
      });
    }

    if (state.banner) {
      const heroVisualImg = document.querySelector('.hero-visual img');
      if (heroVisualImg && state.banner.heroUrl) heroVisualImg.src = state.banner.heroUrl;

      // Only override H1/desc/topbar when the admin has set a NON-EMPTY
      // value. Empty == "use whatever the HTML default is".
      if (state.banner.heroH1) {
        const heroH1 = document.querySelector('h1');
        if (heroH1) {
          markFouc(heroH1);
          heroH1.innerHTML = `${state.banner.heroH1}<br><span class="hero-highlight">${state.banner.heroSub || ''}</span>`;
          unmarkFouc(heroH1);
        }
      }

      if (state.banner.heroDesc) {
        const heroP = document.querySelector('.hero-text p:not(.hero-eyebrow)');
        if (heroP) {
          markFouc(heroP);
          heroP.textContent = state.banner.heroDesc;
          unmarkFouc(heroP);
        }
      }

      if (state.banner.topbarText) {
        const topbarText = document.querySelector('.topbar-text');
        if (topbarText) {
          markFouc(topbarText);
          topbarText.textContent = state.banner.topbarText;
          unmarkFouc(topbarText);
        }
      }

      if (state.banner.topbarCode) {
        const topbarPill = document.querySelector('.topbar-pill');
        if (topbarPill) {
          markFouc(topbarPill);
          topbarPill.textContent = state.banner.topbarCode;
          if (!state.banner.topbarCode) {
            topbarPill.style.display = 'none';
          } else {
            topbarPill.style.display = '';
          }
          unmarkFouc(topbarPill);
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
    if (!saleGrid) {
      console.warn('[integration] saleGrid not found');
      return;
    }

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

    const adminList = (typeof window.adminProductsForSale !== 'undefined' && Array.isArray(window.adminProductsForSale))
      ? window.adminProductsForSale
      : [];
    const htmlList = (typeof window.products !== 'undefined' && Array.isArray(window.products))
      ? window.products
      : [];

    // Combined source: admin first, then HTML hardcoded products (avoid dups by name)
    const seenNames = new Set();
    const combined = [];
    adminList.forEach(p => {
      const key = String(p.name || '').toLowerCase();
      if (key && !seenNames.has(key)) { seenNames.add(key); combined.push(p); }
    });
    htmlList.forEach(p => {
      const key = String(p.name || '').toLowerCase();
      if (key && !seenNames.has(key)) { seenNames.add(key); combined.push(p); }
    });

    console.log('[integration] renderSaleSection - adminList:', adminList.length, 'htmlList:', htmlList.length, 'combined:', combined.length);

    if (!combined.length) {
      console.warn('[integration] combined empty, keeping HTML hardcoded');
      return;
    }

    let saleProducts = [];
    let saleDiscounts = {};
    let hasAdminSelection = false;
    try {
      const state = window.DragonState.getState();
      let selectedIds = (state && state.superSaleProductIds) || [];
      console.log('[integration] superSaleProductIds from state:', selectedIds);
      if (selectedIds.length) {
        hasAdminSelection = true;
        if (typeof selectedIds[0] === 'string') {
          selectedIds = selectedIds.map(name => ({ name: String(name), discount: 0 }));
        }
        if (selectedIds[0] && typeof selectedIds[0] === 'object' && selectedIds[0].id !== undefined && selectedIds[0].name === undefined) {
          const byId = Object.fromEntries(combined.map(p => [String(p.id), p]));
          selectedIds = selectedIds.map(item => {
            const p = byId[String(item.id)];
            return p ? { name: p.name, discount: Number(item.discount) || 0 } : null;
          }).filter(Boolean);
        }
        const byName = Object.fromEntries(combined.map(p => [String(p.name), p]));
        saleProducts = selectedIds.map(item => byName[String(item.name)]).filter(Boolean).slice(0, 10);
        selectedIds.forEach(item => {
          saleDiscounts[String(item.name)] = Number(item.discount) || 0;
        });
      }
    } catch (e) { /* ignore */ }

    // If admin selected nothing → leave section empty (do not fallback to HTML)
    if (!hasAdminSelection) {
      saleGrid.innerHTML = '<div class="empty-state" style="grid-column: 1/-1; text-align: center; color: var(--muted); padding: 40px 0;">Chưa có sản phẩm khuyến mãi. Vào trang quản trị để thêm.</div>';
      return;
    }

    if (saleProducts.length === 0) {
      saleGrid.innerHTML = '<div class="empty-state" style="grid-column: 1/-1; text-align: center; color: var(--muted); padding: 40px 0;">Không có sản phẩm khuyến mãi nào.</div>';
      return;
    }

    let html = '';
    saleProducts.forEach(p => {
      const discount = saleDiscounts[p.name] || p.discount || 0;
      const salePrice = discount > 0 ? Math.round(p.price * (1 - discount / 100)) : p.price;
      html += `
        <div class="product-card" data-id="${p.id}">
          <div class="product-img">
            <img src="${p.img}" alt="${escHtml(p.name)}" onerror="this.src='https://placehold.co/300x300/f8f8f8/ccc?text=Giay'"/>
            ${p.soldOut ? '<span class="badge-soldout">Hết hàng</span>' : ''}
            ${p.status === 'preorder' ? '<span class="badge-preorder">Đặt trước</span>' : ''}
            ${discount > 0 ? `<span class="badge-sale">-${discount}%</span>` : ''}
          </div>
          <div class="product-info">
            <div class="product-name">${p.name}</div>
            <div class="product-price">
              ${salePrice ? `<span class="price-new">${fmtMoney(salePrice)}</span>` : '<span class="price-soldout">Liên hệ</span>'}
              ${p.oldPrice > salePrice ? `<span class="price-old">${fmtMoney(p.oldPrice)}</span>` : ''}
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

  // Render the sneaker tabs section dynamically from admin's sneakerConfig
  // (visible brands list + section title). Also wires up the prev/next arrow
  // slider when the tabs overflow horizontally.
  renderSneakerTabs() {
    const tabsContainer = document.getElementById('sneaker-brand-tabs');
    const titleEl = document.getElementById('sneaker-section-title');
    if (!tabsContainer) return;

    const state = (window.DragonState && window.DragonState.getState) ? window.DragonState.getState() : {};
    const cfg = state.sneakerConfig;
    const DEFAULT_VISIBLE = ['Trang Chủ','Nike','Adidas','MLB','Puma','Fila'];
    const title = (cfg && cfg.title) ? cfg.title : 'Giày Sneaker';
    let visibleBrands = (cfg && Array.isArray(cfg.visibleBrands) && cfg.visibleBrands.length)
      ? cfg.visibleBrands
      : DEFAULT_VISIBLE;
    // Always make sure the first tab is "Trang Chủ" so the user lands on
    // the all-brands grid (first 20 products + "Xem tất cả" button) on a
    // fresh page load instead of jumping straight to Nike.
    const hasHome = visibleBrands.some(b => {
      const slug = (b || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\s+/g, '');
      return slug === 'trangchu' || slug === 'trang chu' || b === 'Trang Chủ' || b === 'Trang chủ';
    });
    if (!hasHome) visibleBrands = ['Trang Chủ', ...visibleBrands];

    if (titleEl) titleEl.textContent = '👟 ' + title;

    // Map brand name to the key that productMatchesBrand() understands.
    // Special keys: 'all' (Trang Chủ), 'khac', 'bongchuyen'
    const brandKeyOf = (name) => {
      const n = (name || '').trim();
      const slug = n.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\s+/g, '');
      // Trang Chủ → all products
      if (slug === 'trangchu' || n === 'Trang Chủ' || n === 'Trang chủ') return 'all';
      // Already normalised by brandKeyFromLabel in productMatchesBrand
      if (n === 'Giày Khác' || slug === 'giàykhác' || slug === 'giaykhac') return 'khac';
      if (n === 'Giày Bóng Chuyền' || slug === 'giàybóngchuyền' || slug === 'giaybongchuyen') return 'bongchuyen';
      // Generic: strip "Giày " prefix then use as-is (lowercased + diacritics removed)
      const stripped = n.replace(/^gi[àa]y\s+/i, '').trim();
      return stripped.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    };

    // Friendly display name on tab — keep "Giày X" unless name already starts with it
    const fmt = (name) => {
      const n = (name || '').trim();
      if (/^gi[àa]y\s+/i.test(n)) return n;
      return 'Giày ' + n;
    };

    tabsContainer.innerHTML = visibleBrands.map((b, i) => {
      const isHome = i === 0;
      const attrs = [
        'class="brand-tab' + (isHome ? ' active' : '') + '"',
        'data-brand-name="' + b.replace(/"/g, '&quot;') + '"',
        'data-brand-key="' + brandKeyOf(b) + '"',
        isHome ? 'id="sneaker-home-tab"' : '',
        isHome ? 'data-sneaker-home="1"' : '',
      ].filter(Boolean).join(' ');
      return `<div ${attrs}>${fmt(b)}</div>`;
    }).join('');

    // Wire click handlers — pass the correct brand-key so productMatchesBrand works
    tabsContainer.querySelectorAll('.brand-tab').forEach(tab => {
      tab.addEventListener('click', () => {
        tabsContainer.querySelectorAll('.brand-tab').forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        const brandKey = tab.dataset.brandKey;
        window.currentBrandFilter = tab.dataset.brandName;
        if (typeof applySneakerFilter === 'function') {
          applySneakerFilter(brandKey, false);
        }
        if (typeof scrollToSneakerSection === 'function') scrollToSneakerSection();
      });
    });

    // After (re)building the tab strip, ensure the grid reflects the
    // currently-active tab. Without this, a fresh page load leaves the
    // static HTML products in #sneaker-grid untouched, so the user sees
    // every hardcoded product instead of the first 20 + "Xem tất cả".
    //
    // Preserve the user's expand/collapse state when the active tab
    // hasn't changed. Otherwise (new tab, first paint, brand switch)
    // collapse the grid back to LIMIT.
    const activeTab = tabsContainer.querySelector('.brand-tab.active')
      || tabsContainer.querySelector('.brand-tab[data-sneaker-home="1"]')
      || tabsContainer.querySelector('.brand-tab');
    if (activeTab && typeof applySneakerFilter === 'function') {
      const activeKey = activeTab.dataset.brandKey || 'all';
      activeTab.classList.add('active');
      tabsContainer.querySelectorAll('.brand-tab').forEach(t => {
        if (t !== activeTab) t.classList.remove('active');
      });
      window.currentBrandFilter = activeTab.dataset.brandName || activeTab.textContent.trim();
      const sameTabAsBefore = window.currentBrandKey === activeKey;
      window.currentBrandKey = activeKey;
      // undefined → "respect existing window.sneakerExpanded if same tab"
      applySneakerFilter(activeKey, sameTabAsBefore ? undefined : false);
      if (typeof syncNavActive === 'function') {
        syncNavActive(window.currentBrandFilter);
      }
    }

    // Fade edges: show no-overflow class when everything fits, otherwise mask shows fade
    const wrap = document.getElementById('sneaker-tabs-wrap');

    const updateFade = () => {
      if (!wrap) return;
      const hasOverflow = tabsContainer.scrollWidth > tabsContainer.clientWidth + 2;
      wrap.classList.toggle('no-overflow', !hasOverflow);
    };

    if (!wrap.dataset.scrollWired) {
      wrap.dataset.scrollWired = '1';
      tabsContainer.addEventListener('scroll', updateFade, { passive: true });
      window.addEventListener('resize', updateFade);
    }
    // Run once after layout
    setTimeout(updateFade, 50);
  },

  // Render footer from dragon_state.footerConfig (set by admin "Footer" page)
  renderFooter() {
    const state = (window.DragonState && window.DragonState.getState) ? window.DragonState.getState() : {};
    const cfg = state.footerConfig;
    if (!cfg) return; // keep static fallback

    // Brand name + desc
    const nameEl = document.getElementById('footer-brand-name');
    if (nameEl && cfg.brandName) {
      const parts = String(cfg.brandName).trim().split(/\s+/);
      if (parts.length >= 2) {
        nameEl.innerHTML = parts[0] + ' <span>' + parts.slice(1).join(' ') + '</span>';
      } else {
        nameEl.textContent = cfg.brandName;
      }
    }
    const descEl = document.getElementById('footer-brand-desc');
    if (descEl && cfg.brandDesc) descEl.textContent = cfg.brandDesc;

    // Social links
    const socialsEl = document.getElementById('footer-socials');
    if (socialsEl) {
      const socials = [
        { name: 'Facebook',  url: cfg.facebook },
        { name: 'Instagram', url: cfg.instagram },
        { name: 'TikTok',    url: cfg.tiktok },
        { name: 'Zalo',      url: cfg.zalo }
      ].filter(s => s.url && String(s.url).trim());
      if (socials.length) {
        socialsEl.innerHTML = socials.map(s => {
          const isExternal = /^https?:\/\//.test(s.url);
          const attrs = isExternal ? 'target="_blank" rel="noopener noreferrer"' : '';
          return `<a href="${s.url}" ${attrs} style="color:#ccc; font-size:12px; border:1px solid #444; padding:5px 12px; border-radius:4px;">${s.name}</a>`;
        }).join('');
      }
    }

    // Parse a multiline list of "Label | URL" lines
    const parseItems = (text) => {
      if (!text) return [];
      return String(text).split(/\r?\n/).map(l => l.trim()).filter(Boolean).map(line => {
        const idx = line.indexOf('|');
        if (idx === -1) return { label: line.trim(), url: '#' };
        return { label: line.slice(0, idx).trim(), url: line.slice(idx + 1).trim() || '#' };
      });
    };

    // Render a footer column from title + items
    const renderCol = (colEl, title, itemsText) => {
      if (!colEl) return;
      const items = parseItems(itemsText);
      const oldH4 = colEl.querySelector('h4');
      const oldTitle = oldH4 ? oldH4.textContent : '';
      colEl.innerHTML = '';
      const h4 = document.createElement('h4');
      h4.textContent = title || oldTitle || '';
      colEl.appendChild(h4);
      if (items.length) {
        const ul = document.createElement('ul');
        ul.innerHTML = items.map(i => {
          const isExternal = /^https?:\/\//.test(i.url);
          const attrs = isExternal ? 'target="_blank" rel="noopener noreferrer"' : '';
          return `<li><a href="${i.url}" ${attrs}>${i.label}</a></li>`;
        }).join('');
        colEl.appendChild(ul);
      }
    };

    renderCol(document.getElementById('footer-col-1'), cfg.col1Title, cfg.col1Items);
    renderCol(document.getElementById('footer-col-2'), cfg.col2Title, cfg.col2Items);
    renderCol(document.getElementById('footer-col-3'), cfg.col3Title, cfg.col3Items);

    // Bottom bar
    const cpEl = document.getElementById('footer-copyright');
    if (cpEl && cfg.copyright) cpEl.textContent = cfg.copyright;
    const crEl = document.getElementById('footer-credit');
    if (crEl && cfg.credit) crEl.textContent = cfg.credit;
  },

  // Render footer from dragon_state.footerConfig (set by admin "Footer" page)
  renderFooter() {
    const state = (window.DragonState && window.DragonState.getState) ? window.DragonState.getState() : {};
    const cfg = state.footerConfig;
    if (!cfg) return; // keep static fallback

    // Brand name + desc
    const nameEl = document.getElementById('footer-brand-name');
    if (nameEl && cfg.brandName) {
      // Bold the first word(s) and keep "<span>Activiti</span>" style if present
      const parts = String(cfg.brandName).trim().split(/\s+/);
      if (parts.length >= 2) {
        nameEl.innerHTML = parts[0] + ' <span>' + parts.slice(1).join(' ') + '</span>';
      } else {
        nameEl.textContent = cfg.brandName;
      }
    }
    const descEl = document.getElementById('footer-brand-desc');
    if (descEl && cfg.brandDesc) descEl.textContent = cfg.brandDesc;

    // Social links
    const socialsEl = document.getElementById('footer-socials');
    if (socialsEl) {
      const socials = [
        { name: 'Facebook',  url: cfg.facebook },
        { name: 'Instagram', url: cfg.instagram },
        { name: 'TikTok',    url: cfg.tiktok },
        { name: 'Zalo',      url: cfg.zalo }
      ].filter(s => s.url && s.url.trim());
      if (socials.length) {
        socialsEl.innerHTML = socials.map(s => {
          const isExternal = /^https?:\/\//.test(s.url);
          const attrs = isExternal ? 'target="_blank" rel="noopener noreferrer"' : '';
          return `<a href="${s.url}" ${attrs} style="color:#ccc; font-size:12px; border:1px solid #444; padding:5px 12px; border-radius:4px;">${s.name}</a>`;
        }).join('');
      }
    }

    // Helper: parse a multiline list of "Label | URL" lines
    const parseItems = (text) => {
      if (!text) return [];
      return text.split(/\r?\n/).map(l => l.trim()).filter(Boolean).map(line => {
        const idx = line.indexOf('|');
        if (idx === -1) return { label: line.trim(), url: '#' };
        return { label: line.slice(0, idx).trim(), url: line.slice(idx + 1).trim() || '#' };
      });
    };

    // Helper: render a footer column from title + items
    const renderCol = (colEl, title, itemsText) => {
      if (!colEl) return;
      const items = parseItems(itemsText);
      const h4 = colEl.querySelector('h4');
      colEl.innerHTML = '';
      if (h4) {
        const t = title || (h4.textContent || '');
        colEl.appendChild(h4);
        h4.textContent = t;
      } else {
        const tEl = document.createElement('h4');
        tEl.textContent = title || '';
        colEl.appendChild(tEl);
      }
      if (items.length) {
        const ul = document.createElement('ul');
        ul.innerHTML = items.map(i => {
          const isExternal = /^https?:\/\//.test(i.url);
          const attrs = isExternal ? 'target="_blank" rel="noopener noreferrer"' : '';
          return `<li><a href="${i.url}" ${attrs}>${i.label}</a></li>`;
        }).join('');
        colEl.appendChild(ul);
      }
    };

    renderCol(document.getElementById('footer-col-1'), cfg.col1Title, cfg.col1Items);
    renderCol(document.getElementById('footer-col-2'), cfg.col2Title, cfg.col2Items);
    renderCol(document.getElementById('footer-col-3'), cfg.col3Title, cfg.col3Items);

    // Bottom bar
    const cpEl = document.getElementById('footer-copyright');
    if (cpEl && cfg.copyright) cpEl.textContent = cfg.copyright;
    const crEl = document.getElementById('footer-credit');
    if (crEl && cfg.credit) crEl.textContent = cfg.credit;
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
  }
};

// Start integration when ready. We previously waited 500ms hoping that
// window.products would be defined by then, but in practice data-bridge.js
// (which defines it) is a <script> loaded BEFORE this file, so it's
// already in scope. The 500ms wait was the main reason for the FOUC
// flash — the page was revealed long before the new logo/banner had a
// chance to apply. Init immediately; syncAndReveal() inside init()
// handles the visibility gate, and a 2.5s hard-fail fallback there
// guards against a stuck sync.
(function startIntegration() {
  function go() {
    console.log('[integration] init starting; window.products =', typeof window.products);
    window.websiteIntegration.init();
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', go);
  } else {
    go();
  }
})();


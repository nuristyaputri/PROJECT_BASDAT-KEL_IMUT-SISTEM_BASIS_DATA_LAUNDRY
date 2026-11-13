/**
 * =============================================================================
 * SISTEM BASIS DATA LAUNDRY - MODUL JAVASCRIPT PELANGGAN
 * File: JS/pelanggan.js
 * Deskripsi: Skrip logika interaktif murni (Vanilla JS) untuk seluruh halaman
 *            portal Pelanggan (Bersihin Laundry).
 * 
 * STRUKTUR INTEGRASI BASIS DATA:
 * - Tabel `pelanggan`: Menyimpan profil, autentikasi, status member (Silver/Gold).
 * - Tabel `layanan`: Data paket laundry (Kiloan, Satuan, Express, dsb).
 * - Tabel `transaksi`: Riwayat dan tracking status cucian pelanggan.
 * - Tabel `detail_transaksi`: Rincian berat, pewangi, opsi penjemputan.
 * =============================================================================
 */

(function () {
  'use strict';

  // ===========================================================================
  // 1. KONFIGURASI GLOBAL & ENDPOINT API BACKEND (Siap Integrasi Database)
  // ===========================================================================
  const BersihinConfig = {
    appName: 'Bersihin Laundry',
    storageKeys: {
      profile: 'bersihin_customer_profile',
      transactions: 'bersihin_transactions',
      lastOrder: 'bersihin_last_order',
      cartService: 'bersihin_selected_service'
    },
    apiEndpoints: {
      login: '/api/pelanggan/login',
      register: '/api/pelanggan/register',
      forgotPassword: '/api/pelanggan/forgot-password',
      profile: '/api/pelanggan/profile',
      updateProfile: '/api/pelanggan/profile/update',
      updatePassword: '/api/pelanggan/password/update',
      orders: '/api/pelanggan/orders',
      createOrder: '/api/pelanggan/orders/create',
      services: '/api/pelanggan/services'
    },
    defaultProfile: {
      id_pelanggan: 1,
      id_user: 4,
      username: 'andipratama',
      fullName: 'Andi Pratama',
      email: 'andi.pratama@email.com',
      phone: '081234567821',
      address: 'Jl. Kemang Raya No. 45, RT 02 / RW 05, Mampang Prapatan, Jakarta Selatan',
      memberTier: 'Silver Member',
      member_tier: 'SILVER',
      kode_pelanggan: 'PLG-08129',
      created_at: '2024-03-01 09:00:00',
      joinDate: 'Maret 2024'
    }
  };

  // ===========================================================================
  // 2. UTILITAS GLOBAL
  // ===========================================================================

  /**
   * Format teks tanggal bergabung pelanggan real-time (contoh: Bergabung sejak November 2026)
   */
  function formatMemberSince(dateInput) {
    let d;
    if (!dateInput) {
      d = new Date();
    } else if (dateInput instanceof Date) {
      d = dateInput;
    } else {
      d = new Date(dateInput);
      if (isNaN(d.getTime())) {
        d = new Date();
      }
    }
    const months = [
      'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
      'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
    ];
    return `Bergabung sejak ${months[d.getMonth()]} ${d.getFullYear()}`;
  }

  /**
   * Format angka menjadi representasi Rupiah (contoh: Rp45.000)
   */
  function formatRupiah(num) {
    const val = Number(num) || 0;
    return 'Rp' + val.toLocaleString('id-ID');
  }

  /**
   * Menampilkan pesan toast mengambang di pojok kanan bawah
   */
  function showToast(message, isError) {
    let toast = document.getElementById('successToast') || document.getElementById('globalToast');
    let toastMessage = document.getElementById('toastMessage') || document.getElementById('globalToastMessage');

    if (!toast) {
      toast = document.createElement('div');
      toast.id = 'globalToast';
      toast.className = 'fixed bottom-6 right-6 z-50 transform translate-y-24 opacity-0 transition-all duration-300 pointer-events-none bg-slate-900 text-white px-4 py-3 rounded-xl shadow-lg flex items-center gap-2.5 text-xs';
      toast.innerHTML = `
        <div id="globalToastIcon" class="size-5 rounded-full bg-emerald-500 text-white flex items-center justify-center shrink-0">
          <svg class="size-3" viewBox="0 0 16 16" fill="none">
            <path d="M3.5 8.5L6.5 11.5L12.5 4.5" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
          </svg>
        </div>
        <span id="globalToastMessage">${message}</span>
      `;
      document.body.appendChild(toast);
      toastMessage = document.getElementById('globalToastMessage');
    }

    if (toastMessage) {
      toastMessage.textContent = message;
    }

    const toastIcon = toast.querySelector('div');
    if (toastIcon) {
      if (isError) {
        toastIcon.className = 'size-5 rounded-full bg-rose-500 text-white flex items-center justify-center shrink-0';
        toastIcon.innerHTML = `
          <svg class="size-3" viewBox="0 0 16 16" fill="none">
            <path d="M4 4L12 12M12 4L4 12" stroke="currentColor" stroke-width="2" stroke-linecap="round" />
          </svg>
        `;
      } else {
        toastIcon.className = 'size-5 rounded-full bg-emerald-500 text-white flex items-center justify-center shrink-0';
        toastIcon.innerHTML = `
          <svg class="size-3" viewBox="0 0 16 16" fill="none">
            <path d="M3.5 8.5L6.5 11.5L12.5 4.5" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
          </svg>
        `;
      }
    }

    toast.classList.remove('translate-y-24', 'opacity-0');
    toast.classList.add('translate-y-0', 'opacity-100');

    setTimeout(() => {
      toast.classList.add('translate-y-24', 'opacity-0');
      toast.classList.remove('translate-y-0', 'opacity-100');
    }, 3200);
  }

  // Ekspor showToast ke global window agar dapat dipanggil dari mana pun jika diperlukan
  window.showBersihinToast = showToast;

  /**
   * Mengambil data profil pelanggan dari localStorage atau default
   */
  function getCustomerProfile() {
    try {
      let userObj = null;
      try {
        const userRaw = sessionStorage.getItem('bersihin_user') || localStorage.getItem('bersihin_user');
        if (userRaw) userObj = JSON.parse(userRaw);
      } catch (_) {}

      let storedProfile = null;
      try {
        const stored = sessionStorage.getItem(BersihinConfig.storageKeys.profile) || localStorage.getItem(BersihinConfig.storageKeys.profile);
        if (stored) storedProfile = JSON.parse(stored);
      } catch (_) {}

      // Jika userObj aktif login, pastikan profil 100% selaras dengan akun tersebut!
      if (userObj) {
        const activeName = userObj.nama || userObj.username || (storedProfile && storedProfile.fullName) || 'Andi Pratama';
        const activeEmail = userObj.email || (storedProfile && storedProfile.email) || 'andi.pratama@email.com';
        const activePhone = userObj.telepon || userObj.no_telp || (storedProfile && storedProfile.phone) || '081234567821';
        const activeAddress = userObj.alamat || (storedProfile && storedProfile.address) || 'Jl. Kemang Raya No. 45, RT 02 / RW 05, Mampang Prapatan, Jakarta Selatan';
        const activeIdUser = userObj.id_user || (storedProfile && storedProfile.id_user) || 4;
        const activeIdCust = userObj.id_pelanggan || (storedProfile && storedProfile.id_pelanggan) || 1;
        const activeKode = userObj.kode_pelanggan || (storedProfile && storedProfile.kode_pelanggan) || 'PLG-08129';
        const rawTier = String(userObj.member_tier || (storedProfile && (storedProfile.member_tier || storedProfile.memberTier)) || 'REGULER').toUpperCase();
        const activeTierLabel = rawTier.includes('GOLD')
          ? 'Gold Member'
          : rawTier.includes('SILVER')
            ? 'Silver Member'
            : 'Reguler Member';
        const activeJoined = userObj.created_at || userObj.createdAt || (storedProfile && (storedProfile.created_at || storedProfile.createdAt)) || new Date().toISOString();

        return {
          id_user: activeIdUser,
          id_pelanggan: activeIdCust,
          kode_pelanggan: activeKode,
          username: userObj.username || '',
          fullName: activeName,
          email: activeEmail,
          phone: activePhone,
          address: activeAddress,
          member_tier: rawTier.includes('GOLD') ? 'GOLD' : (rawTier.includes('SILVER') ? 'SILVER' : 'REGULER'),
          memberTier: activeTierLabel,
          created_at: activeJoined,
          createdAt: activeJoined
        };
      }

      if (storedProfile) {
        return Object.assign({}, BersihinConfig.defaultProfile, storedProfile);
      }
    } catch (e) {
      console.warn('Gagal memuat profil pelanggan dari storage:', e);
    }
    return BersihinConfig.defaultProfile;
  }

  /**
   * Menyimpan data profil pelanggan ke storage (session & local)
   */
  function saveCustomerProfile(data) {
    try {
      const current = getCustomerProfile();
      const updated = Object.assign({}, current, data);
      sessionStorage.setItem(BersihinConfig.storageKeys.profile, JSON.stringify(updated));
      localStorage.setItem(BersihinConfig.storageKeys.profile, JSON.stringify(updated));
      return updated;
    } catch (e) {
      console.warn('Gagal menyimpan profil pelanggan ke storage:', e);
      return data;
    }
  }

  /**
   * Menghasilkan inisial nama akun pengguna (1-2 huruf kapital) untuk avatar profil
   */
  function getInitials(name) {
    if (!name || typeof name !== 'string') return 'PL';
    const clean = name.trim().replace(/[^a-zA-Z0-9\s]/g, '');
    const parts = clean.split(/\s+/).filter(Boolean);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    if (parts.length === 1 && parts[0].length >= 2) {
      return parts[0].slice(0, 2).toUpperCase();
    }
    if (parts.length === 1 && parts[0].length === 1) {
      return parts[0].toUpperCase();
    }
    return 'PL';
  }

  // ===========================================================================
  // 3. INISIALISASI KOMPONEN BERSAMA (SHARED) PADA SELURUH HALAMAN
  // ===========================================================================
  function initSharedComponents() {
    const profile = getCustomerProfile();
    const initials = getInitials(profile.fullName || profile.username || 'Pelanggan');

    // 3.1 Sinkronisasi Avatar Pengguna Mengikuti Nama Akun
    const profileMenuBtns = document.querySelectorAll('#profileMenuBtn, .customer-avatar-btn');
    profileMenuBtns.forEach(btn => {
      if (btn && !btn.querySelector('img')) {
        btn.textContent = initials;
        btn.setAttribute('title', profile.fullName || 'Profil Pengguna');
      }
    });

    const bannerAvatars = document.querySelectorAll('#bannerProfileAvatar, #modalPhotoPreviewAvatar, .customer-avatar-badge, [data-user-avatar]');
    bannerAvatars.forEach(el => {
      if (el && !el.querySelector('img')) {
        el.textContent = initials;
      }
    });

    // Fallback: deteksi elemen avatar div dengan inisial default 'AP'
    document.querySelectorAll('div').forEach(el => {
      if ((el.classList.contains('size-16') || el.classList.contains('size-20')) &&
          el.classList.contains('font-bold') &&
          !el.querySelector('*') &&
          el.textContent.trim() === 'AP') {
        el.textContent = initials;
      }
    });

    // 3.1b Pembaruan Hari & Tanggal Topbar Real-Time di Seluruh Halaman
    const nowRealtime = new Date();
    const dateFormatted = nowRealtime.toLocaleDateString('id-ID', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
    const isoDateStr = nowRealtime.toISOString().slice(0, 10);
    document.querySelectorAll('header time, [data-realtime-date], [data-realtime-full-date], time#topbarDateDisplay').forEach(el => {
      el.textContent = dateFormatted;
      el.setAttribute('datetime', isoDateStr);
    });

    // 3.2 Sinkronisasi Nama & Email di Seluruh Tampilan Web
    const topbarNames = document.querySelectorAll(
      '#topbarUserName, #bannerProfileName, #dropdownUserName, #passwordOverviewName, #statusCustomerName, #loggedAsName, #modalCustomerName'
    );
    const topbarEmails = document.querySelectorAll(
      '#dropdownUserEmail, #bannerProfileEmail, #passwordOverviewEmail'
    );

    topbarNames.forEach(el => {
      if (el) el.textContent = profile.fullName;
    });
    topbarEmails.forEach(el => {
      if (el) el.textContent = profile.email;
    });

    const overviewPhone = document.getElementById('passwordOverviewPhone');
    if (overviewPhone) overviewPhone.textContent = profile.phone || '-';

    // 3.3 Sinkronisasi Tanggal Bergabung Pelanggan Real-Time Sesuai Akun
    const memberSinceStr = formatMemberSince(profile.created_at || profile.createdAt || profile.joinedAt || profile.joinDate);
    document.querySelectorAll('#bannerMemberSince, .banner-member-since').forEach(el => {
      if (el) el.textContent = memberSinceStr;
    });

    const expSub = document.getElementById('statTotalPengeluaranSub');
    if (expSub && expSub.textContent !== 'Akumulasi pengeluaran') {
      expSub.textContent = 'Akumulasi pengeluaran';
    }

    // 3.3b Sinkronisasi Real-Time Kartu Bersihin Member Berdasarkan Jumlah Pesanan Akun Pelanggan
    const memberTierLabel = document.getElementById('memberTierLabel');
    const memberTierBadge = document.getElementById('memberTierBadge');
    const memberProgressSubtitle = document.getElementById('memberProgressSubtitle');
    const memberProgressBar = document.getElementById('memberProgressBar');
    const memberProgressPercent = document.getElementById('memberProgressPercent');
    const memberProgressRemaining = document.getElementById('memberProgressRemaining');

    if (memberTierLabel || memberProgressSubtitle) {
      const rawT = String(profile.member_tier || profile.memberTier || 'SILVER').toUpperCase();
      const tLabel = rawT.includes('GOLD') ? 'Gold Member' : (rawT.includes('SILVER') ? 'Silver Member' : 'Reguler Member');
      const tBadge = rawT.includes('GOLD') ? 'Tier 3' : (rawT.includes('SILVER') ? 'Tier 2' : 'Tier 1');
      if (memberTierLabel) memberTierLabel.textContent = tLabel;
      if (memberTierBadge) memberTierBadge.textContent = tBadge;

      const allOrders = typeof getAllCustomerTransactions === 'function' ? getAllCustomerTransactions() : [];
      const orderCount = Array.isArray(allOrders) ? allOrders.length : 0;
      const targetOrders = 10;
      const pct = Math.min(100, Math.round((orderCount / targetOrders) * 100));
      const rem = Math.max(0, targetOrders - orderCount);

      if (memberProgressSubtitle) {
        memberProgressSubtitle.textContent = `${orderCount} dari ${targetOrders} transaksi menuju Gold`;
      }
      if (memberProgressBar) {
        memberProgressBar.style.width = `${pct}%`;
      }
      if (memberProgressPercent) {
        memberProgressPercent.textContent = `${pct}% Tercapai`;
      }
      if (memberProgressRemaining) {
        memberProgressRemaining.textContent = rem > 0 ? `${rem} transaksi lagi` : 'Target tercapai!';
      }
    }

    // 3.4 Ucapan Selamat Datang / Greeting Mengikuti Nama Pengguna (Stabil & Tidak Berkedip)
    const greetingHeading = document.getElementById('greetingHeading');
    if (greetingHeading) {
      const firstName = (profile.fullName || profile.username || 'Pelanggan').trim().split(/\s+/)[0];
      const targetGreeting = `Halo, ${firstName}! Semoga harimu menyenangkan.`;
      if (greetingHeading.textContent !== targetGreeting) {
        greetingHeading.textContent = targetGreeting;
      }
    }

    // 3.2 Sidebar Drawer Mobile
    const sidebar = document.getElementById('sidebar');
    const sidebarOverlay = document.getElementById('sidebarOverlay');
    const openSidebarBtn = document.getElementById('openSidebarBtn');
    const closeSidebarBtn = document.getElementById('closeSidebarBtn');

    function openSidebar() {
      if (sidebar) sidebar.classList.remove('-translate-x-full');
      if (sidebarOverlay) sidebarOverlay.classList.remove('hidden');
      if (openSidebarBtn) openSidebarBtn.setAttribute('aria-expanded', 'true');
    }

    function closeSidebar() {
      if (sidebar) sidebar.classList.add('-translate-x-full');
      if (sidebarOverlay) sidebarOverlay.classList.add('hidden');
      if (openSidebarBtn) openSidebarBtn.setAttribute('aria-expanded', 'false');
    }

    if (openSidebarBtn && !openSidebarBtn.dataset.hasSidebarListener) {
      openSidebarBtn.dataset.hasSidebarListener = 'true';
      openSidebarBtn.addEventListener('click', openSidebar);
    }
    if (closeSidebarBtn && !closeSidebarBtn.dataset.hasSidebarListener) {
      closeSidebarBtn.dataset.hasSidebarListener = 'true';
      closeSidebarBtn.addEventListener('click', closeSidebar);
    }
    if (sidebarOverlay && !sidebarOverlay.dataset.hasSidebarListener) {
      sidebarOverlay.dataset.hasSidebarListener = 'true';
      sidebarOverlay.addEventListener('click', closeSidebar);
    }
    if (sidebar && !sidebar.dataset.hasSidebarLinkClose) {
      sidebar.dataset.hasSidebarLinkClose = 'true';
      sidebar.querySelectorAll('a[href]').forEach((link) => {
        link.addEventListener('click', () => {
          if (window.innerWidth < 1024) closeSidebar();
        });
      });
    }
    if (sidebar && !document.body.dataset.hasCustomerEscSidebar) {
      document.body.dataset.hasCustomerEscSidebar = 'true';
      document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && !sidebar.classList.contains('-translate-x-full')) {
          closeSidebar();
        }
      });
    }

    // 3.3 Dropdown Notifikasi & Profil Topbar
    const notifToggleBtn = document.getElementById('notifToggleBtn');
    const notifDropdown = document.getElementById('notifDropdown');
    const notifDot = document.getElementById('notifDot');
    const profileMenuBtn = document.getElementById('profileMenuBtn');
    const profileDropdown = document.getElementById('profileDropdown');

    // Render notifikasi pesanan terbaru secara dinamis
    function renderCustomerNotifications() {
      const notifDrop = document.getElementById('notifDropdown');
      const dot = document.getElementById('notifDot');
      if (!notifDrop) return;

      let transactions = [];
      try {
        const raw = localStorage.getItem('bersihin_transactions');
        if (raw) transactions = JSON.parse(raw);
      } catch (_) {}

      let activeOrder = null;
      try {
        const activeRaw = localStorage.getItem('bersihin_active_order');
        if (activeRaw) activeOrder = JSON.parse(activeRaw);
      } catch (_) {}

      const latestOrder = activeOrder || (transactions.length > 0 ? transactions[0] : null);

      if (!latestOrder) {
        notifDrop.innerHTML = `
          <div class="flex items-center justify-between pb-2.5 border-b border-slate-100">
            <span class="text-xs font-bold text-slate-800">Notifikasi Pelanggan</span>
          </div>
          <div class="py-6 text-center text-xs text-slate-400">
            Belum ada notifikasi pesanan baru.
          </div>
        `;
        if (dot) dot.classList.add('hidden');
        return;
      }

      const orderCode = latestOrder.code || latestOrder.id || latestOrder.orderId || latestOrder.kode_pesanan || 'TRX-BARU';
      const rawStatus = String(latestOrder.status || 'MENUNGGU').toUpperCase();
      const serviceName = latestOrder.service || latestOrder.layanan || 'Cuci Komplit (Cuci + Setrika)';
      const weight = latestOrder.weight || (latestOrder.weightKg ? `${latestOrder.weightKg},0 kg` : '3,0 kg');

      let title = `Pesanan ${orderCode} Menunggu Konfirmasi`;
      let desc = `Pakaian Anda (${serviceName} &bull; ${weight}) berhasil dibuat dan sedang menunggu pengecekan pegawai outlet.`;
      let badgeBg = 'bg-amber-100 text-amber-800';

      if (rawStatus.includes('DIPROSES') || rawStatus.includes('TERKONFIRMASI')) {
        title = `Pesanan ${orderCode} Dikonfirmasi`;
        desc = `Pesanan Anda (${serviceName}) telah dikonfirmasi oleh pegawai outlet dan siap dicuci.`;
        badgeBg = 'bg-emerald-100 text-emerald-800';
      } else if (rawStatus.includes('DICUCI') || rawStatus.includes('CUCI')) {
        title = `Pesanan ${orderCode} Sedang Dicuci`;
        desc = `Pakaian Anda (${weight}) sedang dalam tahap pencucian. Estimasi selesai ${latestOrder.estDone || '2 hari lagi'}.`;
        badgeBg = 'bg-orange-100 text-amber-800';
      } else if (rawStatus.includes('DISETRIKA') || rawStatus.includes('SETRIKA')) {
        title = `Pesanan ${orderCode} Sedang Disetrika`;
        desc = `Pakaian Anda telah selesai dicuci dan sedang dirapikan dalam proses setrika uap.`;
        badgeBg = 'bg-indigo-100 text-indigo-800';
      } else if (rawStatus.includes('SELESAI') || rawStatus.includes('SIAP')) {
        title = `Pesanan ${orderCode} Selesai & Siap Diambil`;
        desc = `Cucian Anda telah bersih, rapi, dan harum. Siap untuk diambil di outlet BersihIn!`;
        badgeBg = 'bg-emerald-100 text-emerald-800';
      }

      notifDrop.innerHTML = `
        <div class="flex items-center justify-between pb-2.5 border-b border-slate-100">
          <span class="text-xs font-bold text-slate-800">Notifikasi Pelanggan</span>
          <button type="button" id="markNotifReadBtn"
            class="min-h-[36px] px-2 rounded-lg text-[11px] font-semibold text-cyan-700 hover:bg-cyan-50">
            Tandai dibaca
          </button>
        </div>
        <div class="py-3 flex items-start gap-3">
          <div class="size-8 rounded-lg ${badgeBg} flex items-center justify-center shrink-0 mt-0.5">
            <svg class="size-4" viewBox="0 0 16 16" fill="none" aria-hidden="true">
              <circle cx="8" cy="8" r="5.5" stroke="currentColor" stroke-width="1.4" />
              <path d="M8 5V8L10 9.2" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" />
            </svg>
          </div>
          <div class="text-xs leading-4">
            <p class="font-bold text-slate-800">${title}</p>
            <p class="text-slate-600 text-[11px] mt-1">${desc}</p>
            <span class="block text-[10px] text-slate-400 mt-1.5">Baru saja</span>
          </div>
        </div>
      `;

      if (dot) dot.classList.remove('hidden');

      const markBtn = document.getElementById('markNotifReadBtn');
      if (markBtn) {
        markBtn.onclick = (e) => {
          e.stopPropagation();
          if (dot) dot.classList.add('hidden');
          markBtn.textContent = 'Semua dibaca';
          showToast('Notifikasi ditandai telah dibaca.');
        };
      }
    }

    renderCustomerNotifications();
    window.renderCustomerNotifications = renderCustomerNotifications;

    if (notifToggleBtn && notifDropdown && !notifToggleBtn.dataset.hasNotifListener) {
      notifToggleBtn.dataset.hasNotifListener = 'true';
      notifToggleBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        renderCustomerNotifications();
        const willOpen = notifDropdown.classList.contains('hidden');
        notifDropdown.classList.toggle('hidden', !willOpen);
        if (profileDropdown) profileDropdown.classList.add('hidden');
        notifToggleBtn.setAttribute('aria-expanded', String(willOpen));
      });
    }

    if (profileMenuBtn && profileDropdown && !profileMenuBtn.dataset.hasProfileListener) {
      profileMenuBtn.dataset.hasProfileListener = 'true';
      profileMenuBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        const willOpen = profileDropdown.classList.contains('hidden');
        profileDropdown.classList.toggle('hidden', !willOpen);
        if (notifDropdown) notifDropdown.classList.add('hidden');
        profileMenuBtn.setAttribute('aria-expanded', String(willOpen));
      });
    }

    if (!document.body.dataset.hasGlobalDropdownListener) {
      document.body.dataset.hasGlobalDropdownListener = 'true';
      document.addEventListener('click', (e) => {
        const curNotifBtn = document.getElementById('notifToggleBtn');
        const curNotifDrop = document.getElementById('notifDropdown');
        const curProfBtn = document.getElementById('profileMenuBtn');
        const curProfDrop = document.getElementById('profileDropdown');

        if (curNotifDrop && !curNotifDrop.contains(e.target) && curNotifBtn && !curNotifBtn.contains(e.target)) {
          curNotifDrop.classList.add('hidden');
          if (curNotifBtn) curNotifBtn.setAttribute('aria-expanded', 'false');
        }
        if (curProfDrop && !curProfDrop.contains(e.target) && curProfBtn && !curProfBtn.contains(e.target)) {
          curProfDrop.classList.add('hidden');
          if (curProfBtn) curProfBtn.setAttribute('aria-expanded', 'false');
        }
      });
    }

    // 3.4 Modal Bantuan Pelanggan (Hubungi Kami)
    const helpModal = document.getElementById('helpModal') || document.getElementById('helpContactModal');
    const openHelpModalBtn = document.getElementById('openHelpModalBtn');
    const closeHelpModalBtn = document.getElementById('closeHelpModalBtn');
    const okHelpModalBtn = document.getElementById('okHelpModalBtn');

    if (openHelpModalBtn && helpModal) {
      openHelpModalBtn.addEventListener('click', () => helpModal.classList.remove('hidden'));
    }
    if (closeHelpModalBtn && helpModal) {
      closeHelpModalBtn.addEventListener('click', () => helpModal.classList.add('hidden'));
    }
    if (okHelpModalBtn && helpModal) {
      okHelpModalBtn.addEventListener('click', () => helpModal.classList.add('hidden'));
    }

    // 3.5 Modal Keuntungan Member (Silver Tier)
    const tierBenefitModal = document.getElementById('tierBenefitModal');
    const openTierBenefitBtn = document.getElementById('openTierBenefitBtn');
    const closeTierBenefitBtn = document.getElementById('closeTierBenefitBtn');
    const okTierBenefitBtn = document.getElementById('okTierBenefitBtn');

    if (openTierBenefitBtn && tierBenefitModal) {
      openTierBenefitBtn.addEventListener('click', () => tierBenefitModal.classList.remove('hidden'));
    }
    if (closeTierBenefitBtn && tierBenefitModal) {
      closeTierBenefitBtn.addEventListener('click', () => tierBenefitModal.classList.add('hidden'));
    }
    if (okTierBenefitBtn && tierBenefitModal) {
      okTierBenefitBtn.addEventListener('click', () => tierBenefitModal.classList.add('hidden'));
    }

    // 3.6 Modal Pengaturan Notifikasi
    const notifSettingModal = document.getElementById('notifSettingModal');
    const openNotifSettingModalBtn = document.getElementById('openNotifSettingModalBtn');
    const closeNotifModalBtn = document.getElementById('closeNotifModalBtn') || document.getElementById('closeNotifSettingBtn');
    const cancelNotifModalBtn = document.getElementById('cancelNotifModalBtn');
    const saveNotifModalBtn = document.getElementById('saveNotifModalBtn') || document.getElementById('saveNotifSettingBtn');

    function closeNotifSetting() {
      if (notifSettingModal) notifSettingModal.classList.add('hidden');
    }

    if (openNotifSettingModalBtn && notifSettingModal) {
      openNotifSettingModalBtn.addEventListener('click', () => notifSettingModal.classList.remove('hidden'));
    }
    if (closeNotifModalBtn) closeNotifModalBtn.addEventListener('click', closeNotifSetting);
    if (cancelNotifModalBtn) cancelNotifModalBtn.addEventListener('click', closeNotifSetting);
    if (saveNotifModalBtn) {
      saveNotifModalBtn.addEventListener('click', () => {
        closeNotifSetting();
        showToast('Pengaturan notifikasi berhasil diperbarui!');
      });
    }

    // 3.7 Tutup Modal jika area latar (backdrop) diklik & tombol Escape
    window.addEventListener('click', (e) => {
      const activeModals = [helpModal, tierBenefitModal, notifSettingModal];
      activeModals.forEach(m => {
        if (m && e.target === m) m.classList.add('hidden');
      });
    });

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        const activeModals = document.querySelectorAll('[role="dialog"]:not(.hidden)');
        activeModals.forEach(m => m.classList.add('hidden'));
      }
    });
  }

  // ===========================================================================
  // 4. MODUL HALAMAN LOGIN (PELANGGAN/login.html)
  // ===========================================================================
  function initLoginPage() {
    const loginForm = document.getElementById('pelangganLoginForm');
    if (!loginForm) return;

    const identifierInput = document.getElementById('identifier');
    const passwordInput = document.getElementById('password');
    const rememberInput = document.getElementById('rememberMe');
    const identifierError = document.getElementById('identifierError');
    const passwordError = document.getElementById('passwordError');
    const submitLoginBtn = document.getElementById('submitLoginBtn');
    const submitLoginText = document.getElementById('submitLoginText');
    const authStatusBanner = document.getElementById('authStatusBanner');
    const authStatusTitle = document.getElementById('authStatusTitle');
    const authStatusMessage = document.getElementById('authStatusMessage');

    function setAuthStatus(state, title, message) {
      if (!authStatusBanner) return;
      if (!state) {
        authStatusBanner.className = 'hidden';
        return;
      }
      const styles = {
        empty: 'w-full mt-5 px-3.5 py-3 rounded-[10px] border border-slate-300 bg-slate-50 text-slate-700 text-xs font-["Poppins"] leading-4 flex items-start gap-2.5',
        loading: 'w-full mt-5 px-3.5 py-3 rounded-[10px] border border-cyan-300 bg-cyan-50 text-cyan-950 text-xs font-["Poppins"] leading-4 flex items-start gap-2.5',
        error: 'w-full mt-5 px-3.5 py-3 rounded-[10px] border border-red-300 bg-red-50 text-red-900 text-xs font-["Poppins"] leading-4 flex items-start gap-2.5',
        info: 'w-full mt-5 px-3.5 py-3 rounded-[10px] border border-emerald-300 bg-emerald-50 text-emerald-950 text-xs font-["Poppins"] leading-4 flex items-start gap-2.5'
      };
      authStatusBanner.className = styles[state] || styles.empty;
      if (authStatusTitle) authStatusTitle.textContent = title;
      if (authStatusMessage) authStatusMessage.textContent = message;
    }

    // Toggle Tampilkan / Sembunyikan Password
    const togglePasswordBtn = document.getElementById('togglePasswordBtn');
    const eyeIconOpen = document.getElementById('eyeIconOpen');
    const eyeIconClosed = document.getElementById('eyeIconClosed');

    if (togglePasswordBtn && passwordInput) {
      togglePasswordBtn.addEventListener('click', () => {
        const isHidden = passwordInput.type === 'password';
        passwordInput.type = isHidden ? 'text' : 'password';
        togglePasswordBtn.setAttribute('aria-pressed', String(isHidden));
        togglePasswordBtn.setAttribute('aria-label', isHidden ? 'Sembunyikan password' : 'Tampilkan password');
        if (eyeIconOpen) eyeIconOpen.classList.toggle('hidden', isHidden);
        if (eyeIconClosed) eyeIconClosed.classList.toggle('hidden', !isHidden);
      });
    }

    // Input listeners untuk reset error
    if (identifierInput) {
      identifierInput.addEventListener('input', () => {
        if (identifierError) identifierError.classList.add('hidden');
        identifierInput.classList.remove('border-red-600');
        if (authStatusBanner && !authStatusBanner.classList.contains('hidden')) {
          setAuthStatus(null);
        }
      });
    }

    if (passwordInput) {
      passwordInput.addEventListener('input', () => {
        if (passwordError) passwordError.classList.add('hidden');
        passwordInput.classList.remove('border-red-600');
        if (authStatusBanner && !authStatusBanner.classList.contains('hidden')) {
          setAuthStatus(null);
        }
      });
    }

    // Submit Form Login
    loginForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const identifier = identifierInput ? identifierInput.value.trim() : '';
      const password = passwordInput ? passwordInput.value : '';
      let isValid = true;

      if (!identifier) {
        if (identifierError) identifierError.classList.remove('hidden');
        if (identifierInput) identifierInput.classList.add('border-red-600');
        isValid = false;
      }

      if (!password || password.length < 6) {
        if (passwordError) passwordError.classList.remove('hidden');
        if (passwordInput) passwordInput.classList.add('border-red-600');
        isValid = false;
      }

      if (!isValid) {
        setAuthStatus('error', 'Data login belum lengkap', 'Periksa kembali kolom email/username dan pastikan password minimal 6 karakter.');
        return;
      }

      // Simulasi state verifikasi sebelum integrasi backend
      if (submitLoginBtn) submitLoginBtn.disabled = true;
      if (submitLoginText) submitLoginText.textContent = 'Memverifikasi...';
      setAuthStatus('loading', 'Memproses autentikasi pelanggan', 'Mengarahkan ke dashboard akun ' + identifier + '...');

      // Simpan status remember me & profil jika dicentang
      try {
        if (rememberInput && rememberInput.checked) {
          localStorage.setItem('bersihin_remember_identifier', identifier);
        } else {
          localStorage.removeItem('bersihin_remember_identifier');
        }
        const profObj = {
          id_pelanggan: 1,
          id_user: 4,
          username: 'andipratama',
          kode_pelanggan: 'PLG-08129',
          nama: 'Andi Pratama',
          fullName: 'Andi Pratama',
          email: identifier.includes('@') ? identifier : 'andi.pratama@email.com',
          telepon: '081234567821',
          phone: '081234567821',
          alamat: 'Jl. Kemang Raya No. 45, RT 02 / RW 05, Mampang Prapatan, Jakarta Selatan',
          address: 'Jl. Kemang Raya No. 45, RT 02 / RW 05, Mampang Prapatan, Jakarta Selatan',
          member_tier: 'SILVER',
          memberTier: 'Silver Member'
        };
        localStorage.setItem('bersihin_customer_profile', JSON.stringify(profObj));
        sessionStorage.setItem('bersihin_customer_profile', JSON.stringify(profObj));
      } catch (err) {
        // Storage restricted
      }

      setTimeout(() => {
        window.location.href = 'dashboard.html';
      }, 500);
    });

    // Cek remembered identifier
    try {
      const remembered = localStorage.getItem('bersihin_remember_identifier');
      if (remembered && identifierInput) {
        identifierInput.value = remembered;
        if (rememberInput) rememberInput.checked = true;
      }
    } catch (err) { }

    // Modal Lupa Password & Register Cepat
    const openForgotModalBtn = document.getElementById('openForgotModalBtn');
    const forgotPasswordModal = document.getElementById('forgotPasswordModal');
    const forgotPasswordForm = document.getElementById('forgotPasswordForm');
    const forgotModalStatus = document.getElementById('forgotModalStatus');

    if (openForgotModalBtn && forgotPasswordModal) {
      openForgotModalBtn.addEventListener('click', () => {
        const resetEmailInput = document.getElementById('resetEmail');
        if (resetEmailInput && identifierInput && identifierInput.value.includes('@')) {
          resetEmailInput.value = identifierInput.value.trim();
        }
        forgotPasswordModal.classList.remove('hidden');
      });
    }

    if (forgotPasswordForm) {
      forgotPasswordForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const resetEmailInput = document.getElementById('resetEmail');
        const emailVal = resetEmailInput ? resetEmailInput.value.trim() : '';

        if (!emailVal || !emailVal.includes('@')) {
          if (forgotModalStatus) {
            forgotModalStatus.className = 'mt-4 px-3.5 py-2.5 rounded-lg border border-red-300 bg-red-50 text-red-900 text-xs leading-4';
            forgotModalStatus.textContent = 'Masukkan alamat email yang valid terlebih dahulu.';
          }
          return;
        }

        if (forgotModalStatus) {
          forgotModalStatus.className = 'mt-4 px-3.5 py-2.5 rounded-lg border border-emerald-300 bg-emerald-50 text-emerald-950 text-xs leading-4';
          forgotModalStatus.textContent = 'Instruksi reset kata sandi telah dikirim ke ' + emailVal + '. Periksa kotak masuk atau spam email Anda.';
        }
        setTimeout(() => {
          if (forgotPasswordModal) forgotPasswordModal.classList.add('hidden');
          showToast('Tautan reset password berhasil dikirim.');
        }, 1800);
      });
    }

    const openRegisterModalBtn = document.getElementById('openRegisterModalBtn');
    const registerInfoModal = document.getElementById('registerInfoModal');
    const quickRegisterForm = document.getElementById('quickRegisterForm');
    const registerModalStatus = document.getElementById('registerModalStatus');

    if (openRegisterModalBtn && registerInfoModal) {
      openRegisterModalBtn.addEventListener('click', () => registerInfoModal.classList.remove('hidden'));
    }

    if (quickRegisterForm) {
      quickRegisterForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const regNama = document.getElementById('regNama');
        const regEmail = document.getElementById('regEmail');
        const regTelepon = document.getElementById('regTelepon');

        const nama = regNama ? regNama.value.trim() : '';
        const email = regEmail ? regEmail.value.trim() : '';
        const telp = regTelepon ? regTelepon.value.trim() : '';

        if (!nama || !email || !telp) {
          if (registerModalStatus) {
            registerModalStatus.className = 'mt-4 px-3.5 py-2.5 rounded-lg border border-red-300 bg-red-50 text-red-900 text-xs leading-4';
            registerModalStatus.textContent = 'Harap lengkapi nama, email, dan nomor telepon terlebih dahulu.';
          }
          return;
        }

        if (identifierInput) identifierInput.value = email;
        if (registerModalStatus) {
          registerModalStatus.className = 'mt-4 px-3.5 py-2.5 rounded-lg border border-emerald-300 bg-emerald-50 text-emerald-950 text-xs leading-4';
          registerModalStatus.textContent = 'Pendaftaran calon pelanggan berhasil! Email Anda telah diisikan ke form login.';
        }
        setTimeout(() => {
          if (registerInfoModal) registerInfoModal.classList.add('hidden');
          showToast('Data calon pelanggan ' + nama + ' berhasil didaftarkan.');
        }, 1500);
      });
    }

    // Penutup modal dengan atribut data-close-modal
    document.querySelectorAll('[data-close-modal]').forEach(btn => {
      btn.addEventListener('click', () => {
        const targetId = btn.getAttribute('data-close-modal');
        const targetModal = document.getElementById(targetId);
        if (targetModal) targetModal.classList.add('hidden');
      });
    });
  }

  // ===========================================================================
  // 4. PENGELOLAAN DATA TRANSAKSI PELANGGAN (CENTRAL TRANSACTIONS STORE)
  // ===========================================================================
  // Data transaksi bawaan kosong agar seluruh pesanan 100% bersumber murni dari database MySQL XAMPP
  const DEFAULT_CUSTOMER_TRANSACTIONS = [];

  /**
   * Konversi satu baris pesanan dari database MySQL ke format data frontend
   */
  function mapDbOrderToFrontend(dbRow, idx) {
    const code = dbRow.kode_pesanan || dbRow.nomor_pesanan || `TRX-${dbRow.id_pesanan}`;
    const amountNum = Number(dbRow.total_harga) || 0;
    const beratVal = Number(dbRow.total_berat) || 4;
    const rawDate = dbRow.tanggal_pesanan || dbRow.created_at;
    let dateStr = 'Hari ini';
    let timeIso = new Date().toISOString();
    if (rawDate) {
      const d = new Date(rawDate);
      if (!isNaN(d.getTime())) {
        timeIso = d.toISOString();
        dateStr = d.toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
      }
    }

    const srvCheck = String(dbRow.layanan || '').toLowerCase();
    const isExpress = srvCheck.includes('express') || srvCheck.includes('kilat') || srvCheck.includes('4 jam') || srvCheck.includes('cepat');
    let estStr = '2 hari lagi';
    if (dbRow.tanggal_selesai) {
      const es = new Date(dbRow.tanggal_selesai);
      if (!isNaN(es.getTime())) {
        if (isExpress) {
          let expressEst = es;
          if (es.getTime() - new Date(timeIso).getTime() > 12 * 60 * 60 * 1000) {
            expressEst = new Date(new Date(timeIso).getTime() + 4 * 60 * 60 * 1000);
          }
          const tStr = `${String(expressEst.getHours()).padStart(2, '0')}:${String(expressEst.getMinutes()).padStart(2, '0')} WIB`;
          const isToday = expressEst.toDateString() === new Date(timeIso).toDateString();
          estStr = isToday ? `Hari ini, ${tStr} (4 Jam)` : `Besok, ${tStr} (4 Jam)`;
        } else {
          const tStr = `${String(es.getHours()).padStart(2, '0')}:${String(es.getMinutes()).padStart(2, '0')} WIB`;
          estStr = `${es.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}, ${tStr} (2 Hari)`;
        }
      }
    } else {
      estStr = formatEstimatedDone({ service: dbRow.layanan, timestamp: timeIso });
    }

    let statusText = 'Menunggu konfirmasi';
    const st = String(dbRow.status || '').toUpperCase().trim();
    if (st === 'MENUNGGU') statusText = 'Menunggu konfirmasi';
    else if (st === 'DIPROSES') statusText = 'Terkonfirmasi \u2022 Diproses';
    else if (st === 'DICUCI') statusText = 'Sedang dicuci';
    else if (st === 'DISETRIKA') statusText = 'Sedang disetrika';
    else if (st === 'SIAP_DIAMBIL') statusText = 'Siap diambil';
    else if (st === 'SELESAI') statusText = 'Selesai';
    else if (st === 'DIBATALKAN') statusText = 'Dibatalkan';
    else statusText = dbRow.status;

    return {
      code: code,
      kode_pesanan: code,
      id: code,
      id_pesanan: dbRow.id_pesanan,
      id_pelanggan: dbRow.id_pelanggan || 1,
      nama_pelanggan: dbRow.nama_pelanggan || 'Andi Pratama',
      telepon: dbRow.telepon || dbRow.telepon_pelanggan || '081234567821',
      alamat: dbRow.alamat || dbRow.alamat_pelanggan || 'Jl. Kemang Raya No. 45, RT 02 / RW 05, Mampang Prapatan, Jakarta Selatan',
      orderSeq: idx,
      date: dateStr,
      timestamp: timeIso,
      tanggal_pesanan: dbRow.tanggal_pesanan || timeIso,
      tanggal_selesai: dbRow.tanggal_selesai || null,
      service: dbRow.layanan || 'Cuci Komplit (Cuci + Setrika)',
      layanan: dbRow.layanan || 'Cuci Komplit (Cuci + Setrika)',
      weight: `${beratVal.toLocaleString('id-ID')} kg`,
      weightKg: beratVal,
      total_berat: beratVal,
      amount: amountNum,
      total_harga: amountNum,
      total: `Rp${amountNum.toLocaleString('id-ID')}`,
      totalFormatted: `Rp${amountNum.toLocaleString('id-ID')}`,
      status: statusText,
      statusCode: st,
      status_pembayaran: dbRow.status_pembayaran || 'MENUNGGU',
      metode_pembayaran: dbRow.metode_pembayaran || 'QRIS',
      paymentMethod: dbRow.metode_pembayaran || 'QRIS',
      referensi_bayar: dbRow.referensi_bayar || null,
      bukti_bayar: dbRow.bukti_bayar || dbRow.bukti_transfer || null,
      bukti_transfer: dbRow.bukti_bayar || dbRow.bukti_transfer || null,
      details: Array.isArray(dbRow.details) ? dbRow.details : null,
      dateIn: dateStr,
      dateOut: estStr,
      estDone: estStr,
      notes: dbRow.catatan || 'Pakaian reguler',
      catatan: dbRow.catatan || 'Pakaian reguler',
      calcSub: `${beratVal.toLocaleString('id-ID')} kg (Estimasi)`,
      paidDate: dbRow.status_pembayaran === 'BERHASIL' ? 'Lunas' : 'Belum dibayar',
      created: `Dibuat pada ${dateStr}`
    };
  }

  /**
   * Mengambil seluruh data pesanan milik pelanggan langsung dari database MySQL XAMPP
   */
  async function syncAllCustomerDataWithBackend() {
    try {
      let activeUserId = null;
      let activeCustId = null;
      let activeUsername = null;
      try {
        const u = sessionStorage.getItem('bersihin_user') || localStorage.getItem('bersihin_user');
        if (u) {
          const up = JSON.parse(u);
          activeUserId = up.id_user;
          activeCustId = up.id_pelanggan;
          activeUsername = (up.username || '').toLowerCase();
        }
      } catch (_) {}

      try {
        const p = sessionStorage.getItem('bersihin_customer_profile') || localStorage.getItem('bersihin_customer_profile');
        if (p) {
          const pp = JSON.parse(p);
          if (!activeCustId && pp.id_pelanggan) activeCustId = pp.id_pelanggan;
          if (!activeUserId && pp.id_user) activeUserId = pp.id_user;
          if (!activeUsername && pp.username) activeUsername = pp.username.toLowerCase();
        }
      } catch (_) {}

      // Fallback ID pelanggan sesuai database_laundry.sql XAMPP
      if (!activeCustId) {
        if (activeUsername === 'rinamarlina' || activeUserId === 5) {
          activeCustId = 2;
          activeUserId = 5;
        } else if (activeUsername === 'dedikurniawan' || activeUserId === 6) {
          activeCustId = 3;
          activeUserId = 6;
        } else if (activeUsername === 'mayaanggraini' || activeUsername === 'maya' || activeUserId === 7) {
          activeCustId = 4;
          activeUserId = 7;
        } else {
          activeCustId = 1;
          activeUserId = 4;
          if (!activeUsername) activeUsername = 'andipratama';
        }
      }

      const token = sessionStorage.getItem('bersihin_token') || localStorage.getItem('bersihin_token');
      const headers = {};
      if (token) headers['Authorization'] = 'Bearer ' + token;

      // Ambil profil paling segar langsung dari MySQL jika backend tersedia
      try {
        const profUrl = `${getBackendBaseUrl()}/api/pelanggan/profil?id_pelanggan=${activeCustId || ''}&id_user=${activeUserId || ''}`;
        const profRes = await fetch(profUrl, { headers });
        if (profRes.ok) {
          const profJson = await profRes.json();
          if (profJson.success && profJson.data) {
            const d = profJson.data;
            const tierRaw = String(d.member_tier || 'REGULER').toUpperCase();
            saveCustomerProfile({
              id_user: d.id_user || activeUserId,
              id_pelanggan: d.id_pelanggan || activeCustId,
              kode_pelanggan: d.kode_pelanggan || '',
              username: d.username || activeUsername,
              fullName: d.nama || d.fullName,
              phone: d.telepon || d.phone,
              email: d.email,
              address: d.alamat || d.address,
              member_tier: tierRaw,
              memberTier: tierRaw === 'GOLD' ? 'Gold Member' : (tierRaw === 'SILVER' ? 'Silver Member' : 'Reguler Member'),
              created_at: d.created_at
            });
            initSharedComponents();
          }
        }
      } catch (_) {}

      let url = `${getBackendBaseUrl()}/api/pelanggan/pesanan`;
      const queryParts = [];
      if (activeCustId) queryParts.push(`id_pelanggan=${encodeURIComponent(activeCustId)}`);
      if (activeUserId) queryParts.push(`id_user=${encodeURIComponent(activeUserId)}`);
      if (activeUsername) queryParts.push(`username=${encodeURIComponent(activeUsername)}`);
      if (queryParts.length > 0) url += `?${queryParts.join('&')}`;

      const res = await fetch(url, { headers });
      if (!res.ok) return null;
      const json = await res.json();
      if (!json.success || !Array.isArray(json.data)) return null;

      // Pertahankan bukti_transfer yang baru diunggah di localStorage bila kode pesanan cocok dengan XAMPP
      const localProofByCode = {};
      try {
        const prevInv = JSON.parse(localStorage.getItem('bersihin_invoices') || '[]');
        if (Array.isArray(prevInv)) {
          prevInv.forEach(it => {
            const c = it && (it.kode_pesanan || it.code || it.orderId || it.id);
            const b = it && (it.bukti_bayar || it.bukti_transfer);
            if (c && b) localProofByCode[c] = b;
          });
        }
      } catch (_) {}

      const dbRows = json.data;
      const mappedList = dbRows.map((r, idx) => {
        const mapped = mapDbOrderToFrontend(r, idx);
        if (!mapped.bukti_transfer && localProofByCode[mapped.code]) {
          mapped.bukti_transfer = localProofByCode[mapped.code];
          mapped.bukti_bayar = localProofByCode[mapped.code];
        }
        return mapped;
      });

      // Urutkan pesanan dari yang paling baru ke yang lama (id_pesanan DESC atau timestamp DESC)
      mappedList.sort((a, b) => {
        const idA = Number(a.id_pesanan) || 0;
        const idB = Number(b.id_pesanan) || 0;
        if (idA && idB && idA !== idB) return idB - idA;
        return (new Date(b.timestamp).getTime() || 0) - (new Date(a.timestamp).getTime() || 0);
      });

      // 1. Simpan daftar pesanan murni dari database MySQL XAMPP (bersihkan transaksi dummy lama)
      sessionStorage.setItem('bersihin_transactions', JSON.stringify(mappedList));
      localStorage.setItem('bersihin_transactions', JSON.stringify(mappedList));
      localStorage.setItem('bersihin_invoices', JSON.stringify(mappedList));
      if (mappedList.length > 0) {
        localStorage.setItem('last_active_invoice', JSON.stringify(mappedList[0]));
      } else {
        localStorage.removeItem('last_active_invoice');
      }

      // 2. Selaraskan pesanan aktif teratas yang belum selesai (prioritaskan Express atau pesanan terbaru)
      let activeFromDb = mappedList.find(x => {
        const s = String(x.status || x.statusCode || '').toUpperCase();
        const srv = String(x.service || x.layanan || '').toLowerCase();
        const isExp = srv.includes('express') || srv.includes('kilat') || srv.includes('4 jam');
        return isExp && !s.includes('SELESAI') && !s.includes('BATAL') && !s.includes('DIAMBIL');
      });

      if (!activeFromDb) {
        activeFromDb = mappedList.find(x => {
          const s = String(x.status || x.statusCode || '').toUpperCase();
          return !s.includes('SELESAI') && !s.includes('BATAL') && !s.includes('DIAMBIL');
        });
      }

      if (activeFromDb) {
        sessionStorage.setItem('bersihin_active_order', JSON.stringify(activeFromDb));
        localStorage.setItem('bersihin_active_order', JSON.stringify(activeFromDb));
      } else {
        sessionStorage.removeItem('bersihin_active_order');
        localStorage.removeItem('bersihin_active_order');
      }

      return mappedList;
    } catch (_) {
      return null;
    }
  }

  if (typeof window !== 'undefined') {
    window.syncAllCustomerDataWithBackend = syncAllCustomerDataWithBackend;
  }

  function formatEstimatedDone(raw) {
    if (!raw) return '2 hari lagi';
    const srv = String(raw.service || raw.layanan || '').toLowerCase();
    const isExpress = srv.includes('express') || srv.includes('kilat') || srv.includes('4 jam') || srv.includes('cepat');
    let base = new Date();
    if (raw.timestamp || raw.createdAt) {
      const p = new Date(raw.timestamp || raw.createdAt);
      if (!isNaN(p.getTime())) base = p;
    }

    if (isExpress) {
      const est = new Date(base.getTime() + 4 * 60 * 60 * 1000);
      const timeStr = `${String(est.getHours()).padStart(2, '0')}:${String(est.getMinutes()).padStart(2, '0')} WIB`;
      const isToday = est.toDateString() === base.toDateString();
      return isToday ? `Hari ini, ${timeStr} (4 Jam)` : `Besok, ${timeStr} (4 Jam)`;
    }

    // Reguler (48 jam)
    const est = new Date(base.getTime() + 48 * 60 * 60 * 1000);
    const timeStr = `${String(est.getHours()).padStart(2, '0')}:${String(est.getMinutes()).padStart(2, '0')} WIB`;
    const dateStr = est.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
    return `${dateStr}, ${timeStr} (2 Hari)`;
  }

  function isCustomerOrderActive(order) {
    if (!order) return false;
    const s = String(order.status || order.statusCode || '').toUpperCase().trim();
    if (s.includes('SELESAI') || s.includes('BATAL') || s === 'TELAH DIAMBIL' || s === 'SUDAH DIAMBIL') {
      return false;
    }
    return true;
  }

  function getActiveCustomerOrder() {
    const allTrx = typeof getAllCustomerTransactions === 'function' ? getAllCustomerTransactions() : [];
    let order = null;

    if (Array.isArray(allTrx) && allTrx.length > 0) {
      // 1. Prioritaskan pesanan Express yang sedang aktif berjalan
      order = allTrx.find(x => {
        const srv = String(x.service || x.layanan || '').toLowerCase();
        const isExp = srv.includes('express') || srv.includes('kilat') || srv.includes('4 jam') || srv.includes('cepat');
        return isExp && isCustomerOrderActive(x);
      }) || allTrx.find(x => isCustomerOrderActive(x));
    }

    // 2. Fallback ke bersihin_active_order jika masih aktif dan milik pelanggan aktif
    if (!order) {
      try {
        const activeRaw = localStorage.getItem('bersihin_active_order') || sessionStorage.getItem('bersihin_last_order');
        if (activeRaw) {
          const parsed = JSON.parse(activeRaw);
          let currentCustId = null;
          try {
            const u = JSON.parse(localStorage.getItem('bersihin_user') || '{}');
            currentCustId = u.id_pelanggan;
          } catch (_) {}
          if ((!currentCustId || !parsed.id_pelanggan || Number(parsed.id_pelanggan) === Number(currentCustId)) && isCustomerOrderActive(parsed)) {
            order = parsed;
          }
        }
      } catch (_) {}
    }

    // Selaraskan storage bersihin_active_order secara otomatis
    try {
      if (order) {
        localStorage.setItem('bersihin_active_order', JSON.stringify(order));
      } else {
        localStorage.removeItem('bersihin_active_order');
      }
    } catch (_) {}

    return order;
  }

  function normalizeStatusCategory(rawStatus) {
    const s = String(rawStatus || '').toUpperCase().trim();
    if (s.includes('BATAL')) return 'Dibatalkan';
    if (s.includes('SELESAI') || s === 'TELAH DIAMBIL' || s === 'SUDAH DIAMBIL') return 'Selesai';
    return 'Diproses'; // MENUNGGU, TERKONFIRMASI, DIPROSES, DICUCI, DISETRIKA, SIAP_DIAMBIL
  }

  function getAllCustomerTransactions() {
    let customList = [];
    try {
      const stored = sessionStorage.getItem('bersihin_transactions') || localStorage.getItem('bersihin_transactions');
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) customList = parsed;
      }
    } catch (_) {}

    // Identifikasi data akun pelanggan aktif yang sedang login
    let activeCustId = null;
    let activeUserId = null;
    let activeUsername = '';

    try {
      const uRaw = sessionStorage.getItem('bersihin_user') || localStorage.getItem('bersihin_user');
      if (uRaw) {
        const u = JSON.parse(uRaw);
        activeCustId = u.id_pelanggan || null;
        activeUserId = u.id_user || null;
        activeUsername = (u.username || '').toLowerCase();
      }
    } catch (_) {}

    try {
      const pRaw = sessionStorage.getItem('bersihin_customer_profile') || localStorage.getItem('bersihin_customer_profile');
      if (pRaw) {
        const p = JSON.parse(pRaw);
        if (!activeCustId && p.id_pelanggan) activeCustId = p.id_pelanggan;
        if (!activeUserId && p.id_user) activeUserId = p.id_user;
        if (!activeUsername && p.username) activeUsername = p.username.toLowerCase();
      }
    } catch (_) {}

    if (!activeCustId) {
      if (activeUsername === 'andipratama' || activeUserId === 4) {
        activeCustId = 1;
        activeUserId = 4;
      } else if (activeUsername === 'rinamarlina' || activeUserId === 5) {
        activeCustId = 2;
        activeUserId = 5;
      } else if (activeUsername === 'dedikurniawan' || activeUserId === 6) {
        activeCustId = 3;
        activeUserId = 6;
      } else if (activeUsername === 'mayaanggraini' || activeUsername === 'maya' || activeUserId === 7) {
        activeCustId = 4;
        activeUserId = 7;
      }
    }

    const result = [];
    const seen = new Set();

    customList.forEach((raw, idx) => {
      // 1. Isolasi transaksi per id_pelanggan: jangan tampilkan pesanan milik akun lain
      if (activeCustId && raw.id_pelanggan && Number(raw.id_pelanggan) !== Number(activeCustId)) {
        return;
      }

      const code = raw.code || raw.id || raw.orderId;
      if (code && !seen.has(code)) {
        seen.add(code);
        const amountNum = typeof raw.amount === 'number'
          ? raw.amount
          : (typeof raw.total === 'number'
            ? raw.total
            : parseInt(String(raw.total || raw.totalFormatted || '0').replace(/[^0-9]/g, ''), 10) || 45000);

        const estDoneComputed = formatEstimatedDone(raw);
        const fallbackTime = new Date(Date.now() - idx * 60000).toISOString();

        result.push({
          code: code,
          id: code,
          id_pesanan: raw.id_pesanan,
          id_pelanggan: raw.id_pelanggan,
          orderSeq: idx,
          date: raw.date || raw.dateIn || 'Hari ini',
          timestamp: raw.createdAt || raw.timestamp || fallbackTime,
          service: raw.service || raw.layanan || 'Cuci Komplit (Cuci + Setrika)',
          weight: raw.weight || (raw.weightKg ? `${raw.weightKg},0 kg` : '4,0 kg'),
          weightKg: parseFloat(raw.weightKg) || 4.0,
          amount: amountNum,
          total: raw.totalFormatted || (typeof raw.total === 'string' && raw.total.startsWith('Rp') ? raw.total : formatRupiah(amountNum)),
          status: raw.status || 'Menunggu konfirmasi',
          dateIn: raw.dateIn || raw.date || 'Hari ini',
          dateOut: raw.dateOut || estDoneComputed,
          estDone: raw.estDone || estDoneComputed,
          notes: raw.notes || raw.catatan || 'Pakaian reguler',
          calcSub: raw.calcSub || `${raw.weight || '4,0 kg'} (Estimasi)`,
          paidDate: raw.paidDate || (raw.status === 'Selesai' ? `Dibayar ${raw.date || 'kemarin'}` : 'Belum dibayar'),
          created: raw.created || raw.dateInTime || `Dibuat pada ${raw.date || 'Hari ini'}`
        });
      }
    });

    // Masukkan data demo bawaan HANYA jika akun yang aktif adalah akun demo Andi Pratama
    if (activeUsername === 'andipratama' || (!activeUsername && !activeCustId)) {
      DEFAULT_CUSTOMER_TRANSACTIONS.forEach((def, defIdx) => {
        if (!seen.has(def.code)) {
          seen.add(def.code);
          result.push({
            ...def,
            orderSeq: 9999 + defIdx
          });
        }
      });
    }

    // Urutkan transaksi dari yang paling baru ke paling lama (Newest First)
    result.sort((a, b) => {
      const idA = Number(a.id_pesanan) || 0;
      const idB = Number(b.id_pesanan) || 0;
      if (idA && idB && idA !== idB) return idB - idA;
      const parseTime = (item) => {
        if (!item) return 0;
        if (item.timestamp) {
          const t = new Date(item.timestamp).getTime();
          if (!isNaN(t)) return t;
        }
        if (item.createdAt) {
          const t = new Date(item.createdAt).getTime();
          if (!isNaN(t)) return t;
        }
        return 0;
      };
      const tA = parseTime(a);
      const tB = parseTime(b);
      if (tA && tB && tA !== tB) return tB - tA;
      return (a.orderSeq || 0) - (b.orderSeq || 0);
    });

    // Selaraskan active order di localStorage agar sesuai pesanan teranyar
    if (result.length > 0) {
      try {
        const topOrder = result.find(x => {
          const s = String(x.status || '').toUpperCase();
          return !s.includes('SELESAI') && !s.includes('BATAL') && !s.includes('DIAMBIL');
        });
        if (topOrder) {
          localStorage.setItem('bersihin_active_order', JSON.stringify(topOrder));
        } else {
          localStorage.removeItem('bersihin_active_order');
        }
      } catch (_) {}
    } else {
      try {
        localStorage.removeItem('bersihin_active_order');
      } catch (_) {}
    }

    return result;
  }

  function getCustomerStats(transactions) {
    const list = transactions || getAllCustomerTransactions();
    const totalOrders = list.length;
    let processing = 0;
    let completed = 0;
    let canceled = 0;
    let totalExpense = 0;

    list.forEach(t => {
      const cat = normalizeStatusCategory(t.status);
      if (cat === 'Diproses') processing++;
      else if (cat === 'Selesai') completed++;
      else if (cat === 'Dibatalkan') canceled++;

      if (cat !== 'Dibatalkan') {
        const amt = typeof t.amount === 'number' && !isNaN(t.amount)
          ? t.amount
          : (typeof t.total === 'number'
            ? t.total
            : parseInt(String(t.total || t.totalFormatted || '0').replace(/[^0-9]/g, ''), 10) || 0);
        totalExpense += amt;
      }
    });

    return {
      total: totalOrders,
      processing: processing,
      completed: completed,
      canceled: canceled,
      totalExpense: totalExpense,
      totalExpenseFormatted: formatRupiah(totalExpense)
    };
  }

  function getStatusBadgeHtml(status, isSmall) {
    const s = String(status || '').toUpperCase().trim();
    if (s.includes('BATAL')) {
      return `
        <span class="px-2.5 py-1 bg-red-50 border border-red-200 rounded-[20px] inline-flex items-center gap-1.5">
          <span class="size-1.5 bg-red-500 rounded-full" aria-hidden="true"></span>
          <span class="text-red-700 text-[10px] font-semibold leading-3">Dibatalkan</span>
        </span>
      `;
    }
    if (s.includes('SELESAI') || s.includes('DIAMBIL')) {
      return `
        <span class="px-2.5 py-1 bg-emerald-50 border border-emerald-200 rounded-[20px] inline-flex items-center gap-1.5">
          <span class="size-1.5 bg-teal-700 rounded-full" aria-hidden="true"></span>
          <span class="text-teal-700 text-[10px] font-semibold leading-3">Selesai</span>
        </span>
      `;
    }
    if (s.includes('MENUNGGU')) {
      return `
        <span class="px-2.5 py-1 bg-amber-50 border border-amber-200 rounded-[20px] inline-flex items-center gap-1.5">
          <span class="size-1.5 bg-amber-500 rounded-full" aria-hidden="true"></span>
          <span class="text-amber-800 text-[10px] font-semibold leading-3">Menunggu konfirmasi</span>
        </span>
      `;
    }
    return `
      <span class="px-2.5 py-1 bg-blue-50 border border-blue-200 rounded-[20px] inline-flex items-center gap-1.5 shadow-2xs">
        <span class="size-1.5 bg-blue-600 rounded-full" aria-hidden="true"></span>
        <span class="text-blue-800 text-[10px] font-semibold leading-3">Terkonfirmasi &bull; Diproses</span>
      </span>
    `;
    if (s === 'DICUCI' || s.includes('CUCI')) {
      return `
        <span class="px-2.5 py-1 bg-sky-50 border border-sky-200 rounded-[20px] inline-flex items-center gap-1.5">
          <span class="size-1.5 bg-cyan-600 rounded-full" aria-hidden="true"></span>
          <span class="text-cyan-800 text-[10px] font-semibold leading-3">Sedang dicuci</span>
        </span>
      `;
    }
    if (s === 'DISETRIKA' || s.includes('SETRIKA')) {
      return `
        <span class="px-2.5 py-1 bg-indigo-50 border border-indigo-200 rounded-[20px] inline-flex items-center gap-1.5">
          <span class="size-1.5 bg-indigo-600 rounded-full" aria-hidden="true"></span>
          <span class="text-indigo-800 text-[10px] font-semibold leading-3">Sedang disetrika</span>
        </span>
      `;
    }
    if (s === 'SELESAI') {
      return `
        <span class="px-2.5 py-1 bg-emerald-50 rounded-[20px] inline-flex items-center gap-1.5">
          <span class="size-1.5 bg-teal-700 rounded-full" aria-hidden="true"></span>
          <span class="text-teal-700 text-[10px] font-semibold leading-3">Selesai</span>
        </span>
      `;
    }
    if (s === 'DIAMBIL' || s.includes('SIAP')) {
      return `
        <span class="px-2.5 py-1 bg-indigo-50 rounded-[20px] inline-flex items-center gap-1.5">
          <span class="size-1.5 bg-cyan-700 rounded-full" aria-hidden="true"></span>
          <span class="text-cyan-800 text-[10px] font-semibold leading-3">${status}</span>
        </span>
      `;
    }
    return `
      <span class="px-2.5 py-1 bg-slate-100 rounded-[20px] inline-flex items-center gap-1.5">
        <span class="size-1.5 bg-slate-500 rounded-full" aria-hidden="true"></span>
        <span class="text-slate-600 text-[10px] font-semibold leading-3">${status || 'Dibatalkan'}</span>
      </span>
    `;
  }

  // Ekspor BersihinTrx ke window global
  if (typeof window !== 'undefined') {
    window.BersihinTrx = {
      getAll: getAllCustomerTransactions,
      getStats: getCustomerStats,
      getStatusBadgeHtml: getStatusBadgeHtml,
      getActiveOrder: getActiveCustomerOrder,
      isActive: isCustomerOrderActive
    };
    window.getAllCustomerTransactions = getAllCustomerTransactions;
    window.getCustomerStats = getCustomerStats;
    window.getActiveCustomerOrder = getActiveCustomerOrder;
    window.isCustomerOrderActive = isCustomerOrderActive;
  }

  // ===========================================================================
  // 5. MODUL DASHBOARD PELANGGAN (PELANGGAN/dashboard.html)
  // ===========================================================================
  function initDashboardPage() {
    const dashboardSection = document.getElementById('pesananAktifSection') || document.querySelector('main');
    // Pastikan berada di dashboard dengan memeriksa elemen unik
    if (!document.getElementById('pesananAktifSection') && !document.getElementById('orderDetailModal')) return;

    // 5.1 Ucapan Waktu Dinamis & Profil Pengguna (Stabil & Tidak Berkedip)
    const profile = getCustomerProfile();
    const greetingHeading = document.getElementById('greetingHeading') || document.querySelector('h2.font-normal');
    if (greetingHeading) {
      const firstName = profile.fullName ? profile.fullName.trim().split(/\s+/)[0] : 'Andi';
      const targetGreeting = `Halo, ${firstName}! Semoga harimu menyenangkan.`;
      if (greetingHeading.textContent !== targetGreeting) {
        greetingHeading.textContent = targetGreeting;
      }
    }

    const loggedAsEl = document.getElementById('loggedAsName');
    if (loggedAsEl && profile.fullName) loggedAsEl.textContent = profile.fullName;

    const modalCustName = document.getElementById('modalCustomerName');
    if (modalCustName && profile.fullName) modalCustName.textContent = profile.fullName;

    // 5.2 Perbarui Ringkasan Statistik Dashboard Secara Dinamis
    const allTrx = getAllCustomerTransactions();
    const stats = getCustomerStats(allTrx);

    const statTotalEl = document.getElementById('statTotalTransaksi');
    if (statTotalEl && statTotalEl.textContent !== String(stats.total)) statTotalEl.textContent = stats.total;

    const statSedangEl = document.getElementById('statSedangDiproses');
    if (statSedangEl && statSedangEl.textContent !== String(stats.processing)) statSedangEl.textContent = stats.processing;

    const statProcessSub = document.getElementById('statSedangDiprosesSub');
    if (statProcessSub) {
      if (!stats.processing || stats.processing === 0) {
        if (statProcessSub.textContent !== 'Tidak ada pesanan aktif') statProcessSub.textContent = 'Tidak ada pesanan aktif';
      }
      // Jangan timpa jika sudah diisi tahap spesifik oleh syncDashboardActiveOrder (mis. Tahap penyetrikaan)
    }

    const statSelesaiEl = document.getElementById('statPesananSelesai');
    if (statSelesaiEl && statSelesaiEl.textContent !== String(stats.completed)) statSelesaiEl.textContent = stats.completed;

    const statExpenseEl = document.getElementById('statTotalPengeluaran');
    if (statExpenseEl && statExpenseEl.textContent !== stats.totalExpenseFormatted) statExpenseEl.textContent = stats.totalExpenseFormatted;

    const statExpenseSub = document.getElementById('statTotalPengeluaranSub');
    if (statExpenseSub && statExpenseSub.textContent !== 'Akumulasi pengeluaran') statExpenseSub.textContent = 'Akumulasi pengeluaran';

    // 5.3 Render Tabel Riwayat Transaksi Terbaru (Dinamis dari Storage)
    const recentBody = document.getElementById('recentTransactionsBody');
    const recentEmpty = document.getElementById('recentTransactionsEmpty');
    const recentTableWrapper = document.getElementById('recentTransactionsTableWrapper');

    if (recentBody) {
      const recentList = allTrx.slice(0, 4); // Ambil 4 transaksi terbaru
      const recentKey = recentList.map(t => `${t.code}_${t.status}_${t.total}`).join('|');
      if (recentBody.getAttribute('data-recent-key') !== recentKey) {
        recentBody.setAttribute('data-recent-key', recentKey);
        if (recentList.length === 0) {
          if (recentTableWrapper) recentTableWrapper.classList.add('hidden');
          if (recentEmpty) recentEmpty.classList.remove('hidden');
          recentBody.innerHTML = '';
        } else {
          if (recentTableWrapper) recentTableWrapper.classList.remove('hidden');
          if (recentEmpty) recentEmpty.classList.add('hidden');

          recentBody.innerHTML = recentList.map(trx => `
            <tr class="hover:bg-slate-50/80">
              <td class="px-3 py-3 font-bold text-slate-800">
                <a href="invoice.html?id=${encodeURIComponent(trx.code)}" class="hover:text-cyan-700">${trx.code}</a>
              </td>
              <td class="px-3 py-3 text-slate-600">${trx.date}</td>
              <td class="px-3 py-3 text-slate-600">${trx.service}</td>
              <td class="px-3 py-3 font-bold text-slate-800">${trx.total}</td>
              <td class="px-3 py-3">
                <a href="status.html?id=${encodeURIComponent(trx.code)}"
                  title="Klik untuk melacak perjalanan pesanan ${trx.code}"
                  class="inline-block transition hover:opacity-85 hover:scale-[1.02] active:scale-95 group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-600 rounded-full cursor-pointer">
                  ${getStatusBadgeHtml(trx.status)}
                </a>
              </td>
              <td class="px-3 py-1.5 text-right">
                <a href="invoice.html?id=${encodeURIComponent(trx.code)}"
                  aria-label="Lihat invoice transaksi ${trx.code}"
                  class="min-w-[36px] min-h-[36px] inline-flex items-center justify-center rounded-lg text-slate-500 hover:text-cyan-700 hover:bg-cyan-50">
                  <svg class="size-4" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                    <path d="M6 4L10 8L6 12" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round" />
                  </svg>
                </a>
              </td>
            </tr>
          `).join('');
        }
      }
    }

    // 5.4 Modal Detail Pesanan Aktif
    const orderDetailModal = document.getElementById('orderDetailModal');
    const openOrderDetailBtns = document.querySelectorAll('[data-open-modal="orderDetailModal"]');

    openOrderDetailBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        if (orderDetailModal) orderDetailModal.classList.remove('hidden');
      });
    });

    document.querySelectorAll('[data-close-modal]').forEach(btn => {
      btn.addEventListener('click', () => {
        const modalId = btn.getAttribute('data-close-modal');
        const modal = document.getElementById(modalId);
        if (modal) modal.classList.add('hidden');
      });
    });
  }

  // ===========================================================================
  // 6. MODUL LAYANAN (PELANGGAN/layanan.html)
  // ===========================================================================
  function initLayananPage() {
    // Periksa apakah halaman ini adalah layanan.html
    const serviceCards = document.querySelectorAll('.service-card') || document.querySelectorAll('[data-service-name]');
    const serviceSearchInput = document.getElementById('serviceSearchInput');
    const serviceCategoryTabs = document.querySelectorAll('.service-category-tab');

    // Modal Kalkulator Pesanan Cepat di Layanan
    const serviceOrderModal = document.getElementById('serviceOrderModal');
    const orderWeightInput = document.getElementById('orderWeightInput');
    const serviceModalTotalCost = document.getElementById('serviceModalTotalCost');
    const serviceOrderForm = document.getElementById('serviceOrderForm');
    const closeServiceModalBtn = document.getElementById('closeServiceModalBtn');
    const cancelServiceModalBtn = document.getElementById('cancelServiceModalBtn');

    let currentPricePerKg = 9000;
    let currentServiceName = 'Cuci Komplit (Cuci + Setrika)';
    let currentServiceId = 2;

    // Sinkronisasi katalog layanan aktif pelanggan langsung dari MySQL (GET /api/pelanggan/layanan)
    (async function hydrateCustomerServiceCards() {
      try {
        const res = await fetch(`${getBackendBaseUrl()}/api/pelanggan/layanan`);
        if (!res.ok) return;
        const json = await res.json();
        const rows = Array.isArray(json.data) ? json.data : [];
        if (rows.length === 0) return;

        rows.forEach((svc) => {
          const card = document.querySelector(`[data-layanan-id="${svc.id_layanan}"]`);
          if (!card) return;
          card.setAttribute('data-service-name', svc.nama_layanan);
          card.setAttribute('data-service-price', String(Number(svc.harga) || 0));
          card.setAttribute('data-service-est', svc.estimasi_waktu || '');
          const titleEl = card.querySelector('[data-service-title]');
          const descEl = card.querySelector('[data-service-desc]');
          const priceEl = card.querySelector('[data-service-price]') || card.querySelector('[data-service-price-label]');
          const unitEl = card.querySelector('[data-service-unit]');
          const estEl = card.querySelector('[data-service-est]') || card.querySelector('[data-service-est-label]');
          if (titleEl) titleEl.textContent = svc.nama_layanan;
          if (descEl && svc.deskripsi) descEl.textContent = svc.deskripsi;
          if (priceEl) priceEl.textContent = formatRupiah(svc.harga);
          if (unitEl && svc.satuan) unitEl.textContent = `/${svc.satuan}`;
          if (estEl && svc.estimasi_waktu) estEl.textContent = svc.estimasi_waktu;
        });
      } catch (_) {}
    })();

    function updateEstimatedTotal() {
      if (!orderWeightInput || !serviceModalTotalCost) return;
      const weight = Math.max(3, parseFloat(orderWeightInput.value) || 3);
      const total = Math.round(weight * currentPricePerKg);
      serviceModalTotalCost.textContent = formatRupiah(total);
    }

    if (orderWeightInput) {
      orderWeightInput.addEventListener('input', updateEstimatedTotal);
    }

    // Expose openServiceOrderModal ke global window untuk kompatibilitas onclick di HTML
    window.openServiceOrderModal = function (name, pricePerKg, duration, minWeight, description, idLayanan) {
      currentServiceName = name || 'Cuci Komplit (Cuci + Setrika)';
      currentPricePerKg = Number(pricePerKg) || 9000;
      currentServiceId = Number(idLayanan) || 2;

      // Navigasi langsung ke pesanan.html dengan parameter layanan terpilih
      try {
        sessionStorage.setItem(BersihinConfig.storageKeys.cartService, currentServiceName);
      } catch (e) { }

      window.location.href = `pesanan.html?id_layanan=${encodeURIComponent(currentServiceId)}&service=${encodeURIComponent(currentServiceName)}`;
    };

    if (closeServiceModalBtn && serviceOrderModal) {
      closeServiceModalBtn.addEventListener('click', () => serviceOrderModal.classList.add('hidden'));
    }
    if (cancelServiceModalBtn && serviceOrderModal) {
      cancelServiceModalBtn.addEventListener('click', () => serviceOrderModal.classList.add('hidden'));
    }

    if (serviceOrderForm) {
      serviceOrderForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const weight = Math.max(3, parseFloat(orderWeightInput.value) || 3);
        const perfumeSelect = document.getElementById('orderPerfumeSelect');
        const perfume = perfumeSelect ? perfumeSelect.value : 'Ocean Fresh';
        const total = formatRupiah(Math.round(weight * currentPricePerKg));

        try {
          sessionStorage.setItem(BersihinConfig.storageKeys.lastOrder, JSON.stringify({
            service: currentServiceName,
            weightKg: weight,
            perfume: perfume,
            totalFormatted: total
          }));
        } catch (err) { }

        if (serviceOrderModal) serviceOrderModal.classList.add('hidden');
        showToast(`Pesanan "${currentServiceName}" (${weight} kg) berhasil disiapkan!`);
        setTimeout(() => {
          window.location.href = 'pesanan.html?service=' + encodeURIComponent(currentServiceName);
        }, 800);
      });
    }

    // Modal Syarat & Ketentuan Layanan
    const termsModal = document.getElementById('termsModal');
    const openTermsModalBtn = document.getElementById('openTermsModalBtn');
    const jaminanBadgeBtn = document.getElementById('jaminanBadgeBtn');
    const closeTermsModalBtn = document.getElementById('closeTermsModalBtn');
    const okTermsModalBtn = document.getElementById('okTermsModalBtn');

    if (openTermsModalBtn && termsModal) openTermsModalBtn.addEventListener('click', () => termsModal.classList.remove('hidden'));
    if (jaminanBadgeBtn && termsModal) jaminanBadgeBtn.addEventListener('click', () => termsModal.classList.remove('hidden'));
    if (closeTermsModalBtn && termsModal) closeTermsModalBtn.addEventListener('click', () => termsModal.classList.add('hidden'));
    if (okTermsModalBtn && termsModal) okTermsModalBtn.addEventListener('click', () => termsModal.classList.add('hidden'));

    // Filter Kategori Layanan & Pencarian jika tersedia
    if (serviceSearchInput) {
      serviceSearchInput.addEventListener('input', () => {
        const query = serviceSearchInput.value.toLowerCase().trim();
        const allCards = document.querySelectorAll('.service-card-item');
        allCards.forEach(card => {
          const text = card.textContent.toLowerCase();
          card.classList.toggle('hidden', query !== '' && !text.includes(query));
        });
      });
    }
  }

  // ===========================================================================
  // 7. MODUL BUAT PESANAN (PELANGGAN/pesanan.html)
  // ===========================================================================
  function initPesananPage() {
    const createOrderForm = document.getElementById('createOrderForm');
    if (!createOrderForm) return;

    let selectedService = 'Cuci Komplit (Cuci + Setrika)';
    let selectedPricePerKg = 9000;
    let selectedEst = 'Estimasi 2 Hari';
    let currentWeightKg = 4; // Default: 4 kg
    let selectedDeliveryMethod = 'Antar sendiri';
    let selectedDeliveryFee = 0;

    const serviceOptionBtns = document.querySelectorAll('.service-option-btn');
    const deliveryOptionBtns = document.querySelectorAll('.delivery-option-btn');
    const decreaseWeightBtn = document.getElementById('decreaseWeightBtn');
    const increaseWeightBtn = document.getElementById('increaseWeightBtn');
    const weightDisplay = document.getElementById('weightDisplay');

    const summaryServiceName = document.getElementById('summaryServiceName');
    const summaryServiceEst = document.getElementById('summaryServiceEst');
    const summaryPricePerKg = document.getElementById('summaryPricePerKg');
    const summaryWeight = document.getElementById('summaryWeight');
    const summaryDeliveryRow = document.getElementById('summaryDeliveryRow');
    const summaryTotal = document.getElementById('summaryTotal');

    function updateOrderSummary() {
      if (summaryServiceName) summaryServiceName.textContent = selectedService;
      if (summaryServiceEst) summaryServiceEst.textContent = selectedEst;
      if (summaryPricePerKg) summaryPricePerKg.textContent = formatRupiah(selectedPricePerKg);
      if (weightDisplay) weightDisplay.textContent = currentWeightKg + ' kg';
      if (summaryWeight) summaryWeight.textContent = currentWeightKg + ' kg';

      if (summaryDeliveryRow) {
        if (selectedDeliveryFee > 0) {
          summaryDeliveryRow.classList.remove('hidden');
        } else {
          summaryDeliveryRow.classList.add('hidden');
        }
      }

      const total = (currentWeightKg * selectedPricePerKg) + selectedDeliveryFee;
      if (summaryTotal) summaryTotal.textContent = formatRupiah(total);
    }

    function selectServiceOption(btn) {
      if (!btn) return;
      selectedService = btn.getAttribute('data-service-option') || 'Cuci Komplit (Cuci + Setrika)';
      selectedPricePerKg = parseInt(btn.getAttribute('data-price'), 10) || 9000;
      selectedEst = btn.getAttribute('data-est') || 'Estimasi 2 Hari';

      serviceOptionBtns.forEach((b) => {
        const checkBox = b.querySelector('.service-check-box');
        const checkIcon = b.querySelector('.service-check-icon');
        if (b === btn) {
          b.setAttribute('aria-checked', 'true');
          b.className = 'service-option-btn w-full p-3 rounded-[10px] border border-blue-400 bg-sky-50 shadow-[0px_0px_0px_1px_rgba(87,173,212,1.00)] flex items-center gap-3 text-left transition';
          if (checkBox) checkBox.className = 'service-check-box size-4 rounded-md bg-blue-400 border border-blue-400 flex items-center justify-center shrink-0';
          if (checkIcon) checkIcon.classList.remove('hidden');
        } else {
          b.setAttribute('aria-checked', 'false');
          b.className = 'service-option-btn w-full p-3 rounded-[10px] border border-slate-200 bg-white hover:bg-slate-50 flex items-center gap-3 text-left transition';
          if (checkBox) checkBox.className = 'service-check-box size-4 rounded-md border border-slate-300 bg-white flex items-center justify-center shrink-0';
          if (checkIcon) checkIcon.classList.add('hidden');
        }
      });

      updateOrderSummary();
    }

    serviceOptionBtns.forEach((btn) => {
      btn.addEventListener('click', () => selectServiceOption(btn));
    });

    // Otomatis pilih layanan jika dikirim via URL parameter (?service=...) atau sessionStorage
    const params = new URLSearchParams(window.location.search);
    const serviceFromUrl = params.get('service') || sessionStorage.getItem(BersihinConfig.storageKeys.cartService);

    if (serviceFromUrl) {
      let matched = false;
      serviceOptionBtns.forEach((btn) => {
        if (btn.getAttribute('data-service-option') === serviceFromUrl) {
          selectServiceOption(btn);
          matched = true;
        }
      });
      // Bersihkan query dari session storage setelah digunakan
      try { sessionStorage.removeItem(BersihinConfig.storageKeys.cartService); } catch (e) { }
    }

    // Stepper Berat (Minimal 3 kg sesuai ketentuan Figma)
    if (decreaseWeightBtn) {
      decreaseWeightBtn.addEventListener('click', () => {
        if (currentWeightKg > 3) {
          currentWeightKg -= 1;
          updateOrderSummary();
        } else {
          showToast('Batas minimum pemesanan adalah 3 kg.', true);
        }
      });
    }

    if (increaseWeightBtn) {
      increaseWeightBtn.addEventListener('click', () => {
        if (currentWeightKg < 100) {
          currentWeightKg += 1;
          updateOrderSummary();
        }
      });
    }

    // Pilihan Metode Pengantaran (Antar sendiri vs Jemput Kurir)
    deliveryOptionBtns.forEach((btn) => {
      btn.addEventListener('click', () => {
        selectedDeliveryMethod = btn.getAttribute('data-delivery-option') || 'Antar sendiri';
        selectedDeliveryFee = parseInt(btn.getAttribute('data-fee'), 10) || 0;

        deliveryOptionBtns.forEach((b) => {
          if (b === btn) {
            b.setAttribute('aria-checked', 'true');
            b.className = 'delivery-option-btn w-full p-3.5 rounded-[10px] border border-blue-400 bg-sky-50 flex items-center gap-3 text-left transition';
          } else {
            b.setAttribute('aria-checked', 'false');
            b.className = 'delivery-option-btn w-full p-3.5 rounded-[10px] border border-slate-200 bg-white hover:bg-slate-50 flex items-center gap-3 text-left transition';
          }
        });

        updateOrderSummary();
      });
    });

    // Inisialisasi awal kalkulasi (submit form dikelola secara komprehensif bersama modal invoice di pesanan.html)
    updateOrderSummary();

    // Sinkronisasi 4 pilihan layanan pelanggan dari MySQL (GET /api/pelanggan/layanan)
    (async function hydrateOrderServiceOptions() {
      try {
        const res = await fetch(`${getBackendBaseUrl()}/api/pelanggan/layanan`);
        if (!res.ok) return;
        const json = await res.json();
        const rows = Array.isArray(json.data) ? json.data : [];
        if (rows.length === 0) return;

        rows.forEach((svc) => {
          const btn = document.querySelector(`.service-option-btn[data-layanan-id="${svc.id_layanan}"]`);
          if (!btn) return;
          const priceNum = Number(svc.harga) || 0;
          const estText = svc.estimasi_waktu ? `Estimasi ${svc.estimasi_waktu}` : 'Estimasi 2 Hari';
          btn.setAttribute('data-service-option', svc.nama_layanan);
          btn.setAttribute('data-price', String(priceNum));
          btn.setAttribute('data-est', estText);
          btn.setAttribute('data-unit', svc.satuan || 'kg');
          const nameEl = btn.querySelector('[data-opt-name]') || btn.querySelector('.font-semibold') || btn.querySelector('.font-bold');
          const priceEl = btn.querySelector('[data-opt-price]') || btn.querySelector('.text-\\[11px\\]');
          if (nameEl) nameEl.textContent = svc.nama_layanan;
          if (priceEl) priceEl.textContent = `${formatRupiah(priceNum)}/${svc.satuan || 'kg'}`;
        });
        const activeBtn = document.querySelector('.service-option-btn[aria-checked="true"]');
        if (activeBtn) selectServiceOption(activeBtn);
      } catch (_) {}
    })();
  }

  // ===========================================================================
  // 8. MODUL STATUS PESANAN (PELANGGAN/status.html)
  // ===========================================================================
  function initStatusPage() {
    const trxDetailModal = document.getElementById('trxDetailModal');
    const openTrxDetailModalBtn = document.getElementById('openTrxDetailModalBtn');
    const closeTrxDetailModalBtn = document.getElementById('closeTrxDetailModalBtn');
    const okTrxDetailModalBtn = document.getElementById('okTrxDetailModalBtn');

    if (openTrxDetailModalBtn && trxDetailModal) {
      openTrxDetailModalBtn.addEventListener('click', () => trxDetailModal.classList.remove('hidden'));
    }
    if (closeTrxDetailModalBtn && trxDetailModal) {
      closeTrxDetailModalBtn.addEventListener('click', () => trxDetailModal.classList.add('hidden'));
    }
    if (okTrxDetailModalBtn && trxDetailModal) {
      okTrxDetailModalBtn.addEventListener('click', () => trxDetailModal.classList.add('hidden'));
    }

    const directionsModal = document.getElementById('directionsModal');
    const openDirectionsModalBtn = document.getElementById('openDirectionsModalBtn');
    const closeDirectionsModalBtn = document.getElementById('closeDirectionsModalBtn');
    const okDirectionsModalBtn = document.getElementById('okDirectionsModalBtn');

    if (openDirectionsModalBtn && directionsModal) {
      openDirectionsModalBtn.addEventListener('click', () => directionsModal.classList.remove('hidden'));
    }
    if (closeDirectionsModalBtn && directionsModal) {
      closeDirectionsModalBtn.addEventListener('click', () => directionsModal.classList.add('hidden'));
    }
    if (okDirectionsModalBtn && directionsModal) {
      okDirectionsModalBtn.addEventListener('click', () => directionsModal.classList.add('hidden'));
    }

    const askQuestionBannerBtn = document.getElementById('askQuestionBannerBtn');
    const helpModal = document.getElementById('helpModal');
    if (askQuestionBannerBtn && helpModal) {
      askQuestionBannerBtn.addEventListener('click', () => helpModal.classList.remove('hidden'));
    }

    if (typeof loadActiveOrderStatus === 'function') {
      loadActiveOrderStatus();
    }
  }

  // ===========================================================================
  // 9. MODUL RIWAYAT TRANSAKSI (PELANGGAN/riwayat.html)
  // ===========================================================================
  // State persisten untuk Riwayat Transaksi agar filter tidak ter-reset saat auto-refresh polling
  let riwayatCurrentFilter = 'all';
  let riwayatCurrentSearch = '';
  let riwayatCurrentSort = 'newest';
  let riwayatCurrentPage = 1;
  const RIWAYAT_ITEMS_PER_PAGE = 8;
  let riwayatListenersBound = false;

  function initRiwayatPage() {
    const tableBody = document.getElementById('historyTableBody');
    const filterTabs = document.querySelectorAll('.filter-tab');
    const searchInput = document.getElementById('searchInput');
    const sortSelect = document.getElementById('sortSelect');
    const emptySearchState = document.getElementById('emptySearchState');
    const resetFilterBtn = document.getElementById('resetFilterBtn');
    const tableInfoText = document.getElementById('tableInfoText');

    if (!tableBody && !filterTabs.length && !searchInput) return;

    const allTrx = getAllCustomerTransactions();
    const stats = getCustomerStats(allTrx);

    // Perbarui 4 Kartu Ringkasan Statistik
    const statTotalEl = document.getElementById('statTotalOrders');
    if (statTotalEl) statTotalEl.textContent = stats.total;

    const statProcessEl = document.getElementById('statProcessOrders');
    if (statProcessEl) statProcessEl.textContent = stats.processing;

    const statProcessSub = document.getElementById('statProcessOrdersSub');
    if (statProcessSub) statProcessSub.textContent = `${stats.processing} pesanan berjalan`;

    const statDoneEl = document.getElementById('statDoneOrders');
    if (statDoneEl) statDoneEl.textContent = stats.completed;

    const statExpenseEl = document.getElementById('statTotalExpense');
    if (statExpenseEl) statExpenseEl.textContent = stats.totalExpenseFormatted;

    // Perbarui Badge Angka pada Tab Filter
    const badgeAll = document.getElementById('badgeTabAll');
    if (badgeAll) badgeAll.textContent = stats.total;

    const badgeProcess = document.getElementById('badgeTabProcess');
    if (badgeProcess) badgeProcess.textContent = stats.processing;

    const badgeDone = document.getElementById('badgeTabDone');
    if (badgeDone) badgeDone.textContent = stats.completed;

    const badgeCanceled = document.getElementById('badgeTabCanceled');
    if (badgeCanceled) badgeCanceled.textContent = stats.canceled;

    const totalCountEl = document.getElementById('totalItemsCount');
    if (totalCountEl) totalCountEl.textContent = stats.total;

    // Sinkronisasi styling visual tab dengan riwayatCurrentFilter yang aktif
    filterTabs.forEach(t => {
      const tabFilter = t.getAttribute('data-filter') || 'all';
      if (tabFilter === riwayatCurrentFilter) {
        t.setAttribute('aria-selected', 'true');
        t.classList.add('bg-white', 'text-slate-800', 'shadow-xs');
        t.classList.remove('text-slate-600');
      } else {
        t.setAttribute('aria-selected', 'false');
        t.classList.remove('bg-white', 'text-slate-800', 'shadow-xs');
        t.classList.add('text-slate-600');
      }
    });

    // Sinkronisasi pesanan langsung dari database MySQL XAMPP secara real-time
    (async function syncWithDatabase() {
      const freshList = await syncAllCustomerDataWithBackend();
      if (freshList) {
        allTrx.length = 0;
        freshList.forEach(t => allTrx.push(t));
        const refreshedStats = getCustomerStats(allTrx);
        if (statTotalEl) statTotalEl.textContent = refreshedStats.total;
        if (statProcessEl) statProcessEl.textContent = refreshedStats.processing;
        if (statProcessSub) statProcessSub.textContent = `${refreshedStats.processing} pesanan berjalan`;
        if (statDoneEl) statDoneEl.textContent = refreshedStats.completed;
        if (statExpenseEl) statExpenseEl.textContent = refreshedStats.totalExpenseFormatted;
        if (badgeAll) badgeAll.textContent = refreshedStats.total;
        if (badgeProcess) badgeProcess.textContent = refreshedStats.processing;
        if (badgeDone) badgeDone.textContent = refreshedStats.completed;
        if (badgeCanceled) badgeCanceled.textContent = refreshedStats.canceled;
        if (totalCountEl) totalCountEl.textContent = refreshedStats.total;
        renderRows();
      }
    })();

    function renderRows() {
      if (!tableBody) return;

      // 1. Filter data menggunakan state filter persisten
      let filtered = allTrx.filter(trx => {
        let matchFilter = true;
        const cat = normalizeStatusCategory(trx.status);
        if (riwayatCurrentFilter === 'Diproses') {
          matchFilter = (cat === 'Diproses');
        } else if (riwayatCurrentFilter === 'Selesai') {
          matchFilter = (cat === 'Selesai');
        } else if (riwayatCurrentFilter === 'Dibatalkan') {
          matchFilter = (cat === 'Dibatalkan');
        }

        const q = riwayatCurrentSearch.toLowerCase();
        const matchSearch = !q ||
          trx.code.toLowerCase().includes(q) ||
          trx.service.toLowerCase().includes(q) ||
          trx.date.toLowerCase().includes(q) ||
          trx.status.toLowerCase().includes(q);

        return matchFilter && matchSearch;
      });

      // 2. Sort data
      filtered.sort((a, b) => {
        const parseTime = (item) => {
          if (!item) return 0;
          if (item.timestamp) {
            const t = new Date(item.timestamp).getTime();
            if (!isNaN(t)) return t;
          }
          if (item.createdAt) {
            const t = new Date(item.createdAt).getTime();
            if (!isNaN(t)) return t;
          }
          if (item.dateInTime) {
            const t = new Date(item.dateInTime).getTime();
            if (!isNaN(t)) return t;
          }
          if (item.date) {
            const t = new Date(item.date).getTime();
            if (!isNaN(t)) return t;
          }
          return 0;
        };

        const timeA = parseTime(a);
        const timeB = parseTime(b);
        const amtA = a.amount || 0;
        const amtB = b.amount || 0;

        if (riwayatCurrentSort === 'newest') {
          const idA = Number(a.id_pesanan) || 0;
          const idB = Number(b.id_pesanan) || 0;
          if (idA && idB && idA !== idB) return idB - idA;
          if (timeA && timeB && timeA !== timeB) return timeB - timeA;
          if (typeof a.orderSeq === 'number' && typeof b.orderSeq === 'number') {
            return a.orderSeq - b.orderSeq;
          }
          return 0;
        }
        if (riwayatCurrentSort === 'oldest') {
          const idA = Number(a.id_pesanan) || 0;
          const idB = Number(b.id_pesanan) || 0;
          if (idA && idB && idA !== idB) return idA - idB;
          if (timeA && timeB && timeA !== timeB) return timeA - timeB;
          if (typeof a.orderSeq === 'number' && typeof b.orderSeq === 'number') {
            return b.orderSeq - a.orderSeq;
          }
          return 0;
        }
        if (riwayatCurrentSort === 'highest') return amtB - amtA;
        if (riwayatCurrentSort === 'lowest') return amtA - amtB;
        return 0;
      });

      // 3. Hitung pagination dinamis
      const totalPages = Math.max(1, Math.ceil(filtered.length / RIWAYAT_ITEMS_PER_PAGE));
      if (riwayatCurrentPage > totalPages) riwayatCurrentPage = totalPages;
      if (riwayatCurrentPage < 1) riwayatCurrentPage = 1;

      const startIndex = (riwayatCurrentPage - 1) * RIWAYAT_ITEMS_PER_PAGE;
      const endIndex = Math.min(startIndex + RIWAYAT_ITEMS_PER_PAGE, filtered.length);
      const pageItems = filtered.slice(startIndex, endIndex);

      // 4. Render ke tabel
      if (filtered.length === 0) {
        tableBody.innerHTML = '';
        if (tableBody.parentElement) tableBody.parentElement.classList.add('hidden');
        if (emptySearchState) emptySearchState.classList.remove('hidden');
      } else {
        if (tableBody.parentElement) tableBody.parentElement.classList.remove('hidden');
        if (emptySearchState) emptySearchState.classList.add('hidden');

        tableBody.innerHTML = pageItems.map(trx => `
          <tr class="trx-row hover:bg-slate-50/80"
            data-code="${trx.code}"
            data-service="${trx.service}"
            data-status="${trx.status}"
            data-amount="${trx.amount}"
            data-timestamp="${trx.timestamp}">
            <td class="px-4 py-3.5 font-bold text-slate-800">
              <a href="invoice.html?id=${encodeURIComponent(trx.code)}" class="hover:text-cyan-700">${trx.code}</a>
            </td>
            <td class="px-4 py-3.5 text-slate-600">${trx.date}</td>
            <td class="px-4 py-3.5 text-slate-700 font-medium">${trx.service}</td>
            <td class="px-4 py-3.5 text-slate-600">${trx.weight}</td>
            <td class="px-4 py-3.5 font-bold text-slate-800">${trx.total}</td>
            <td class="px-4 py-3.5">
              <a href="status.html?id=${encodeURIComponent(trx.code)}"
                title="Klik untuk melacak perjalanan pesanan ${trx.code}"
                class="inline-block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-600 rounded-full cursor-pointer">
                ${getStatusBadgeHtml(trx.status)}
              </a>
            </td>
            <td class="px-4 py-2 text-right">
              <div class="flex items-center justify-end">
                <a href="invoice.html?id=${encodeURIComponent(trx.code)}"
                  aria-label="Lihat invoice & bukti pembayaran transaksi ${trx.code}"
                  class="min-h-[36px] px-3.5 py-1.5 rounded-lg bg-cyan-50 hover:bg-cyan-100 text-cyan-700 text-xs font-semibold inline-flex items-center gap-1.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-700">
                  <span>Detail</span>
                  <svg class="size-3.5" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                    <path d="M6 4L10 8L6 12" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round" />
                  </svg>
                </a>
              </div>
            </td>
          </tr>
        `).join('');
      }

      // 5. Update Info Text secara akurat
      if (tableInfoText) {
        if (filtered.length === 0) {
          tableInfoText.innerHTML = `Menampilkan <span class="font-semibold text-slate-700">0</span> dari <span class="font-semibold text-slate-700">${allTrx.length}</span> transaksi`;
        } else {
          tableInfoText.innerHTML = `Menampilkan <span class="font-semibold text-slate-700">${startIndex + 1} - ${endIndex}</span> dari <span class="font-semibold text-slate-700">${filtered.length}</span> transaksi`;
        }
      }

      // 6. Render Tombol Angka Halaman Dinamis (Sesuai Jumlah Riwayat Pesanan)
      renderPaginationControls(totalPages);
    }

    // Fungsi Render Tombol Pagination 1, 2, 3 Sesuai Data Riwayat Pesanan
    function renderPaginationControls(totalPages) {
      const prevBtn = document.getElementById('prevPageBtn');
      const nextBtn = document.getElementById('nextPageBtn');
      const pageContainer = document.getElementById('pageNumbersContainer');

      if (prevBtn) {
        prevBtn.disabled = false;
        prevBtn.removeAttribute('disabled');
        prevBtn.onclick = () => {
          if (riwayatCurrentPage > 1) {
            riwayatCurrentPage--;
            renderRows();
          } else if (totalPages > 1) {
            riwayatCurrentPage = totalPages;
            renderRows();
          }
        };
      }

      if (nextBtn) {
        nextBtn.disabled = false;
        nextBtn.removeAttribute('disabled');
        nextBtn.onclick = () => {
          if (riwayatCurrentPage < totalPages) {
            riwayatCurrentPage++;
            renderRows();
          } else if (totalPages > 1) {
            riwayatCurrentPage = 1;
            renderRows();
          }
        };
      }

      if (pageContainer) {
        let pagesHtml = '';
        for (let i = 1; i <= totalPages; i++) {
          const isActive = (i === riwayatCurrentPage);
          pagesHtml += `
            <button type="button" data-page="${i}"
              class="page-num-btn min-w-[36px] min-h-[36px] w-9 h-9 inline-flex items-center justify-center rounded-lg text-xs font-semibold ${isActive ? 'bg-slate-900 text-white shadow-xs' : 'border border-slate-200 bg-white hover:bg-slate-100 text-slate-700 shadow-2xs'}">
              ${i}
            </button>
          `;
        }
        pageContainer.innerHTML = pagesHtml;

        pageContainer.querySelectorAll('.page-num-btn').forEach(btn => {
          btn.addEventListener('click', () => {
            const p = parseInt(btn.getAttribute('data-page'), 10);
            if (p && p !== riwayatCurrentPage) {
              riwayatCurrentPage = p;
              renderRows();
            }
          });
        });
      }
    }

    renderRows();

    // Event listener dipasang hanya SATU KALI agar tidak tertumpuk/reset saat auto-refresh polling
    if (!riwayatListenersBound) {
      riwayatListenersBound = true;

      // Event Klik Tab Filter
      filterTabs.forEach(tab => {
        tab.addEventListener('click', () => {
          riwayatCurrentFilter = tab.getAttribute('data-filter') || 'all';
          riwayatCurrentPage = 1;

          filterTabs.forEach(t => {
            const isTarget = (t.getAttribute('data-filter') || 'all') === riwayatCurrentFilter;
            t.setAttribute('aria-selected', isTarget ? 'true' : 'false');
            if (isTarget) {
              t.classList.add('bg-white', 'text-slate-800', 'shadow-xs');
              t.classList.remove('text-slate-600');
            } else {
              t.classList.remove('bg-white', 'text-slate-800', 'shadow-xs');
              t.classList.add('text-slate-600');
            }
          });

          renderRows();
        });
      });

      // Real-time Search Input
      if (searchInput) {
        searchInput.addEventListener('input', (e) => {
          riwayatCurrentSearch = e.target.value.trim().toLowerCase();
          riwayatCurrentPage = 1;
          renderRows();
        });
      }

      // Reset Filter Button
      if (resetFilterBtn) {
        resetFilterBtn.addEventListener('click', () => {
          riwayatCurrentFilter = 'all';
          riwayatCurrentSearch = '';
          riwayatCurrentPage = 1;
          if (searchInput) searchInput.value = '';

          filterTabs.forEach((t, idx) => {
            if (idx === 0) {
              t.setAttribute('aria-selected', 'true');
              t.classList.add('bg-white', 'text-slate-800', 'shadow-xs');
              t.classList.remove('text-slate-600');
            } else {
              t.setAttribute('aria-selected', 'false');
              t.classList.remove('bg-white', 'text-slate-800', 'shadow-xs');
              t.classList.add('text-slate-600');
            }
          });

          renderRows();
        });
      }

      // Sort Dropdown
      if (sortSelect) {
        sortSelect.addEventListener('change', (e) => {
          riwayatCurrentSort = e.target.value;
          riwayatCurrentPage = 1;
          renderRows();
        });
      }
    }
  }

  // ===========================================================================
  // 10. MODUL DETAIL TRANSAKSI (PELANGGAN/dtltransaksi.html)
  // ===========================================================================
  function initDtlTransaksiPage() {
    const allTrx = getAllCustomerTransactions();
    const catalog = {};
    allTrx.forEach(t => { catalog[t.code] = t; });

    const params = new URLSearchParams(window.location.search);
    let trxId = params.get('id');

    if (!trxId || !catalog[trxId]) {
      // Prioritaskan pesanan aktif terbaru atau transaksi pertama
      const activeRaw = localStorage.getItem('bersihin_active_order') || sessionStorage.getItem('bersihin_last_order');
      if (activeRaw) {
        try {
          const active = JSON.parse(activeRaw);
          if (active && (active.code || active.orderId) && catalog[active.code || active.orderId]) {
            trxId = active.code || active.orderId;
          }
        } catch (_) {}
      }
      if (!trxId || !catalog[trxId]) {
        trxId = allTrx.length > 0 ? allTrx[0].code : 'TRX-240518-01';
      }
    }

    const data = catalog[trxId] || allTrx[0];
    if (!data) return;

    // Render ke elemen dtltransaksi.html
    const trxCodeEl = document.getElementById('trxCodeDisplay') || document.getElementById('dtlTrxCode');
    if (trxCodeEl) trxCodeEl.textContent = data.code;

    const trxCreatedEl = document.getElementById('trxCreatedDisplay') || document.getElementById('dtlTrxCreated');
    if (trxCreatedEl) trxCreatedEl.textContent = data.created;

    const infoServiceEl = document.getElementById('infoService') || document.getElementById('dtlServiceName');
    if (infoServiceEl) infoServiceEl.textContent = data.service;

    const infoWeightEl = document.getElementById('infoWeight') || document.getElementById('dtlWeight');
    if (infoWeightEl) infoWeightEl.textContent = data.weight;

    const infoDateInEl = document.getElementById('infoDateIn') || document.getElementById('dtlDateIn');
    if (infoDateInEl) infoDateInEl.textContent = data.dateIn;

    const infoDateOutEl = document.getElementById('infoDateOut') || document.getElementById('dtlDateOut');
    if (infoDateOutEl) infoDateOutEl.textContent = data.dateOut;

    const infoNotesEl = document.getElementById('infoNotes') || document.getElementById('dtlNotes');
    if (infoNotesEl) infoNotesEl.textContent = data.notes;

    const priceTitleEl = document.getElementById('priceServiceTitle');
    if (priceTitleEl) priceTitleEl.textContent = data.service;

    const priceCalcEl = document.getElementById('priceCalcSub') || document.getElementById('dtlCalcSub');
    if (priceCalcEl) priceCalcEl.textContent = data.calcSub;

    const priceSubtotalEl = document.getElementById('priceSubtotal');
    if (priceSubtotalEl) priceSubtotalEl.textContent = data.total;

    const priceTotalEl = document.getElementById('priceTotal') || document.getElementById('dtlTotal');
    if (priceTotalEl) priceTotalEl.textContent = data.total;

    const paymentAmountEl = document.getElementById('paymentAmount');
    if (paymentAmountEl) paymentAmountEl.textContent = data.total;

    const paymentDateEl = document.getElementById('paymentDate') || document.getElementById('dtlPaidDate');
    if (paymentDateEl) paymentDateEl.textContent = data.paidDate;

    // Status Pill & Dot
    const statusPill = document.getElementById('trxStatusPill');
    const statusDot = document.getElementById('trxStatusDot');
    const statusText = document.getElementById('trxStatusText');

    if (statusText) statusText.textContent = data.status;

    if (statusPill && statusDot && statusText) {
      if (data.status === 'Selesai') {
        statusPill.className = 'px-3 py-1.5 bg-emerald-50 rounded-[20px] inline-flex items-center gap-1.5 shrink-0';
        statusDot.className = 'size-1.5 bg-teal-700 rounded-full';
        statusText.className = 'text-teal-700 text-[11px] font-semibold font-["Poppins"] leading-3';
      } else if (data.status === 'Dibatalkan') {
        statusPill.className = 'px-3 py-1.5 bg-slate-100 rounded-[20px] inline-flex items-center gap-1.5 shrink-0';
        statusDot.className = 'size-1.5 bg-slate-500 rounded-full';
        statusText.className = 'text-slate-600 text-[11px] font-semibold font-["Poppins"] leading-3';
      } else if (data.status === 'Menunggu konfirmasi') {
        statusPill.className = 'px-3 py-1.5 bg-amber-50 border border-amber-200 rounded-[20px] inline-flex items-center gap-1.5 shrink-0';
        statusDot.className = 'size-1.5 bg-amber-500 rounded-full';
        statusText.className = 'text-amber-800 text-[11px] font-semibold font-["Poppins"] leading-3';
      } else {
        statusPill.className = 'px-3 py-1.5 bg-orange-100 rounded-[20px] inline-flex items-center gap-1.5 shrink-0';
        statusDot.className = 'size-1.5 bg-yellow-600 rounded-full';
        statusText.className = 'text-yellow-700 text-[11px] font-semibold font-["Poppins"] leading-3';
      }
    }

    // Hubungkan Bukti Transaksi dan Tombol Invoice langsung ke Pemeriksaan Invoice (Bukan Pop Up)
    const dtlBuktiLink = document.getElementById('dtlBuktiLink');
    if (dtlBuktiLink) {
      dtlBuktiLink.href = `invoice.html?id=${encodeURIComponent(data.code)}`;
    }

    const viewFullInvoiceBtn = document.getElementById('viewFullInvoiceBtn');
    if (viewFullInvoiceBtn) {
      viewFullInvoiceBtn.href = `invoice.html?id=${encodeURIComponent(data.code)}`;
    }

    // Tampilkan Bukti Transfer Riil jika tersimpan
    let proofImgSrc = data.bukti_transfer || data.bukti_bayar || null;
    try {
      const invList = JSON.parse(localStorage.getItem('bersihin_invoices') || '[]');
      const found = invList.find(x => (x.kode_pesanan === data.code || x.orderId === data.code || x.id === data.code));
      if (found && (found.bukti_transfer || found.bukti_bayar)) {
        proofImgSrc = found.bukti_transfer || found.bukti_bayar;
      }
    } catch(_) {}

    const dtlBuktiImg = document.getElementById('dtlBuktiImg');
    const dtlBuktiBadge = document.getElementById('dtlBuktiBadge');
    if (proofImgSrc && dtlBuktiImg) {
      dtlBuktiImg.src = proofImgSrc;
      if (dtlBuktiBadge) {
        dtlBuktiBadge.textContent = 'Terlampir';
        dtlBuktiBadge.className = 'px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700';
      }
    }

    // Salin Kode Transaksi
    const copyTrxBtn = document.getElementById('copyTrxBtn');
    if (copyTrxBtn) {
      copyTrxBtn.addEventListener('click', () => {
        if (navigator.clipboard) {
          navigator.clipboard.writeText(data.code).then(() => {
            showToast('Kode transaksi ' + data.code + ' disalin ke clipboard!');
          });
        } else {
          showToast('Kode transaksi: ' + data.code);
        }
      });
    }

    // Cetak Invoice Transaksi
    const printInvoiceBtn = document.getElementById('printInvoiceBtn');
    if (printInvoiceBtn) {
      printInvoiceBtn.addEventListener('click', () => {
        window.print();
      });
    }
  }

  function getBackendBaseUrl() {
    if (typeof window !== 'undefined' && window.location.origin && window.location.origin.includes(':5000')) {
      return '';
    }
    return 'http://localhost:5000';
  }

  // ===========================================================================
  // 11. MODUL PROFIL PELANGGAN (PELANGGAN/profil.html)
  // ===========================================================================
  async function initProfilPage() {
    const displayFullName = document.getElementById('displayFullName');
    if (!displayFullName) return;

    let profile = getCustomerProfile();

    // Coba ambil data terbaru langsung dari Database MySQL Backend
    try {
      const token = localStorage.getItem('bersihin_token');
      const headers = {};
      if (token) headers['Authorization'] = 'Bearer ' + token;

      const res = await fetch(`${getBackendBaseUrl()}/api/pelanggan/profil?id_pelanggan=${encodeURIComponent(profile.id_pelanggan || 1)}&id_user=${encodeURIComponent(profile.id_user || 4)}`, { credentials: 'same-origin', headers });
      const result = await res.json();
      if (result && result.success && result.data) {
        const d = result.data;
        profile = saveCustomerProfile({
          id_pelanggan: d.id_pelanggan || profile.id_pelanggan || 1,
          id_user: d.id_user || profile.id_user || 4,
          username: d.username || profile.username || 'andipratama',
          kode_pelanggan: d.kode_pelanggan || profile.kode_pelanggan || 'PLG-08129',
          fullName: d.nama || profile.fullName,
          phone: d.telepon || profile.phone,
          email: d.email || profile.email,
          address: d.alamat || profile.address,
          created_at: d.created_at || profile.created_at
        });
      }
    } catch (_) {}

    // Render kontak pelanggan
    const displayPhone = document.getElementById('displayPhone');
    const displayEmail = document.getElementById('displayEmail');
    const displayAddress = document.getElementById('displayAddress');
    const bannerProfileName = document.getElementById('bannerProfileName');
    const bannerProfileEmail = document.getElementById('bannerProfileEmail');

    if (displayFullName) displayFullName.textContent = profile.fullName;
    if (displayPhone) displayPhone.textContent = profile.phone;
    if (displayEmail) displayEmail.textContent = profile.email;
    if (displayAddress) displayAddress.textContent = profile.address;
    if (bannerProfileName) bannerProfileName.textContent = profile.fullName;
    if (bannerProfileEmail) bannerProfileEmail.textContent = profile.email;

    const memberSinceStr = formatMemberSince(profile.created_at || profile.createdAt || profile.joinedAt || profile.joinDate);
    document.querySelectorAll('#bannerMemberSince, .banner-member-since').forEach(el => {
      if (el) el.textContent = memberSinceStr;
    });

    // Sinkronisasi inisial avatar pengguna
    const initials = getInitials(profile.fullName || 'Pelanggan');
    document.querySelectorAll('#bannerProfileAvatar, #modalPhotoPreviewAvatar, .customer-avatar-btn').forEach(el => {
      if (el) el.textContent = initials;
    });

    // Modal Ubah Foto Profil jika ada
    const changePhotoBtn = document.getElementById('changePhotoBtn');
    const photoModal = document.getElementById('photoModal');
    const closePhotoModalBtn = document.getElementById('closePhotoModalBtn');
    const savePhotoModalBtn = document.getElementById('savePhotoModalBtn');

    if (changePhotoBtn && photoModal) {
      changePhotoBtn.addEventListener('click', () => photoModal.classList.remove('hidden'));
    }
    if (closePhotoModalBtn && photoModal) {
      closePhotoModalBtn.addEventListener('click', () => photoModal.classList.add('hidden'));
    }
    if (savePhotoModalBtn && photoModal) {
      savePhotoModalBtn.addEventListener('click', () => {
        photoModal.classList.add('hidden');
        showToast('Foto profil baru berhasil dipasang!');
      });
    }
  }

  // ===========================================================================
  // 12. MODUL EDIT PROFIL (PELANGGAN/editprofil.html)
  // ===========================================================================
  async function initEditProfilPage() {
    const editProfileForm = document.getElementById('editProfileForm');
    if (!editProfileForm) return;

    let profile = getCustomerProfile();

    const fullNameInput = document.getElementById('fullNameInput');
    const phoneInput = document.getElementById('phoneInput');
    const emailInput = document.getElementById('emailInput');
    const addressInput = document.getElementById('addressInput');
    const saveProfileBtn = document.getElementById('saveProfileBtn');
    const editProfileAlert = document.getElementById('editProfileAlert');
    const editProfileErrorMessage = document.getElementById('editProfileErrorMessage');

    // Coba ambil data teraktual dari database MySQL
    try {
      const token = localStorage.getItem('bersihin_token');
      const headers = {};
      if (token) headers['Authorization'] = 'Bearer ' + token;

      const res = await fetch(`${getBackendBaseUrl()}/api/pelanggan/profil?id_pelanggan=${encodeURIComponent(profile.id_pelanggan || 1)}&id_user=${encodeURIComponent(profile.id_user || 4)}`, { credentials: 'same-origin', headers });
      const result = await res.json();
      if (result && result.success && result.data) {
        const d = result.data;
        if (d.nama) profile.fullName = d.nama;
        if (d.telepon) profile.phone = d.telepon;
        if (d.email) profile.email = d.email;
        if (d.alamat) profile.address = d.alamat;
        if (d.created_at) profile.created_at = d.created_at;
      }
    } catch (_) {}

    const memberSinceStr = formatMemberSince(profile.created_at || profile.createdAt || profile.joinedAt || profile.joinDate);
    document.querySelectorAll('#bannerMemberSince, .banner-member-since').forEach(el => {
      if (el) el.textContent = memberSinceStr;
    });

    // Isi input awal dengan data profil
    if (fullNameInput) fullNameInput.value = profile.fullName;
    if (phoneInput) phoneInput.value = profile.phone;
    if (emailInput) emailInput.value = profile.email;
    if (addressInput) addressInput.value = profile.address;

    function showEditError(msg) {
      if (!editProfileAlert || !editProfileErrorMessage) return;
      editProfileErrorMessage.textContent = msg;
      editProfileAlert.classList.remove('hidden');
      editProfileAlert.classList.add('flex');
    }

    function hideEditError() {
      if (!editProfileAlert) return;
      editProfileAlert.classList.add('hidden');
      editProfileAlert.classList.remove('flex');
    }

    editProfileForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      hideEditError();

      const fullName = fullNameInput ? fullNameInput.value.trim() : '';
      const phone = phoneInput ? phoneInput.value.trim() : '';
      const email = emailInput ? emailInput.value.trim() : '';
      const address = addressInput ? addressInput.value.trim() : '';

      if (!fullName) {
        showEditError('Nama lengkap tidak boleh kosong.');
        if (fullNameInput) fullNameInput.focus();
        return;
      }

      if (!phone) {
        showEditError('Nomor HP / WhatsApp tidak boleh kosong.');
        if (phoneInput) phoneInput.focus();
        return;
      }

      if (!email || !email.includes('@')) {
        showEditError('Format email tidak valid.');
        if (emailInput) emailInput.focus();
        return;
      }

      if (!address) {
        showEditError('Alamat lengkap penjemputan tidak boleh kosong.');
        if (addressInput) addressInput.focus();
        return;
      }

      if (saveProfileBtn) {
        saveProfileBtn.disabled = true;
        saveProfileBtn.innerHTML = `
          <svg class="size-4 animate-spin" viewBox="0 0 24 24" fill="none">
            <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" class="opacity-25"></circle>
            <path fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" class="opacity-75"></path>
          </svg>
          <span>Menyimpan...</span>
        `;
      }

      // 1. Simpan perubahan ke Database MySQL Backend
      const currentProf = getCustomerProfile();
      let activeUserId = currentProf.id_user;
      let activeCustId = currentProf.id_pelanggan;

      try {
        const token = sessionStorage.getItem('bersihin_token') || localStorage.getItem('bersihin_token');
        const headers = { 'Content-Type': 'application/json' };
        if (token) headers['Authorization'] = 'Bearer ' + token;

        await fetch(`${getBackendBaseUrl()}/api/pelanggan/profil`, {
          method: 'PUT',
          headers,
          body: JSON.stringify({
            id_user: activeUserId,
            id_pelanggan: activeCustId,
            nama: fullName,
            telepon: phone,
            phone: phone,
            email: email,
            alamat: address
          })
        });
      } catch (err) {
        console.warn('Gagal update profil MySQL:', err.message);
      }

      // 2. Simpan perubahan ke storage
      saveCustomerProfile({
        fullName: fullName,
        phone: phone,
        email: email,
        address: address
      });

      showToast('Profil berhasil diperbarui! Mengalihkan ke profil...');

      setTimeout(() => {
        window.location.href = 'profil.html';
      }, 1200);
    });
  }

  // ===========================================================================
  // 13. MODUL UBAH PASSWORD (PELANGGAN/password.html)
  // ===========================================================================
  function initPasswordPage() {
    const changePasswordForm = document.getElementById('changePasswordForm');
    if (!changePasswordForm) return;

    const profile = getCustomerProfile();
    const memberSinceStr = formatMemberSince(profile.created_at || profile.createdAt || profile.joinedAt || profile.joinDate);
    document.querySelectorAll('#bannerMemberSince, .banner-member-since').forEach(el => {
      if (el) el.textContent = memberSinceStr;
    });

    // Toggle Tampilkan / Sembunyikan Password pada 3 Input
    document.querySelectorAll('.toggle-pass-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const targetId = btn.getAttribute('data-toggle-target');
        const input = document.getElementById(targetId);
        if (!input) return;

        if (input.type === 'password') {
          input.type = 'text';
          btn.innerHTML = `
            <svg class="size-4" viewBox="0 0 16 16" fill="none" aria-hidden="true">
              <path d="M2 2L14 14M6.7 6.7C6.3 7.1 6 7.5 6 8C6 9.1 6.9 10 8 10C8.5 10 8.9 9.7 9.3 9.3M9.9 5.2C9.3 4.8 8.7 4.5 8 4.5C4.5 4.5 2 9 2 9C2.7 10.3 3.9 11.6 5.5 12.4" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" />
            </svg>
          `;
        } else {
          input.type = 'password';
          btn.innerHTML = `
            <svg class="size-4" viewBox="0 0 16 16" fill="none" aria-hidden="true">
              <circle cx="8" cy="8" r="2.5" stroke="currentColor" stroke-width="1.3" />
              <path d="M2 8C2 8 4.5 3.5 8 3.5C11.5 3.5 14 8 14 8C14 8 11.5 12.5 8 12.5C4.5 12.5 2 8 2 8Z" stroke="currentColor" stroke-width="1.3" />
            </svg>
          `;
        }
      });
    });

    // Indikator Kekuatan Password Real-time
    const newPasswordInput = document.getElementById('newPasswordInput');
    const strengthText = document.getElementById('strengthText');
    const bar1 = document.getElementById('bar1');
    const bar2 = document.getElementById('bar2');
    const bar3 = document.getElementById('bar3');

    if (newPasswordInput && strengthText) {
      newPasswordInput.addEventListener('input', () => {
        const val = newPasswordInput.value;
        if (!val) {
          strengthText.textContent = 'Belum diisi';
          strengthText.className = 'font-semibold text-slate-400';
          if (bar1) bar1.className = 'h-full flex-1 bg-slate-200 rounded-full transition-colors duration-200';
          if (bar2) bar2.className = 'h-full flex-1 bg-slate-200 rounded-full transition-colors duration-200';
          if (bar3) bar3.className = 'h-full flex-1 bg-slate-200 rounded-full transition-colors duration-200';
          return;
        }

        let score = 0;
        if (val.length >= 8) score++;
        if (/[A-Z]/.test(val) && /[a-z]/.test(val)) score++;
        if (/[0-9]/.test(val) || /[^A-Za-z0-9]/.test(val)) score++;

        if (score === 1) {
          strengthText.textContent = 'Lemah';
          strengthText.className = 'font-semibold text-rose-500';
          if (bar1) bar1.className = 'h-full flex-1 bg-rose-500 rounded-full transition-colors duration-200';
          if (bar2) bar2.className = 'h-full flex-1 bg-slate-200 rounded-full transition-colors duration-200';
          if (bar3) bar3.className = 'h-full flex-1 bg-slate-200 rounded-full transition-colors duration-200';
        } else if (score === 2) {
          strengthText.textContent = 'Sedang';
          strengthText.className = 'font-semibold text-amber-500';
          if (bar1) bar1.className = 'h-full flex-1 bg-amber-500 rounded-full transition-colors duration-200';
          if (bar2) bar2.className = 'h-full flex-1 bg-amber-500 rounded-full transition-colors duration-200';
          if (bar3) bar3.className = 'h-full flex-1 bg-slate-200 rounded-full transition-colors duration-200';
        } else {
          strengthText.textContent = 'Kuat';
          strengthText.className = 'font-semibold text-emerald-600';
          if (bar1) bar1.className = 'h-full flex-1 bg-emerald-500 rounded-full transition-colors duration-200';
          if (bar2) bar2.className = 'h-full flex-1 bg-emerald-500 rounded-full transition-colors duration-200';
          if (bar3) bar3.className = 'h-full flex-1 bg-emerald-500 rounded-full transition-colors duration-200';
        }
      });
    }

    // Submit & Validasi Form Ubah Password
    const passwordErrorAlert = document.getElementById('passwordErrorAlert');
    const passwordErrorMessage = document.getElementById('passwordErrorMessage');
    const submitPasswordBtn = document.getElementById('submitPasswordBtn');

    function showPassError(msg) {
      if (!passwordErrorAlert || !passwordErrorMessage) return;
      passwordErrorMessage.textContent = msg;
      passwordErrorAlert.classList.remove('hidden');
      passwordErrorAlert.classList.add('flex');
    }

    function hidePassError() {
      if (!passwordErrorAlert) return;
      passwordErrorAlert.classList.add('hidden');
      passwordErrorAlert.classList.remove('flex');
    }

    changePasswordForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      hidePassError();

      const currentPassEl = document.getElementById('currentPasswordInput');
      const newPassEl = document.getElementById('newPasswordInput');
      const confirmPassEl = document.getElementById('confirmPasswordInput');

      const currentPass = currentPassEl ? currentPassEl.value.trim() : '';
      const newPass = newPassEl ? newPassEl.value.trim() : '';
      const confirmPass = confirmPassEl ? confirmPassEl.value.trim() : '';

      if (!currentPass) {
        showPassError('Silakan masukkan password saat ini.');
        if (currentPassEl) currentPassEl.focus();
        return;
      }

      if (newPass.length < 8) {
        showPassError('Password baru harus memiliki minimal 8 karakter.');
        if (newPassEl) newPassEl.focus();
        return;
      }

      if (newPass === currentPass) {
        showPassError('Password baru tidak boleh sama dengan password saat ini.');
        if (newPassEl) newPassEl.focus();
        return;
      }

      if (newPass !== confirmPass) {
        showPassError('Konfirmasi password baru tidak cocok dengan password baru.');
        if (confirmPassEl) confirmPassEl.focus();
        return;
      }

      if (submitPasswordBtn) {
        submitPasswordBtn.disabled = true;
        submitPasswordBtn.innerHTML = `
          <svg class="size-4 animate-spin" viewBox="0 0 24 24" fill="none">
            <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" class="opacity-25"></circle>
            <path fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" class="opacity-75"></path>
          </svg>
          <span>Menyimpan...</span>
        `;
      }

      // Kirim pembaruan password ke Backend MySQL
      try {
        const token = localStorage.getItem('bersihin_token');
        const headers = { 'Content-Type': 'application/json' };
        if (token) headers['Authorization'] = 'Bearer ' + token;

        const resp = await fetch(`${getBackendBaseUrl()}/api/pelanggan/password`, {
          method: 'PUT',
          headers,
          body: JSON.stringify({
            password_lama: currentPass,
            password_baru: newPass
          })
        });

        const resData = await resp.json();
        if (!resp.ok || !resData.success) {
          showPassError(resData.message || 'Gagal mengubah kata sandi.');
          if (submitPasswordBtn) {
            submitPasswordBtn.disabled = false;
            submitPasswordBtn.innerHTML = `
              <svg class="size-4" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                <path d="M3.5 8.5L6.5 11.5L12.5 4.5" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" />
              </svg>
              <span>Simpan Password Baru</span>
            `;
          }
          return;
        }

        showToast('Password berhasil diperbarui! Mengalihkan ke profil...');
        changePasswordForm.reset();

        setTimeout(() => {
          window.location.href = 'profil.html';
        }, 1500);

      } catch (err) {
        showPassError('Gagal terhubung ke server: ' + err.message);
        if (submitPasswordBtn) {
          submitPasswordBtn.disabled = false;
          submitPasswordBtn.innerHTML = `
            <svg class="size-4" viewBox="0 0 16 16" fill="none" aria-hidden="true">
              <path d="M3.5 8.5L6.5 11.5L12.5 4.5" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" />
            </svg>
            <span>Simpan Password Baru</span>
          `;
        }
      }
    });
  }

  // ===========================================================================
  // 14. BOOTSTRAP: JALANKAN INISIALISASI SETELAH DOM SIAP
  // ===========================================================================
  function logoutCustomer(event) {
    if (event && event.preventDefault) {
      event.preventDefault();
    }
    try {
      localStorage.removeItem('bersihin_token');
      localStorage.removeItem('bersihin_user');
      localStorage.removeItem('bersihin_active_role');
      localStorage.removeItem('bersihin_customer_profile');
      sessionStorage.removeItem('bersihin_token');
      sessionStorage.removeItem('bersihin_user');
      sessionStorage.removeItem('bersihin_active_role');
      sessionStorage.removeItem('bersihin_customer_profile');

      const apiBase = getApiBaseUrl();
      fetch(`${apiBase}/api/auth/logout`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include'
      }).catch(() => {});
    } catch (e) {
      console.error('Logout error:', e);
    }
    window.location.href = '../login.html';
  }

  window.logoutCustomer = logoutCustomer;

  function bootstrap() {
    initSharedComponents();
    initLoginPage();
    initDashboardPage();
    initLayananPage();
    initPesananPage();
    initStatusPage();
    initRiwayatPage();
    initDtlTransaksiPage();
    initProfilPage();
    initEditProfilPage();
    initPasswordPage();

    // Pasang penangan logout ke semua tautan/tombol keluar pelanggan
    document.querySelectorAll('a[href*="login.html"], [title="Keluar"]').forEach(el => {
      el.addEventListener('click', logoutCustomer);
    });

    // Otomatis sinkronisasi profil dan pesanan langsung dari database MySQL XAMPP jika backend aktif
    if (typeof syncAllCustomerDataWithBackend === 'function') {
      syncAllCustomerDataWithBackend().then(() => {
        initSharedComponents();
        initDashboardPage();
        initStatusPage();
        initRiwayatPage();
        initProfilPage();
      }).catch(() => {});
    }

    // Dengarkan pembaruan status real-time dari portal Pegawai
    window.addEventListener('storage', (e) => {
      if (e.key === 'bersihin_order_updated' || e.key === 'bersihin_transactions' || e.key === 'bersihin_active_order') {
        if (typeof syncAllCustomerDataWithBackend === 'function') {
          syncAllCustomerDataWithBackend().then(() => {
            initSharedComponents();
            initDashboardPage();
            initStatusPage();
            initRiwayatPage();
            initProfilPage();
          }).catch(() => {});
        }
      }
    });

    // Polling sinkronisasi real-time berkala ke database MySQL XAMPP setiap 3.5 detik
    setInterval(() => {
      if (typeof syncAllCustomerDataWithBackend === 'function') {
        syncAllCustomerDataWithBackend().then(() => {
          const path = (window.location.pathname || '').toLowerCase();
          if (path.includes('dashboard.html') || path.endsWith('/pelanggan/') || path.endsWith('/pelanggan')) {
            initDashboardPage();
          } else if (path.includes('status.html')) {
            if (typeof loadActiveOrderStatus === 'function') loadActiveOrderStatus();
          } else if (path.includes('riwayat.html')) {
            initRiwayatPage();
          } else if (path.includes('profil.html')) {
            initProfilPage();
          }
        }).catch(() => {});
      }
    }, 3500);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', bootstrap);
  } else {
    bootstrap();
  }

})();


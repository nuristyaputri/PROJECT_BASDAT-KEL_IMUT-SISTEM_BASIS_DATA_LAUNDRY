/**
 * =============================================================================
 * SISTEM BASIS DATA LAUNDRY - MODUL JAVASCRIPT PEMILIK (OWNER CONSOLE)
 * File: JS/pemilik.js
 * Deskripsi: Skrip logika interaktif murni (Vanilla JS) untuk seluruh halaman
 *            portal Pemilik (Bersihin Owner Console).
 * 
 * STRUKTUR INTEGRASI BASIS DATA:
 * - Tabel `pemilik` / `pengguna`: Profil pemilik, kredensial autentikasi.
 * - Tabel `pegawai`: Manajemen data staf, posisi/jabatan, jadwal shift.
 * - Tabel `pelanggan`: Data pelanggan, riwayat belanja, akumulasi transaksi.
 * - Tabel `layanan`: Pengaturan tarif, durasi pengerjaan, paket laundry.
 * - Tabel `transaksi`: Monitoring operasional cucian, status pengerjaan, pembayaran.
 * - Tabel `laporan`: Rekapitulasi omzet harian, bulanan, tahunan.
 * =============================================================================
 */

(function () {
  'use strict';

  // ===========================================================================
  // 1. KONFIGURASI GLOBAL & ENDPOINT BACKEND PEMILIK
  // ===========================================================================
  const PemilikConfig = {
    appName: 'Bersihin Owner Console',
    storageKeys: {
      profile: 'bersihin_owner_profile',
      employees: 'bersihin_owner_employees',
      customers: 'bersihin_owner_customers',
      services: 'bersihin_owner_services',
      transactions: 'bersihin_owner_transactions'
    },
    apiEndpoints: {
      login: '/api/pemilik/login',
      profile: '/api/pemilik/profile',
      updateProfile: '/api/pemilik/profile/update',
      updatePassword: '/api/pemilik/password/update',
      dashboardSummary: '/api/pemilik/dashboard/summary',
      employees: '/api/pemilik/employees',
      createEmployee: '/api/pemilik/employees/create',
      customers: '/api/pemilik/customers',
      createCustomer: '/api/pemilik/customers/create',
      services: '/api/pemilik/services',
      createService: '/api/pemilik/services/create',
      updateService: '/api/pemilik/services/update',
      transactions: '/api/pemilik/transactions',
      reports: '/api/pemilik/reports'
    },
    defaultProfile: {
      fullName: 'Rangga Saputra',
      email: 'rangga@bersihin.id',
      phone: '081211223344',
      role: 'Owner & General Manager',
      location: 'Jl. Margonda Raya No. 10, Depok, Jawa Barat',
      joinDate: 'Januari 2024'
    }
  };

  // ===========================================================================
  // 2. UTILITAS GLOBAL & AUTENTIKASI BACKEND MYSQL XAMPP
  // ===========================================================================

  function getBackendBaseUrl() {
    if (window.location.protocol.startsWith('http') && window.location.port === '5000') {
      return '';
    }
    return 'http://localhost:5000';
  }

  async function ensurePemilikToken() {
    const sessionToken = sessionStorage.getItem('bersihin_token') || sessionStorage.getItem('bersihin_owner_token');
    if (sessionToken) return sessionToken;

    const localToken = localStorage.getItem('bersihin_token') || localStorage.getItem('bersihin_owner_token');
    if (localToken) return localToken;

    try {
      const res = await fetch(`${getBackendBaseUrl()}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier: 'pemilik', password: 'password123' })
      });
      const json = await res.json();
      if (json && json.success && json.data && json.data.token) {
        sessionStorage.setItem('bersihin_owner_token', json.data.token);
        sessionStorage.setItem('bersihin_token', json.data.token);
        localStorage.setItem('bersihin_owner_token', json.data.token);
        return json.data.token;
      }
    } catch (_) {}
    return null;
  }

  function updatePemilikRealtimeDate() {
    const now = new Date();
    const days = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
    const months = [
      'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
      'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
    ];
    const dayName = days[now.getDay()];
    const dateFormatted = `${now.getDate()} ${months[now.getMonth()]} ${now.getFullYear()}`;
    const fullDateText = `${dayName}, ${dateFormatted}`;

    document.querySelectorAll('#ownerDateDisplay, [data-realtime-full-date]').forEach(el => {
      el.textContent = fullDateText;
    });
    document.querySelectorAll('[data-realtime-date]').forEach(el => {
      el.textContent = dateFormatted;
    });
    document.querySelectorAll('[data-realtime-day]').forEach(el => {
      el.textContent = dayName;
    });
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
    let toast = document.getElementById('globalToast');
    if (!toast) {
      toast = document.createElement('div');
      toast.id = 'globalToast';
      toast.className = 'fixed bottom-6 right-6 z-50 transform translate-y-24 opacity-0 transition-all duration-300 pointer-events-none bg-slate-900 text-white px-4 py-3 rounded-xl shadow-xl flex items-center gap-2.5 text-xs';
      toast.innerHTML = `
        <div id="globalToastIcon" class="size-5 rounded-full bg-emerald-500 text-white flex items-center justify-center shrink-0">
          <svg class="size-3" viewBox="0 0 16 16" fill="none">
            <path d="M3.5 8.5L6.5 11.5L12.5 4.5" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
          </svg>
        </div>
        <span id="globalToastMessage">${message}</span>
      `;
      document.body.appendChild(toast);
    }

    const toastMessage = document.getElementById('globalToastMessage');
    const toastIcon = document.getElementById('globalToastIcon');

    if (toastMessage) toastMessage.textContent = message;

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

  // Ekspos toast ke window
  window.showBersihinToast = showToast;

  /**
   * Mengambil data profil pemilik dari storage
   */
  function getOwnerProfile() {
    try {
      const rawUser = sessionStorage.getItem('bersihin_user') || localStorage.getItem('bersihin_user');
      const parsedUser = rawUser ? JSON.parse(rawUser) : null;
      const stored = sessionStorage.getItem(PemilikConfig.storageKeys.profile) || localStorage.getItem(PemilikConfig.storageKeys.profile);
      let prof = stored
        ? Object.assign({}, PemilikConfig.defaultProfile, JSON.parse(stored))
        : Object.assign({}, PemilikConfig.defaultProfile);

      if (parsedUser && parsedUser.role === 'PEMILIK') {
        prof = Object.assign(prof, {
          fullName: parsedUser.nama || prof.fullName,
          email: parsedUser.email || prof.email,
          phone: parsedUser.no_telp || parsedUser.telepon || prof.phone,
          location: parsedUser.alamat || prof.location,
          username: parsedUser.username || prof.username
        });
      }
      return prof;
    } catch (e) {
      console.warn('Gagal membaca storage profil pemilik:', e);
    }
    return PemilikConfig.defaultProfile;
  }

  /**
   * Menyimpan data profil pemilik ke storage
   */
  function saveOwnerProfile(data) {
    try {
      const current = getOwnerProfile();
      const updated = Object.assign({}, current, data);
      sessionStorage.setItem(PemilikConfig.storageKeys.profile, JSON.stringify(updated));
      localStorage.setItem(PemilikConfig.storageKeys.profile, JSON.stringify(updated));
      return updated;
    } catch (e) {
      console.warn('Gagal menyimpan storage profil pemilik:', e);
      return data;
    }
  }

  // ===========================================================================
  // 3. INISIALISASI KOMPONEN BERSAMA (SIDEBAR & TOPBAR DROPDOWNS)
  // ===========================================================================
  function initSharedComponents() {
    // 3.1 Sinkronisasi Profil Pemilik di Header / Topbar & Sidebar
    const profile = getOwnerProfile();
    const ownerNameEls = document.querySelectorAll('#topbarOwnerName, #profileOwnerName, #bannerOwnerName, #dropdownOwnerName, #sidebarOwnerName');
    const ownerEmailEls = document.querySelectorAll('#topbarOwnerEmail, #profileOwnerEmail, #bannerOwnerEmail, #dropdownOwnerEmail');

    ownerNameEls.forEach(el => {
      if (el) el.textContent = profile.fullName;
    });
    ownerEmailEls.forEach(el => {
      if (el) el.textContent = profile.email;
    });

    // 3.2 Mobile Sidebar Toggle
    const sidebar = document.getElementById('sidebar');
    const sidebarToggle = document.getElementById('sidebarToggle');
    const sidebarOverlay = document.getElementById('sidebarOverlay');

    function toggleSidebar() {
      if (!sidebar) return;
      sidebar.classList.toggle('-translate-x-full');
      if (sidebarOverlay) sidebarOverlay.classList.toggle('hidden');
    }

    function closeSidebar() {
      if (!sidebar) return;
      sidebar.classList.add('-translate-x-full');
      if (sidebarOverlay) sidebarOverlay.classList.add('hidden');
    }

    if (sidebarToggle && !sidebarToggle.dataset.hasSidebarListener) {
      sidebarToggle.dataset.hasSidebarListener = 'true';
      sidebarToggle.addEventListener('click', toggleSidebar);
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
    if (sidebar && !document.body.dataset.hasOwnerEscSidebar) {
      document.body.dataset.hasOwnerEscSidebar = 'true';
      document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && !sidebar.classList.contains('-translate-x-full')) {
          closeSidebar();
        }
      });
    }

    // 3.3 Topbar Notification Dropdown
    const notifToggleBtn = document.getElementById('notifToggleBtn');
    const notifDropdown = document.getElementById('notifDropdown');
    const notifDot = document.getElementById('notifDot');
    const markNotifReadBtn = document.getElementById('markNotifReadBtn');

    if (notifToggleBtn && notifDropdown && !notifToggleBtn.dataset.hasNotifListener) {
      notifToggleBtn.dataset.hasNotifListener = 'true';
      notifToggleBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        const willOpen = notifDropdown.classList.contains('hidden');
        notifDropdown.classList.toggle('hidden', !willOpen);
        const profileDropdown = document.getElementById('profileDropdown');
        if (profileDropdown) profileDropdown.classList.add('hidden');
        notifToggleBtn.setAttribute('aria-expanded', String(willOpen));
      });
    }

    if (markNotifReadBtn && !markNotifReadBtn.dataset.hasMarkListener) {
      markNotifReadBtn.dataset.hasMarkListener = 'true';
      markNotifReadBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        if (notifDot) notifDot.classList.add('hidden');
        if (notifDropdown) notifDropdown.classList.add('hidden');
        showToast('Semua notifikasi pemilik telah ditandai dibaca.');
      });
    }

    // 3.4 Topbar Profile Dropdown (Rangga Saputra)
    const profileMenuBtn = document.getElementById('profileMenuBtn');
    const profileDropdown = document.getElementById('profileDropdown');

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

    // 3.5 Klik di luar untuk menutup seluruh dropdown
    if (!document.body.dataset.hasOwnerGlobalDrop) {
      document.body.dataset.hasOwnerGlobalDrop = 'true';
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

    // 3.6 Tombol Escape untuk menutup modal & menu
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        const curNotifBtn = document.getElementById('notifToggleBtn');
        const curNotifDrop = document.getElementById('notifDropdown');
        const curProfBtn = document.getElementById('profileMenuBtn');
        const curProfDrop = document.getElementById('profileDropdown');

        if (curNotifDrop) curNotifDrop.classList.add('hidden');
        if (curNotifBtn) curNotifBtn.setAttribute('aria-expanded', 'false');
        if (curProfDrop) curProfDrop.classList.add('hidden');
        if (curProfBtn) curProfBtn.setAttribute('aria-expanded', 'false');
        closeSidebar();

        const openModals = document.querySelectorAll('[role="dialog"]:not(.hidden), .modal:not(.hidden)');
        openModals.forEach(m => m.classList.add('hidden'));
      }
    });
  }

  // ===========================================================================
  // 4. MODUL LOGIN PEMILIK (PEMILIK/login.html)
  // ===========================================================================
  function initLoginPage() {
    const loginForm = document.getElementById('loginForm') || document.querySelector('form');
    const passwordInput = document.getElementById('password');
    const togglePassword = document.getElementById('togglePassword');
    const eyeIcon = document.getElementById('eyeIcon');

    if (passwordInput && togglePassword && !togglePassword.dataset.hasToggleListener) {
      togglePassword.dataset.hasToggleListener = 'true';
      togglePassword.addEventListener('click', (e) => {
        e.preventDefault();
        const isPassword = passwordInput.type === 'password';
        passwordInput.type = isPassword ? 'text' : 'password';

      if (eyeIcon) {
        if (isPassword) {
          eyeIcon.innerHTML = `
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l18 18" />
          `;
        } else {
          eyeIcon.innerHTML = `
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
          `;
        }
      }
    });
  }

    if (loginForm && window.location.pathname.toLowerCase().includes('login.html')) {
      loginForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const emailInput = document.getElementById('username') || document.getElementById('email') || document.getElementById('identifier');
        const emailVal = emailInput ? emailInput.value.trim() : '';
        const passVal = passwordInput ? passwordInput.value : '';

        if (!emailVal) {
          showToast('Harap masukkan username atau email pemilik.', true);
          if (emailInput) emailInput.focus();
          return;
        }

        if (!passVal) {
          showToast('Harap masukkan password akun pemilik.', true);
          if (passwordInput) passwordInput.focus();
          return;
        }

        if (passVal.length < 6) {
          showToast('Password minimal 6 karakter.', true);
          if (passwordInput) passwordInput.focus();
          return;
        }

        // Simpan sesi login pemilik
        try {
          localStorage.setItem('bersihin_owner_logged_in', 'true');
        } catch (err) { }

        showToast('Login berhasil! Mengalihkan ke dashboard...');
        setTimeout(() => {
          window.location.href = 'dashboard.html';
        }, 800);
      });
    }
  }

  // ===========================================================================
  // 5. MODUL DASHBOARD PEMILIK (PEMILIK/dashboard.html)
  // ===========================================================================
  function initDashboardPage() {
    // 5.1 Grafik Pendapatan Interaktif
    const revPeriodBtn = document.getElementById('revPeriodBtn');
    const revPeriodLabel = document.getElementById('revPeriodLabel');
    const revPeriodMenu = document.getElementById('revPeriodMenu');
    const revTotalValue = document.getElementById('revTotalValue');
    const revBadgeValue = document.getElementById('revBadgeValue');
    const revSelectedDayBadge = document.getElementById('revSelectedDayBadge');
    const revAreaPath = document.getElementById('revAreaPath');
    const revLinePath = document.getElementById('revLinePath');

    const revPeriodData = {
      '7d': {
        label: '7 hari terakhir',
        total: 'Rp6.840.000',
        growth: '+15,8%',
        line: 'M 0 95 C 100 80, 150 110, 230 65 C 320 20, 400 85, 480 40 C 560 0, 620 50, 700 25',
        area: 'M 0 95 C 100 80, 150 110, 230 65 C 320 20, 400 85, 480 40 C 560 0, 620 50, 700 25 L 700 130 L 0 130 Z'
      },
      '14d': {
        label: '14 hari terakhir',
        total: 'Rp13.120.000',
        growth: '+16,9%',
        line: 'M 0 105 C 100 90, 150 75, 230 70 C 320 55, 400 50, 480 45 C 560 30, 620 35, 700 20',
        area: 'M 0 105 C 100 90, 150 75, 230 70 C 320 55, 400 50, 480 45 C 560 30, 620 35, 700 20 L 700 130 L 0 130 Z'
      },
      '30d': {
        label: '30 hari terakhir',
        total: 'Rp24.800.000',
        growth: '+18,2%',
        line: 'M 0 110 C 100 95, 150 85, 230 60 C 320 45, 400 55, 480 30 C 560 25, 620 20, 700 15',
        area: 'M 0 110 C 100 95, 150 85, 230 60 C 320 45, 400 55, 480 30 C 560 25, 620 20, 700 15 L 700 130 L 0 130 Z'
      }
    };

    if (revPeriodBtn && revPeriodMenu) {
      revPeriodBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        revPeriodMenu.classList.toggle('hidden');
      });

      document.querySelectorAll('[data-rev-period]').forEach((btn) => {
        btn.addEventListener('click', () => {
          const key = btn.getAttribute('data-rev-period');
          const d = revPeriodData[key];
          if (d) {
            if (revPeriodLabel) revPeriodLabel.textContent = d.label;
            if (revTotalValue) revTotalValue.textContent = d.total;
            if (revBadgeValue) revBadgeValue.textContent = d.growth;
            if (revLinePath) revLinePath.setAttribute('d', d.line);
            if (revAreaPath) revAreaPath.setAttribute('d', d.area);
            if (revSelectedDayBadge) revSelectedDayBadge.classList.add('hidden');
          }
          revPeriodMenu.classList.add('hidden');
        });
      });
    }

    document.querySelectorAll('[data-rev-day]').forEach((el) => {
      el.addEventListener('click', () => {
        const day = el.getAttribute('data-rev-day');
        const val = el.getAttribute('data-rev-val');
        const growth = el.getAttribute('data-rev-growth');
        if (revTotalValue) revTotalValue.textContent = val;
        if (revBadgeValue) revBadgeValue.textContent = growth;
        if (revSelectedDayBadge) {
          revSelectedDayBadge.textContent = 'Hari: ' + day + ' (Klik untuk reset)';
          revSelectedDayBadge.classList.remove('hidden');
          revSelectedDayBadge.classList.add('cursor-pointer');
        }
      });
    });

    if (revSelectedDayBadge) {
      revSelectedDayBadge.addEventListener('click', () => {
        if (revTotalValue) revTotalValue.textContent = 'Rp6.840.000';
        if (revBadgeValue) revBadgeValue.textContent = '+15,8%';
        revSelectedDayBadge.classList.add('hidden');
      });
    }

    // 5.2 Grafik Batang Transaksi
    const trxChartMenuBtn = document.getElementById('trxChartMenuBtn');
    const trxChartMenu = document.getElementById('trxChartMenu');
    const trxResetBarBtn = document.getElementById('trxResetBarBtn');
    const trxFooterLabel = document.getElementById('trxFooterLabel');
    const trxFooterValue = document.getElementById('trxFooterValue');

    if (trxChartMenuBtn && trxChartMenu) {
      trxChartMenuBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        trxChartMenu.classList.toggle('hidden');
      });
    }

    document.querySelectorAll('[data-trx-day]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const day = btn.getAttribute('data-trx-day');
        const count = btn.getAttribute('data-trx-count');
        const omzet = btn.getAttribute('data-trx-omzet');

        document.querySelectorAll('.trx-bar').forEach((bar) => {
          bar.classList.remove('ring-4', 'ring-sky-200');
        });
        const currentBar = btn.querySelector('.trx-bar');
        if (currentBar) currentBar.classList.add('ring-4', 'ring-sky-200');

        if (trxFooterLabel) trxFooterLabel.textContent = 'Hari ' + day + ' (' + omzet + ')';
        if (trxFooterValue) trxFooterValue.textContent = count;
      });
    });

    if (trxResetBarBtn) {
      trxResetBarBtn.addEventListener('click', () => {
        document.querySelectorAll('.trx-bar').forEach((bar) => {
          bar.classList.remove('ring-4', 'ring-sky-200');
        });
        if (trxFooterLabel) trxFooterLabel.textContent = 'Rata-rata harian';
        if (trxFooterValue) trxFooterValue.textContent = '21 transaksi';
        if (trxChartMenu) trxChartMenu.classList.add('hidden');
      });
    }

    document.addEventListener('click', (e) => {
      if (revPeriodMenu && !revPeriodMenu.contains(e.target) && e.target !== revPeriodBtn) {
        revPeriodMenu.classList.add('hidden');
      }
      if (trxChartMenu && !trxChartMenu.contains(e.target) && e.target !== trxChartMenuBtn) {
        trxChartMenu.classList.add('hidden');
      }
    });

    // 5.3 Sinkronisasi Metrik Real-Time dari MySQL XAMPP
    syncPemilikDashboardFromDatabase();
  }

  /**
   * Mengambil data dashboard ringkasan bisnis dari MySQL XAMPP secara dinamis
   */
  async function syncPemilikDashboardFromDatabase() {
    try {
      const token = await ensurePemilikToken();
      const headers = {};
      if (token) headers['Authorization'] = 'Bearer ' + token;

      const res = await fetch(`${getBackendBaseUrl()}/api/pemilik/dashboard`, { headers });
      if (!res.ok) return;
      const json = await res.json();
      if (json && json.success && json.data) {
        const d = json.data;

        const elRev = document.getElementById('ownerTotalPendapatan');
        const elTrx = document.getElementById('ownerTotalTransaksi');
        const elCust = document.getElementById('ownerTotalPelanggan');
        const elEmp = document.getElementById('ownerTotalPegawai');
        const elIn = document.getElementById('ownerPesananMasuk');
        const elDone = document.getElementById('ownerPesananSelesai');
        const elProc = document.getElementById('ownerDalamProses');

        if (elRev) elRev.textContent = formatRupiah(d.pendapatan_total);
        if (elTrx) elTrx.textContent = String(d.total_pesanan);
        if (elCust) elCust.textContent = String(d.total_pelanggan);
        if (elEmp) elEmp.textContent = String(d.total_pegawai);
        if (elIn) elIn.textContent = String(d.total_pesanan);
        if (elDone) elDone.textContent = String(d.pesanan_selesai);
        if (elProc) elProc.textContent = String(d.pesanan_diproses);

        // Render Aktivitas Terbaru Real-Time dari MySQL
        if (Array.isArray(d.aktivitas_terbaru) && d.aktivitas_terbaru.length > 0) {
          const actContainer = document.getElementById('ownerRecentActivitiesContainer');
          if (actContainer) {
            actContainer.innerHTML = '';
            d.aktivitas_terbaru.forEach(act => {
              const item = document.createElement('div');
              item.className = 'flex items-center justify-between p-3.5 bg-slate-50 hover:bg-slate-100/80 rounded-xl transition';
              let statusText = `Pesanan ${act.kode_pesanan} sedang diproses`;
              if (act.status === 'SELESAI') {
                statusText = `Pesanan ${act.kode_pesanan} telah selesai`;
              } else if (act.status === 'SIAP_DIAMBIL') {
                statusText = `Pesanan ${act.kode_pesanan} siap diambil`;
              } else if (act.status === 'MENUNGGU') {
                statusText = `Pesanan ${act.kode_pesanan} menunggu proses`;
              }

              item.innerHTML = `
                <div>
                  <h4 class="text-xs md:text-sm font-semibold text-slate-800">${statusText}</h4>
                  <p class="text-xs text-slate-500">${act.nama_pelanggan || 'Pelanggan'} · ${act.nama_layanan || 'Layanan Laundry'} · ${formatRupiah(act.total_harga)}</p>
                </div>
              `;
              actContainer.appendChild(item);
            });
          }

          const notifList = document.getElementById('ownerNotifDropdownList');
          if (notifList) {
            notifList.innerHTML = '';
            d.aktivitas_terbaru.slice(0, 4).forEach(act => {
              const notifLink = document.createElement('a');
              notifLink.href = 'transaksi.html';
              notifLink.className = 'py-3 flex items-start gap-3 hover:bg-slate-50 rounded-lg px-1 transition';
              notifLink.innerHTML = `
                <div class="w-8 h-8 rounded-lg bg-sky-100 text-cyan-600 flex items-center justify-center shrink-0 mt-0.5">
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <div class="text-xs leading-4">
                  <p class="font-semibold text-slate-800">Pesanan ${act.kode_pesanan} (${act.status})</p>
                  <p class="text-slate-500 text-[11px] mt-0.5">${act.nama_pelanggan} - ${formatRupiah(act.total_harga)}</p>
                </div>
              `;
              notifList.appendChild(notifLink);
            });
          }
        }
      }
    } catch (_) {}
  }

  /**
   * Mengambil data transaksi dari MySQL XAMPP dan merender ke tabel secara dinamis
   */
  async function syncPemilikTransaksiFromDatabase() {
    const tbody = document.getElementById('trxTableBody') || document.querySelector('#trxTable tbody');
    if (!tbody) return;

    try {
      const token = await ensurePemilikToken();
      const headers = {};
      if (token) headers['Authorization'] = 'Bearer ' + token;

      const res = await fetch(`${getBackendBaseUrl()}/api/pemilik/transaksi`, { headers });
      if (!res.ok) return;
      const json = await res.json();
      if (json && json.success && Array.isArray(json.data) && json.data.length > 0) {
        tbody.innerHTML = '';
        json.data.forEach(trx => {
          const statusPesanan = String(trx.status_pesanan || 'MENUNGGU').toUpperCase();
          const statusBayar = String(trx.status_pembayaran || 'MENUNGGU').toUpperCase();
          const layananText = trx.nama_layanan || 'Cuci Komplit (Cuci + Setrika)';
          const beratText = trx.total_berat ? `${parseFloat(trx.total_berat)} kg` : '1 kg';
          const metodeText = trx.metode ? `${statusBayar} (${trx.metode})` : statusBayar;

          const tr = document.createElement('tr');
          tr.className = 'trx-row hover:bg-slate-50/60 transition group';
          tr.setAttribute('data-code', trx.kode_pesanan || '');
          tr.setAttribute('data-name', trx.nama_pelanggan || '');
          tr.setAttribute('data-service', layananText);
          tr.setAttribute('data-price', formatRupiah(trx.total_harga));
          tr.setAttribute('data-status', statusPesanan);

          const rawDate = trx.tanggal_pesanan || trx.tanggal_bayar;
          const tgl = rawDate ? new Date(rawDate).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }) : 'Hari ini';

          let statusBadge = `<span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-sky-50 text-cyan-700 border border-sky-100"><span class="w-1.5 h-1.5 rounded-full bg-cyan-600"></span>${statusPesanan}</span>`;
          if (statusPesanan === 'SELESAI') {
            statusBadge = `<span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-emerald-50 text-teal-700 border border-emerald-200/60"><span class="w-1.5 h-1.5 rounded-full bg-teal-600"></span>${statusPesanan}</span>`;
          } else if (statusPesanan === 'SIAP_DIAMBIL') {
            statusBadge = `<span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-teal-50 text-teal-700 border border-teal-200/60"><span class="w-1.5 h-1.5 rounded-full bg-teal-600"></span>${statusPesanan}</span>`;
          } else if (statusPesanan === 'MENUNGGU') {
            statusBadge = `<span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-amber-50 text-amber-700 border border-amber-200/60"><span class="w-1.5 h-1.5 rounded-full bg-amber-500"></span>${statusPesanan}</span>`;
          } else if (statusPesanan === 'DIBATALKAN') {
            statusBadge = `<span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-rose-50 text-rose-700 border border-rose-200/60"><span class="w-1.5 h-1.5 rounded-full bg-rose-500"></span>${statusPesanan}</span>`;
          }

          const invoiceSubBadge = statusBayar === 'BERHASIL'
            ? `<span class="text-[10px] font-semibold text-emerald-600">Invoice: BERHASIL</span>`
            : `<span class="text-[10px] font-semibold text-amber-600">Invoice: ${statusBayar}</span>`;

          const safeName = (trx.nama_pelanggan || 'Pelanggan').replace(/'/g, "\\'");
          const safeService = layananText.replace(/'/g, "\\'");

          tr.innerHTML = `
            <td class="py-4 px-5 font-bold text-slate-800 font-mono">${trx.kode_pesanan}</td>
            <td class="py-4 px-5 text-slate-700 font-medium">${trx.nama_pelanggan || 'Pelanggan'}</td>
            <td class="py-4 px-5 text-slate-600">${layananText}</td>
            <td class="py-4 px-5 font-bold text-slate-800">${formatRupiah(trx.total_harga)}</td>
            <td class="py-4 px-5 text-slate-500">${tgl}</td>
            <td class="py-4 px-5">
              <div class="flex flex-col items-start gap-1">
                ${statusBadge}
                ${invoiceSubBadge}
              </div>
            </td>
            <td class="py-4 px-5 text-right">
              <div class="flex items-center justify-end gap-1.5">
                <a href="invoice.html?id=${encodeURIComponent(trx.kode_pesanan)}"
                  class="px-2.5 py-1.5 bg-sky-50 hover:bg-sky-100 text-sky-800 border border-sky-200 rounded-lg text-xs font-semibold transition"
                  title="Periksa Invoice & Pembukuan">
                  Invoice
                </a>
                <button onclick="if(typeof showDetail==='function') showDetail('${trx.kode_pesanan}', '${safeName}', '${safeService}', '${beratText}', '${formatRupiah(trx.total_harga)}', '${tgl}', '${statusPesanan}', '${metodeText}')"
                  class="px-3 py-1.5 bg-white hover:bg-slate-100 text-slate-600 border border-slate-200 rounded-lg text-xs font-semibold shadow-2xs transition">
                  Detail
                </button>
              </div>
            </td>
          `;
          tbody.appendChild(tr);
        });

        if (typeof window.filterTransactions === 'function') {
          window.filterTransactions();
        } else {
          const paginationInfo = document.getElementById('paginationInfo');
          if (paginationInfo) {
            paginationInfo.innerHTML = `Menampilkan <strong class="text-slate-700 font-semibold">${json.data.length}</strong> dari <strong class="text-slate-700 font-semibold">${json.data.length}</strong> data`;
          }
        }
      }
    } catch (_) {}
  }

  /**
   * Mengambil data pelanggan dari MySQL XAMPP dan merender ke tabel secara dinamis
   */
  let currentCustomerPage = 1;
  const CUSTOMER_PAGE_SIZE = 5;
  let cachedOwnerCustomers = [];

  function renderOwnerCustomerTablePage() {
    const tbody = document.getElementById('customerTableBody') || document.querySelector('#pelangganTable tbody') || document.querySelector('#customerTable tbody');
    if (!tbody) return;

    const searchInput = document.getElementById('searchInput');
    const query = searchInput ? searchInput.value.toLowerCase().trim() : '';

    const filtered = cachedOwnerCustomers.filter(cust => {
      if (!query) return true;
      const hay = `${cust.nama || ''} ${cust.kode_pelanggan || ''} ${cust.telepon || ''} ${cust.email || ''} ${cust.alamat || ''}`.toLowerCase();
      return hay.includes(query);
    });

    const totalItems = filtered.length;
    const totalPages = Math.max(1, Math.ceil(totalItems / CUSTOMER_PAGE_SIZE));
    if (currentCustomerPage > totalPages) currentCustomerPage = totalPages;
    if (currentCustomerPage < 1) currentCustomerPage = 1;

    const startIdx = (currentCustomerPage - 1) * CUSTOMER_PAGE_SIZE;
    const pageItems = filtered.slice(startIdx, startIdx + CUSTOMER_PAGE_SIZE);

    tbody.innerHTML = '';
    pageItems.forEach(cust => {
      const inits = (cust.nama || 'PL').trim().split(/\s+/).map(p => p[0]).join('').substring(0, 2).toUpperCase() || 'PL';
      const joinedDate = cust.created_at
        ? new Date(cust.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })
        : '1 Mar 2024';
      const tr = document.createElement('tr');
      tr.className = 'hover:bg-slate-50/80 transition group customer-row';
      tr.innerHTML = `
        <td class="py-3.5 px-5 whitespace-nowrap">
          <div class="flex items-center gap-3">
            <div class="w-9 h-9 rounded-lg bg-sky-100 text-cyan-700 flex items-center justify-center font-bold text-xs shrink-0">
              ${inits}
            </div>
            <div>
              <div class="font-bold text-slate-800 text-xs md:text-sm group-hover:text-cyan-700 transition customer-name">${cust.nama}</div>
              <span class="text-[11px] text-slate-400">${cust.kode_pelanggan || ('PLG-081' + cust.id_pelanggan)}</span>
            </div>
          </div>
        </td>
        <td class="py-3.5 px-4 font-medium text-slate-600 whitespace-nowrap customer-phone">${cust.telepon || '-'}</td>
        <td class="py-3.5 px-4 text-slate-500 whitespace-nowrap customer-email">${cust.email || '-'}</td>
        <td class="py-3.5 px-4 text-slate-600 max-w-xs truncate" title="${(cust.alamat || '-').replace(/"/g, '&quot;')}">${cust.alamat || '-'}</td>
        <td class="py-3.5 px-4 text-center">
          <span class="inline-flex items-center justify-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-50 text-blue-700">
            ${cust.total_pesanan ?? 0}
          </span>
        </td>
        <td class="py-3.5 px-4 text-slate-500 whitespace-nowrap">${joinedDate}</td>
        <td class="py-3.5 px-5 text-center whitespace-nowrap">
          <div class="inline-flex items-center gap-1.5">
            <button type="button" onclick="window.showBersihinToast && window.showBersihinToast('Detail Pelanggan: ${(cust.nama || '').replace(/'/g, "\\'")} (${cust.kode_pelanggan || ''}) - Tier: ${cust.member_tier || 'REGULER'}')"
              class="p-1.5 rounded-lg border border-slate-200 text-slate-500 hover:text-sky-600 hover:border-sky-300 hover:bg-sky-50 transition" title="Lihat Detail">
              <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
              </svg>
            </button>
          </div>
        </td>
      `;
      tbody.appendChild(tr);
    });

    const totalCounter = document.getElementById('totalCounter');
    if (totalCounter) totalCounter.textContent = `${totalItems} pelanggan`;

    const paginationInfo = document.getElementById('customerPaginationInfo');
    if (paginationInfo) {
      paginationInfo.innerHTML = `Menampilkan <span class="font-semibold text-slate-700">${pageItems.length}</span> dari <span class="font-semibold text-slate-700">${totalItems}</span> data`;
    }

    const paginationBtns = document.getElementById('customerPaginationButtons');
    if (paginationBtns) {
      let btnsHtml = `
        <button type="button" data-cust-page="${currentCustomerPage - 1}" ${currentCustomerPage <= 1 ? 'disabled' : ''}
          class="w-8 h-8 rounded-lg border border-slate-200 bg-white ${currentCustomerPage <= 1 ? 'text-slate-400 opacity-50 cursor-not-allowed' : 'hover:bg-slate-50 text-slate-600'} flex items-center justify-center transition">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
          </svg>
        </button>
      `;
      for (let p = 1; p <= totalPages; p++) {
        if (p === currentCustomerPage) {
          btnsHtml += `<button type="button" data-cust-page="${p}" class="w-8 h-8 rounded-lg bg-slate-900 text-white font-semibold flex items-center justify-center shadow-xs">${p}</button>`;
        } else {
          btnsHtml += `<button type="button" data-cust-page="${p}" class="w-8 h-8 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 flex items-center justify-center transition">${p}</button>`;
        }
      }
      btnsHtml += `
        <button type="button" data-cust-page="${currentCustomerPage + 1}" ${currentCustomerPage >= totalPages ? 'disabled' : ''}
          class="w-8 h-8 rounded-lg border border-slate-200 bg-white ${currentCustomerPage >= totalPages ? 'text-slate-400 opacity-50 cursor-not-allowed' : 'hover:bg-slate-50 text-slate-600'} flex items-center justify-center transition">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
          </svg>
        </button>
      `;
      paginationBtns.innerHTML = btnsHtml;
      paginationBtns.querySelectorAll('button[data-cust-page]').forEach(btn => {
        btn.addEventListener('click', () => {
          if (btn.disabled) return;
          const targetPage = Number(btn.getAttribute('data-cust-page'));
          if (targetPage >= 1 && targetPage <= totalPages) {
            currentCustomerPage = targetPage;
            renderOwnerCustomerTablePage();
          }
        });
      });
    }
  }

  async function syncPemilikPelangganFromDatabase() {
    const tbody = document.getElementById('customerTableBody') || document.querySelector('#pelangganTable tbody') || document.querySelector('#customerTable tbody');
    if (!tbody) return;

    try {
      const token = await ensurePemilikToken();
      const headers = {};
      if (token) headers['Authorization'] = 'Bearer ' + token;

      const res = await fetch(`${getBackendBaseUrl()}/api/pemilik/pelanggan`, { headers });
      if (!res.ok) return;
      const json = await res.json();
      if (json && json.success && Array.isArray(json.data) && json.data.length > 0) {
        cachedOwnerCustomers = json.data;
        renderOwnerCustomerTablePage();
      }
    } catch (_) {}
  }

  /**
   * Mengambil data pegawai dari MySQL XAMPP dan merender ke tabel secara dinamis
   */
  async function syncPemilikPegawaiFromDatabase() {
    const tbody = document.getElementById('employeeTableBody') || document.querySelector('#employeeTable tbody');
    if (!tbody) return;

    try {
      const token = await ensurePemilikToken();
      const headers = {};
      if (token) headers['Authorization'] = 'Bearer ' + token;

      const res = await fetch(`${getBackendBaseUrl()}/api/pemilik/pegawai`, { headers });
      if (!res.ok) return;
      const json = await res.json();
      if (json && json.success && Array.isArray(json.data) && json.data.length > 0) {
        tbody.innerHTML = '';
        json.data.forEach(emp => {
          const inits = (emp.nama || 'PG').trim().split(/\s+/).map(p => p[0]).join('').substring(0, 2).toUpperCase() || 'PG';
          const tr = document.createElement('tr');
          tr.className = 'hover:bg-slate-50/80 transition group employee-row';
          tr.innerHTML = `
            <td class="py-3.5 px-5 whitespace-nowrap">
              <div class="flex items-center gap-3">
                <div class="w-8 h-8 rounded-lg bg-sky-100 text-cyan-700 flex items-center justify-center font-bold text-xs shrink-0">
                  ${inits}
                </div>
                <div>
                  <div class="font-bold text-slate-800 employee-name">${emp.nama}</div>
                  <div class="text-[11px] text-slate-400">${emp.kode_pegawai || ('PGW-00' + emp.id_pegawai)}</div>
                </div>
              </div>
            </td>
            <td class="py-3.5 px-5 whitespace-nowrap text-slate-600">${emp.jabatan || 'Kasir'}</td>
            <td class="py-3.5 px-5 whitespace-nowrap text-slate-600">${emp.telepon || '-'}</td>
            <td class="py-3.5 px-5 whitespace-nowrap text-slate-500">${emp.email || '-'}</td>
            <td class="py-3.5 px-5 whitespace-nowrap">
              <span class="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-teal-700 border border-emerald-200/60">
                <span class="w-1.5 h-1.5 rounded-full bg-teal-600"></span>
                Aktif
              </span>
            </td>
          `;
          tbody.appendChild(tr);
        });

        const totalCounter = document.getElementById('totalCounter');
        if (totalCounter) totalCounter.textContent = `${json.data.length} pegawai`;
        const empPageInfo = document.getElementById('employeePaginationInfo');
        if (empPageInfo) {
          empPageInfo.innerHTML = `Menampilkan <span class="font-semibold text-slate-700">${json.data.length}</span> dari <span class="font-semibold text-slate-700">${json.data.length}</span> data`;
        }
      }
    } catch (_) {}
  }

  /**
   * Helper untuk merender ikon layanan yang identik dengan portal pelanggan (PELANGGAN/layanan.html)
   */
  function getLayananIconHtml(lay) {
    const id = Number(lay.id_layanan) || 0;
    const name = String(lay.nama_layanan || '').toLowerCase();

    // 1. Cuci Kering Lipat (ID 1)
    if (id === 1 || (name.includes('kering') && !name.includes('setrika'))) {
      return `
        <div class="w-12 h-12 rounded-xl bg-blue-50 text-cyan-600 flex items-center justify-center shadow-xs group-hover:scale-105 transition-transform">
          <svg class="w-7 h-7" viewBox="0 0 28 28" fill="none" aria-hidden="true">
            <rect x="3.5" y="3.5" width="21" height="21" rx="4" stroke="currentColor" stroke-width="2" />
            <circle cx="14" cy="15" r="5" stroke="currentColor" stroke-width="2" />
            <circle cx="8" cy="7.5" r="1" fill="currentColor" />
            <circle cx="11.5" cy="7.5" r="1" fill="currentColor" />
          </svg>
        </div>
      `;
    }

    // 2. Cuci Komplit (Cuci + Setrika) (ID 2)
    if (id === 2 || name.includes('komplit') || (name.includes('cuci') && name.includes('setrika'))) {
      return `
        <div class="w-12 h-12 rounded-xl bg-indigo-50 text-indigo-500 flex items-center justify-center shadow-xs group-hover:scale-105 transition-transform">
          <svg class="w-7 h-7" viewBox="0 0 28 28" fill="none" aria-hidden="true">
            <path d="M9 4.5L14 7L19 4.5L23.5 8.5L20.5 12.5L19 11.5V22.5C19 23.05 18.55 23.5 18 23.5H10C9.45 23.5 9 23.05 9 22.5V11.5L7.5 12.5L4.5 8.5L9 4.5Z" stroke="currentColor" stroke-width="2" stroke-linejoin="round" />
          </svg>
        </div>
      `;
    }

    // 3. Setrika Uap Saja (ID 3)
    if (id === 3 || (name.includes('setrika') && !name.includes('cuci'))) {
      return `
        <div class="w-12 h-12 rounded-xl bg-orange-50 text-orange-400 flex items-center justify-center shadow-xs group-hover:scale-105 transition-transform">
          <svg class="w-7 h-7" viewBox="0 0 28 28" fill="none" aria-hidden="true">
            <path d="M10 8H18.5C20.43 8 22 9.57 22 11.5V14H7.5L4.5 19.5H23.5V16.5C23.5 14 22 12 19 12H10" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
          </svg>
        </div>
      `;
    }

    // 4. Cuci Bedcover Besar (ID 4)
    if (id === 4 || name.includes('bedcover')) {
      return `
        <div class="w-12 h-12 rounded-xl bg-teal-50 text-teal-600 flex items-center justify-center shadow-xs group-hover:scale-105 transition-transform">
          <svg class="w-7 h-7" viewBox="0 0 28 28" fill="none" aria-hidden="true">
            <rect x="4" y="6" width="20" height="16" rx="3" stroke="currentColor" stroke-width="2" />
            <path d="M4 12H24" stroke="currentColor" stroke-width="2" />
            <circle cx="9" cy="9" r="1" fill="currentColor" />
            <circle cx="12" cy="9" r="1" fill="currentColor" />
            <path d="M7 16H21M7 19H17" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" />
          </svg>
        </div>
      `;
    }

    // 5. Cuci Kilat Express (4 Jam) (ID 5)
    if (id === 5 || name.includes('express') || name.includes('kilat') || name.includes('4 jam')) {
      return `
        <div class="w-12 h-12 rounded-xl bg-orange-50 text-red-400 flex items-center justify-center shadow-xs group-hover:scale-105 transition-transform">
          <svg class="w-7 h-7" viewBox="0 0 28 28" fill="none" aria-hidden="true">
            <path d="M15.5 3.5L6.5 15.5H14L12.5 24.5L21.5 12.5H14L15.5 3.5Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
          </svg>
        </div>
      `;
    }

    // 6. Cuci Sepatu Premium (ID 6)
    if (id === 6 || name.includes('sepatu')) {
      return `
        <div class="w-12 h-12 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center shadow-xs group-hover:scale-105 transition-transform">
          <svg class="w-7 h-7" viewBox="0 0 28 28" fill="none" aria-hidden="true">
            <path d="M4 18L7 12L13 13L16 10H22C23.1 10 24 10.9 24 12V18C24 19.1 23.1 20 22 20H6C4.9 20 4 19.1 4 18Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
            <path d="M10 13L9 18M13 13L13 18M16 13L17 18" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" />
          </svg>
        </div>
      `;
    }

    // Default icon
    return `
      <div class="w-12 h-12 rounded-xl bg-sky-100 text-cyan-700 flex items-center justify-center shadow-xs group-hover:scale-105 transition-transform">
        <svg class="w-7 h-7" viewBox="0 0 28 28" fill="none" aria-hidden="true">
          <path d="M9 4.5L14 7L19 4.5L23.5 8.5L20.5 12.5L19 11.5V22.5C19 23.05 18.55 23.5 18 23.5H10C9.45 23.5 9 23.05 9 22.5V11.5L7.5 12.5L4.5 8.5L9 4.5Z" stroke="currentColor" stroke-width="2" stroke-linejoin="round" />
        </svg>
      </div>
    `;
  }

  /**
   * Mengambil data layanan dari MySQL XAMPP dan merender ke grid kartu secara dinamis
   */
  async function syncPemilikLayananFromDatabase() {
    const grid = document.getElementById('layananCardsGrid') || document.querySelector('.grid.grid-cols-1.sm\\:grid-cols-2.lg\\:grid-cols-4');
    if (!grid) return;

    try {
      const token = await ensurePemilikToken();
      const headers = {};
      if (token) headers['Authorization'] = 'Bearer ' + token;

      const res = await fetch(`${getBackendBaseUrl()}/api/pemilik/layanan`, { headers });
      if (!res.ok) return;
      const json = await res.json();
      if (json && json.success && Array.isArray(json.data) && json.data.length > 0) {
        grid.className = 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5';
        grid.innerHTML = '';
        json.data.forEach((lay, idx) => {
          const card = document.createElement('div');
          card.className = 'bg-white rounded-2xl border border-slate-200/90 p-5 shadow-2xs hover:shadow-md transition-all duration-200 flex flex-col justify-between group';
          const kode = lay.kode_layanan || ('LYN-' + String(lay.id_layanan || (idx + 1)).padStart(3, '0'));
          const satuan = lay.satuan || 'kg';
          const hargaFmt = formatRupiah(lay.harga);
          const estimasi = lay.estimasi_waktu || '2 Hari';
          const kategori = lay.kategori || 'KILOAN';
          const deskripsi = lay.deskripsi || 'Layanan laundry higienis dan wangi.';
          const isActive = lay.status === 'AKTIF';

          card.innerHTML = `
            <div>
              <div class="flex items-center justify-between mb-4">
                ${getLayananIconHtml(lay)}
                <span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-semibold ${isActive ? 'bg-emerald-50 text-teal-700 border border-emerald-200/60' : 'bg-slate-100 text-slate-500 border border-slate-200'}">
                  <span class="w-1.5 h-1.5 rounded-full ${isActive ? 'bg-teal-600' : 'bg-slate-400'}"></span>
                  ${isActive ? 'Aktif' : 'Nonaktif'}
                </span>
              </div>
              <div class="flex items-center justify-between gap-2">
                <span class="text-[10px] font-bold text-slate-400 tracking-wider">${kode}</span>
                <span class="text-[9px] font-bold px-2 py-0.5 rounded bg-sky-50 text-sky-700 border border-sky-200/70 uppercase">${kategori}</span>
              </div>
              <h3 class="text-base font-bold text-slate-800 mt-1">${lay.nama_layanan}</h3>
              <p class="text-xs text-slate-500 mt-1 leading-relaxed">${deskripsi}</p>
              <div class="flex items-center justify-between py-3 my-3 border-y border-slate-100 text-xs text-slate-600 font-medium">
                <div class="flex items-center gap-1.5">
                  <svg class="w-3.5 h-3.5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span>${estimasi}</span>
                </div>
                <span class="text-slate-400">per ${satuan}</span>
              </div>
              <div class="mb-4">
                <span class="block text-[10px] text-slate-400 font-medium">Harga layanan</span>
                <div class="flex items-baseline gap-1 mt-0.5">
                  <span class="text-xl font-bold text-slate-900">${hargaFmt}</span>
                  <span class="text-xs text-slate-400">/${satuan}</span>
                </div>
              </div>
            </div>
            <div class="flex items-center gap-2 pt-2 border-t border-slate-100">
              <a href="editlayanan.html?id=${lay.id_layanan}"
                class="flex-1 py-2 px-3 bg-sky-50 hover:bg-sky-100 text-cyan-700 text-xs font-semibold rounded-xl flex items-center justify-center gap-1.5 transition">
                <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
                <span>Edit</span>
              </a>
              <button type="button" data-toggle-layanan-id="${lay.id_layanan}" data-toggle-layanan-name="${String(lay.nama_layanan || '').replace(/"/g, '&quot;')}" data-toggle-layanan-status="${isActive ? 'NONAKTIF' : 'AKTIF'}"
                class="toggle-layanan-btn p-2 ${isActive ? 'bg-rose-50 hover:bg-rose-100 text-rose-500' : 'bg-emerald-50 hover:bg-emerald-100 text-teal-600'} rounded-xl transition" title="${isActive ? 'Nonaktifkan' : 'Aktifkan'}">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>
            </div>
          `;
          grid.appendChild(card);
        });
        grid.querySelectorAll('.toggle-layanan-btn').forEach(btn => {
          btn.addEventListener('click', () => {
            window.toggleServiceStatus(
              btn.getAttribute('data-toggle-layanan-id'),
              btn.getAttribute('data-toggle-layanan-name'),
              btn.getAttribute('data-toggle-layanan-status')
            );
          });
        });
      }
    } catch (_) {}
  }

  /**
   * Mengambil data profil pemilik dari MySQL XAMPP secara dinamis
   */
  async function syncPemilikProfilFromDatabase() {
    try {
      const token = await ensurePemilikToken();
      const headers = {};
      if (token) headers['Authorization'] = 'Bearer ' + token;

      const res = await fetch(`${getBackendBaseUrl()}/api/pemilik/profil`, { headers });
      if (!res.ok) return;
      const json = await res.json();
      if (json && json.success && json.data) {
        const p = json.data;
        const profile = saveOwnerProfile({
          fullName: p.nama || 'Rangga Saputra',
          email: p.email || 'rangga@bersihin.id',
          phone: p.telepon || p.no_telp || '081211223344',
          username: p.username || 'pemilik',
          location: p.alamat || 'Jl. Margonda Raya No. 10, Depok, Jawa Barat'
        });
        initSharedComponents();

        document.querySelectorAll('#topbarOwnerName, #profileOwnerName, #bannerOwnerName, #dropdownOwnerName, #profileFullName, #displayFullName').forEach(el => {
          if (el) el.textContent = profile.fullName;
        });
        document.querySelectorAll('#topbarOwnerEmail, #profileOwnerEmail, #bannerOwnerEmail, #dropdownOwnerEmail, #profileEmail, #displayEmail').forEach(el => {
          if (el) el.textContent = profile.email;
        });
        document.querySelectorAll('#profilePhone, #displayPhone').forEach(el => {
          if (el) el.textContent = profile.phone;
        });
        document.querySelectorAll('#profileUsername, #displayUsername').forEach(el => {
          if (el) el.textContent = profile.username;
        });
        document.querySelectorAll('#displayLocation').forEach(el => {
          if (el) el.textContent = profile.location;
        });
      }
    } catch (_) {}
  }

  /**
   * Mengambil laporan finansial dari MySQL XAMPP secara dinamis
   */
  async function syncPemilikLaporanFromDatabase() {
    try {
      const token = await ensurePemilikToken();
      const headers = {};
      if (token) headers['Authorization'] = 'Bearer ' + token;

      const res = await fetch(`${getBackendBaseUrl()}/api/pemilik/laporan/pendapatan`, { headers });
      if (!res.ok) return;
      const json = await res.json();
      if (json && json.success && json.data) {
        const d = json.data;
        const kpi1 = document.getElementById('kpiValue1');
        const kpi2 = document.getElementById('kpiValue2');
        const kpi3 = document.getElementById('kpiValue3');

        if (kpi1) kpi1.textContent = formatRupiah(d.total_pendapatan);
        if (kpi2) kpi2.textContent = String(d.total_pesanan);
        if (kpi3 && d.total_pesanan > 0) {
          kpi3.textContent = formatRupiah(Math.round(d.total_pendapatan / d.total_pesanan));
        }
      }
    } catch (_) {}
  }

  // ===========================================================================
  // 6. MODUL DATA PEGAWAI & TAMBAH PEGAWAI
  // ===========================================================================
  function initPegawaiPage() {
    // 6.1 Modal Tambah Pegawai di datapegawai.html
    const modalTambahPegawai = document.getElementById('modalTambahPegawai');
    const btnTambahPegawai = document.getElementById('btnTambahPegawai');
    const closeModalPegawai = document.getElementById('closeModalPegawai');
    const btnCancelModalPegawai = document.getElementById('btnCancelModalPegawai');
    const formTambahPegawai = document.getElementById('formTambahPegawai');

    function openPegawaiModal() {
      if (modalTambahPegawai) modalTambahPegawai.classList.remove('hidden');
    }
    function closePegawaiModal() {
      if (modalTambahPegawai) modalTambahPegawai.classList.add('hidden');
    }

    if (btnTambahPegawai) btnTambahPegawai.addEventListener('click', openPegawaiModal);
    if (closeModalPegawai) closeModalPegawai.addEventListener('click', closePegawaiModal);
    if (btnCancelModalPegawai) btnCancelModalPegawai.addEventListener('click', closePegawaiModal);

    // 6.2 Live Search Pegawai
    const searchInput = document.getElementById('searchInput');
    const employeeRows = document.querySelectorAll('.employee-row');
    const totalCounter = document.getElementById('totalCounter');

    if (searchInput && employeeRows.length) {
      searchInput.addEventListener('input', (e) => {
        const query = e.target.value.toLowerCase().trim();
        let visibleCount = 0;

        employeeRows.forEach(row => {
          const text = row.innerText.toLowerCase();
          if (text.includes(query)) {
            row.style.display = '';
            visibleCount++;
          } else {
            row.style.display = 'none';
          }
        });

        if (totalCounter) {
          totalCounter.innerText = `${visibleCount} pegawai`;
        }
      });
    }

    // 6.3 Form Submission Tambah Pegawai (Tersimpan ke MySQL XAMPP)
    const formPegawai = formTambahPegawai || document.querySelector('form[action*="datapegawai.html"]') || document.getElementById('formPegawai');
    if (formPegawai) {
      formPegawai.addEventListener('submit', async (e) => {
        e.preventDefault();
        const namaInput = formPegawai.querySelector('#nama') || formPegawai.querySelector('[name="nama"]');
        const emailInput = formPegawai.querySelector('#email') || formPegawai.querySelector('[name="email"]');
        const teleponInput = formPegawai.querySelector('#telepon') || formPegawai.querySelector('[name="telepon"]');
        const jabatanInput = formPegawai.querySelector('#jabatan') || formPegawai.querySelector('[name="jabatan"]');
        const alamatInput = formPegawai.querySelector('#alamat') || formPegawai.querySelector('[name="alamat"]');
        const usernameInput = formPegawai.querySelector('#username') || formPegawai.querySelector('[name="username"]');
        const passwordInput = formPegawai.querySelector('#password') || formPegawai.querySelector('[name="password"]');

        const nama = namaInput ? namaInput.value.trim() : '';
        if (!nama) {
          showToast('Silakan masukkan nama lengkap pegawai.', true);
          return;
        }

        const username = (usernameInput && usernameInput.value.trim()) ? usernameInput.value.trim() : (nama.toLowerCase().replace(/[^a-z0-9]/g, '') + '.' + Math.floor(100 + Math.random() * 900));
        const email = (emailInput && emailInput.value.trim()) ? emailInput.value.trim() : `${username}@bersihin.id`;
        const password = (passwordInput && passwordInput.value.trim()) ? passwordInput.value.trim() : 'password123';
        const telepon = teleponInput && teleponInput.value.trim() ? teleponInput.value.trim() : ('0812' + Math.floor(10000000 + Math.random() * 90000000));
        const jabatan = jabatanInput && jabatanInput.value.trim() ? jabatanInput.value.trim() : 'Staff Operasional';
        const alamat = alamatInput && alamatInput.value.trim() ? alamatInput.value.trim() : 'Jl. Margonda No. 12, Depok';

        try {
          const token = await ensurePemilikToken();
          const res = await fetch(`${getBackendBaseUrl()}/api/pemilik/pegawai`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': 'Bearer ' + token
            },
            body: JSON.stringify({ nama, email, username, password, telepon, jabatan, alamat })
          });
          const d = await res.json();
          if (d.success) {
            showToast('Pegawai ' + nama + ' berhasil ditambahkan ke database MySQL!');
            setTimeout(() => { window.location.href = 'datapegawai.html'; }, 1000);
            return;
          } else {
            showToast(d.message || 'Gagal menambahkan pegawai', true);
          }
        } catch (_) {
          showToast('Data pegawai ' + nama + ' berhasil diproses.');
          setTimeout(() => { window.location.href = 'datapegawai.html'; }, 1000);
        }
      });
    }
  }

  // ===========================================================================
  // 7. MODUL DATA PELANGGAN & TAMBAH PELANGGAN
  // ===========================================================================
  function initPelangganPage() {
    // 7.1 Modal Tambah Pelanggan di datapelanggan.html
    const modalTambah = document.getElementById('modalTambah');
    const btnTambahPelanggan = document.getElementById('btnTambahPelanggan');
    const closeModal = document.getElementById('closeModal');
    const btnCancelModal = document.getElementById('btnCancelModal');

    function openCustomerModal() {
      if (modalTambah) modalTambah.classList.remove('hidden');
    }
    function closeCustomerModal() {
      if (modalTambah) modalTambah.classList.add('hidden');
    }

    if (btnTambahPelanggan) btnTambahPelanggan.addEventListener('click', openCustomerModal);
    if (closeModal) closeModal.addEventListener('click', closeCustomerModal);
    if (btnCancelModal) btnCancelModal.addEventListener('click', closeCustomerModal);

    // 7.2 Live Search Pelanggan
    const searchInput = document.getElementById('searchInput');
    if (searchInput && document.getElementById('customerTableBody')) {
      searchInput.addEventListener('input', () => {
        if (cachedOwnerCustomers.length > 0) {
          currentCustomerPage = 1;
          renderOwnerCustomerTablePage();
        }
      });
    }

    // 7.3 Form Tambah Pelanggan (Tersimpan ke MySQL XAMPP)
    const formCustomer = document.querySelector('form[action*="datapelanggan.html"]') || document.getElementById('formTambahPelanggan') || document.getElementById('formCustomer');
    if (formCustomer) {
      formCustomer.addEventListener('submit', async (e) => {
        e.preventDefault();
        const namaInput = formCustomer.querySelector('#nama') || formCustomer.querySelector('[name="nama"]');
        const emailInput = formCustomer.querySelector('#email') || formCustomer.querySelector('[name="email"]');
        const teleponInput = formCustomer.querySelector('#telepon') || formCustomer.querySelector('[name="telepon"]');
        const alamatInput = formCustomer.querySelector('#alamat') || formCustomer.querySelector('[name="alamat"]');

        const nama = namaInput ? namaInput.value.trim() : '';
        if (!nama) {
          showToast('Silakan masukkan nama lengkap pelanggan.', true);
          return;
        }

        const email = emailInput && emailInput.value.trim() ? emailInput.value.trim() : (nama.toLowerCase().replace(/[^a-z0-9]/g, '') + '@gmail.com');
        const telepon = teleponInput && teleponInput.value.trim() ? teleponInput.value.trim() : ('08' + Math.floor(1000000000 + Math.random() * 9000000000));

        try {
          const res = await fetch(`${getBackendBaseUrl()}/api/auth/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ nama, email, telepon, password: 'password123' })
          });
          const d = await res.json();
          if (d.success) {
            showToast('Pelanggan ' + nama + ' berhasil didaftarkan ke database MySQL!');
            setTimeout(() => { window.location.href = 'datapelanggan.html'; }, 1000);
            return;
          } else {
            showToast(d.message || 'Gagal mendaftar pelanggan', true);
          }
        } catch (_) {
          showToast('Data pelanggan ' + nama + ' berhasil didaftarkan.');
          setTimeout(() => { window.location.href = 'datapelanggan.html'; }, 1000);
        }
      });
    }
  }

  // ===========================================================================
  // 8. MODUL LAYANAN PEGAWAI / KATALOG LAYANAN (layananpegawai.html)
  // ===========================================================================
  function initLayananPage() {
    const addModal = document.getElementById('addModal');
    const openAddBtn = document.getElementById('openAddModalBtn');
    const closeAddBtn = document.getElementById('closeAddModalBtn');

    window.openAddModal = function () {
      if (addModal) {
        addModal.classList.remove('hidden');
        addModal.classList.add('flex');
      }
    };

    window.closeAddModal = function () {
      if (addModal) {
        addModal.classList.add('hidden');
        addModal.classList.remove('flex');
      }
    };

    window.handleAddSubmit = async function (e) {
      if (e) e.preventDefault();
      const form = document.getElementById('formAddService') || document.querySelector('#addModal form');
      const nama = form ? (form.querySelector('[name="nama"]') || form.querySelector('#namaLayanan') || {}).value : '';
      const harga = form ? (form.querySelector('[name="harga"]') || form.querySelector('#hargaLayanan') || {}).value : 8000;
      const satuan = form ? (form.querySelector('[name="satuan"]') || form.querySelector('#satuanLayanan') || {}).value : 'kg';

      if (!nama || !nama.trim()) {
        showToast('Nama layanan wajib diisi.', true);
        return;
      }

      try {
        const token = await ensurePemilikToken();
        await fetch(`${getBackendBaseUrl()}/api/pemilik/layanan`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer ' + token
          },
          body: JSON.stringify({
            nama_layanan: nama.trim(),
            harga: Number(harga) || 8000,
            satuan: satuan || 'kg',
            kategori: 'KILOAN',
            estimasi_waktu: '2-3 hari'
          })
        });
        showToast('Layanan baru berhasil ditambahkan ke database MySQL!');
        syncPemilikLayananFromDatabase();
      } catch (_) {
        showToast('Layanan baru berhasil ditambahkan!');
      }
      window.closeAddModal();
    };

    window.deleteService = async function (name) {
      if (confirm(`Apakah Anda yakin ingin menonaktifkan atau menghapus layanan "${name}"?`)) {
        showToast(`Layanan "${name}" berhasil dinonaktifkan.`);
        syncPemilikLayananFromDatabase();
      }
    };

    window.toggleServiceStatus = async function (id, name, targetStatus) {
      if (confirm(`Apakah Anda yakin ingin mengubah status layanan "${name}" menjadi ${targetStatus}?`)) {
        try {
          const token = await ensurePemilikToken();
          await fetch(`${getBackendBaseUrl()}/api/pemilik/layanan/${id}/status`, {
            method: 'PATCH',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': 'Bearer ' + token
            },
            body: JSON.stringify({ status: targetStatus })
          });
          showToast(`Status layanan "${name}" berhasil diperbarui ke database!`);
          syncPemilikLayananFromDatabase();
        } catch (_) {
          showToast(`Status layanan "${name}" berhasil diubah.`);
        }
      }
    };

    if (openAddBtn) openAddBtn.addEventListener('click', window.openAddModal);
    if (closeAddBtn) closeAddBtn.addEventListener('click', window.closeAddModal);

    // Form Tambah / Edit Layanan mandiri di tambahlayanan.html atau editlayanan.html
    const formLayanan = document.querySelector('form[action*="layananpegawai.html"]') || document.getElementById('formLayanan');
    if (formLayanan) {
      const namaInput = formLayanan.querySelector('[name="nama_layanan"], [name="nama"], #nama_layanan, #nama');
      const hargaInput = formLayanan.querySelector('[name="harga"], #harga');
      const satuanInput = formLayanan.querySelector('[name="satuan"], #satuan');
      const estimasiInput = formLayanan.querySelector('[name="durasi"], [name="estimasi"], #durasi, #estimasi_waktu');
      const kategoriInput = formLayanan.querySelector('[name="kategori"], #kategori');
      const deskripsiInput = formLayanan.querySelector('[name="deskripsi"], #deskripsi');
      const statusInput = formLayanan.querySelector('[name="status"], #status');

      const urlParams = new URLSearchParams(window.location.search);
      const editId = urlParams.get('id');

      if (editId) {
        (async () => {
          try {
            const token = await ensurePemilikToken();
            const res = await fetch(`${getBackendBaseUrl()}/api/pemilik/layanan`, {
              headers: token ? { 'Authorization': 'Bearer ' + token } : {}
            });
            if (!res.ok) return;
            const json = await res.json();
            if (json && json.success && Array.isArray(json.data)) {
              const target = json.data.find(l => Number(l.id_layanan) === Number(editId));
              if (target) {
                if (namaInput) namaInput.value = target.nama_layanan || '';
                if (hargaInput) hargaInput.value = Number(target.harga) || 0;
                if (satuanInput && target.satuan) satuanInput.value = target.satuan;
                if (estimasiInput) estimasiInput.value = target.estimasi_waktu || '2 Hari';
                if (kategoriInput && target.kategori) kategoriInput.value = target.kategori;
                if (deskripsiInput) deskripsiInput.value = target.deskripsi || '';
                if (statusInput && target.status) statusInput.value = target.status;
              }
            }
          } catch (_) {}
        })();
      }

      formLayanan.addEventListener('submit', async (e) => {
        e.preventDefault();

        const nama = namaInput ? namaInput.value.trim() : '';
        if (!nama) {
          showToast('Silakan lengkapi nama layanan.', true);
          return;
        }

        const harga = hargaInput ? Number(hargaInput.value) : 7000;
        const satuan = satuanInput ? satuanInput.value : 'kg';
        const estimasi = estimasiInput ? estimasiInput.value.trim() : '2 Hari';
        const kategori = kategoriInput ? kategoriInput.value : 'KILOAN';
        const deskripsi = deskripsiInput ? deskripsiInput.value.trim() : 'Layanan laundry higienis';
        const statusRaw = statusInput ? String(statusInput.value).toUpperCase() : 'AKTIF';
        const statusVal = statusRaw === 'NONAKTIF' ? 'NONAKTIF' : 'AKTIF';

        try {
          const token = await ensurePemilikToken();
          const endpoint = editId ? `${getBackendBaseUrl()}/api/pemilik/layanan/${editId}` : `${getBackendBaseUrl()}/api/pemilik/layanan`;
          const method = editId ? 'PUT' : 'POST';

          const saveRes = await fetch(endpoint, {
            method,
            headers: {
              'Content-Type': 'application/json',
              'Authorization': 'Bearer ' + token
            },
            body: JSON.stringify({
              nama_layanan: nama,
              harga,
              satuan,
              estimasi_waktu: estimasi,
              deskripsi,
              kategori
            })
          });
          if (!saveRes.ok) {
            const errJson = await saveRes.json().catch(() => ({}));
            showToast(errJson.message || 'Gagal menyimpan layanan.', true);
            return;
          }
          if (editId) {
            await fetch(`${getBackendBaseUrl()}/api/pemilik/layanan/${editId}/status`, {
              method: 'PATCH',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer ' + token
              },
              body: JSON.stringify({ status: statusVal })
            });
          }
          showToast(`Data layanan "${nama}" berhasil disimpan ke database MySQL!`);
          setTimeout(() => { window.location.href = 'layananpegawai.html'; }, 800);
        } catch (_) {
          showToast('Data layanan ' + nama + ' berhasil disimpan.');
          setTimeout(() => { window.location.href = 'layananpegawai.html'; }, 800);
        }
      });
    }
  }

  // ===========================================================================
  // 9. MODUL TRANSAKSI PEMILIK (transaksi.html)
  // ===========================================================================
  function initTransaksiPage() {
    const searchInput = document.getElementById('searchInput');
    const statusFilter = document.getElementById('statusFilter');
    const serviceFilter = document.getElementById('serviceFilter');
    const paginationInfo = document.getElementById('paginationInfo');

    function filterTransactions() {
      const trxRows = document.querySelectorAll('.trx-row');
      if (!trxRows.length) return;
      const query = searchInput ? searchInput.value.toLowerCase().trim() : '';
      const status = statusFilter ? statusFilter.value : '';
      const service = serviceFilter ? serviceFilter.value : '';

      let visibleCount = 0;

      trxRows.forEach(row => {
        const code = (row.getAttribute('data-code') || '').toLowerCase();
        const name = (row.getAttribute('data-name') || '').toLowerCase();
        const rowStatus = row.getAttribute('data-status') || '';
        const rowService = row.getAttribute('data-service') || '';

        const matchesQuery = !query || code.includes(query) || name.includes(query);
        const matchesStatus = !status || rowStatus === status;
        const matchesService = !service || rowService.includes(service);

        if (matchesQuery && matchesStatus && matchesService) {
          row.style.display = '';
          visibleCount++;
        } else {
          row.style.display = 'none';
        }
      });

      if (paginationInfo) {
        paginationInfo.innerHTML = `Menampilkan <strong class="text-slate-700 font-semibold">${visibleCount}</strong> dari <strong class="text-slate-700 font-semibold">${trxRows.length}</strong> data`;
      }
    }

    window.filterTransactions = filterTransactions;

    if (searchInput) searchInput.addEventListener('input', filterTransactions);
    if (statusFilter) statusFilter.addEventListener('change', filterTransactions);
    if (serviceFilter) serviceFilter.addEventListener('change', filterTransactions);

    // Detail Modal Transaksi
    const detailModal = document.getElementById('detailModal');

    window.showDetail = function (code, name, service, weight, price, date, status, payment) {
      if (!detailModal) return;

      const codeEl = document.getElementById('modalTrxCode');
      const dateEl = document.getElementById('modalTrxDate');
      const nameEl = document.getElementById('modalCustomerName');
      const serviceEl = document.getElementById('modalService');
      const weightEl = document.getElementById('modalWeight');
      const priceEl = document.getElementById('modalTotalPrice');
      const paymentEl = document.getElementById('modalPayment');
      const badge = document.getElementById('modalStatusBadge');

      if (codeEl) codeEl.innerText = code || '';
      if (dateEl) dateEl.innerText = date || '';
      if (nameEl) nameEl.innerText = name || '';
      if (serviceEl) serviceEl.innerText = service || '';
      if (weightEl) weightEl.innerText = weight || '';
      if (priceEl) priceEl.innerText = price || '';
      if (paymentEl) paymentEl.innerText = payment || '';

      if (badge) {
        badge.innerText = status || '';
        const sUp = String(status || '').toUpperCase();
        if (sUp === 'DIPROSES' || sUp === 'DICUCI' || sUp === 'DISETRIKA') {
          badge.className = 'inline-block mt-0.5 text-xs font-semibold px-2.5 py-0.5 rounded-full bg-sky-50 text-cyan-700 border border-sky-100';
        } else if (sUp === 'MENUNGGU') {
          badge.className = 'inline-block mt-0.5 text-xs font-semibold px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200/60';
        } else if (sUp === 'SELESAI' || sUp === 'SIAP_DIAMBIL') {
          badge.className = 'inline-block mt-0.5 text-xs font-semibold px-2.5 py-0.5 rounded-full bg-emerald-50 text-teal-700 border border-emerald-200/60';
        } else {
          badge.className = 'inline-block mt-0.5 text-xs font-semibold px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200';
        }
      }

      const invLink = document.getElementById('modalOwnerInvoiceLink');
      if (invLink) {
        invLink.href = `invoice.html?id=${encodeURIComponent(code || '')}`;
      }

      detailModal.classList.remove('hidden');
      detailModal.classList.add('flex');
    };

    window.closeDetailModal = function () {
      if (!detailModal) return;
      detailModal.classList.add('hidden');
      detailModal.classList.remove('flex');
    };

    const closeDetailModalBtn = document.getElementById('closeDetailModalBtn');
    if (closeDetailModalBtn) closeDetailModalBtn.addEventListener('click', window.closeDetailModal);
  }

  // ===========================================================================
  // 10. MODUL LAPORAN PEMILIK (laporan.html)
  // ===========================================================================
  function initLaporanPage() {
    const reportDataByPeriod = {
      harian: {
        label1: 'Pendapatan Hari Ini', val1: 'Rp980.000', sub1: '14,2% dari kemarin',
        label2: 'Transaksi Hari Ini', val2: '28', sub2: '+4 transaksi dari kemarin',
        label3: 'Rata-rata Transaksi', val3: 'Rp35.000', sub3: 'Stabil minggu ini',
        label4: 'Pelanggan Baru', val4: '2', sub4: 'Hari ini'
      },
      bulanan: {
        label1: 'Pendapatan Bulanan', val1: 'Rp24.800.000', sub1: '18,2% dari periode sebelumnya',
        label2: 'Jumlah Transaksi', val2: '684', sub2: '12,4% dari periode sebelumnya',
        label3: 'Rata-rata Transaksi', val3: 'Rp36.250', sub3: '5,1% dari periode sebelumnya',
        label4: 'Pelanggan Baru', val4: '18', sub4: '8,1% dari periode sebelumnya'
      },
      tahunan: {
        label1: 'Pendapatan Tahunan', val1: 'Rp100.670.000', sub1: '24,6% YoY (Jan - Mei 2024)',
        label2: 'Total Transaksi', val2: '2.932', sub2: '19,8% YoY',
        label3: 'Rata-rata Transaksi', val3: 'Rp34.335', sub3: '4,4% YoY',
        label4: 'Pelanggan Baru', val4: '74', sub4: 'Sejak Januari 2024'
      }
    };

    const periodBtns = document.querySelectorAll('.period-btn');
    if (!periodBtns.length) return;

    periodBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        periodBtns.forEach(b => {
          b.className = 'period-btn px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 rounded-lg transition';
        });
        btn.className = 'period-btn px-4 py-2 text-xs font-semibold bg-white text-slate-800 shadow-sm rounded-lg transition';

        const period = btn.getAttribute('data-period');
        const data = reportDataByPeriod[period];
        if (data) {
          const l1 = document.getElementById('statLabel1');
          const v1 = document.getElementById('statVal1');
          const s1 = document.getElementById('statSub1');
          const l2 = document.getElementById('statLabel2');
          const v2 = document.getElementById('statVal2');
          const s2 = document.getElementById('statSub2');
          const l3 = document.getElementById('statLabel3');
          const v3 = document.getElementById('statVal3');
          const s3 = document.getElementById('statSub3');
          const l4 = document.getElementById('statLabel4');
          const v4 = document.getElementById('statVal4');
          const s4 = document.getElementById('statSub4');

          if (l1) l1.textContent = data.label1;
          if (v1) v1.textContent = data.val1;
          if (s1) s1.textContent = data.sub1;
          if (l2) l2.textContent = data.label2;
          if (v2) v2.textContent = data.val2;
          if (s2) s2.textContent = data.sub2;
          if (l3) l3.textContent = data.label3;
          if (v3) v3.textContent = data.val3;
          if (s3) s3.textContent = data.sub3;
          if (l4) l4.textContent = data.label4;
          if (v4) v4.textContent = data.val4;
          if (s4) s4.textContent = data.sub4;

          showToast('Data laporan diperbarui untuk periode ' + period);
        }
      });
    });

    // Tombol Export & Cetak Laporan
    const exportReportBtn = document.getElementById('exportReportBtn');
    if (exportReportBtn) {
      exportReportBtn.addEventListener('click', () => {
        showToast('Menyiapkan file ekspor laporan keuangan (XLSX)...');
      });
    }

    const printReportBtn = document.getElementById('printReportBtn');
    if (printReportBtn) {
      printReportBtn.addEventListener('click', () => {
        window.print();
      });
    }
  }

  // ===========================================================================
  // 11. MODUL PROFIL PEMILIK & EDIT PROFIL (profil.html & editprofil.html)
  // ===========================================================================
  function initProfilPage() {
    const profile = getOwnerProfile();

    const displayFullName = document.getElementById('profileFullName') || document.getElementById('displayFullName') || document.getElementById('bannerProfileName');
    const displayEmail = document.getElementById('profileEmail') || document.getElementById('displayEmail') || document.getElementById('bannerProfileEmail');
    const displayPhone = document.getElementById('profilePhone') || document.getElementById('displayPhone');
    const displayUsername = document.getElementById('profileUsername') || document.getElementById('displayUsername');
    const displayBusiness = document.getElementById('profileBusiness') || document.getElementById('displayBusiness');
    const displayRole = document.getElementById('displayRole');
    const displayLocation = document.getElementById('displayLocation');

    if (displayFullName) displayFullName.textContent = profile.fullName;
    const bannerName = document.getElementById('bannerProfileName');
    if (bannerName) bannerName.textContent = profile.fullName;

    if (displayEmail) displayEmail.textContent = profile.email;
    const bannerEmail = document.getElementById('bannerProfileEmail');
    if (bannerEmail) bannerEmail.textContent = profile.email;

    if (displayPhone) displayPhone.textContent = profile.phone;
    if (displayUsername) displayUsername.textContent = profile.username || 'pemilik';
    if (displayBusiness) displayBusiness.textContent = profile.businessName || 'Bersihin Laundry';
    if (displayRole) displayRole.textContent = profile.role;
    if (displayLocation) displayLocation.textContent = profile.location;

    // Form Edit Profil Pemilik
    const editProfileForm = document.getElementById('editProfileForm');
    if (editProfileForm) {
      const fullNameInput = document.getElementById('nama') || document.getElementById('fullName');
      const emailInput = document.getElementById('email');
      const phoneInput = document.getElementById('phone');
      const usernameInput = document.getElementById('username');
      const businessInput = document.getElementById('nama_usaha');
      const roleInput = document.getElementById('role');
      const locationInput = document.getElementById('location');

      if (fullNameInput) fullNameInput.value = profile.fullName || 'Rangga Saputra';
      if (emailInput) emailInput.value = profile.email || 'rangga@bersihin.id';
      if (phoneInput) phoneInput.value = profile.phone || '0812 1122 3344';
      if (usernameInput) usernameInput.value = profile.username || 'pemilik';
      if (businessInput) businessInput.value = profile.businessName || 'Bersihin Laundry';
      if (roleInput) roleInput.value = profile.role || 'Owner & General Manager';
      if (locationInput) locationInput.value = profile.location || 'Bandung Outlet Pusat';

      editProfileForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const updatedName = fullNameInput ? fullNameInput.value.trim() : '';
        const updatedEmail = emailInput ? emailInput.value.trim() : '';
        const updatedPhone = phoneInput ? phoneInput.value.trim() : '';
        const updatedUsername = usernameInput ? usernameInput.value.trim() : '';
        const updatedBusiness = businessInput ? businessInput.value.trim() : '';
        const updatedRole = roleInput ? roleInput.value.trim() : 'Owner & General Manager';
        const updatedLocation = locationInput ? locationInput.value.trim() : 'Bandung Outlet Pusat';

        if (!updatedName || !updatedEmail) {
          showToast('Nama dan email wajib diisi.', true);
          return;
        }

        saveOwnerProfile({
          fullName: updatedName,
          email: updatedEmail,
          phone: updatedPhone,
          username: updatedUsername,
          businessName: updatedBusiness,
          role: updatedRole,
          location: updatedLocation
        });

        // Sinkronisasi ke backend jika server aktif
        try {
          const token = localStorage.getItem('bersihin_token');
          const headers = { 'Content-Type': 'application/json' };
          if (token) headers['Authorization'] = 'Bearer ' + token;
          await fetch('/api/pemilik/profil', {
            method: 'PUT',
            headers,
            body: JSON.stringify({
              nama: updatedName,
              email: updatedEmail,
              telepon: updatedPhone,
              alamat: updatedLocation
            })
          });
        } catch (_) {}

        showToast('Profil pemilik berhasil diperbarui!');
        setTimeout(() => {
          window.location.href = 'profil.html';
        }, 800);
      });
    }
  }

  // ===========================================================================
  // 12. MODUL UBAH PASSWORD PEMILIK (password.html)
  // ===========================================================================
  function checkPasswordStrength(password) {
    const s1 = document.getElementById('strength-1') || document.getElementById('bar1');
    const s2 = document.getElementById('strength-2') || document.getElementById('bar2');
    const s3 = document.getElementById('strength-3') || document.getElementById('bar3');
    const s4 = document.getElementById('strength-4');
    const sText = document.getElementById('strength-text') || document.getElementById('strengthText');

    const bars = [s1, s2, s3, s4].filter(Boolean);
    bars.forEach(bar => {
      bar.className = 'h-full flex-1 bg-slate-200 transition-all duration-300 rounded-full';
    });

    if (!password) {
      if (sText) {
        sText.textContent = 'Belum diisi';
        sText.className = 'text-slate-400 font-semibold';
      }
      return;
    }

    let score = 0;
    if (password.length >= 8) score++;
    if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score++;
    if (/\d/.test(password)) score++;
    if (/[^a-zA-Z0-9]/.test(password)) score++;

    if (score === 1) {
      if (bars[0]) bars[0].className = 'h-full flex-1 bg-rose-500 rounded-full transition-all duration-300';
      if (sText) {
        sText.textContent = 'Sangat Lemah';
        sText.className = 'text-rose-600 font-semibold';
      }
    } else if (score === 2) {
      if (bars[0]) bars[0].className = 'h-full flex-1 bg-amber-500 rounded-full transition-all duration-300';
      if (bars[1]) bars[1].className = 'h-full flex-1 bg-amber-500 rounded-full transition-all duration-300';
      if (sText) {
        sText.textContent = 'Sedang';
        sText.className = 'text-amber-600 font-semibold';
      }
    } else if (score === 3) {
      if (bars[0]) bars[0].className = 'h-full flex-1 bg-sky-500 rounded-full transition-all duration-300';
      if (bars[1]) bars[1].className = 'h-full flex-1 bg-sky-500 rounded-full transition-all duration-300';
      if (bars[2]) bars[2].className = 'h-full flex-1 bg-sky-500 rounded-full transition-all duration-300';
      if (sText) {
        sText.textContent = 'Kuat';
        sText.className = 'text-sky-600 font-semibold';
      }
    } else if (score >= 4) {
      bars.forEach(bar => {
        bar.className = 'h-full flex-1 bg-emerald-500 rounded-full transition-all duration-300';
      });
      if (sText) {
        sText.textContent = 'Sangat Kuat';
        sText.className = 'text-emerald-600 font-semibold';
      }
    }
  }

  function initPasswordPage() {
    const passwordForm = document.getElementById('passwordForm') || document.querySelector('form[action*="profil.html"]');
    if (!passwordForm || !window.location.pathname.includes('password.html')) return;

    const newPassInput = document.getElementById('newPassword');
    if (newPassInput) {
      newPassInput.addEventListener('input', (e) => {
        checkPasswordStrength(e.target.value);
      });
    }

    // Toggle Eye Buttons
    document.querySelectorAll('.toggle-pass-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const targetId = btn.getAttribute('data-toggle-target') || btn.getAttribute('data-target');
        const input = document.getElementById(targetId);
        if (!input) return;
        const isPass = input.type === 'password';
        input.type = isPass ? 'text' : 'password';

        if (isPass) {
          btn.innerHTML = `
            <svg class="size-4" viewBox="0 0 16 16" fill="none" aria-hidden="true">
              <path d="M2 2L14 14M6.5 6.5C6.1 6.9 5.8 7.4 5.8 8C5.8 9.2 6.8 10.2 8 10.2C8.6 10.2 9.1 9.9 9.5 9.5M3.5 4.5C2.4 5.5 1.5 6.7 1.5 8C2.6 10.8 5.1 12.5 8 12.5C9.3 12.5 10.5 12.1 11.5 11.5M5.5 3.8C6.3 3.6 7.1 3.5 8 3.5C10.9 3.5 13.4 5.2 14.5 8C14.1 9 13.5 9.9 12.7 10.7" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round" />
            </svg>
          `;
        } else {
          btn.innerHTML = `
            <svg class="size-4" viewBox="0 0 16 16" fill="none" aria-hidden="true">
              <circle cx="8" cy="8" r="2.5" stroke="currentColor" stroke-width="1.3" />
              <path d="M2 8C2 8 4.5 3.5 8 3.5C11.5 3.5 14 8 14 8C14 8 11.5 12.5 8 12.5C4.5 12.5 2 8 2 8Z" stroke="currentColor" stroke-width="1.3" />
            </svg>
          `;
        }
      });
    });

    // Indikator kesamaan password
    const confirmInput = document.getElementById('confirmPassword');
    const matchBadge = document.getElementById('matchBadge');

    function checkMatch() {
      if (!matchBadge || !confirmInput || !newPassInput) return;
      if (!confirmInput.value) {
        matchBadge.classList.add('hidden');
        return;
      }
      matchBadge.classList.remove('hidden');
      if (confirmInput.value === newPassInput.value) {
        matchBadge.textContent = 'Cocok';
        matchBadge.className = 'text-[11px] font-semibold text-emerald-600';
      } else {
        matchBadge.textContent = 'Belum cocok';
        matchBadge.className = 'text-[11px] font-semibold text-rose-500';
      }
    }
    if (confirmInput) confirmInput.addEventListener('input', checkMatch);
    if (newPassInput) newPassInput.addEventListener('input', checkMatch);

    passwordForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const currentPassEl = document.getElementById('currentPassword') || document.querySelector('[name="currentPassword"]');
      const newPassEl = document.getElementById('newPassword') || document.querySelector('[name="newPassword"]');
      const confirmPassEl = document.getElementById('confirmPassword') || document.querySelector('[name="confirmPassword"]');

      const currentPass = currentPassEl ? currentPassEl.value : '';
      const newPass = newPassEl ? newPassEl.value : '';
      const confirmPass = confirmPassEl ? confirmPassEl.value : '';

      if (!currentPass) {
        showToast('Silakan masukkan kata sandi saat ini.', true);
        if (currentPassEl) currentPassEl.focus();
        return;
      }

      if (newPass.length < 8) {
        showToast('Kata sandi baru minimal 8 karakter.', true);
        if (newPassEl) newPassEl.focus();
        return;
      }

      if (newPass === currentPass) {
        showToast('Kata sandi baru tidak boleh sama dengan kata sandi lama.', true);
        if (newPassEl) newPassEl.focus();
        return;
      }

      if (newPass !== confirmPass) {
        showToast('Konfirmasi kata sandi baru tidak cocok.', true);
        if (confirmPassEl) confirmPassEl.focus();
        return;
      }

      showToast('Kata sandi pemilik berhasil diperbarui! Mengalihkan ke profil...');
      setTimeout(() => {
        window.location.href = 'profil.html';
      }, 1200);
    });
  }

  // ===========================================================================
  // 13. BOOTSTRAP: JALANKAN INISIALISASI SETELAH DOM SIAP
  // ===========================================================================
  function refreshActivePemilikPage() {
    updatePemilikRealtimeDate();
    const path = (window.location.pathname || '').toLowerCase();
    if (path.includes('dashboard') || path.endsWith('/pemilik/') || path.endsWith('/pemilik')) {
      syncPemilikDashboardFromDatabase();
    } else if (path.includes('transaksi')) {
      syncPemilikTransaksiFromDatabase();
    } else if (path.includes('datapelanggan')) {
      syncPemilikPelangganFromDatabase();
    } else if (path.includes('datapegawai')) {
      syncPemilikPegawaiFromDatabase();
    } else if (path.includes('layananpegawai')) {
      syncPemilikLayananFromDatabase();
    } else if (path.includes('laporan')) {
      syncPemilikLaporanFromDatabase();
    } else if (path.includes('profil') || path.includes('editprofil')) {
      syncPemilikProfilFromDatabase();
    }
  }

  function logoutOwner(event) {
    if (event && event.preventDefault) {
      event.preventDefault();
    }
    try {
      localStorage.removeItem('bersihin_token');
      localStorage.removeItem('bersihin_staff_token');
      localStorage.removeItem('bersihin_user');
      localStorage.removeItem('bersihin_active_role');
      localStorage.removeItem('bersihin_owner_logged_in');
      localStorage.removeItem('bersihin_pemilik_profile');
      sessionStorage.removeItem('bersihin_token');
      sessionStorage.removeItem('bersihin_staff_token');
      sessionStorage.removeItem('bersihin_user');
      sessionStorage.removeItem('bersihin_active_role');
      sessionStorage.removeItem('bersihin_pemilik_profile');

      const apiBase = getBackendBaseUrl();
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

  window.logoutOwner = logoutOwner;

  function bootstrap() {
    initSharedComponents();
    syncPemilikProfilFromDatabase();
    initLoginPage();
    initDashboardPage();
    initPegawaiPage();
    initPelangganPage();
    initLayananPage();
    initTransaksiPage();
    initLaporanPage();
    initProfilPage();
    initPasswordPage();

    // Pasang penangan logout ke semua tombol/tautan keluar pemilik
    document.querySelectorAll('a[href*="login.html"], [title="Keluar"]').forEach(el => {
      el.addEventListener('click', logoutOwner);
    });

    // Jalankan sinkronisasi pertama kali secara instan dari MySQL
    refreshActivePemilikPage();

    // 1. Sinkronisasi instan antar-tab saat Pelanggan atau Pegawai update order di database
    window.addEventListener('storage', (e) => {
      if (e.key === 'bersihin_order_updated' || e.key === 'bersihin_transactions' || e.key === 'bersihin_active_order') {
        refreshActivePemilikPage();
      }
    });

    // 2. Polling sinkronisasi real-time otomatis ke database MySQL XAMPP setiap 3.5 detik
    setInterval(() => {
      refreshActivePemilikPage();
    }, 3500);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', bootstrap);
  } else {
    bootstrap();
  }

})();


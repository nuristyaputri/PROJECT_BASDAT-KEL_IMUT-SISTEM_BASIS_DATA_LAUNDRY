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
      email: 'rangga.saputra@bersihin.id',
      phone: '0811 2345 6789',
      role: 'Owner & General Manager',
      location: 'Bandung Outlet Pusat',
      joinDate: 'Januari 2023'
    }
  };

  // ===========================================================================
  // 2. UTILITAS GLOBAL
  // ===========================================================================

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
      const stored = localStorage.getItem(PemilikConfig.storageKeys.profile);
      if (stored) {
        return Object.assign({}, PemilikConfig.defaultProfile, JSON.parse(stored));
      }
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
    // 3.1 Sinkronisasi Profil Pemilik di Header / Topbar
    const profile = getOwnerProfile();
    const ownerNameEls = document.querySelectorAll('#topbarOwnerName, #profileOwnerName, #bannerOwnerName, #dropdownOwnerName');
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

    if (sidebarToggle) sidebarToggle.addEventListener('click', toggleSidebar);
    if (sidebarOverlay) sidebarOverlay.addEventListener('click', closeSidebar);

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

    // 6.3 Form Submission Tambah Pegawai (Baik di modal maupun di tambahpegawai.html)
    const formPegawai = formTambahPegawai || document.querySelector('form[action*="datapegawai.html"]');
    if (formPegawai) {
      formPegawai.addEventListener('submit', (e) => {
        const namaInput = formPegawai.querySelector('#nama') || formPegawai.querySelector('[name="nama"]');
        const nama = namaInput ? namaInput.value.trim() : '';

        if (!nama) {
          e.preventDefault();
          showToast('Silakan masukkan nama lengkap pegawai.', true);
          return;
        }

        showToast('Data pegawai ' + nama + ' berhasil disimpan.');
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
    const customerRows = document.querySelectorAll('.customer-row');
    const totalCounter = document.getElementById('totalCounter');

    if (searchInput && customerRows.length) {
      searchInput.addEventListener('input', (e) => {
        const query = e.target.value.toLowerCase().trim();
        let visibleCount = 0;

        customerRows.forEach(row => {
          const text = row.innerText.toLowerCase();
          if (text.includes(query)) {
            row.style.display = '';
            visibleCount++;
          } else {
            row.style.display = 'none';
          }
        });

        if (totalCounter) {
          totalCounter.innerText = `${visibleCount} pelanggan`;
        }
      });
    }

    // 7.3 Form Tambah Pelanggan
    const formCustomer = document.querySelector('form[action*="datapelanggan.html"]') || document.getElementById('formTambahPelanggan');
    if (formCustomer) {
      formCustomer.addEventListener('submit', (e) => {
        const namaInput = formCustomer.querySelector('#nama') || formCustomer.querySelector('[name="nama"]');
        const nama = namaInput ? namaInput.value.trim() : '';

        if (!nama) {
          e.preventDefault();
          showToast('Silakan masukkan nama lengkap pelanggan.', true);
          return;
        }

        showToast('Data pelanggan ' + nama + ' berhasil didaftarkan.');
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

    window.handleAddSubmit = function (e) {
      if (e) e.preventDefault();
      showToast('Layanan baru berhasil ditambahkan!');
      window.closeAddModal();
    };

    window.deleteService = function (name) {
      if (confirm(`Apakah Anda yakin ingin menonaktifkan atau menghapus layanan "${name}"?`)) {
        showToast(`Layanan "${name}" berhasil dihapus.`);
      }
    };

    if (openAddBtn) openAddBtn.addEventListener('click', window.openAddModal);
    if (closeAddBtn) closeAddBtn.addEventListener('click', window.closeAddModal);

    // Form Tambah / Edit Layanan mandiri
    const formLayanan = document.querySelector('form[action*="layananpegawai.html"]') || document.getElementById('formLayanan');
    if (formLayanan) {
      formLayanan.addEventListener('submit', (e) => {
        const namaInput = formLayanan.querySelector('[name="nama"]') || formLayanan.querySelector('#nama');
        const nama = namaInput ? namaInput.value.trim() : '';

        if (!nama) {
          e.preventDefault();
          showToast('Silakan lengkapi nama layanan.', true);
          return;
        }

        showToast('Data layanan ' + nama + ' berhasil disimpan.');
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
    const trxRows = document.querySelectorAll('.trx-row');
    const paginationInfo = document.getElementById('paginationInfo');

    function filterTransactions() {
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
        const matchesService = !service || rowService === service;

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
        if (status === 'Diproses') {
          badge.className = 'inline-block mt-0.5 text-xs font-semibold px-2.5 py-0.5 rounded-full bg-sky-50 text-cyan-700 border border-sky-100';
        } else if (status === 'Menunggu') {
          badge.className = 'inline-block mt-0.5 text-xs font-semibold px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200/60';
        } else if (status === 'Selesai') {
          badge.className = 'inline-block mt-0.5 text-xs font-semibold px-2.5 py-0.5 rounded-full bg-emerald-50 text-teal-700 border border-emerald-200/60';
        } else {
          badge.className = 'inline-block mt-0.5 text-xs font-semibold px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200';
        }
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

    const displayFullName = document.getElementById('displayFullName');
    const displayEmail = document.getElementById('displayEmail');
    const displayPhone = document.getElementById('displayPhone');
    const displayRole = document.getElementById('displayRole');
    const displayLocation = document.getElementById('displayLocation');

    if (displayFullName) displayFullName.textContent = profile.fullName;
    if (displayEmail) displayEmail.textContent = profile.email;
    if (displayPhone) displayPhone.textContent = profile.phone;
    if (displayRole) displayRole.textContent = profile.role;
    if (displayLocation) displayLocation.textContent = profile.location;

    // Form Edit Profil Pemilik
    const editProfileForm = document.getElementById('editProfileForm');
    if (editProfileForm) {
      const fullNameInput = document.getElementById('fullName');
      const emailInput = document.getElementById('email');
      const phoneInput = document.getElementById('phone');
      const roleInput = document.getElementById('role');
      const locationInput = document.getElementById('location');

      if (fullNameInput) fullNameInput.value = profile.fullName;
      if (emailInput) emailInput.value = profile.email;
      if (phoneInput) phoneInput.value = profile.phone;
      if (roleInput) roleInput.value = profile.role;
      if (locationInput) locationInput.value = profile.location;

      editProfileForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const updatedName = fullNameInput ? fullNameInput.value.trim() : '';
        const updatedEmail = emailInput ? emailInput.value.trim() : '';
        const updatedPhone = phoneInput ? phoneInput.value.trim() : '';
        const updatedRole = roleInput ? roleInput.value.trim() : '';
        const updatedLocation = locationInput ? locationInput.value.trim() : '';

        if (!updatedName || !updatedEmail) {
          showToast('Nama dan email wajib diisi.', true);
          return;
        }

        saveOwnerProfile({
          fullName: updatedName,
          email: updatedEmail,
          phone: updatedPhone,
          role: updatedRole,
          location: updatedLocation
        });

        showToast('Profil pemilik berhasil diperbarui!');
        setTimeout(() => {
          window.location.href = 'profil.html';
        }, 1000);
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
  function bootstrap() {
    initSharedComponents();
    initLoginPage();
    initDashboardPage();
    initPegawaiPage();
    initPelangganPage();
    initLayananPage();
    initTransaksiPage();
    initLaporanPage();
    initProfilPage();
    initPasswordPage();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', bootstrap);
  } else {
    bootstrap();
  }

})();


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
      fullName: 'Andi Pratama',
      email: 'andi.pratama@email.com',
      phone: '0812 3456 7890',
      address: 'Jl. Cempaka Indah No. 12, Coblong, Bandung, Jawa Barat 40132',
      memberTier: 'Silver Member',
      joinDate: 'Januari 2024'
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
      const stored = localStorage.getItem(BersihinConfig.storageKeys.profile);
      if (stored) {
        return Object.assign({}, BersihinConfig.defaultProfile, JSON.parse(stored));
      }
    } catch (e) {
      console.warn('Gagal memuat profil pelanggan dari storage:', e);
    }
    return BersihinConfig.defaultProfile;
  }

  /**
   * Menyimpan data profil pelanggan ke localStorage
   */
  function saveCustomerProfile(data) {
    try {
      const current = getCustomerProfile();
      const updated = Object.assign({}, current, data);
      localStorage.setItem(BersihinConfig.storageKeys.profile, JSON.stringify(updated));
      return updated;
    } catch (e) {
      console.warn('Gagal menyimpan profil pelanggan ke storage:', e);
      return data;
    }
  }

  // ===========================================================================
  // 3. INISIALISASI KOMPONEN BERSAMA (SHARED) PADA SELURUH HALAMAN
  // ===========================================================================
  function initSharedComponents() {
    // 3.1 Sinkronisasi Nama & Email di Topbar / Sidebar
    const profile = getCustomerProfile();
    const topbarNames = document.querySelectorAll('#topbarUserName, #bannerProfileName, #dropdownUserName');
    const topbarEmails = document.querySelectorAll('#dropdownUserEmail, #bannerProfileEmail');

    topbarNames.forEach(el => {
      if (el) el.textContent = profile.fullName;
    });
    topbarEmails.forEach(el => {
      if (el) el.textContent = profile.email;
    });

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

    if (openSidebarBtn) openSidebarBtn.addEventListener('click', openSidebar);
    if (closeSidebarBtn) closeSidebarBtn.addEventListener('click', closeSidebar);
    if (sidebarOverlay) sidebarOverlay.addEventListener('click', closeSidebar);

    // 3.3 Dropdown Notifikasi & Profil Topbar
    const notifToggleBtn = document.getElementById('notifToggleBtn');
    const notifDropdown = document.getElementById('notifDropdown');
    const notifDot = document.getElementById('notifDot');
    const markNotifReadBtn = document.getElementById('markNotifReadBtn');
    const profileMenuBtn = document.getElementById('profileMenuBtn');
    const profileDropdown = document.getElementById('profileDropdown');

    if (notifToggleBtn && notifDropdown && !notifToggleBtn.dataset.hasNotifListener) {
      notifToggleBtn.dataset.hasNotifListener = 'true';
      notifToggleBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        const willOpen = notifDropdown.classList.contains('hidden');
        notifDropdown.classList.toggle('hidden', !willOpen);
        if (profileDropdown) profileDropdown.classList.add('hidden');
        notifToggleBtn.setAttribute('aria-expanded', String(willOpen));
      });
    }

    if (markNotifReadBtn && !markNotifReadBtn.dataset.hasReadListener) {
      markNotifReadBtn.dataset.hasReadListener = 'true';
      markNotifReadBtn.addEventListener('click', () => {
        if (notifDot) notifDot.classList.add('hidden');
        markNotifReadBtn.textContent = 'Semua dibaca';
        showToast('Semua notifikasi ditandai telah dibaca.');
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
        localStorage.setItem('bersihin_customer_profile', JSON.stringify({
          nama: 'Andi Pratama',
          email: identifier.includes('@') ? identifier : 'andi.pratama@email.com',
          telepon: '0812 3456 7821',
          alamat: 'Jl. Kemang Raya No. 45, Jakarta Selatan',
          member_tier: 'Silver Member'
        }));
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
  const DEFAULT_CUSTOMER_TRANSACTIONS = [
    {
      code: 'TRX-240518-01',
      date: '18 Mei 2024',
      timestamp: '2024-05-18T09:15:00',
      service: 'Cuci + Setrika',
      weight: '4,5 kg',
      weightKg: 4.5,
      amount: 45000,
      total: 'Rp45.000',
      status: 'Diproses',
      dateIn: '18 Mei 2024',
      dateOut: '21 Mei 2024',
      notes: 'Pisahkan pakaian putih, gunakan pewangi lembut.',
      calcSub: '4,5 kg x Rp10.000',
      paidDate: 'Dibayar 18 Mei 2024 (Lunas - QRIS)',
      created: 'Dibuat pada 18 Mei 2024, 09.15 WIB'
    },
    {
      code: 'TRX-240512-08',
      date: '12 Mei 2024',
      timestamp: '2024-05-12T14:20:00',
      service: 'Express',
      weight: '4,0 kg',
      weightKg: 4.0,
      amount: 72000,
      total: 'Rp72.000',
      status: 'Selesai',
      dateIn: '12 Mei 2024',
      dateOut: '13 Mei 2024',
      notes: 'Lipat rapi sesuai kategori kemeja.',
      calcSub: '4,0 kg x Rp18.000',
      paidDate: 'Dibayar 12 Mei 2024 (Lunas - Tunai)',
      created: 'Dibuat pada 12 Mei 2024, 14.20 WIB'
    },
    {
      code: 'TRX-240506-12',
      date: '6 Mei 2024',
      timestamp: '2024-05-06T10:15:00',
      service: 'Cuci Kering',
      weight: '4,0 kg',
      weightKg: 4.0,
      amount: 28000,
      total: 'Rp28.000',
      status: 'Selesai',
      dateIn: '6 Mei 2024',
      dateOut: '8 Mei 2024',
      notes: 'Gunakan deterjen hypoallergenic.',
      calcSub: '4,0 kg x Rp7.000',
      paidDate: 'Dibayar 6 Mei 2024 (Lunas - QRIS)',
      created: 'Dibuat pada 6 Mei 2024, 10.15 WIB'
    },
    {
      code: 'TRX-240430-05',
      date: '30 Apr 2024',
      timestamp: '2024-04-30T08:45:00',
      service: 'Setrika Saja',
      weight: '5,0 kg',
      weightKg: 5.0,
      amount: 30000,
      total: 'Rp30.000',
      status: 'Selesai',
      dateIn: '30 Apr 2024',
      dateOut: '1 Mei 2024',
      notes: 'Setrika rapi licin dengan pewangi.',
      calcSub: '5,0 kg x Rp6.000',
      paidDate: 'Dibayar 30 Apr 2024 (Lunas - Tunai)',
      created: 'Dibuat pada 30 Apr 2024, 08.45 WIB'
    },
    {
      code: 'TRX-240422-09',
      date: '22 Apr 2024',
      timestamp: '2024-04-22T10:00:00',
      service: 'Cuci + Setrika',
      weight: '6,0 kg',
      weightKg: 6.0,
      amount: 60000,
      total: 'Rp60.000',
      status: 'Selesai',
      dateIn: '22 Apr 2024',
      dateOut: '25 Apr 2024',
      notes: 'Termasuk selimut tipis.',
      calcSub: '6,0 kg x Rp10.000',
      paidDate: 'Dibayar 22 Apr 2024 (Lunas - Transfer Bank)',
      created: 'Dibuat pada 22 Apr 2024, 10.00 WIB'
    },
    {
      code: 'TRX-240415-02',
      date: '15 Apr 2024',
      timestamp: '2024-04-15T08:45:00',
      service: 'Express',
      weight: '3,0 kg',
      weightKg: 3.0,
      amount: 54000,
      total: 'Rp54.000',
      status: 'Selesai',
      dateIn: '15 Apr 2024',
      dateOut: '16 Apr 2024',
      notes: 'Paket kilat.',
      calcSub: '3,0 kg x Rp18.000',
      paidDate: 'Dibayar 15 Apr 2024 (Lunas - QRIS)',
      created: 'Dibuat pada 15 Apr 2024, 08.45 WIB'
    },
    {
      code: 'TRX-240408-07',
      date: '8 Apr 2024',
      timestamp: '2024-04-08T15:00:00',
      service: 'Cuci Kering',
      weight: '3,5 kg',
      weightKg: 3.5,
      amount: 24500,
      total: 'Rp24.500',
      status: 'Selesai',
      dateIn: '8 Apr 2024',
      dateOut: '10 Apr 2024',
      notes: 'Pewangi Ocean Fresh.',
      calcSub: '3,5 kg x Rp7.000',
      paidDate: 'Dibayar 8 Apr 2024 (Lunas - QRIS)',
      created: 'Dibuat pada 8 Apr 2024, 15.00 WIB'
    },
    {
      code: 'TRX-240328-04',
      date: '28 Mar 2024',
      timestamp: '2024-03-28T11:30:00',
      service: 'Cuci + Setrika',
      weight: '3,0 kg',
      weightKg: 3.0,
      amount: 30000,
      total: 'Rp30.000',
      status: 'Dibatalkan',
      dateIn: '28 Mar 2024',
      dateOut: '31 Mar 2024',
      notes: 'Dibatalkan oleh pelanggan sebelum penjemputan.',
      calcSub: '3,0 kg x Rp10.000',
      paidDate: 'Dikembalikan (Refund)',
      created: 'Dibuat pada 28 Mar 2024, 11.30 WIB'
    }
  ];

  function getAllCustomerTransactions() {
    let customList = [];
    try {
      const stored = localStorage.getItem('bersihin_transactions');
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) customList = parsed;
      }
    } catch (_) {}

    try {
      const activeRaw = localStorage.getItem('bersihin_active_order') || sessionStorage.getItem('bersihin_last_order');
      if (activeRaw) {
        const active = JSON.parse(activeRaw);
        const code = active.code || active.orderId;
        if (code && !customList.some(item => (item.code || item.id) === code)) {
          customList.unshift(active);
        }
      }
    } catch (_) {}

    const result = [];
    const seen = new Set();

    customList.forEach(raw => {
      const code = raw.code || raw.id || raw.orderId;
      if (code && !seen.has(code)) {
        seen.add(code);
        const amountNum = typeof raw.amount === 'number'
          ? raw.amount
          : (typeof raw.total === 'number'
            ? raw.total
            : parseInt(String(raw.total || raw.totalFormatted || '0').replace(/[^0-9]/g, ''), 10) || 45000);

        result.push({
          code: code,
          date: raw.date || raw.dateIn || 'Hari ini',
          timestamp: raw.createdAt || raw.timestamp || new Date().toISOString(),
          service: raw.service || 'Cuci + Setrika',
          weight: raw.weight || (raw.weightKg ? `${raw.weightKg},0 kg` : '4,0 kg'),
          weightKg: parseFloat(raw.weightKg) || 4.0,
          amount: amountNum,
          total: raw.totalFormatted || (typeof raw.total === 'string' && raw.total.startsWith('Rp') ? raw.total : formatRupiah(amountNum)),
          status: raw.status || 'Menunggu konfirmasi',
          dateIn: raw.dateIn || raw.date || 'Hari ini',
          dateOut: raw.estDone || raw.dateOut || '2 hari lagi',
          notes: raw.notes || 'Pakaian reguler',
          calcSub: raw.calcSub || `${raw.weight || '4,0 kg'} (Estimasi)`,
          paidDate: raw.paidDate || (raw.status === 'Selesai' ? `Dibayar ${raw.date || 'kemarin'}` : 'Belum dibayar'),
          created: raw.created || raw.dateInTime || `Dibuat pada ${raw.date || 'Hari ini'}`
        });
      }
    });

    DEFAULT_CUSTOMER_TRANSACTIONS.forEach(def => {
      if (!seen.has(def.code)) {
        seen.add(def.code);
        result.push(def);
      }
    });

    return result;
  }

  function getCustomerStats(transactions) {
    const list = transactions || getAllCustomerTransactions();
    const totalOrders = list.length;
    const processing = list.filter(t => t.status === 'Diproses' || t.status === 'Menunggu konfirmasi').length;
    const completed = list.filter(t => t.status === 'Selesai' || t.status === 'Diambil').length;
    const canceled = list.filter(t => t.status === 'Dibatalkan').length;
    const totalExpense = list
      .filter(t => t.status !== 'Dibatalkan')
      .reduce((sum, t) => sum + (t.amount || 0), 0);

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
    if (status === 'Menunggu konfirmasi') {
      return `
        <span class="px-2.5 py-1 bg-amber-50 border border-amber-200 rounded-[20px] inline-flex items-center gap-1.5">
          <span class="size-1.5 bg-amber-500 rounded-full animate-pulse" aria-hidden="true"></span>
          <span class="text-amber-800 text-[10px] font-semibold leading-3">Menunggu konfirmasi</span>
        </span>
      `;
    }
    if (status === 'Diproses') {
      return `
        <span class="px-2.5 py-1 bg-orange-100 rounded-[20px] inline-flex items-center gap-1.5">
          <span class="size-1.5 bg-yellow-600 rounded-full" aria-hidden="true"></span>
          <span class="text-yellow-700 text-[10px] font-semibold leading-3">Diproses</span>
        </span>
      `;
    }
    if (status === 'Selesai') {
      return `
        <span class="px-2.5 py-1 bg-emerald-50 rounded-[20px] inline-flex items-center gap-1.5">
          <span class="size-1.5 bg-teal-700 rounded-full" aria-hidden="true"></span>
          <span class="text-teal-700 text-[10px] font-semibold leading-3">Selesai</span>
        </span>
      `;
    }
    if (status === 'Diambil') {
      return `
        <span class="px-2.5 py-1 bg-indigo-50 rounded-[20px] inline-flex items-center gap-1.5">
          <span class="size-1.5 bg-cyan-700 rounded-full" aria-hidden="true"></span>
          <span class="text-cyan-800 text-[10px] font-semibold leading-3">Diambil</span>
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
  window.BersihinTrx = {
    getAll: getAllCustomerTransactions,
    getStats: getCustomerStats,
    getStatusBadgeHtml: getStatusBadgeHtml
  };

  // ===========================================================================
  // 5. MODUL DASHBOARD PELANGGAN (PELANGGAN/dashboard.html)
  // ===========================================================================
  function initDashboardPage() {
    const dashboardSection = document.getElementById('pesananAktifSection') || document.querySelector('main');
    // Pastikan berada di dashboard dengan memeriksa elemen unik
    if (!document.getElementById('pesananAktifSection') && !document.getElementById('orderDetailModal')) return;

    // 5.1 Ucapan Waktu Dinamis & Profil Pengguna
    const profile = getCustomerProfile();
    const hour = new Date().getHours();
    let greeting = 'Selamat Datang';
    if (hour >= 4 && hour < 11) greeting = 'Selamat Pagi';
    else if (hour >= 11 && hour < 15) greeting = 'Selamat Siang';
    else if (hour >= 15 && hour < 18) greeting = 'Selamat Sore';
    else greeting = 'Selamat Malam';

    const greetingHeading = document.getElementById('greetingHeading') || document.querySelector('h2.font-normal');
    if (greetingHeading && greetingHeading.textContent.includes('Halo,')) {
      const firstName = profile.fullName ? profile.fullName.split(' ')[0] : 'Andi';
      greetingHeading.textContent = `${greeting}, ${firstName}! Semoga harimu menyenangkan.`;
    }

    const loggedAsEl = document.getElementById('loggedAsName');
    if (loggedAsEl && profile.fullName) loggedAsEl.textContent = profile.fullName;

    const modalCustName = document.getElementById('modalCustomerName');
    if (modalCustName && profile.fullName) modalCustName.textContent = profile.fullName;

    // 5.2 Perbarui Ringkasan Statistik Dashboard Secara Dinamis
    const allTrx = getAllCustomerTransactions();
    const stats = getCustomerStats(allTrx);

    const statTotalEl = document.getElementById('statTotalTransaksi');
    if (statTotalEl) statTotalEl.textContent = stats.total;

    const statSedangEl = document.getElementById('statSedangDiproses');
    if (statSedangEl) statSedangEl.textContent = stats.processing;

    const statSelesaiEl = document.getElementById('statPesananSelesai');
    if (statSelesaiEl) statSelesaiEl.textContent = stats.completed;

    const statExpenseEl = document.getElementById('statTotalPengeluaran');
    if (statExpenseEl) statExpenseEl.textContent = stats.totalExpenseFormatted;

    // 5.3 Render Tabel Riwayat Transaksi Terbaru (Dinamis dari Storage)
    const recentBody = document.getElementById('recentTransactionsBody');
    const recentEmpty = document.getElementById('recentTransactionsEmpty');
    const recentTableWrapper = document.getElementById('recentTransactionsTableWrapper');

    if (recentBody) {
      const recentList = allTrx.slice(0, 4); // Ambil 4 transaksi terbaru
      if (recentList.length === 0) {
        if (recentTableWrapper) recentTableWrapper.classList.add('hidden');
        if (recentEmpty) recentEmpty.classList.remove('hidden');
      } else {
        if (recentTableWrapper) recentTableWrapper.classList.remove('hidden');
        if (recentEmpty) recentEmpty.classList.add('hidden');

        recentBody.innerHTML = recentList.map(trx => `
          <tr class="hover:bg-slate-50/80 transition">
            <td class="px-3 py-3 font-bold text-slate-800">
              <a href="dtltransaksi.html?id=${encodeURIComponent(trx.code)}" class="hover:text-cyan-700 transition">${trx.code}</a>
            </td>
            <td class="px-3 py-3 text-slate-600">${trx.date}</td>
            <td class="px-3 py-3 text-slate-600">${trx.service}</td>
            <td class="px-3 py-3 font-bold text-slate-800">${trx.total}</td>
            <td class="px-3 py-3">
              ${getStatusBadgeHtml(trx.status)}
            </td>
            <td class="px-3 py-1.5 text-right">
              <a href="dtltransaksi.html?id=${encodeURIComponent(trx.code)}"
                aria-label="Lihat detail transaksi ${trx.code}"
                class="min-w-[44px] min-h-[44px] inline-flex items-center justify-center rounded-lg text-slate-500 hover:text-cyan-700 hover:bg-cyan-50 active:bg-cyan-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-700 transition">
                <svg class="size-4" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                  <path d="M6 4L10 8L6 12" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round" />
                </svg>
              </a>
            </td>
          </tr>
        `).join('');
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

    let currentPricePerKg = 10000;
    let currentServiceName = 'Cuci + Setrika';

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
    window.openServiceOrderModal = function (name, pricePerKg, duration, minWeight, description) {
      currentServiceName = name || 'Cuci + Setrika';
      currentPricePerKg = Number(pricePerKg) || 10000;

      // Navigasi langsung ke pesanan.html dengan parameter layanan terpilih
      try {
        sessionStorage.setItem(BersihinConfig.storageKeys.cartService, currentServiceName);
      } catch (e) { }

      window.location.href = 'pesanan.html?service=' + encodeURIComponent(currentServiceName);
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

    let selectedService = 'Cuci + Setrika';
    let selectedPricePerKg = 10000;
    let selectedEst = 'Estimasi 2-3 hari';
    let currentWeightKg = 4; // Default Figma: 4 kg
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
      selectedService = btn.getAttribute('data-service-option') || 'Cuci + Setrika';
      selectedPricePerKg = parseInt(btn.getAttribute('data-price'), 10) || 10000;
      selectedEst = btn.getAttribute('data-est') || 'Estimasi 2-3 hari';

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

    // Submit Buat Pesanan
    createOrderForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const deliveryDateInput = document.getElementById('deliveryDateInput');
      const laundryNotesInput = document.getElementById('laundryNotesInput');

      const dateOptions = { day: 'numeric', month: 'short', year: 'numeric' };
      const now = new Date();
      const deliveryDate = deliveryDateInput && deliveryDateInput.value ? deliveryDateInput.value : now.toLocaleDateString('id-ID', dateOptions);
      const notes = laundryNotesInput ? laundryNotesInput.value.trim() : '';

      const total = (currentWeightKg * selectedPricePerKg) + selectedDeliveryFee;

      // Simpan riwayat pesanan ke localStorage agar tersinkronisasi ke status.html dan riwayat.html
      const y = String(now.getFullYear()).slice(2);
      const m = String(now.getMonth() + 1).padStart(2, '0');
      const d = String(now.getDate()).padStart(2, '0');
      const randomNum = Math.floor(10 + Math.random() * 90);
      const newOrderId = `TRX-${y}${m}${d}-${randomNum}`;

      const estDate = new Date(now);
      estDate.setDate(now.getDate() + 2);
      const estDoneFormatted = estDate.toLocaleDateString('id-ID', dateOptions);

      const newOrder = {
        orderId: newOrderId,
        code: newOrderId,
        created: 'Baru saja dibuat',
        status: 'Menunggu konfirmasi',
        statusCode: 'MENUNGGU',
        step: 1,
        service: selectedService,
        weight: currentWeightKg + ',0 kg',
        weightKg: currentWeightKg,
        deliveryMethod: selectedDeliveryMethod,
        dateIn: deliveryDate,
        dateInTime: `${deliveryDate}, ${String(now.getHours()).padStart(2, '0')}.${String(now.getMinutes()).padStart(2, '0')} WIB`,
        dateOut: estDoneFormatted,
        estDone: estDoneFormatted,
        notes: notes || 'Pakaian reguler',
        calcSub: `${currentWeightKg} kg x ${formatRupiah(selectedPricePerKg)}`,
        total: formatRupiah(total),
        totalFormatted: formatRupiah(total),
        paidDate: 'Belum dibayar'
      };

      try {
        sessionStorage.setItem(BersihinConfig.storageKeys.lastOrder, JSON.stringify(newOrder));
        localStorage.setItem('bersihin_active_order', JSON.stringify(newOrder));

        const existingRaw = localStorage.getItem(BersihinConfig.storageKeys.transactions);
        const trxList = existingRaw ? JSON.parse(existingRaw) : [];
        trxList.unshift(newOrder);
        localStorage.setItem(BersihinConfig.storageKeys.transactions, JSON.stringify(trxList));
      } catch (err) { }
    });

    // Inisialisasi awal kalkulasi
    updateOrderSummary();
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

    let currentFilter = 'all';
    let currentSearch = '';
    let currentSort = 'newest';

    function renderRows() {
      if (!tableBody) return;

      // 1. Filter data
      let filtered = allTrx.filter(trx => {
        let matchFilter = true;
        if (currentFilter === 'Diproses') {
          matchFilter = (trx.status === 'Diproses' || trx.status === 'Menunggu konfirmasi');
        } else if (currentFilter === 'Selesai') {
          matchFilter = (trx.status === 'Selesai' || trx.status === 'Diambil');
        } else if (currentFilter === 'Dibatalkan') {
          matchFilter = (trx.status === 'Dibatalkan');
        }

        const q = currentSearch.toLowerCase();
        const matchSearch = !q ||
          trx.code.toLowerCase().includes(q) ||
          trx.service.toLowerCase().includes(q) ||
          trx.date.toLowerCase().includes(q) ||
          trx.status.toLowerCase().includes(q);

        return matchFilter && matchSearch;
      });

      // 2. Sort data
      filtered.sort((a, b) => {
        const timeA = new Date(a.timestamp).getTime() || 0;
        const timeB = new Date(b.timestamp).getTime() || 0;
        const amtA = a.amount || 0;
        const amtB = b.amount || 0;

        if (currentSort === 'newest') return timeB - timeA;
        if (currentSort === 'oldest') return timeA - timeB;
        if (currentSort === 'highest') return amtB - amtA;
        if (currentSort === 'lowest') return amtA - amtB;
        return 0;
      });

      // 3. Render ke tabel
      if (filtered.length === 0) {
        tableBody.innerHTML = '';
        if (tableBody.parentElement) tableBody.parentElement.classList.add('hidden');
        if (emptySearchState) emptySearchState.classList.remove('hidden');
      } else {
        if (tableBody.parentElement) tableBody.parentElement.classList.remove('hidden');
        if (emptySearchState) emptySearchState.classList.add('hidden');

        tableBody.innerHTML = filtered.map(trx => `
          <tr class="trx-row hover:bg-slate-50/80 transition"
            data-code="${trx.code}"
            data-service="${trx.service}"
            data-status="${trx.status}"
            data-amount="${trx.amount}"
            data-timestamp="${trx.timestamp}">
            <td class="px-4 py-3.5 font-bold text-slate-800">
              <a href="dtltransaksi.html?id=${encodeURIComponent(trx.code)}" class="hover:text-cyan-700 transition">${trx.code}</a>
            </td>
            <td class="px-4 py-3.5 text-slate-600">${trx.date}</td>
            <td class="px-4 py-3.5 text-slate-700 font-medium">${trx.service}</td>
            <td class="px-4 py-3.5 text-slate-600">${trx.weight}</td>
            <td class="px-4 py-3.5 font-bold text-slate-800">${trx.total}</td>
            <td class="px-4 py-3.5">
              ${getStatusBadgeHtml(trx.status)}
            </td>
            <td class="px-4 py-2 text-right">
              <a href="dtltransaksi.html?id=${encodeURIComponent(trx.code)}"
                aria-label="Lihat rincian transaksi ${trx.code}"
                class="min-h-[36px] px-3 py-1.5 rounded-lg bg-blue-50 hover:bg-blue-100 text-cyan-700 text-xs font-semibold inline-flex items-center gap-1 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-700">
                <span>Detail</span>
                <svg class="size-3.5" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                  <path d="M6 4L10 8L6 12" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round" />
                </svg>
              </a>
            </td>
          </tr>
        `).join('');
      }

      // 4. Update Info Text
      if (tableInfoText) {
        tableInfoText.innerHTML = `Menampilkan <span class="font-semibold text-slate-700">1 - ${filtered.length}</span> dari <span class="font-semibold text-slate-700">${allTrx.length}</span> transaksi`;
      }
    }

    renderRows();

    // Event Klik Tab Filter
    filterTabs.forEach(tab => {
      tab.addEventListener('click', () => {
        filterTabs.forEach(t => {
          t.setAttribute('aria-selected', 'false');
          t.classList.remove('bg-white', 'text-slate-800', 'shadow-xs');
          t.classList.add('text-slate-600');
        });

        tab.setAttribute('aria-selected', 'true');
        tab.classList.add('bg-white', 'text-slate-800', 'shadow-xs');
        tab.classList.remove('text-slate-600');

        currentFilter = tab.getAttribute('data-filter') || 'all';
        renderRows();
      });
    });

    // Real-time Search Input
    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        currentSearch = e.target.value.trim().toLowerCase();
        renderRows();
      });
    }

    // Reset Filter Button
    if (resetFilterBtn) {
      resetFilterBtn.addEventListener('click', () => {
        currentFilter = 'all';
        currentSearch = '';
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
        currentSort = e.target.value;
        renderRows();
      });
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
        statusDot.className = 'size-1.5 bg-amber-500 rounded-full animate-pulse';
        statusText.className = 'text-amber-800 text-[11px] font-semibold font-["Poppins"] leading-3';
      } else {
        statusPill.className = 'px-3 py-1.5 bg-orange-100 rounded-[20px] inline-flex items-center gap-1.5 shrink-0';
        statusDot.className = 'size-1.5 bg-yellow-600 rounded-full';
        statusText.className = 'text-yellow-700 text-[11px] font-semibold font-["Poppins"] leading-3';
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

  // ===========================================================================
  // 11. MODUL PROFIL PELANGGAN (PELANGGAN/profil.html)
  // ===========================================================================
  function initProfilPage() {
    const displayFullName = document.getElementById('displayFullName');
    if (!displayFullName) return;

    const profile = getCustomerProfile();

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
  function initEditProfilPage() {
    const editProfileForm = document.getElementById('editProfileForm');
    if (!editProfileForm) return;

    const profile = getCustomerProfile();

    const fullNameInput = document.getElementById('fullNameInput');
    const phoneInput = document.getElementById('phoneInput');
    const emailInput = document.getElementById('emailInput');
    const addressInput = document.getElementById('addressInput');
    const saveProfileBtn = document.getElementById('saveProfileBtn');
    const editProfileAlert = document.getElementById('editProfileAlert');
    const editProfileErrorMessage = document.getElementById('editProfileErrorMessage');

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

    editProfileForm.addEventListener('submit', (e) => {
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

      // Simpan perubahan ke storage
      saveCustomerProfile({
        fullName: fullName,
        phone: phone,
        email: email,
        address: address
      });

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

      showToast('Perubahan profil berhasil disimpan! Mengalihkan ke profil...');

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

    changePasswordForm.addEventListener('submit', (e) => {
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

      showToast('Password berhasil diperbarui! Mengalihkan ke profil...');
      changePasswordForm.reset();

      setTimeout(() => {
        window.location.href = 'profil.html';
      }, 1500);
    });
  }

  // ===========================================================================
  // 14. BOOTSTRAP: JALANKAN INISIALISASI SETELAH DOM SIAP
  // ===========================================================================
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
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', bootstrap);
  } else {
    bootstrap();
  }

})();


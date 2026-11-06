/**
 * BERSIHIN - Staff / Pegawai Portal JavaScript
 * Mengatur interaktivitas, filter, pencarian, modal, sinkronisasi profil,
 * kalkulasi metrik status pesanan, dan manajemen transaksi untuk seluruh modul PEGAWAI.
 * 
 * Vanilla JavaScript (ES6+), modular, terstruktur, tanpa dependensi framework.
 */

(() => {
    'use strict';

    // ==========================================
    // 1. DATA DEFAULT & SINKRONISASI PEGAWAI
    // ==========================================
    const DEFAULT_STAFF_PROFILE = {
        nama: 'Dina Nurhaliza',
        inisial: 'DN',
        idPegawai: 'PGW-0017',
        nomorHp: '0812 9876 5432',
        email: 'dina.nurhaliza@bersihin.id',
        alamat: 'Jl. Dago Asri No. 42, Coblong, Bandung',
        posisi: 'Kasir Utama',
        jadwal: 'Shift Pagi (08.00 - 16.00 WIB)',
        cabang: 'Cabang Dago',
        aktifSejak: '15 Januari 2023',
        notifikasiAktif: true
    };

    const STORAGE_KEY = 'bersihin_pegawai_profile';

    function getStaffProfile() {
        try {
            const raw = localStorage.getItem(STORAGE_KEY);
            if (!raw) {
                localStorage.setItem(STORAGE_KEY, JSON.stringify(DEFAULT_STAFF_PROFILE));
                return { ...DEFAULT_STAFF_PROFILE };
            }
            return { ...DEFAULT_STAFF_PROFILE, ...JSON.parse(raw) };
        } catch (e) {
            return { ...DEFAULT_STAFF_PROFILE };
        }
    }

    function saveStaffProfile(data) {
        try {
            const current = getStaffProfile();
            const updated = { ...current, ...data };
            localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
            applyStaffProfileToDOM(updated);
            return updated;
        } catch (e) {
            return null;
        }
    }

    function applyStaffProfileToDOM(profile = getStaffProfile()) {
        // Update user avatar initials in sidebar and topbar
        document.querySelectorAll('.staff-avatar-initials, aside .w-8.h-8, header .w-9.h-9.bg-sky-100, #profileMenuBtn').forEach(el => {
            if (el && (!el.children.length || el.tagName === 'DIV' || el.tagName === 'A' || el.tagName === 'BUTTON')) {
                if (el.textContent.trim().length <= 3) {
                    el.textContent = profile.inisial || 'DN';
                }
            }
        });

        // Update dropdown profil di topbar
        const dropdownStaffName = document.getElementById('dropdownStaffName');
        const dropdownStaffEmail = document.getElementById('dropdownStaffEmail');
        if (dropdownStaffName) dropdownStaffName.textContent = profile.nama;
        if (dropdownStaffEmail) dropdownStaffEmail.textContent = profile.email;

        // Update user name in sidebar footer
        const sidebarNameEl = document.querySelector('aside .text-slate-800.text-xs.font-bold');
        if (sidebarNameEl) {
            sidebarNameEl.textContent = profile.nama;
        }

        // Update role in sidebar footer
        const sidebarRoleEl = document.querySelector('aside .text-slate-400.text-\\[10px\\].font-normal');
        if (sidebarRoleEl && sidebarRoleEl.textContent.includes('Shift')) {
            sidebarRoleEl.textContent = `${profile.posisi} . Shift Pagi`;
        }

        // Update greeting banner on dashboard
        const greetingHeading = document.querySelector('main h2.text-white');
        if (greetingHeading && greetingHeading.textContent.includes('Dina')) {
            const hour = new Date().getHours();
            let waktu = 'pagi';
            if (hour >= 11 && hour < 15) waktu = 'siang';
            else if (hour >= 15 && hour < 18) waktu = 'sore';
            else if (hour >= 18 || hour < 5) waktu = 'malam';

            const firstName = profile.nama.split(' ')[0] || 'Dina';
            greetingHeading.textContent = `Selamat ${waktu}, ${firstName}!`;
        }
    }

    // ==========================================
    // 2. SISTEM TOAST NOTIFIKASI GLOBAL
    // ==========================================
    let toastTimeout;

    function showToast(message, isError = false) {
        let toast = document.getElementById('toastNotification');
        let toastMsg = document.getElementById('toastMessage');

        if (!toast) {
            toast = document.createElement('div');
            toast.id = 'toastNotification';
            toast.className = 'fixed bottom-6 right-6 z-50 transform translate-y-24 opacity-0 transition-all duration-300 flex items-center gap-3 px-4 py-3 bg-slate-900 text-white rounded-xl shadow-xl text-xs';
            toast.innerHTML = `
                <div class="toast-icon w-6 h-6 rounded-full ${isError ? 'bg-rose-500/20 text-rose-400' : 'bg-emerald-500/20 text-emerald-400'} flex items-center justify-center shrink-0">
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        ${isError 
                            ? '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />'
                            : '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />'}
                    </svg>
                </div>
                <div id="toastMessage" class="font-medium">${message}</div>
            `;
            document.body.appendChild(toast);
            toastMsg = document.getElementById('toastMessage');
        } else {
            if (toastMsg) toastMsg.textContent = message;
            const iconWrap = toast.querySelector('.toast-icon, div:first-child');
            if (iconWrap) {
                if (isError) {
                    iconWrap.className = 'w-6 h-6 rounded-full bg-rose-500/20 text-rose-400 flex items-center justify-center shrink-0';
                    iconWrap.innerHTML = `
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                        </svg>
                    `;
                } else {
                    iconWrap.className = 'w-6 h-6 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0';
                    iconWrap.innerHTML = `
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
                        </svg>
                    `;
                }
            }
        }

        // Tampilkan animasi melayang
        toast.classList.remove('translate-y-24', 'opacity-0');
        toast.classList.add('translate-y-0', 'opacity-100');

        clearTimeout(toastTimeout);
        toastTimeout = setTimeout(() => {
            toast.classList.remove('translate-y-0', 'opacity-100');
            toast.classList.add('translate-y-24', 'opacity-0');
        }, 3200);
    }

    // ==========================================
    // 3. COPY KE CLIPBOARD HELPER
    // ==========================================
    function copyToClipboard(text, fieldName = 'Data') {
        if (!text) return;
        if (navigator.clipboard && window.isSecureContext) {
            navigator.clipboard.writeText(text).then(() => {
                showToast(`${fieldName} berhasil disalin ke clipboard!`);
            }).catch(() => {
                fallbackCopy(text, fieldName);
            });
        } else {
            fallbackCopy(text, fieldName);
        }
    }

    function fallbackCopy(text, fieldName) {
        const temp = document.createElement('textarea');
        temp.value = text;
        temp.style.position = 'fixed';
        temp.style.left = '-9999px';
        document.body.appendChild(temp);
        temp.select();
        try {
            document.execCommand('copy');
            showToast(`${fieldName} berhasil disalin!`);
        } catch (err) {
            showToast(`Gagal menyalin ${fieldName}`, true);
        }
        document.body.removeChild(temp);
    }

    // ==========================================
    // 4. NAVIGASI MOBILE SIDEBAR
    // ==========================================
    function initSidebar() {
        const sidebar = document.getElementById('sidebar');
        const sidebarToggle = document.getElementById('sidebarToggle');
        const sidebarOverlay = document.getElementById('sidebarOverlay');

        if (!sidebar) return;

        function openSidebar() {
            sidebar.classList.remove('-translate-x-full');
            if (sidebarOverlay) sidebarOverlay.classList.remove('hidden');
        }

        function closeSidebar() {
            sidebar.classList.add('-translate-x-full');
            if (sidebarOverlay) sidebarOverlay.classList.add('hidden');
        }

        if (sidebarToggle) {
            sidebarToggle.addEventListener('click', (e) => {
                e.stopPropagation();
                const isOpen = !sidebar.classList.contains('-translate-x-full');
                if (isOpen) closeSidebar();
                else openSidebar();
            });
        }

        if (sidebarOverlay) {
            sidebarOverlay.addEventListener('click', closeSidebar);
        }

        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && !sidebar.classList.contains('-translate-x-full')) {
                closeSidebar();
            }
        });
    }

    // ==========================================
    // 5. DROPDOWN NOTIFIKASI TOPBAR
    // ==========================================
    function initNotificationDropdown() {
        const notifButtons = document.querySelectorAll('button[aria-label="Notifikasi"]');
        if (!notifButtons.length) return;

        notifButtons.forEach(btn => {
            const container = btn.parentElement;
            if (!container) return;

            // Buat menu dropdown notifikasi staff
            const dropdown = document.createElement('div');
            dropdown.className = 'notif-dropdown hidden absolute right-0 top-12 w-80 bg-white rounded-xl shadow-xl border border-slate-200 z-50 overflow-hidden';
            dropdown.innerHTML = `
                <div class="px-4 py-3 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
                    <span class="text-xs font-bold text-slate-800">Notifikasi Staf</span>
                    <span class="text-[10px] bg-red-100 text-red-600 px-2 py-0.5 rounded-full font-semibold">3 Baru</span>
                </div>
                <div class="max-h-64 overflow-y-auto divide-y divide-slate-100 text-xs">
                    <a href="statuspesanan.html" class="p-3 block hover:bg-slate-50 transition">
                        <div class="flex items-start gap-2.5">
                            <span class="w-2 h-2 mt-1.5 rounded-full bg-red-500 shrink-0"></span>
                            <div>
                                <div class="font-semibold text-slate-800">ORD-0524-018 Perlu Konfirmasi</div>
                                <div class="text-[11px] text-slate-500 mt-0.5">Pelanggan baru saja memesan via aplikasi.</div>
                                <div class="text-[10px] text-slate-400 mt-1">10 menit yang lalu</div>
                            </div>
                        </div>
                    </a>
                    <a href="statuspesanan.html" class="p-3 block hover:bg-slate-50 transition">
                        <div class="flex items-start gap-2.5">
                            <span class="w-2 h-2 mt-1.5 rounded-full bg-amber-500 shrink-0"></span>
                            <div>
                                <div class="font-semibold text-slate-800">ORD-0524-015 Siap Disetrika</div>
                                <div class="text-[11px] text-slate-500 mt-0.5">Proses cuci selesai, lanjutkan ke tahap setrika.</div>
                                <div class="text-[10px] text-slate-400 mt-1">35 menit yang lalu</div>
                            </div>
                        </div>
                    </a>
                    <a href="datatransaksi.html" class="p-3 block hover:bg-slate-50 transition">
                        <div class="flex items-start gap-2.5">
                            <span class="w-2 h-2 mt-1.5 rounded-full bg-teal-500 shrink-0"></span>
                            <div>
                                <div class="font-semibold text-slate-800">Pembayaran QRIS Berhasil</div>
                                <div class="text-[11px] text-slate-500 mt-0.5">TRX-0524-001 senilai Rp42.000 telah lunas.</div>
                                <div class="text-[10px] text-slate-400 mt-1">1 jam yang lalu</div>
                            </div>
                        </div>
                    </a>
                </div>
                <div class="p-2.5 text-center bg-slate-50 border-t border-slate-100">
                    <a href="statuspesanan.html" class="text-[11px] font-semibold text-cyan-700 hover:text-cyan-800">
                        Buka Kelola Status Pesanan &rarr;
                    </a>
                </div>
            `;

            container.classList.add('relative');
            container.appendChild(dropdown);

            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                dropdown.classList.toggle('hidden');
            });

            document.addEventListener('click', (e) => {
                if (!container.contains(e.target)) {
                    dropdown.classList.add('hidden');
                }
            });
        });
    }

    // ==========================================
    // 5.2 DROPDOWN PROFIL TOPBAR PEGAWAI
    // ==========================================
    function initProfileDropdown() {
        const profileMenuBtn = document.getElementById('profileMenuBtn');
        const profileDropdown = document.getElementById('profileDropdown');
        if (!profileMenuBtn || !profileDropdown) return;

        if (!profileMenuBtn.dataset.hasProfileListener) {
            profileMenuBtn.dataset.hasProfileListener = 'true';
            profileMenuBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                const willOpen = profileDropdown.classList.contains('hidden');
                profileDropdown.classList.toggle('hidden', !willOpen);
                const notifDropdown = document.querySelector('.notif-dropdown');
                if (notifDropdown) notifDropdown.classList.add('hidden');
                profileMenuBtn.setAttribute('aria-expanded', String(willOpen));
            });
        }

        if (!document.body.dataset.hasGlobalPegawaiDrop) {
            document.body.dataset.hasGlobalPegawaiDrop = 'true';
            document.addEventListener('click', (e) => {
                const curProfBtn = document.getElementById('profileMenuBtn');
                const curProfDrop = document.getElementById('profileDropdown');
                const notifDropdown = document.querySelector('.notif-dropdown');

                if (curProfDrop && !curProfDrop.contains(e.target) && curProfBtn && !curProfBtn.contains(e.target)) {
                    curProfDrop.classList.add('hidden');
                    if (curProfBtn) curProfBtn.setAttribute('aria-expanded', 'false');
                }
            });

            document.addEventListener('keydown', (e) => {
                if (e.key === 'Escape') {
                    const curProfDrop = document.getElementById('profileDropdown');
                    if (curProfDrop) curProfDrop.classList.add('hidden');
                    const notifDropdown = document.querySelector('.notif-dropdown');
                    if (notifDropdown) notifDropdown.classList.add('hidden');
                }
            });
        }
    }

    // ==========================================
    // 6. MODUL: LOGIN PEGAWAI (login.html)
    // ==========================================
    function initLoginPage() {
        const loginForm = document.querySelector('form');
        if (!loginForm) return;

        // Toggle Password Visibility
        const passwordInput = document.getElementById('password');
        const togglePassword = document.getElementById('togglePassword');
        const eyeIcon = document.getElementById('eyeIcon');

        if (togglePassword && passwordInput && !togglePassword.dataset.hasToggleListener) {
            togglePassword.dataset.hasToggleListener = 'true';
            togglePassword.addEventListener('click', (e) => {
                e.preventDefault();
                const isPassword = passwordInput.type === 'password';
                passwordInput.type = isPassword ? 'text' : 'password';

                if (eyeIcon) {
                    if (isPassword) {
                        eyeIcon.innerHTML = `
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.75" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l18 18" />
                        `;
                    } else {
                        eyeIcon.innerHTML = `
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.75" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.75" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        `;
                    }
                }
            });
        }

        loginForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const userInput = document.getElementById('username') || document.getElementById('email') || document.getElementById('identifier') || document.getElementById('idPegawai');
            const passInput = document.getElementById('password');

            const username = userInput ? userInput.value.trim() : '';
            const pass = passInput ? passInput.value.trim() : '';

            if (!username) {
                showToast('Silakan masukkan username atau ID Pegawai', true);
                if (userInput) userInput.focus();
                return;
            }

            if (!pass) {
                showToast('Silakan masukkan password akun Anda', true);
                if (passInput) passInput.focus();
                return;
            }

            if (pass.length < 6) {
                showToast('Password minimal 6 karakter', true);
                if (passInput) passInput.focus();
                return;
            }

            // Simpan sesi autentikasi pegawai
            try {
                localStorage.setItem('bersihin_pegawai_logged_in', 'true');
                localStorage.setItem('bersihin_pegawai_user', username);
            } catch (err) {}

            showToast('Verifikasi staf berhasil! Mengalihkan ke dashboard...');
            setTimeout(() => {
                window.location.href = 'dashboard.html';
            }, 800);
        });
    }

    // ==========================================
    // 7. MODUL: DATA PELANGGAN (datapelanggan.html)
    // ==========================================
    function initDataPelangganPage() {
        const searchInput = document.getElementById('searchInput');
        const rows = document.querySelectorAll('.customer-row');
        const showingInfo = document.getElementById('showingInfo');
        const totalText = document.getElementById('totalPelangganText');
        const btnExport = document.getElementById('btnExport');

        function filterCustomers() {
            const query = searchInput ? searchInput.value.toLowerCase().trim() : '';
            let visibleCount = 0;

            rows.forEach(row => {
                const text = row.innerText.toLowerCase();
                if (text.includes(query)) {
                    row.style.display = '';
                    visibleCount++;
                } else {
                    row.style.display = 'none';
                }
            });

            if (showingInfo) {
                showingInfo.innerText = `Menampilkan ${visibleCount} dari ${rows.length} data`;
            }

            // Pesan kosong jika tidak ada hasil
            const table = document.getElementById('pelangganTable');
            let noDataRow = document.getElementById('noCustomerDataRow');
            if (visibleCount === 0) {
                if (!noDataRow && table) {
                    const tbody = table.querySelector('tbody');
                    if (tbody) {
                        noDataRow = document.createElement('tr');
                        noDataRow.id = 'noCustomerDataRow';
                        noDataRow.innerHTML = `
                            <td colspan="6" class="py-8 text-center text-slate-400">
                                <div class="flex flex-col items-center justify-center gap-2">
                                    <svg class="w-8 h-8 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                                    </svg>
                                    <span class="text-xs">Tidak ditemukan pelanggan dengan kata kunci "${query}"</span>
                                </div>
                            </td>
                        `;
                        tbody.appendChild(noDataRow);
                    }
                } else if (noDataRow) {
                    noDataRow.style.display = '';
                }
            } else if (noDataRow) {
                noDataRow.style.display = 'none';
            }
        }

        if (searchInput) {
            searchInput.addEventListener('input', filterCustomers);
        }

        if (btnExport) {
            btnExport.addEventListener('click', () => {
                const csvRows = [
                    ['ID Pelanggan', 'Nama Pelanggan', 'Nomor HP', 'Alamat', 'Total Pesanan', 'Bergabung'],
                    ['PLG-00124', 'Andi Pratama', '0812 3456 7890', 'Jl. Cempaka Indah No. 12, Bandung', '24 pesanan', '12 Januari 2024'],
                    ['PLG-00123', 'Siti Rahma', '0813 8890 1122', 'Jl. Ir. H. Juanda No. 84, Bandung', '18 pesanan', '20 Januari 2024'],
                    ['PLG-00119', 'Budi Santoso', '0857 2020 3344', 'Jl. Tubagus Ismail No. 7, Bandung', '15 pesanan', '2 Februari 2024'],
                    ['PLG-00112', 'Maya Lestari', '0821 4466 7733', 'Jl. Sekeloa Selatan No. 21, Bandung', '11 pesanan', '14 Februari 2024'],
                    ['PLG-00108', 'Rizky Maulana', '0819 7788 2211', 'Jl. Dipatiukur No. 36, Bandung', '9 pesanan', '1 Maret 2024']
                ];
                const csvContent = 'data:text/csv;charset=utf-8,' + csvRows.map(e => e.map(v => `"${v}"`).join(',')).join('\n');
                const encodedUri = encodeURI(csvContent);
                const link = document.createElement('a');
                link.setAttribute('href', encodedUri);
                link.setAttribute('download', `Data_Pelanggan_Bersihin_${new Date().toISOString().slice(0, 10)}.csv`);
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);

                showToast('Data pelanggan berhasil diekspor ke format CSV');
            });
        }
    }

    // ==========================================
    // 8. MODUL: DETAIL PELANGGAN (detailpelanggan.html)
    // ==========================================
    function initDetailPelangganPage() {
        const CUSTOMERS_DB = {
            'PLG-00124': {
                initials: 'AP',
                name: 'Andi Pratama',
                id: 'PLG-00124',
                phone: '0812 3456 7890',
                email: 'andi.pratama@email.com',
                address: 'Jl. Cempaka Indah No. 12, Bandung',
                orders: '24',
                joined: '12 Januari 2024'
            },
            'PLG-00123': {
                initials: 'SR',
                name: 'Siti Rahma',
                id: 'PLG-00123',
                phone: '0813 8890 1122',
                email: 'siti.rahma@email.com',
                address: 'Jl. Ir. H. Juanda No. 84, Bandung',
                orders: '18',
                joined: '20 Januari 2024'
            },
            'PLG-00119': {
                initials: 'BS',
                name: 'Budi Santoso',
                id: 'PLG-00119',
                phone: '0857 2020 3344',
                email: 'budi.santoso@email.com',
                address: 'Jl. Tubagus Ismail No. 7, Bandung',
                orders: '15',
                joined: '2 Februari 2024'
            },
            'PLG-00112': {
                initials: 'ML',
                name: 'Maya Lestari',
                id: 'PLG-00112',
                phone: '0821 4466 7733',
                email: 'maya.lestari@email.com',
                address: 'Jl. Sekeloa Selatan No. 21, Bandung',
                orders: '11',
                joined: '14 Februari 2024'
            },
            'PLG-00108': {
                initials: 'RM',
                name: 'Rizky Maulana',
                id: 'PLG-00108',
                phone: '0819 7788 2211',
                email: 'rizky.maulana@email.com',
                address: 'Jl. Dipatiukur No. 36, Bandung',
                orders: '9',
                joined: '1 Maret 2024'
            }
        };

        const params = new URLSearchParams(window.location.search);
        const customerId = params.get('id');

        if (customerId && CUSTOMERS_DB[customerId]) {
            const c = CUSTOMERS_DB[customerId];
            const setVal = (id, val) => {
                const el = document.getElementById(id);
                if (el) el.textContent = val;
            };

            setVal('detailInitials', c.initials);
            setVal('detailName', c.name);
            setVal('detailId', c.id);
            setVal('detailPhone', c.phone);
            setVal('detailEmail', c.email);
            setVal('detailAddress', c.address);
            setVal('detailOrders', c.orders);
            setVal('detailJoined', c.joined);
        }

        // Close on backdrop or Escape
        const backdrop = document.getElementById('modalBackdrop');
        if (backdrop) {
            backdrop.addEventListener('click', (e) => {
                if (e.target === backdrop) {
                    window.location.href = 'datapelanggan.html';
                }
            });
        }
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                window.location.href = 'datapelanggan.html';
            }
        });
    }

    // ==========================================
    // 9. MODUL: DATA PESANAN (datapesanan.html)
    // ==========================================
    function initDataPesananPage() {
        const searchInput = document.getElementById('searchInput');
        const statusFilter = document.getElementById('statusFilter');
        const rows = document.querySelectorAll('.order-row');
        const showingInfo = document.getElementById('showingInfo');

        function filterOrders() {
            const query = searchInput ? searchInput.value.toLowerCase().trim() : '';
            const status = statusFilter ? statusFilter.value : '';
            let visibleCount = 0;

            rows.forEach(row => {
                const text = row.innerText.toLowerCase();
                const rowStatus = row.getAttribute('data-status') || '';
                const matchesQuery = text.includes(query);
                const matchesStatus = !status || rowStatus === status;

                if (matchesQuery && matchesStatus) {
                    row.style.display = '';
                    visibleCount++;
                } else {
                    row.style.display = 'none';
                }
            });

            if (showingInfo) {
                showingInfo.innerText = `Menampilkan ${visibleCount} dari ${rows.length} data`;
            }
        }

        if (searchInput) searchInput.addEventListener('input', filterOrders);
        if (statusFilter) statusFilter.addEventListener('change', filterOrders);

        // Simulasi Pagination Button
        const paginationBtns = document.querySelectorAll('main .flex.items-center.gap-1 button');
        paginationBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                const num = btn.textContent.trim();
                if (num === '‹' || num === '›') return;

                paginationBtns.forEach(b => {
                    b.className = 'w-7 h-7 rounded-md border border-slate-200 bg-white hover:bg-slate-50 text-slate-800 text-xs flex items-center justify-center transition';
                });
                btn.className = 'w-7 h-7 rounded-md bg-blue-950 text-white text-xs font-medium flex items-center justify-center';
                showToast(`Menampilkan halaman ${num}`);
            });
        });
    }

    // ==========================================
    // 10. MODUL: DETAIL PESANAN (detailpesanan.html)
    // ==========================================
    function initDetailPesananPage() {
        const ORDERS_DB = {
            'ORD-0524-018': {
                id: 'ORD-0524-018',
                date: 'Dibuat pada 20 Mei 2024, 08.15 WIB',
                status: 'Menunggu konfirmasi',
                badgeClass: 'bg-rose-50 text-red-500',
                dotClass: 'bg-red-500',
                initials: 'AP',
                customer: 'Andi Pratama',
                phone: '0812 3456 7890',
                address: 'Jl. Cempaka Indah No. 12, Bandung',
                service: 'Cuci + Setrika',
                desc: 'Pakaian harian & seragam . Reguler',
                weight: '4.5 kg',
                price: 'Rp45.000',
                note: 'Tolong pisahkan pakaian putih dan berwarna.'
            },
            'ORD-0524-017': {
                id: 'ORD-0524-017',
                date: 'Dibuat pada 20 Mei 2024, 07.45 WIB',
                status: 'Dicuci',
                badgeClass: 'bg-sky-50 text-cyan-600',
                dotClass: 'bg-cyan-600',
                initials: 'SR',
                customer: 'Siti Rahma',
                phone: '0813 8890 1122',
                address: 'Jl. Ir. H. Juanda No. 84, Bandung',
                service: 'Express',
                desc: 'Pakaian campuran . Express 6 Jam',
                weight: '3 kg',
                price: 'Rp54.000',
                note: 'Selesaikan sebelum pukul 15.00 WIB.'
            },
            'ORD-0524-016': {
                id: 'ORD-0524-016',
                date: 'Dibuat pada 19 Mei 2024, 14.20 WIB',
                status: 'Diproses',
                badgeClass: 'bg-yellow-50 text-yellow-600',
                dotClass: 'bg-yellow-600',
                initials: 'BS',
                customer: 'Budi Santoso',
                phone: '0857 2020 3344',
                address: 'Jl. Tubagus Ismail No. 7, Bandung',
                service: 'Cuci Kering',
                desc: 'Pakaian harian . Reguler',
                weight: '6 kg',
                price: 'Rp42.000',
                note: 'Tanpa pewangi tambahan.'
            },
            'ORD-0524-015': {
                id: 'ORD-0524-015',
                date: 'Dibuat pada 19 Mei 2024, 11.10 WIB',
                status: 'Disetrika',
                badgeClass: 'bg-violet-100 text-slate-600',
                dotClass: 'bg-slate-500',
                initials: 'ML',
                customer: 'Maya Lestari',
                phone: '0821 4466 7733',
                address: 'Jl. Sekeloa Selatan No. 21, Bandung',
                service: 'Setrika Saja',
                desc: 'Kemeja & pakaian kerja . Reguler',
                weight: '5 kg',
                price: 'Rp30.000',
                note: 'Kemeja kerja harap dilipat rapi.'
            },
            'ORD-0524-014': {
                id: 'ORD-0524-014',
                date: 'Dibuat pada 18 Mei 2024, 15.05 WIB',
                status: 'Selesai',
                badgeClass: 'bg-emerald-50 text-teal-700',
                dotClass: 'bg-teal-700',
                initials: 'RM',
                customer: 'Rizky Maulana',
                phone: '0819 7788 2211',
                address: 'Jl. Dipatiukur No. 36, Bandung',
                service: 'Cuci + Setrika',
                desc: 'Pakaian campuran . Reguler',
                weight: '3.5 kg',
                price: 'Rp35.000',
                note: 'Tidak ada catatan khusus.'
            },
            'ORD-0524-013': {
                id: 'ORD-0524-013',
                date: 'Dibuat pada 18 Mei 2024, 10.30 WIB',
                status: 'Diambil',
                badgeClass: 'bg-slate-100 text-slate-500',
                dotClass: 'bg-slate-500',
                initials: 'NP',
                customer: 'Nadia Putri',
                phone: '0812 9988 7766',
                address: 'Jl. Cisitu Indah No. 15, Bandung',
                service: 'Cuci Kering',
                desc: 'Pakaian campuran . Reguler',
                weight: '4 kg',
                price: 'Rp28.000',
                note: 'Sudah diambil oleh pelanggan.'
            }
        };

        const params = new URLSearchParams(window.location.search);
        const orderId = params.get('id');

        if (orderId && ORDERS_DB[orderId]) {
            const o = ORDERS_DB[orderId];
            const setVal = (id, val) => {
                const el = document.getElementById(id);
                if (el) el.textContent = val;
            };

            setVal('orderId', o.id);
            setVal('orderDate', o.date);
            setVal('orderStatusText', o.status);

            const badge = document.getElementById('orderStatusBadge');
            if (badge) badge.className = `inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold ${o.badgeClass}`;

            const dot = document.getElementById('orderStatusDot');
            if (dot) dot.className = `w-1.5 h-1.5 rounded-full ${o.dotClass}`;

            setVal('customerInitials', o.initials);
            setVal('customerName', o.customer);
            setVal('customerPhone', o.phone);
            setVal('customerAddress', o.address);
            setVal('serviceName', o.service);
            setVal('serviceDesc', o.desc);
            setVal('serviceWeight', o.weight);
            setVal('servicePrice', o.price);
            setVal('orderNote', o.note);
            setVal('summarySubtotal', o.price);
            setVal('summaryTotal', o.price);
        }
    }

    // ==========================================
    // 11. MODUL: KELOLA STATUS PESANAN (statuspesanan.html)
    // ==========================================
    const STAGE_CONFIG = {
        'Menunggu konfirmasi': {
            step: 1,
            barColor: 'bg-rose-400',
            badgeBg: 'bg-rose-50',
            badgeText: 'text-red-500',
            dotColor: 'bg-red-500',
            labelColor: 'text-rose-500'
        },
        'Diproses': {
            step: 2,
            barColor: 'bg-amber-400',
            badgeBg: 'bg-amber-50',
            badgeText: 'text-amber-700',
            dotColor: 'bg-amber-500',
            labelColor: 'text-amber-600'
        },
        'Dicuci': {
            step: 3,
            barColor: 'bg-sky-400',
            badgeBg: 'bg-sky-50',
            badgeText: 'text-cyan-700',
            dotColor: 'bg-cyan-600',
            labelColor: 'text-cyan-600'
        },
        'Disetrika': {
            step: 4,
            barColor: 'bg-indigo-400',
            badgeBg: 'bg-indigo-50',
            badgeText: 'text-indigo-700',
            dotColor: 'bg-indigo-600',
            labelColor: 'text-indigo-600'
        },
        'Selesai': {
            step: 5,
            barColor: 'bg-emerald-500',
            badgeBg: 'bg-emerald-50',
            badgeText: 'text-emerald-700',
            dotColor: 'bg-emerald-600',
            labelColor: 'text-emerald-600'
        }
    };

    function updateOrderStatus(orderId, newStatus) {
        const card = document.querySelector(`.order-card[data-id="${orderId}"]`);
        if (!card) return;

        const cfg = STAGE_CONFIG[newStatus];
        if (!cfg) return;

        card.dataset.status = newStatus;

        // Progress Segments
        const segments = card.querySelectorAll('.step-seg');
        segments.forEach((seg, index) => {
            seg.className = 'step-seg flex-1 rounded-full';
            if (index < cfg.step) {
                seg.classList.add(cfg.barColor);
            } else {
                seg.classList.add('bg-slate-200');
            }
        });

        // Step Label
        const stepLabel = card.querySelector('.step-label');
        if (stepLabel) {
            stepLabel.textContent = `${cfg.step}/5 - ${newStatus}`;
            stepLabel.className = `step-label font-semibold ${cfg.labelColor}`;
        }

        // Badge
        const badge = card.querySelector('.status-badge');
        const badgeText = card.querySelector('.badge-text');
        const badgeDot = badge ? badge.querySelector('span:first-child') : null;

        if (badge && badgeText && badgeDot) {
            badge.className = `status-badge px-3 py-1 rounded-full text-xs font-semibold flex items-center gap-1.5 ${cfg.badgeBg} ${cfg.badgeText}`;
            badgeDot.className = `w-1.5 h-1.5 rounded-full ${cfg.dotColor}`;
            badgeText.textContent = newStatus;
        }

        recalculateStatusMetrics();
        showToast(`Status ${orderId} berhasil diubah ke "${newStatus}"`);
    }

    function recalculateStatusMetrics() {
        const cards = document.querySelectorAll('.order-card');
        const counts = {
            'Menunggu konfirmasi': 0,
            'Diproses': 0,
            'Dicuci': 0,
            'Disetrika': 0,
            'Selesai': 0
        };

        cards.forEach(card => {
            const s = card.dataset.status;
            if (counts[s] !== undefined) counts[s]++;
        });

        const setCnt = (id, val) => {
            const el = document.getElementById(id);
            if (el) el.textContent = val;
        };

        setCnt('count-menunggu', counts['Menunggu konfirmasi']);
        setCnt('count-diproses', counts['Diproses']);
        setCnt('count-dicuci', counts['Dicuci']);
        setCnt('count-disetrika', counts['Disetrika']);
        setCnt('count-selesai', counts['Selesai']);

        const activeCount = counts['Menunggu konfirmasi'] + counts['Diproses'] + counts['Dicuci'] + counts['Disetrika'];
        const sidebarBadge = document.getElementById('sidebarBadge');
        if (sidebarBadge) {
            sidebarBadge.textContent = activeCount;
        }
    }

    function initStatusPesananPage() {
        const searchInput = document.getElementById('searchInput');
        const stageFilterSelect = document.getElementById('stageFilterSelect');

        function handleFilter() {
            const searchVal = searchInput ? searchInput.value.toLowerCase().trim() : '';
            const stageVal = stageFilterSelect ? stageFilterSelect.value : 'ALL';

            const cards = document.querySelectorAll('.order-card');
            let visibleCount = 0;

            cards.forEach(card => {
                const orderId = (card.dataset.id || '').toLowerCase();
                const name = (card.dataset.name || '').toLowerCase();
                const status = card.dataset.status || '';

                const matchesSearch = !searchVal || orderId.includes(searchVal) || name.includes(searchVal);
                const matchesStage = (stageVal === 'ALL') || (status === stageVal);

                if (matchesSearch && matchesStage) {
                    card.classList.remove('hidden');
                    visibleCount++;
                } else {
                    card.classList.add('hidden');
                }
            });

            const noRes = document.getElementById('noResultsMessage');
            if (noRes) {
                if (visibleCount === 0) noRes.classList.remove('hidden');
                else noRes.classList.add('hidden');
            }

            const footerText = document.getElementById('footerCountText');
            if (footerText) {
                footerText.textContent = `Menampilkan ${visibleCount} dari ${cards.length} antrean pesanan`;
            }
        }

        if (searchInput) searchInput.addEventListener('input', handleFilter);
        if (stageFilterSelect) stageFilterSelect.addEventListener('change', handleFilter);

        // Bind status update selects
        document.querySelectorAll('.order-card select').forEach(sel => {
            sel.addEventListener('change', (e) => {
                const card = sel.closest('.order-card');
                if (card && card.dataset.id) {
                    updateOrderStatus(card.dataset.id, e.target.value);
                }
            });
        });

        recalculateStatusMetrics();
    }

    // ==========================================
    // 12. MODUL: DATA TRANSAKSI (datatransaksi.html)
    // ==========================================
    let currentModalRow = null;

    function filterTransactions() {
        const searchInput = document.getElementById('searchInput');
        const statusFilter = document.getElementById('statusFilter');
        const methodFilter = document.getElementById('methodFilter');

        const searchVal = searchInput ? searchInput.value.toLowerCase().trim() : '';
        const statusVal = statusFilter ? statusFilter.value : 'ALL';
        const methodVal = methodFilter ? methodFilter.value : 'ALL';

        const rows = document.querySelectorAll('.transaction-row');
        let visibleCount = 0;

        rows.forEach(row => {
            const trx = (row.dataset.trx || '').toLowerCase();
            const pelanggan = (row.dataset.pelanggan || '').toLowerCase();
            const status = row.dataset.status || '';
            const metode = row.dataset.metode || '';

            const matchesSearch = !searchVal || trx.includes(searchVal) || pelanggan.includes(searchVal) || metode.toLowerCase().includes(searchVal);
            const matchesStatus = (statusVal === 'ALL') || (status === statusVal);
            const matchesMethod = (methodVal === 'ALL') || (metode === methodVal);

            if (matchesSearch && matchesStatus && matchesMethod) {
                row.classList.remove('hidden');
                visibleCount++;
            } else {
                row.classList.add('hidden');
            }
        });

        const noData = document.getElementById('noDataMessage');
        if (noData) {
            if (visibleCount === 0) noData.classList.remove('hidden');
            else noData.classList.add('hidden');
        }

        const countEl = document.getElementById('countVisible');
        if (countEl) countEl.textContent = visibleCount;
    }

    function openDetailModal(trxId) {
        const row = document.querySelector(`.transaction-row[data-trx="${trxId}"]`);
        if (!row) return;

        currentModalRow = row;

        const setVal = (id, val) => {
            const el = document.getElementById(id);
            if (el) el.textContent = val;
        };

        setVal('modalTrxId', row.dataset.trx);
        setVal('modalPelanggan', row.dataset.pelanggan);
        setVal('modalTanggal', `${row.dataset.tanggal} . ${row.dataset.jam || '09:00 WIB'}`);
        setVal('modalLayanan', row.dataset.layanan);
        setVal('modalMetode', row.dataset.metode);
        setVal('modalSubtotal', row.dataset.total);
        setVal('modalTotal', row.dataset.total);

        const orderLink = document.getElementById('modalOrderLink');
        if (orderLink) {
            orderLink.textContent = row.dataset.order;
            orderLink.href = `detailpesanan.html?id=${row.dataset.order}`;
        }

        updateModalStatusUI(row.dataset.status);

        const modal = document.getElementById('modalDetail');
        if (modal) modal.classList.remove('hidden');
    }

    function updateModalStatusUI(status) {
        const badge = document.getElementById('modalStatusBadge');
        const statusText = document.getElementById('modalStatusText');
        const actionBtn = document.getElementById('modalActionBtn');

        if (!badge || !statusText || !actionBtn) return;

        if (status === 'Lunas') {
            badge.className = 'inline-flex items-center gap-1.5 px-2.5 py-1 bg-emerald-50 text-teal-700 rounded-full text-xs font-semibold border border-emerald-100';
            const dot = badge.querySelector('span:first-child');
            if (dot) dot.className = 'w-1.5 h-1.5 rounded-full bg-teal-600';
            statusText.textContent = 'Lunas';
            actionBtn.textContent = 'Tandai Belum Bayar';
            actionBtn.className = 'px-3.5 py-2 text-xs font-semibold rounded-lg border border-rose-200 text-rose-600 hover:bg-rose-50 transition';
        } else {
            badge.className = 'inline-flex items-center gap-1.5 px-2.5 py-1 bg-rose-50 text-red-500 rounded-full text-xs font-semibold border border-rose-100';
            const dot = badge.querySelector('span:first-child');
            if (dot) dot.className = 'w-1.5 h-1.5 rounded-full bg-red-500';
            statusText.textContent = 'Belum bayar';
            actionBtn.textContent = 'Tandai Lunas';
            actionBtn.className = 'px-3.5 py-2 text-xs font-semibold rounded-lg border border-emerald-300 text-emerald-700 bg-emerald-50 hover:bg-emerald-100 transition';
        }
    }

    function togglePaymentStatus() {
        if (!currentModalRow) return;

        const currentStatus = currentModalRow.dataset.status;
        const newStatus = currentStatus === 'Lunas' ? 'Belum bayar' : 'Lunas';
        currentModalRow.dataset.status = newStatus;

        // Update sel tabel
        const statusCell = currentModalRow.children[5];
        if (statusCell) {
            if (newStatus === 'Lunas') {
                statusCell.innerHTML = `
                    <span class="inline-flex items-center gap-1.5 px-2.5 py-1 bg-emerald-50 text-teal-700 rounded-full text-[11px] font-semibold border border-emerald-100">
                        <span class="w-1.5 h-1.5 rounded-full bg-teal-600"></span>
                        Lunas
                    </span>
                `;
            } else {
                statusCell.innerHTML = `
                    <span class="inline-flex items-center gap-1.5 px-2.5 py-1 bg-rose-50 text-red-500 rounded-full text-[11px] font-semibold border border-rose-100">
                        <span class="w-1.5 h-1.5 rounded-full bg-red-500"></span>
                        Belum bayar
                    </span>
                `;
            }
        }

        updateModalStatusUI(newStatus);
        showToast(`Status transaksi ${currentModalRow.dataset.trx} diubah menjadi "${newStatus}"`);
    }

    function closeDetailModal() {
        const modal = document.getElementById('modalDetail');
        if (modal) modal.classList.add('hidden');
        currentModalRow = null;
    }

    function exportTransactionsCSV() {
        const rows = document.querySelectorAll('.transaction-row');
        let csvContent = 'data:text/csv;charset=utf-8,';
        csvContent += 'No. Transaksi,Pelanggan,Tanggal,Total Pembayaran,Metode,Status\n';

        rows.forEach(row => {
            if (!row.classList.contains('hidden')) {
                const trx = `"${row.dataset.trx || ''}"`;
                const pelanggan = `"${row.dataset.pelanggan || ''}"`;
                const tanggal = `"${row.dataset.tanggal || ''}"`;
                const total = `"${row.dataset.total || ''}"`;
                const metode = `"${row.dataset.metode || ''}"`;
                const status = `"${row.dataset.status || ''}"`;
                csvContent += [trx, pelanggan, tanggal, total, metode, status].join(',') + '\n';
            }
        });

        const encodedUri = encodeURI(csvContent);
        const link = document.createElement('a');
        link.setAttribute('href', encodedUri);
        link.setAttribute('download', `Data_Transaksi_Bersihin_${new Date().toISOString().slice(0, 10)}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        showToast('Laporan transaksi berhasil diunduh (CSV)');
    }

    function initDataTransaksiPage() {
        const modal = document.getElementById('modalDetail');
        if (modal) {
            modal.addEventListener('click', (e) => {
                if (e.target.id === 'modalDetail') closeDetailModal();
            });
        }

        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') closeDetailModal();
        });
    }

    // ==========================================
    // 13. MODUL: PROFIL PEGAWAI (profil.html)
    // ==========================================
    function initProfilPage() {
        const profile = getStaffProfile();

        // Populate field values
        const profileNameEl = document.querySelector('main h2.text-xl');
        if (profileNameEl) profileNameEl.textContent = profile.nama;

        const profileIdEl = document.querySelector('main span.rounded-full.bg-white\\/20');
        if (profileIdEl) profileIdEl.textContent = `ID: ${profile.idPegawai}`;

        // Update full name box
        const nameBox = document.querySelector('main .p-5.md\\:p-6.grid > div:nth-child(1) .px-3\\.5');
        if (nameBox) nameBox.textContent = profile.nama;

        // Update phone box
        const phoneBox = document.querySelector('main .p-5.md\\:p-6.grid > div:nth-child(3) .px-3\\.5 span');
        if (phoneBox) phoneBox.textContent = profile.nomorHp;

        // Update email box
        const emailBox = document.querySelector('main .p-5.md\\:p-6.grid > div:nth-child(4) .px-3\\.5 span');
        if (emailBox) emailBox.textContent = profile.email;

        // Update role & schedule box
        const roleBox = document.querySelector('main .p-5.md\\:p-6.grid > div:nth-child(5) .px-3\\.5');
        if (roleBox) roleBox.textContent = profile.posisi;

        const scheduleBox = document.querySelector('main .p-5.md\\:p-6.grid > div:nth-child(6) .px-3\\.5');
        if (scheduleBox) scheduleBox.textContent = profile.jadwal;
    }

    // ==========================================
    // 14. MODUL: EDIT PROFIL (editprofil.html)
    // ==========================================
    function initEditProfilPage() {
        const profile = getStaffProfile();

        const namaInput = document.getElementById('namaLengkap');
        const idInput = document.getElementById('idPegawai');
        const phoneInput = document.getElementById('nomorHp');
        const emailInput = document.getElementById('email');
        const posisiInput = document.getElementById('posisi');
        const jadwalInput = document.getElementById('jadwal');

        if (namaInput) namaInput.value = profile.nama;
        if (idInput) idInput.value = profile.idPegawai;
        if (phoneInput) phoneInput.value = profile.nomorHp;
        if (emailInput) emailInput.value = profile.email;
        if (posisiInput) posisiInput.value = profile.posisi;
        if (jadwalInput) jadwalInput.value = profile.jadwal;

        const form = document.getElementById('editProfileForm') || document.querySelector('form');
        if (form) {
            form.addEventListener('submit', (e) => {
                e.preventDefault();

                const updatedName = namaInput ? namaInput.value.trim() : profile.nama;
                const updatedPhone = phoneInput ? phoneInput.value.trim() : profile.nomorHp;
                const updatedEmail = emailInput ? emailInput.value.trim() : profile.email;

                if (!updatedName) {
                    showToast('Nama lengkap tidak boleh kosong!', true);
                    return;
                }

                if (!updatedPhone) {
                    showToast('Nomor WhatsApp harus diisi!', true);
                    return;
                }

                if (!updatedEmail || !updatedEmail.includes('@')) {
                    showToast('Format email tidak valid!', true);
                    return;
                }

                // Hitung inisial
                const parts = updatedName.split(' ').filter(Boolean);
                const initials = parts.length > 1
                    ? (parts[0][0] + parts[1][0]).toUpperCase()
                    : (parts[0] ? parts[0].substring(0, 2).toUpperCase() : 'DN');

                saveStaffProfile({
                    nama: updatedName,
                    inisial: initials,
                    nomorHp: updatedPhone,
                    email: updatedEmail
                });

                showToast('Perubahan profil berhasil disimpan!');
                setTimeout(() => {
                    window.location.href = 'profil.html';
                }, 900);
            });
        }
    }

    // ==========================================
    // 15. MODUL: UBAH PASSWORD (password.html)
    // ==========================================
    function togglePasswordVisibility(inputId, iconId) {
        const input = document.getElementById(inputId);
        const icon = document.getElementById(iconId);
        if (!input) return;

        const isPassword = input.type === 'password';
        input.type = isPassword ? 'text' : 'password';

        if (icon) {
            if (isPassword) {
                icon.innerHTML = `
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                        d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l18 18" />
                `;
            } else {
                icon.innerHTML = `
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                        d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                        d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                `;
            }
        }
    }

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
        if (/[A-Z]/.test(password) && /[a-z]/.test(password)) score++;
        if (/[0-9]/.test(password)) score++;
        if (/[^A-Za-z0-9]/.test(password)) score++;

        if (score <= 1) {
            if (s1) {
                s1.classList.remove('bg-slate-200');
                s1.classList.add('bg-rose-500');
            }
            if (sText) {
                sText.textContent = 'Lemah';
                sText.className = 'text-rose-500 font-semibold';
            }
        } else if (score === 2) {
            [s1, s2].filter(Boolean).forEach(b => {
                b.classList.remove('bg-slate-200');
                b.classList.add('bg-amber-400');
            });
            if (sText) {
                sText.textContent = 'Cukup';
                sText.className = 'text-amber-500 font-semibold';
            }
        } else if (score === 3) {
            [s1, s2, s3].filter(Boolean).forEach(b => {
                b.classList.remove('bg-slate-200');
                b.classList.add('bg-sky-400');
            });
            if (sText) {
                sText.textContent = 'Baik';
                sText.className = 'text-sky-500 font-semibold';
            }
        } else {
            bars.forEach(b => {
                b.classList.remove('bg-slate-200');
                b.classList.add('bg-emerald-500');
            });
            if (sText) {
                sText.textContent = 'Sangat Kuat';
                sText.className = 'text-emerald-600 font-semibold';
            }
        }
    }

    function initPasswordPage() {
        const newPassInput = document.getElementById('newPassword');
        if (newPassInput) {
            newPassInput.addEventListener('input', (e) => {
                checkPasswordStrength(e.target.value);
            });
        }

        // Toggle visibility untuk tombol show/hide password
        document.querySelectorAll('.toggle-pass-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const targetId = btn.getAttribute('data-toggle-target');
                const targetInput = document.getElementById(targetId);
                if (!targetInput) return;

                const isPassword = targetInput.type === 'password';
                targetInput.type = isPassword ? 'text' : 'password';

                if (isPassword) {
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

        const form = document.getElementById('passwordForm') || document.querySelector('form');
        if (form) {
            form.addEventListener('submit', (e) => {
                e.preventDefault();
                const curr = document.getElementById('currentPassword') ? document.getElementById('currentPassword').value : '';
                const newPass = document.getElementById('newPassword') ? document.getElementById('newPassword').value : '';
                const conf = document.getElementById('confirmPassword') ? document.getElementById('confirmPassword').value : '';

                if (!curr) {
                    showToast('Silakan masukkan password saat ini!', true);
                    return;
                }

                if (newPass.length < 8) {
                    showToast('Password baru minimal 8 karakter!', true);
                    return;
                }

                if (newPass !== conf) {
                    showToast('Konfirmasi password baru tidak cocok!', true);
                    return;
                }

                showToast('Password akun Anda berhasil diperbarui!');
                setTimeout(() => {
                    window.location.href = 'profil.html';
                }, 1000);
            });
        }
    }

    // ==========================================
    // 16. EXPOSE FUNGSI KE WINDOW (GLOBAL API)
    // ==========================================
    window.showToast = showToast;
    window.copyToClipboard = copyToClipboard;
    window.togglePasswordVisibility = togglePasswordVisibility;
    window.checkPasswordStrength = checkPasswordStrength;
    window.updateStatus = updateOrderStatus;
    window.recalculateMetrics = recalculateStatusMetrics;
    window.filterTransactions = filterTransactions;
    window.openDetailModal = openDetailModal;
    window.closeDetailModal = closeDetailModal;
    window.togglePaymentStatus = togglePaymentStatus;
    window.exportToCSV = exportTransactionsCSV;

    window.filterByStage = function (stageName) {
        const stageFilterSelect = document.getElementById('stageFilterSelect');
        if (stageFilterSelect) {
            if (stageFilterSelect.value === stageName) {
                stageFilterSelect.value = 'ALL';
            } else {
                stageFilterSelect.value = stageName;
            }
            stageFilterSelect.dispatchEvent(new Event('change'));
        }
    };

    window.toggleNotification = function (isEnabled) {
        if (isEnabled) {
            showToast('Notifikasi kerja telah diaktifkan.');
        } else {
            showToast('Notifikasi kerja telah dinonaktifkan.');
        }
    };

    window.handleFormSubmit = function (e) {
        if (e && e.preventDefault) e.preventDefault();
        const namaInput = document.getElementById('namaLengkap');
        if (namaInput) {
            saveStaffProfile({ nama: namaInput.value.trim() });
        }
        showToast('Perubahan data diri berhasil disimpan!');
        setTimeout(() => {
            window.location.href = 'profil.html';
        }, 900);
    };

    window.handlePasswordSubmit = function (e) {
        if (e && e.preventDefault) e.preventDefault();
        const newPass = document.getElementById('newPassword') ? document.getElementById('newPassword').value : '';
        const conf = document.getElementById('confirmPassword') ? document.getElementById('confirmPassword').value : '';

        if (newPass !== conf) {
            showToast('Konfirmasi password baru tidak cocok!', true);
            return;
        }

        if (newPass.length < 8) {
            showToast('Password baru minimal 8 karakter!', true);
            return;
        }

        showToast('Password akun Anda berhasil diperbarui!');
        setTimeout(() => {
            window.location.href = 'profil.html';
        }, 1000);
    };

    // ==========================================
    // 17. BOOTSTRAP INITIALIZATION
    // ==========================================
    document.addEventListener('DOMContentLoaded', () => {
        applyStaffProfileToDOM();
        initSidebar();
        initNotificationDropdown();
        initProfileDropdown();

        const path = window.location.pathname.toLowerCase();

        if (path.includes('login.html')) {
            initLoginPage();
        } else if (path.includes('datapelanggan.html')) {
            initDataPelangganPage();
        } else if (path.includes('detailpelanggan.html')) {
            initDetailPelangganPage();
        } else if (path.includes('datapesanan.html')) {
            initDataPesananPage();
        } else if (path.includes('detailpesanan.html')) {
            initDetailPesananPage();
        } else if (path.includes('statuspesanan.html')) {
            initStatusPesananPage();
        } else if (path.includes('datatransaksi.html')) {
            initDataTransaksiPage();
        } else if (path.includes('editprofil.html')) {
            initEditProfilPage();
        } else if (path.includes('password.html')) {
            initPasswordPage();
        } else if (path.includes('profil.html')) {
            initProfilPage();
        }
    });

})();


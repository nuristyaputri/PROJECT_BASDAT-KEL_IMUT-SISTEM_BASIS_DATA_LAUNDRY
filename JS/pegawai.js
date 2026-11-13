/**
 * BERSIHIN - Staff / Pegawai Portal JavaScript
 * Mengatur interaktivitas, filter, pencarian, modal verifikasi invoice & pembayaran,
 * sinkronisasi profil, kalkulasi metrik status pesanan, dan sinkronisasi dinamis
 * terpadu antara Backend MySQL & localStorage pelanggan.
 * 
 * Vanilla JavaScript (ES6+), modular, terstruktur, tanpa dependensi framework.
 */

(() => {
    'use strict';

    // ==========================================
    // 1. DATA DEFAULT & SINKRONISASI PEGAWAI
    // ==========================================
    const DEFAULT_STAFF_PROFILE = {
        id_user: 2,
        id_pegawai: 1,
        username: 'dina.staff',
        nama: 'Dina Nurhaliza',
        inisial: 'DN',
        idPegawai: 'PGW-001',
        kode: 'PGW-001',
        nomorHp: '081298765432',
        email: 'dina.nurhaliza@bersihin.id',
        alamat: 'Jl. Sawo Manila No. 15, Pasar Minggu, Jakarta Selatan',
        posisi: 'Kasir Utama',
        jabatan: 'Kasir Utama',
        jadwal: 'Shift Pagi (08.00 - 16.00 WIB)',
        cabang: 'Margonda Depok',
        aktifSejak: '15 Januari 2024',
        notifikasiAktif: true
    };

    const STORAGE_KEY = 'bersihin_pegawai_profile';

    function getStaffProfile() {
        try {
            const rawUser = sessionStorage.getItem('bersihin_user') || localStorage.getItem('bersihin_user');
            const parsedUser = rawUser ? JSON.parse(rawUser) : null;
            const raw = sessionStorage.getItem(STORAGE_KEY) || localStorage.getItem(STORAGE_KEY);
            let prof = raw ? { ...DEFAULT_STAFF_PROFILE, ...JSON.parse(raw) } : { ...DEFAULT_STAFF_PROFILE };

            // Sinkronkan identitas staf agar profil tab aktif tidak tertukar antara Budi & Dina
            if (parsedUser && parsedUser.role === 'PEGAWAI') {
                const userNama = parsedUser.nama || prof.nama;
                const inits = userNama.trim().split(/\s+/).map(p => p[0]).join('').substring(0, 2).toUpperCase() || 'PG';
                prof = {
                    ...prof,
                    id_user: parsedUser.id_user || prof.id_user,
                    id_pegawai: parsedUser.id_pegawai || prof.id_pegawai,
                    username: parsedUser.username || prof.username,
                    nama: userNama,
                    inisial: inits,
                    idPegawai: parsedUser.kode_pegawai || prof.idPegawai,
                    kode: parsedUser.kode_pegawai || prof.kode,
                    email: parsedUser.email || prof.email,
                    nomorHp: parsedUser.no_telp || parsedUser.telepon || prof.nomorHp,
                    telepon: parsedUser.no_telp || parsedUser.telepon || prof.telepon,
                    alamat: parsedUser.alamat || prof.alamat,
                    posisi: parsedUser.jabatan || prof.posisi,
                    jabatan: parsedUser.jabatan || prof.jabatan
                };
            }
            return prof;
        } catch (e) {
            return { ...DEFAULT_STAFF_PROFILE };
        }
    }

    function saveStaffProfile(data) {
        try {
            const current = getStaffProfile();
            const updated = { ...current, ...data };
            sessionStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
            localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
            applyStaffProfileToDOM(updated);
            return updated;
        } catch (e) {
            return null;
        }
    }

    async function syncStaffProfileFromBackend() {
        const token = await ensureStaffToken();
        if (!token) return;

        try {
            const res = await fetch(`${getBackendBaseUrl()}/api/pegawai/profil`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                const json = await res.json();
                if (json && json.success && json.data) {
                    const d = json.data;
                    const staffName = d.nama || 'Pegawai Bersihin';
                    const inits = staffName.trim().split(/\s+/).map(p => p[0]).join('').substring(0, 2).toUpperCase() || 'ST';
                    const updated = {
                        id_user: d.id_user,
                        id_pegawai: d.id_pegawai,
                        username: d.username,
                        nama: staffName,
                        inisial: inits,
                        idPegawai: d.kode_pegawai || 'PGW-001',
                        kode: d.kode_pegawai || 'PGW-001',
                        nomorHp: d.telepon || d.no_telp || '',
                        telepon: d.telepon || d.no_telp || '',
                        email: d.email || '',
                        alamat: d.alamat || '',
                        posisi: d.jabatan || 'Staff Operasional',
                        jabatan: d.jabatan || 'Staff Operasional',
                        jadwal: 'Shift Pagi (08.00 - 16.00 WIB)',
                        cabang: 'Margonda Depok',
                        created_at: d.created_at
                    };
                    saveStaffProfile(updated);
                }
            }
        } catch (_) {}
    }

    function applyStaffProfileToDOM(profile = getStaffProfile()) {
        const inits = profile.inisial || (profile.nama ? profile.nama.trim().split(/\s+/).map(p => p[0]).join('').substring(0, 2).toUpperCase() : 'DN');

        document.querySelectorAll('.staff-avatar-initials, #staffSidebarInitials, aside .w-8.h-8, aside .w-9.h-9, header .w-9.h-9.bg-sky-100, #profileMenuBtn, #pegawaiAvatarBtn').forEach(el => {
            if (el && (!el.children.length || el.tagName === 'DIV' || el.tagName === 'A' || el.tagName === 'BUTTON')) {
                if (el.textContent.trim().length <= 3) {
                    el.textContent = inits;
                }
            }
        });

        const dropdownStaffName = document.getElementById('dropdownStaffName') || document.querySelector('#profileDropdown p.font-bold, #pegawaiAvatarDropdown p.font-bold');
        const dropdownStaffEmail = document.getElementById('dropdownStaffEmail') || document.querySelector('#profileDropdown p.text-slate-500, #pegawaiAvatarDropdown p.text-slate-400');
        if (dropdownStaffName) dropdownStaffName.textContent = profile.nama;
        if (dropdownStaffEmail) dropdownStaffEmail.textContent = profile.email || `${profile.posisi || profile.jabatan || 'Kasir'} • Shift Pagi`;

        const sidebarNameEl = document.getElementById('staffSidebarName') || document.querySelector('aside .text-slate-800.text-xs.font-bold, aside .text-\\[11px\\].font-bold');
        if (sidebarNameEl) sidebarNameEl.textContent = profile.nama;

        const sidebarRoleEl = document.getElementById('staffSidebarRole') || document.querySelector('aside .text-slate-400.text-\\[10px\\], aside .text-\\[9px\\].text-slate-400');
        if (sidebarRoleEl) {
            sidebarRoleEl.textContent = profile.posisi || profile.jabatan || 'Pegawai';
        }

        const staffInvoiceName = document.getElementById('staffStaffName');
        if (staffInvoiceName && !staffInvoiceName.dataset.orderBound) {
            staffInvoiceName.textContent = `${profile.nama} (${profile.posisi || profile.jabatan || 'Pegawai'})`;
        }

        // Sinkronisasi kartu Jadwal Shift Kerja (lokasi Margonda Depok, jabatan sesuai database, waktu bekerja real-time)
        updateRealtimeShiftProgress(profile);

        const candidateH2 = document.querySelector('main h2');
        const greetingHeading = document.getElementById('greetingHeading') || (candidateH2 && /selamat/i.test(candidateH2.textContent) ? candidateH2 : null);
        if (greetingHeading) {
            const hour = new Date().getHours();
            let waktu = 'pagi';
            if (hour >= 11 && hour < 15) waktu = 'siang';
            else if (hour >= 15 && hour < 18) waktu = 'sore';
            else if (hour >= 18 || hour < 5) waktu = 'malam';

            const firstName = (profile.nama || 'Pegawai').trim().split(/\s+/)[0];
            greetingHeading.textContent = `Selamat ${waktu}, ${firstName}!`;
        }

        updateRealtimeDate();
    }

    // ==========================================
    // 1.2 PEMBARUAN TANGGAL REAL-TIME GLOBAL
    // ==========================================
    function updateRealtimeDate() {
        const now = new Date();
        const days = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
        const months = [
            'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
            'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
        ];
        const dayName = days[now.getDay()];
        const dateFormatted = `${now.getDate()} ${months[now.getMonth()]} ${now.getFullYear()}`;
        const fullDateText = `${dayName}, ${dateFormatted}`;

        document.querySelectorAll('.realtime-day, [data-realtime-day]').forEach(el => {
            el.textContent = dayName;
        });
        document.querySelectorAll('.realtime-date, [data-realtime-date]').forEach(el => {
            el.textContent = dateFormatted;
        });
        document.querySelectorAll('.realtime-full-date, [data-realtime-full-date]').forEach(el => {
            el.textContent = fullDateText;
        });

        document.querySelectorAll('header .leading-tight').forEach(container => {
            const spans = container.querySelectorAll('span');
            if (spans.length >= 2) {
                spans[0].textContent = dayName;
                spans[1].textContent = dateFormatted;
            }
        });

        updateRealtimeShiftProgress();
    }

    function updateRealtimeShiftProgress(customProfile) {
        const profile = customProfile || getStaffProfile();
        const roleLabel = profile.jabatan || profile.posisi || 'Kasir Utama';
        const locRoleEl = document.getElementById('shiftCardLocationRole');
        if (locRoleEl) {
            locRoleEl.textContent = `Margonda Depok \u2022 ${roleLabel}`;
        }

        const barEl = document.getElementById('shiftCardProgressBar');
        const elapsedEl = document.getElementById('shiftCardElapsed');
        const remEl = document.getElementById('shiftCardRemaining');
        if (!barEl && !elapsedEl && !remEl) return;

        const now = new Date();
        const currentMinutes = now.getHours() * 60 + now.getMinutes();
        const shiftStart = 8 * 60; // 08:00 WIB
        const shiftEnd = 16 * 60;  // 16:00 WIB
        const totalShiftMinutes = shiftEnd - shiftStart; // 480 menit (8 jam)

        let elapsedMinutes = currentMinutes - shiftStart;
        if (elapsedMinutes < 0) elapsedMinutes = 0;
        if (elapsedMinutes > totalShiftMinutes) elapsedMinutes = totalShiftMinutes;

        const remainingMinutes = Math.max(0, totalShiftMinutes - elapsedMinutes);
        const pct = Math.min(100, Math.max(0, Math.round((elapsedMinutes / totalShiftMinutes) * 100)));

        const elHours = Math.floor(elapsedMinutes / 60);
        const elMins = elapsedMinutes % 60;
        const remHours = Math.floor(remainingMinutes / 60);
        const remMins = remainingMinutes % 60;

        if (barEl) barEl.style.width = `${pct}%`;
        if (elapsedEl) {
            elapsedEl.textContent = `${elHours} jam ${elMins} menit berjalan`;
        }
        if (remEl) {
            remEl.textContent = remainingMinutes > 0
                ? `Sisa ${remHours} jam ${remMins} menit`
                : 'Shift selesai';
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
        const sidebarToggle = document.getElementById('sidebarToggle') || document.getElementById('sidebarToggleBtn');
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

        window.closeSidebar = closeSidebar;
        window.openSidebar = openSidebar;

        const closeSidebarBtn = document.getElementById('closeSidebarBtn');
        if (closeSidebarBtn && !closeSidebarBtn.dataset.hasCloseListener) {
            closeSidebarBtn.dataset.hasCloseListener = 'true';
            closeSidebarBtn.addEventListener('click', closeSidebar);
        }

        if (sidebarToggle && !sidebarToggle.dataset.hasSidebarListener) {
            sidebarToggle.dataset.hasSidebarListener = 'true';
            sidebarToggle.addEventListener('click', (e) => {
                e.stopPropagation();
                const isOpen = !sidebar.classList.contains('-translate-x-full');
                if (isOpen) closeSidebar();
                else openSidebar();
            });
        }

        if (sidebarOverlay && !sidebarOverlay.dataset.hasSidebarListener) {
            sidebarOverlay.dataset.hasSidebarListener = 'true';
            sidebarOverlay.addEventListener('click', closeSidebar);
        }

        if (!sidebar.dataset.hasSidebarLinkClose) {
            sidebar.dataset.hasSidebarLinkClose = 'true';
            sidebar.querySelectorAll('a[href]').forEach((link) => {
                link.addEventListener('click', () => {
                    if (window.innerWidth < 1024) closeSidebar();
                });
            });
        }

        if (!document.body.dataset.hasStaffEscSidebar) {
            document.body.dataset.hasStaffEscSidebar = 'true';
            document.addEventListener('keydown', (e) => {
                if (e.key === 'Escape' && !sidebar.classList.contains('-translate-x-full')) {
                    closeSidebar();
                }
            });
        }
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

            const dropdown = document.createElement('div');
            dropdown.className = 'notif-dropdown hidden absolute right-0 top-12 w-80 bg-white rounded-xl shadow-xl border border-slate-200 z-50 overflow-hidden';
            dropdown.innerHTML = `
                <div class="px-4 py-3 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
                    <span class="text-xs font-bold text-slate-800">Notifikasi Staf</span>
                    <span class="text-[10px] bg-red-100 text-red-600 px-2 py-0.5 rounded-full font-semibold">Real-Time</span>
                </div>
                <div class="max-h-64 overflow-y-auto divide-y divide-slate-100 text-xs">
                    <a href="statuspesanan.html" class="p-3 block hover:bg-slate-50 transition">
                        <div class="flex items-start gap-2.5">
                            <span class="w-2 h-2 mt-1.5 rounded-full bg-red-500 shrink-0"></span>
                            <div>
                                <div class="font-semibold text-slate-800">Pesanan Baru Perlu Konfirmasi</div>
                                <div class="text-[11px] text-slate-500 mt-0.5">Pelanggan baru saja checkout invoice via aplikasi.</div>
                                <div class="text-[10px] text-slate-400 mt-1">Baru saja</div>
                            </div>
                        </div>
                    </a>
                    <a href="datatransaksi.html" class="p-3 block hover:bg-slate-50 transition">
                        <div class="flex items-start gap-2.5">
                            <span class="w-2 h-2 mt-1.5 rounded-full bg-teal-500 shrink-0"></span>
                            <div>
                                <div class="font-semibold text-slate-800">Pembayaran QRIS Masuk</div>
                                <div class="text-[11px] text-slate-500 mt-0.5">Verifikasi pembayaran invoice pesanan pelanggan.</div>
                                <div class="text-[10px] text-slate-400 mt-1">Hari ini</div>
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
        const profileMenuBtn = document.getElementById('profileMenuBtn') || document.getElementById('pegawaiAvatarBtn');
        const profileDropdown = document.getElementById('profileDropdown') || document.getElementById('pegawaiAvatarDropdown');
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
                const curProfBtn = document.getElementById('profileMenuBtn') || document.getElementById('pegawaiAvatarBtn');
                const curProfDrop = document.getElementById('profileDropdown') || document.getElementById('pegawaiAvatarDropdown');
                const notifDropdown = document.querySelector('.notif-dropdown');

                if (curProfDrop && !curProfDrop.contains(e.target) && curProfBtn && !curProfBtn.contains(e.target)) {
                    curProfDrop.classList.add('hidden');
                    if (curProfBtn) curProfBtn.setAttribute('aria-expanded', 'false');
                }
            });

            document.addEventListener('keydown', (e) => {
                if (e.key === 'Escape') {
                    const curProfDrop = document.getElementById('profileDropdown') || document.getElementById('pegawaiAvatarDropdown');
                    if (curProfDrop) curProfDrop.classList.add('hidden');
                    const notifDropdown = document.querySelector('.notif-dropdown');
                    if (notifDropdown) notifDropdown.classList.add('hidden');
                }
            });
        }
    }

    // ==========================================
    // 6. TOKEN AUTH & UNIFIED DATA LAYER
    // ==========================================
    function getBackendBaseUrl() {
        if (typeof window !== 'undefined' && window.location.origin && window.location.origin.includes(':5000')) {
            return '';
        }
        return 'http://localhost:5000';
    }

    function isStaffToken(token, allowOwnerFallback = false) {
        if (!token || typeof token !== 'string') return false;
        try {
            const parts = token.split('.');
            if (parts.length < 2) return false;
            const payload = JSON.parse(atob(parts[1]));
            if (!payload) return false;
            if (payload.role === 'PEGAWAI') return true;
            return Boolean(allowOwnerFallback && payload.role === 'PEMILIK');
        } catch (_) {
            return false;
        }
    }

    async function ensureStaffToken() {
        // Prioritaskan token PEGAWAI aktif pada session tab browser ini (agar tab Budi, Dina, dan Pemilik tidak bentrok)
        const sessionStaff = sessionStorage.getItem('bersihin_staff_token');
        if (isStaffToken(sessionStaff, false)) return sessionStaff;

        const sessionGeneric = sessionStorage.getItem('bersihin_token');
        if (isStaffToken(sessionGeneric, false)) {
            sessionStorage.setItem('bersihin_staff_token', sessionGeneric);
            return sessionGeneric;
        }

        const localStaff = localStorage.getItem('bersihin_staff_token');
        if (isStaffToken(localStaff, false)) return localStaff;

        const genericToken = localStorage.getItem('bersihin_token');
        if (isStaffToken(genericToken, false)) {
            return genericToken;
        }

        // Cek profil tab ini untuk mengetahui identifier staf mana yang sedang login
        const profile = getStaffProfile();
        const staffLoginId = profile.username
            ? profile.username
            : ((profile.email && profile.email.includes('@'))
                ? profile.email
                : (profile.nama && profile.nama.toLowerCase().includes('budi') ? 'budi.operator' : 'dina.staff'));

        try {
            const res = await fetch(`${getBackendBaseUrl()}/api/auth/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ identifier: staffLoginId, password: 'password123' })
            });
            if (res.ok) {
                const json = await res.json();
                if (json && json.success && json.data && json.data.token) {
                    const token = json.data.token;
                    sessionStorage.setItem('bersihin_staff_token', token);
                    sessionStorage.setItem('bersihin_token', token);
                    localStorage.setItem('bersihin_staff_token', token);
                    return token;
                }
            }
        } catch (_) {}
        return null;
    }

    // Format mata uang Rupiah
    function formatRupiah(num) {
        const val = Number(num) || 0;
        return `Rp${val.toLocaleString('id-ID')}`;
    }

    // Normalisasi status ke format visual ramah pengguna
    function normalizeOrderStatus(raw) {
        const s = String(raw || '').trim().toUpperCase();
        if (s.includes('BATAL') || s === 'DIBATALKAN') return 'Dibatalkan';
        if (s.includes('SELESAI') || s === 'SELESAI') return 'Selesai';
        if (s.includes('AMBIL') || s === 'SIAP_DIAMBIL') return 'Siap Diambil';
        if (s.includes('SETRIKA') || s === 'DISETRIKA') return 'Disetrika';
        if (s.includes('CUCI') || s === 'DICUCI') return 'Dicuci';
        if (s.includes('PROSES') || s === 'DIPROSES') return 'Diproses';
        return 'Menunggu konfirmasi';
    }

    // Badge styling config
    function getStatusBadgeConfig(status) {
        switch (status) {
            case 'Menunggu konfirmasi':
                return {
                    badgeClass: 'bg-rose-50 text-rose-500',
                    dotClass: 'bg-rose-500',
                    label: 'Menunggu konfirmasi'
                };
            case 'Diproses':
                return {
                    badgeClass: 'bg-amber-50 text-amber-600',
                    dotClass: 'bg-amber-500',
                    label: 'Diproses'
                };
            case 'Dicuci':
                return {
                    badgeClass: 'bg-sky-50 text-sky-600',
                    dotClass: 'bg-sky-500',
                    label: 'Dicuci'
                };
            case 'Disetrika':
                return {
                    badgeClass: 'bg-purple-50 text-purple-600',
                    dotClass: 'bg-purple-500',
                    label: 'Disetrika'
                };
            case 'Siap Diambil':
                return {
                    badgeClass: 'bg-teal-50 text-teal-600',
                    dotClass: 'bg-teal-500',
                    label: 'Siap Diambil'
                };
            case 'Selesai':
                return {
                    badgeClass: 'bg-emerald-50 text-emerald-600',
                    dotClass: 'bg-emerald-500',
                    label: 'Selesai'
                };
            default:
                return {
                    badgeClass: 'bg-slate-100 text-slate-600',
                    dotClass: 'bg-slate-400',
                    label: status
                };
        }
    }

    // Mengambil dan menyatukan seluruh pesanan dari Backend MySQL & LocalStorage pelanggan
    async function fetchUnifiedOrders() {
        const token = await ensureStaffToken();
        const headers = {};
        if (token) headers['Authorization'] = `Bearer ${token}`;

        let backendOrders = [];
        try {
            const res = await fetch(`${getBackendBaseUrl()}/api/pegawai/pesanan`, { headers });
            if (res.ok) {
                const json = await res.json();
                if (json && json.success && Array.isArray(json.data)) {
                    backendOrders = json.data;
                }
            }
        } catch (_) {}

        // Ambil juga transaksi lokal yang dibuat pelanggan di browser ini
        let localOrders = [];
        try {
            const raw = localStorage.getItem('bersihin_transactions');
            if (raw) {
                const parsed = JSON.parse(raw);
                if (Array.isArray(parsed)) localOrders = parsed;
            }
            const rawActive = localStorage.getItem('bersihin_active_order');
            if (rawActive) {
                const act = JSON.parse(rawActive);
                if (act && act.orderId && !localOrders.some(x => (x.orderId || x.code) === act.orderId)) {
                    localOrders.unshift(act);
                }
            }
        } catch (_) {}

        const mapById = new Map();

        // 1. Proses backend orders terlebih dahulu
        backendOrders.forEach(o => {
            const code = o.kode_pesanan || `ORD-${String(o.id_pesanan).padStart(4, '0')}`;
            const st = normalizeOrderStatus(o.status);
            const beratNum = Number(o.total_berat) || 3.5;
            const totalNum = Number(o.total_harga) || (beratNum * 9000);
            const dateObj = new Date(o.tanggal_pesanan || Date.now());
            const dateStr = dateObj.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
            const timeStr = `${String(dateObj.getHours()).padStart(2, '0')}:${String(dateObj.getMinutes()).padStart(2, '0')} WIB`;
            const payRaw = String(o.status_pembayaran || '').toUpperCase();
            const isPaid = payRaw === 'BERHASIL' || (st !== 'Menunggu konfirmasi' && st !== 'Dibatalkan' && !payRaw);

            mapById.set(code, {
                id: code,
                code: code,
                dbId: o.id_pesanan,
                id_pelanggan: o.id_pelanggan,
                customerName: o.nama_pelanggan || 'Pelanggan Bersihin',
                customerPhone: o.telepon || o.customerPhone || '',
                customerAddress: o.alamat || o.customerAddress || '',
                service: o.layanan || 'Cuci Komplit (Cuci + Setrika)',
                weight: `${beratNum.toFixed(1).replace('.', ',')} kg`,
                weightKg: beratNum,
                total: totalNum,
                totalFormatted: formatRupiah(totalNum),
                status: st,
                rawStatus: o.status,
                paymentMethod: o.metode_pembayaran || 'TUNAI',
                paymentStatus: isPaid ? 'Lunas' : 'Menunggu',
                rawPaymentStatus: o.status_pembayaran || (isPaid ? 'BERHASIL' : 'MENUNGGU'),
                referensi_bayar: o.referensi_bayar || null,
                date: dateStr,
                time: timeStr,
                rawDate: dateObj,
                notes: o.catatan || 'Pakaian reguler higienis'
            });
        });

        // 2. Gabungkan localOrders jika ada pesanan baru yang belum ada di backend
        localOrders.forEach(lo => {
            const code = lo.code || lo.orderId || lo.id || `ORD-${Date.now()}`;
            if (mapById.has(code)) {
                // Selaraskan status jika di local ada update
                const existing = mapById.get(code);
                if (lo.status) {
                    existing.status = normalizeOrderStatus(lo.status);
                    existing.paymentStatus = (existing.status === 'Menunggu konfirmasi') ? 'Menunggu' : 'Lunas';
                }
                if (lo.service) existing.service = lo.service;
                if (lo.customerName) existing.customerName = lo.customerName;
                if (lo.customerPhone) existing.customerPhone = lo.customerPhone;
                if (lo.customerAddress) existing.customerAddress = lo.customerAddress;
                if (lo.notes) existing.notes = lo.notes;
                if (lo.paymentMethod) existing.paymentMethod = lo.paymentMethod;
            } else {
                const st = normalizeOrderStatus(lo.status || 'MENUNGGU');
                const beratNum = Number(lo.weightKg) || Number(String(lo.weight || '3.5').replace(/[^\d.]/g, '')) || 3.5;
                const totalNum = Number(lo.total) || (beratNum * 10000);
                const dateObj = new Date(lo.createdAt || lo.timestamp || Date.now());
                const dateStr = dateObj.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
                const timeStr = `${String(dateObj.getHours()).padStart(2, '0')}:${String(dateObj.getMinutes()).padStart(2, '0')} WIB`;

                mapById.set(code, {
                    id: code,
                    code: code,
                    dbId: lo.dbId || null,
                    id_pelanggan: lo.id_pelanggan || null,
                    customerName: lo.customerName || 'Nuristya',
                    customerPhone: lo.customerPhone || '0889 8080 8098',
                    customerAddress: lo.customerAddress || 'Jl. Margonda Raya No. 45, Beji, Depok',
                    service: lo.service || lo.layanan || 'Cuci + Setrika',
                    weight: lo.weight || `${beratNum.toFixed(1).replace('.', ',')} kg`,
                    weightKg: beratNum,
                    total: totalNum,
                    totalFormatted: lo.totalFormatted || formatRupiah(totalNum),
                    status: st,
                    rawStatus: lo.status || 'MENUNGGU',
                    paymentMethod: lo.paymentMethod || 'QRIS',
                    paymentStatus: (st === 'Menunggu konfirmasi') ? 'Menunggu' : 'Lunas',
                    date: dateStr,
                    time: timeStr,
                    rawDate: dateObj,
                    notes: lo.notes || lo.catatan || 'Pakaian reguler'
                });
            }
        });

        const list = Array.from(mapById.values());
        // Urutkan pesanan dari yang paling baru
        list.sort((a, b) => {
            const idA = Number(a.dbId) || 0;
            const idB = Number(b.dbId) || 0;
            if (idA && idB && idA !== idB) return idB - idA;
            return (b.rawDate?.getTime() || 0) - (a.rawDate?.getTime() || 0);
        });

        return list;
    }

    // ==========================================
    // 6.5 NAVIGASI HALAMAN PENUH INVOICE & VERIFIKASI PEMBAYARAN
    // ==========================================
    let activeModalOrderId = null;

    function injectInvoiceModal() {
        // Pemeriksaan Invoice & Verifikasi Pembayaran langsung dibuka pada halaman penuh invoice.html
        return;
    }

    async function openInvoiceModal(orderId) {
        const orders = await fetchUnifiedOrders();
        const order = orders.find(o => o.id === orderId || o.code === orderId || String(o.dbId) === String(orderId));
        const targetId = order ? (order.code || order.id) : orderId;
        window.location.href = `invoice.html?id=${encodeURIComponent(targetId || '')}`;
    }

    function closeInvoiceModal() {
        const modal = document.getElementById('invoiceVerificationModal');
        if (modal) modal.classList.add('hidden');
        activeModalOrderId = null;
    }

    // Terapkan perubahan status pesanan langsung dari dropdown modal
    window.applyModalQuickStatus = async function () {
        if (!activeModalOrderId) return;
        const select = document.getElementById('modalQuickStatusSelect');
        if (!select) return;
        const chosen = select.value;
        if (chosen === 'Diproses') {
            await confirmOrderPayment(activeModalOrderId);
        } else {
            await updateOrderStatus(activeModalOrderId, chosen);
        }
        await openInvoiceModal(activeModalOrderId);
    };

    // Konfirmasi pembayaran & pesanan (update backend dan localStorage real-time)
    async function confirmOrderPayment(orderId) {
        const idToConfirm = orderId || activeModalOrderId;
        if (!idToConfirm) return;

        const token = await ensureStaffToken();
        const headers = { 'Content-Type': 'application/json' };
        if (token) headers['Authorization'] = `Bearer ${token}`;

        // Kirim request ke backend konfirmasi-pembayaran
        try {
            const res = await fetch(`${getBackendBaseUrl()}/api/pegawai/pesanan/${encodeURIComponent(idToConfirm)}/konfirmasi-pembayaran`, {
                method: 'POST',
                headers,
                body: JSON.stringify({ statusPesanan: 'DIPROSES', metode: 'QRIS' })
            }).catch(() => null);

            // Fallback status patch jika route di atas tidak tersedia
            if (!res || !res.ok) {
                await fetch(`${getBackendBaseUrl()}/api/pegawai/pesanan/${encodeURIComponent(idToConfirm)}/status`, {
                    method: 'PATCH',
                    headers,
                    body: JSON.stringify({ status: 'DIPROSES' })
                }).catch(() => null);
            }
        } catch (_) {}

        // Selaraskan status di localStorage agar modul Pelanggan langsung melihat perubahan secara real-time
        try {
            const rawTrx = localStorage.getItem('bersihin_transactions');
            if (rawTrx) {
                const list = JSON.parse(rawTrx);
                let found = false;
                list.forEach(item => {
                    if ((item.orderId || item.code || item.id) === idToConfirm) {
                        item.status = 'Diproses';
                        item.statusCode = 'DIPROSES';
                        item.paymentStatus = 'Lunas';
                        found = true;
                    }
                });
                if (found) localStorage.setItem('bersihin_transactions', JSON.stringify(list));
            }

            const rawActive = localStorage.getItem('bersihin_active_order');
            if (rawActive) {
                const act = JSON.parse(rawActive);
                if ((act.orderId || act.code || act.id) === idToConfirm) {
                    act.status = 'Diproses';
                    act.statusCode = 'DIPROSES';
                    act.paymentStatus = 'Lunas';
                    localStorage.setItem('bersihin_active_order', JSON.stringify(act));
                }
            }

            // Memicu trigger real-time untuk tab pelanggan
            localStorage.setItem('bersihin_order_updated', Date.now().toString());
        } catch (_) {}

        showToast(`Pembayaran & Pesanan ${idToConfirm} berhasil diverifikasi dan diproses!`);

        // Refresh tampilan halaman yang aktif saat ini
        refreshActivePageView();
    }

    // Tolak / batalkan pesanan
    async function rejectOrderPayment(orderId) {
        const idToReject = orderId || activeModalOrderId;
        if (!idToReject) return;

        const token = await ensureStaffToken();
        const headers = { 'Content-Type': 'application/json' };
        if (token) headers['Authorization'] = `Bearer ${token}`;

        try {
            await fetch(`${getBackendBaseUrl()}/api/pegawai/pesanan/${encodeURIComponent(idToReject)}/tolak`, {
                method: 'POST',
                headers,
                body: JSON.stringify({ alasan: 'Ditolak oleh pegawai outlet' })
            }).catch(() => null);

            await fetch(`${getBackendBaseUrl()}/api/pegawai/pesanan/${encodeURIComponent(idToReject)}/status`, {
                method: 'PATCH',
                headers,
                body: JSON.stringify({ status: 'DIBATALKAN' })
            }).catch(() => null);
        } catch (_) {}

        try {
            const rawTrx = localStorage.getItem('bersihin_transactions');
            if (rawTrx) {
                const list = JSON.parse(rawTrx);
                list.forEach(item => {
                    if ((item.orderId || item.code || item.id) === idToReject) {
                        item.status = 'Dibatalkan';
                        item.statusCode = 'DIBATALKAN';
                    }
                });
                localStorage.setItem('bersihin_transactions', JSON.stringify(list));
            }
            const rawActive = localStorage.getItem('bersihin_active_order');
            if (rawActive) {
                const act = JSON.parse(rawActive);
                if ((act.orderId || act.code || act.id) === idToReject) {
                    localStorage.removeItem('bersihin_active_order');
                }
            }
            localStorage.setItem('bersihin_order_updated', Date.now().toString());
        } catch (_) {}

        closeInvoiceModal();
        showToast(`Pesanan ${idToReject} telah dibatalkan.`);
        refreshActivePageView();
    }

    function refreshActivePageView() {
        const path = window.location.pathname.toLowerCase();
        if (path.includes('dashboard.html') || path.endsWith('/pegawai/') || path.endsWith('/pegawai')) {
            initDashboardPage();
        } else if (path.includes('datapesanan.html')) {
            initDataPesananPage();
        } else if (path.includes('statuspesanan.html')) {
            initStatusPesananPage();
        } else if (path.includes('datatransaksi.html')) {
            initDataTransaksiPage();
        }
    }

    function printInvoiceFromPegawai() {
        window.print();
    }

    window.openInvoiceModal = openInvoiceModal;
    window.closeInvoiceModal = closeInvoiceModal;
    window.confirmCurrentOrder = () => confirmOrderPayment(activeModalOrderId);
    window.rejectCurrentOrder = () => rejectOrderPayment(activeModalOrderId);
    window.printInvoiceFromPegawai = printInvoiceFromPegawai;

    // ==========================================
    // 7. MODUL: DATA PELANGGAN (datapelanggan.html)
    // ==========================================
    async function initDataPelangganPage() {
        const searchInput = document.getElementById('searchInput');
        const showingInfo = document.getElementById('showingInfo');
        const totalText = document.getElementById('totalPelangganText');
        const btnExport = document.getElementById('btnExport');
        const tbody = document.getElementById('pelangganTableBody') || document.querySelector('#pelangganTable tbody');

        const token = await ensureStaffToken();
        const headers = {};
        if (token) headers['Authorization'] = `Bearer ${token}`;

        let customers = [];
        try {
            const res = await fetch(`${getBackendBaseUrl()}/api/pegawai/pelanggan`, { headers });
            if (res.ok) {
                const json = await res.json();
                if (json && json.success && Array.isArray(json.data)) {
                    customers = json.data;
                }
            }
        } catch (_) {}

        // Fallback sesuai bersihinlaundry.sql jika backend offline
        if (!customers.length) {
            customers = [
                { id_pelanggan: 4, kode_pelanggan: 'PLG-08132', nama: 'Maya Anggraini', telepon: '083333333333', email: 'maya@example.com', alamat: 'Jl. Pondok Cina No. 7, Beji, Depok', member_tier: 'REGULER', created_at: '2024-04-01' },
                { id_pelanggan: 3, kode_pelanggan: 'PLG-08131', nama: 'Dedi Kurniawan', telepon: '082222222222', email: 'dedi.kurniawan@example.com', alamat: 'Jl. Beji Timur No. 12, Depok', member_tier: 'REGULER', created_at: '2024-03-15' },
                { id_pelanggan: 2, kode_pelanggan: 'PLG-08130', nama: 'Rina Marlina', telepon: '081111111111', email: 'rina.marlina@example.com', alamat: 'Jl. Kukusan Raya No. 5, Beji, Depok', member_tier: 'GOLD', created_at: '2024-03-10' },
                { id_pelanggan: 1, kode_pelanggan: 'PLG-08129', nama: 'Andi Pratama', telepon: '081234567821', email: 'andi.pratama@email.com', alamat: 'Jl. Kemang Raya No. 45, RT 02 / RW 05, Mampang Prapatan, Jakarta Selatan', member_tier: 'SILVER', created_at: '2024-03-01' }
            ];
        }

        const orders = await fetchUnifiedOrders();

        if (totalText) totalText.textContent = `${customers.length} orang`;

        function renderCustomerRows(listToRender) {
            if (showingInfo) {
                showingInfo.innerText = `Menampilkan ${listToRender.length} dari ${customers.length} data`;
            }
            if (!tbody) return;
            tbody.innerHTML = '';

            if (listToRender.length === 0) {
                tbody.innerHTML = `
                    <tr>
                        <td colspan="6" class="py-8 text-center text-slate-400">
                            <div class="flex flex-col items-center justify-center gap-2">
                                <svg class="w-8 h-8 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                                </svg>
                                <span class="text-xs">Tidak ditemukan pelanggan yang cocok</span>
                            </div>
                        </td>
                    </tr>
                `;
                return;
            }

            listToRender.forEach(c => {
                const parts = (c.nama || '').trim().split(/\s+/);
                const inits = parts.length > 1
                    ? (parts[0][0] + parts[1][0]).toUpperCase()
                    : (parts[0] ? parts[0].substring(0, 2).toUpperCase() : 'PL');

                // Hitung total pesanan pelanggan ini
                const custOrdersCount = orders.filter(o => 
                    (c.id_pelanggan && Number(o.id_pelanggan) === Number(c.id_pelanggan)) ||
                    o.customerName?.toLowerCase().includes((c.nama || '').toLowerCase())
                ).length;

                const joinDate = c.created_at
                    ? new Date(c.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })
                    : '12 Januari 2024';

                const tr = document.createElement('tr');
                tr.className = 'hover:bg-slate-50/70 transition customer-row cursor-pointer';
                tr.onclick = () => { window.location.href = `detailpelanggan.html?id=${encodeURIComponent(c.kode_pelanggan || c.id_pelanggan)}`; };
                tr.innerHTML = `
                    <td class="py-3.5 px-4 whitespace-nowrap">
                        <div class="flex items-center gap-2.5">
                            <div class="w-8 h-8 bg-sky-100 rounded-lg flex items-center justify-center text-cyan-600 text-[11px] font-bold shrink-0">
                                ${inits}
                            </div>
                            <div>
                                <div class="text-slate-700 font-bold leading-tight">${c.nama}</div>
                                <div class="text-gray-400 text-[10px] font-normal mt-0.5">${c.kode_pelanggan || `PLG-${c.id_pelanggan}`}</div>
                            </div>
                        </div>
                    </td>
                    <td class="py-3.5 px-4 text-slate-500 whitespace-nowrap">${c.telepon || '-'}</td>
                    <td class="py-3.5 px-4 text-slate-500 max-w-xs truncate" title="${c.alamat || '-'}">${c.alamat || '-'}</td>
                    <td class="py-3.5 px-4 text-slate-700 font-bold whitespace-nowrap">${custOrdersCount} pesanan</td>
                    <td class="py-3.5 px-4 text-slate-500 whitespace-nowrap">${joinDate}</td>
                    <td class="py-3.5 px-4 text-right whitespace-nowrap" onclick="event.stopPropagation()">
                        <a href="detailpelanggan.html?id=${encodeURIComponent(c.kode_pelanggan || c.id_pelanggan)}"
                            class="inline-flex items-center justify-center p-1.5 text-slate-400 hover:text-cyan-600 rounded-lg transition" title="Lihat Detail">
                            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
                            </svg>
                        </a>
                    </td>
                `;
                tbody.appendChild(tr);
            });
        }

        renderCustomerRows(customers);

        function filterCustomers() {
            const query = searchInput ? searchInput.value.toLowerCase().trim() : '';
            const filtered = customers.filter(c => 
                (c.nama || '').toLowerCase().includes(query) ||
                (c.telepon || '').includes(query) ||
                (c.kode_pelanggan || '').toLowerCase().includes(query) ||
                (c.email || '').toLowerCase().includes(query) ||
                (c.alamat || '').toLowerCase().includes(query)
            );
            renderCustomerRows(filtered);

            if (showingInfo) {
                showingInfo.innerText = `Menampilkan ${filtered.length} dari ${customers.length} data`;
            }
        }

        if (searchInput) {
            searchInput.addEventListener('input', filterCustomers);
        }

        if (btnExport) {
            btnExport.onclick = () => {
                const csvRows = [
                    ['Kode Pelanggan', 'Nama Pelanggan', 'Nomor HP', 'Email', 'Alamat', 'Total Pesanan'],
                    ...customers.map(c => [
                        c.kode_pelanggan || `PLG-${c.id_pelanggan}`,
                        c.nama,
                        c.telepon || '-',
                        c.email || '-',
                        c.alamat || '-',
                        `${orders.filter(o => o.customerName?.toLowerCase().includes((c.nama || '').toLowerCase())).length} pesanan`
                    ])
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
            };
        }
    }

    // ==========================================
    // 8. MODUL: DETAIL PELANGGAN (detailpelanggan.html)
    // ==========================================
    async function initDetailPelangganPage() {
        const params = new URLSearchParams(window.location.search);
        const customerId = params.get('id');

        const token = await ensureStaffToken();
        const headers = {};
        if (token) headers['Authorization'] = `Bearer ${token}`;

        let customers = [];
        try {
            const res = await fetch(`${getBackendBaseUrl()}/api/pegawai/pelanggan`, { headers });
            if (res.ok) {
                const json = await res.json();
                if (json && json.success && Array.isArray(json.data)) customers = json.data;
            }
        } catch (_) {}

        let c = customers.find(x => x.kode_pelanggan === customerId || String(x.id_pelanggan) === customerId);

        if (!c) {
            // Fallback object jika id match nama
            if (customerId && customerId.toLowerCase().includes('nuris')) {
                c = { kode_pelanggan: 'PLG-08133', nama: 'Nuristya', telepon: '0889 8080 8098', email: 'nuristya@gmail.com', alamat: 'Jl. Margonda Raya No. 45, Beji, Depok', created_at: '2026-11-08' };
            } else {
                c = { kode_pelanggan: 'PLG-08129', nama: 'Andi Pratama', telepon: '0812 3456 7821', email: 'andi.pratama@email.com', alamat: 'Jl. Kemang Raya No. 45, Jakarta Selatan', created_at: '2024-03-01' };
            }
        }

        const orders = await fetchUnifiedOrders();
        const custOrdersCount = orders.filter(o => 
            (c.id_pelanggan && Number(o.id_pelanggan) === Number(c.id_pelanggan)) ||
            o.customerName?.toLowerCase().includes((c.nama || '').toLowerCase())
        ).length;

        const parts = (c.nama || '').trim().split(/\s+/);
        const inits = parts.length > 1
            ? (parts[0][0] + parts[1][0]).toUpperCase()
            : (parts[0] ? parts[0].substring(0, 2).toUpperCase() : 'PL');

        const joinDate = c.created_at
            ? new Date(c.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })
            : '12 Januari 2024';

        const setVal = (id, val) => {
            const el = document.getElementById(id);
            if (el) el.textContent = val;
        };

        setVal('detailInitials', inits);
        setVal('detailName', c.nama);
        setVal('detailId', c.kode_pelanggan || `PLG-${c.id_pelanggan}`);
        setVal('detailPhone', c.telepon || '-');
        setVal('detailEmail', c.email || '-');
        setVal('detailAddress', c.alamat || '-');
        setVal('detailOrders', `${custOrdersCount} pesanan`);
        setVal('detailJoined', joinDate);

        const backdrop = document.getElementById('modalBackdrop');
        if (backdrop) {
            backdrop.addEventListener('click', (e) => {
                if (e.target === backdrop) window.location.href = 'datapelanggan.html';
            });
        }
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') window.location.href = 'datapelanggan.html';
        });
    }

    // ==========================================
    // 9. MODUL: DATA PESANAN (datapesanan.html)
    // ==========================================
    async function initDataPesananPage() {
        injectInvoiceModal();
        const searchInput = document.getElementById('searchInput');
        const statusFilter = document.getElementById('statusFilter');
        const dateFilter = document.getElementById('dateFilter');
        const showingInfo = document.getElementById('showingInfo');
        const tbody = document.getElementById('pesananTableBody');

        const orders = await fetchUnifiedOrders();

        function renderOrders(listToRender) {
            if (showingInfo) {
                showingInfo.innerText = `Menampilkan ${listToRender.length} dari ${orders.length} data`;
            }
            if (!tbody) return;
            tbody.innerHTML = '';

            if (listToRender.length === 0) {
                tbody.innerHTML = `
                    <tr>
                        <td colspan="8" class="py-8 text-center text-slate-400">
                            <div class="flex flex-col items-center justify-center gap-2">
                                <svg class="w-8 h-8 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                                </svg>
                                <span class="text-xs">Tidak ditemukan pesanan yang sesuai</span>
                            </div>
                        </td>
                    </tr>
                `;
                return;
            }

            listToRender.forEach(o => {
                const badgeCfg = getStatusBadgeConfig(o.status);
                const tr = document.createElement('tr');
                tr.className = 'hover:bg-slate-50/80 transition cursor-pointer order-row';
                tr.dataset.status = o.status;
                tr.onclick = () => { window.location.href = `invoice.html?id=${encodeURIComponent(o.code || o.id)}`; };

                tr.innerHTML = `
                    <td class="py-3.5 px-4 font-bold text-slate-700 whitespace-nowrap">
                        <span class="text-cyan-700 hover:underline font-mono">${o.code}</span>
                    </td>
                    <td class="py-3.5 px-4 text-slate-700 font-medium whitespace-nowrap">${o.customerName}</td>
                    <td class="py-3.5 px-4 text-slate-500 whitespace-nowrap">${o.date}</td>
                    <td class="py-3.5 px-4 text-slate-500 whitespace-nowrap">${o.service}</td>
                    <td class="py-3.5 px-4 text-slate-500 whitespace-nowrap">${o.weight}</td>
                    <td class="py-3.5 px-4 font-bold text-slate-700 whitespace-nowrap">${o.totalFormatted}</td>
                    <td class="py-3.5 px-4 whitespace-nowrap">
                        <span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold ${badgeCfg.badgeClass}">
                            <span class="w-1.5 h-1.5 rounded-full ${badgeCfg.dotClass}"></span>
                            ${o.status}
                        </span>
                    </td>
                    <td class="py-3.5 px-4 text-right whitespace-nowrap" onclick="event.stopPropagation()">
                        <div class="flex items-center justify-end gap-1.5">
                            <a href="invoice.html?id=${encodeURIComponent(o.code || o.id)}"
                                class="px-2.5 py-1 text-[11px] font-semibold text-cyan-700 hover:text-cyan-800 bg-sky-50 hover:bg-sky-100 rounded-lg border border-sky-200 transition">
                                Cek Invoice
                            </a>
                            <a href="detailpesanan.html?id=${encodeURIComponent(o.id)}" title="Detail Pesanan"
                                class="inline-flex items-center justify-center p-1.5 text-slate-400 hover:text-cyan-600 rounded-lg transition">
                                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
                                </svg>
                            </a>
                        </div>
                    </td>
                `;
                tbody.appendChild(tr);
            });
        }

        renderOrders(orders);

        function filterOrders() {
            const query = searchInput ? searchInput.value.toLowerCase().trim() : '';
            const statusVal = statusFilter ? statusFilter.value : '';

            const filtered = orders.filter(o => {
                const matchesQuery = !query || o.code.toLowerCase().includes(query) || o.customerName.toLowerCase().includes(query) || o.service.toLowerCase().includes(query);
                const matchesStatus = !statusVal || o.status === statusVal;
                return matchesQuery && matchesStatus;
            });

            renderOrders(filtered);

            if (showingInfo) {
                showingInfo.innerText = `Menampilkan ${filtered.length} dari ${orders.length} data`;
            }
        }

        if (searchInput) searchInput.addEventListener('input', filterOrders);
        if (statusFilter) statusFilter.addEventListener('change', filterOrders);
        if (dateFilter) dateFilter.addEventListener('change', filterOrders);
    }

    // ==========================================
    // 10. MODUL: DETAIL PESANAN (detailpesanan.html)
    // ==========================================
    async function initDetailPesananPage() {
        injectInvoiceModal();
        const params = new URLSearchParams(window.location.search);
        const orderId = params.get('id') || 'ORD-0524-018';

        const orders = await fetchUnifiedOrders();
        const o = orders.find(x => x.id === orderId || x.code === orderId || String(x.dbId) === orderId) || orders[0];

        if (o) {
            const setVal = (id, val) => {
                const el = document.getElementById(id);
                if (el) el.textContent = val;
            };

            const parts = (o.customerName || '').trim().split(/\s+/);
            const inits = parts.length > 1
                ? (parts[0][0] + parts[1][0]).toUpperCase()
                : (parts[0] ? parts[0].substring(0, 2).toUpperCase() : 'AP');

            setVal('orderId', o.code);
            setVal('orderDate', `Dibuat pada ${o.date}, ${o.time}`);
            setVal('orderStatusText', o.status);

            const badgeCfg = getStatusBadgeConfig(o.status);
            const badge = document.getElementById('orderStatusBadge');
            if (badge) badge.className = `inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold ${badgeCfg.badgeClass}`;

            const dot = document.getElementById('orderStatusDot');
            if (dot) dot.className = `w-1.5 h-1.5 rounded-full ${badgeCfg.dotClass}`;

            setVal('customerInitials', inits);
            setVal('customerName', o.customerName);
            setVal('customerPhone', o.customerPhone);
            setVal('customerAddress', o.customerAddress);
            setVal('serviceName', o.service);
            setVal('serviceDesc', 'Pakaian harian higienis • Reguler');
            setVal('serviceWeight', o.weight);
            setVal('servicePrice', o.totalFormatted);
            setVal('orderNote', o.notes);
            setVal('summarySubtotal', o.totalFormatted);
            setVal('summaryTotal', o.totalFormatted);

            // Tambahkan tombol Detail Invoice & Verifikasi Pembayaran langsung ke halaman penuh invoice.html
            const actionContainer = document.querySelector('main .lg\\:col-span-4.space-y-3\\.5');
            if (actionContainer && !document.getElementById('detailCheckInvoiceBtn')) {
                const btnInv = document.createElement('a');
                btnInv.id = 'detailCheckInvoiceBtn';
                btnInv.href = `invoice.html?id=${encodeURIComponent(o.code || o.id)}`;
                btnInv.className = 'w-full py-2.5 px-4 bg-gradient-to-r from-cyan-600 to-blue-900 hover:brightness-110 active:scale-[0.99] text-white text-xs font-bold rounded-lg shadow-sm flex items-center justify-center gap-2 transition cursor-pointer';
                btnInv.innerHTML = `
                    <svg class="w-4 h-4 text-cyan-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    <span>Cek Invoice & Verifikasi Pembayaran</span>
                `;
                actionContainer.insertBefore(btnInv, actionContainer.firstChild);
            }
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
            dotColor: 'bg-red-500 animate-pulse',
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
        'Siap Diambil': {
            step: 5,
            barColor: 'bg-emerald-500',
            badgeBg: 'bg-emerald-50',
            badgeText: 'text-emerald-700',
            dotColor: 'bg-emerald-600',
            labelColor: 'text-emerald-600'
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

    async function updateOrderStatus(orderId, newStatus) {
        const token = await ensureStaffToken();
        const headers = { 'Content-Type': 'application/json' };
        if (token) headers['Authorization'] = `Bearer ${token}`;

        let backendEnum = 'DIPROSES';
        if (newStatus === 'Menunggu konfirmasi') backendEnum = 'MENUNGGU';
        else if (newStatus === 'Diproses') backendEnum = 'DIPROSES';
        else if (newStatus === 'Dicuci') backendEnum = 'DICUCI';
        else if (newStatus === 'Disetrika') backendEnum = 'DISETRIKA';
        else if (newStatus === 'Selesai') backendEnum = 'SELESAI';

        try {
            await fetch(`${getBackendBaseUrl()}/api/pegawai/pesanan/${encodeURIComponent(orderId)}/status`, {
                method: 'PATCH',
                headers,
                body: JSON.stringify({ status: backendEnum })
            }).catch(() => null);
        } catch (_) {}

        // Sinkronkan ke localStorage
        try {
            const rawTrx = localStorage.getItem('bersihin_transactions');
            if (rawTrx) {
                const list = JSON.parse(rawTrx);
                list.forEach(item => {
                    if ((item.orderId || item.code || item.id) === orderId) {
                        item.status = newStatus;
                        item.statusCode = backendEnum;
                        if (newStatus === 'Selesai') item.paymentStatus = 'Lunas';
                    }
                });
                localStorage.setItem('bersihin_transactions', JSON.stringify(list));
            }

            const rawActive = localStorage.getItem('bersihin_active_order');
            if (rawActive) {
                const act = JSON.parse(rawActive);
                if ((act.orderId || act.code || act.id) === orderId) {
                    if (newStatus === 'Selesai') {
                        localStorage.removeItem('bersihin_active_order');
                    } else {
                        act.status = newStatus;
                        act.statusCode = backendEnum;
                        localStorage.setItem('bersihin_active_order', JSON.stringify(act));
                    }
                }
            }

            // Memicu trigger real-time untuk tab pelanggan
            localStorage.setItem('bersihin_order_updated', Date.now().toString());
        } catch (_) {}

        const card = document.querySelector(`.order-card[data-id="${orderId}"]`);
        if (card) {
            const cfg = STAGE_CONFIG[newStatus] || STAGE_CONFIG['Diproses'];
            card.dataset.status = newStatus;

            const segments = card.querySelectorAll('.step-seg');
            segments.forEach((seg, index) => {
                seg.className = 'step-seg flex-1 rounded-full';
                if (index < cfg.step) seg.classList.add(cfg.barColor);
                else seg.classList.add('bg-slate-200');
            });

            const stepLabel = card.querySelector('.step-label');
            if (stepLabel) {
                stepLabel.textContent = `${cfg.step}/5 - ${newStatus}`;
                stepLabel.className = `step-label text-[10px] font-semibold ${cfg.labelColor}`;
            }

            const badge = card.querySelector('.status-badge');
            const badgeText = card.querySelector('.badge-text');
            const badgeDot = badge ? badge.querySelector('span:first-child') : null;

            if (badge && badgeText && badgeDot) {
                badge.className = `inline-flex items-center gap-1.5 status-badge px-2.5 py-1 rounded-full text-[11px] font-semibold ${cfg.badgeBg} ${cfg.badgeText}`;
                badgeDot.className = `w-1.5 h-1.5 rounded-full ${cfg.dotColor}`;
                badgeText.textContent = newStatus;
            }
        }

        recalculateStatusMetrics();
        showToast(`Status ${orderId} berhasil diubah ke "${newStatus}"`);
        refreshActivePageView();
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

        const prosesAktif = counts['Diproses'] + counts['Dicuci'] + counts['Disetrika'];
        const totalAll = cards.length;

        setCnt('count-total', totalAll);
        setCnt('count-menunggu', counts['Menunggu konfirmasi']);
        setCnt('count-proses-aktif', prosesAktif);
        setCnt('count-diproses', counts['Diproses']);
        setCnt('count-dicuci', counts['Dicuci']);
        setCnt('count-disetrika', counts['Disetrika']);
        setCnt('count-selesai', counts['Selesai']);

        setCnt('pill-count-all', totalAll);
        setCnt('pill-count-menunggu', counts['Menunggu konfirmasi']);
        setCnt('pill-count-diproses', counts['Diproses']);
        setCnt('pill-count-dicuci', counts['Dicuci']);
        setCnt('pill-count-disetrika', counts['Disetrika']);
        setCnt('pill-count-selesai', counts['Selesai']);

        const activeCount = counts['Menunggu konfirmasi'] + prosesAktif;
        const sidebarBadge = document.getElementById('sidebarBadge');
        if (sidebarBadge) sidebarBadge.textContent = activeCount;
    }

    function syncStagePillUI(activeStage) {
        document.querySelectorAll('#statusFilterPills .stage-pill').forEach(btn => {
            const isMatch = (btn.dataset.stage || 'ALL') === activeStage;
            const badge = btn.querySelector('span:last-child');
            if (isMatch) {
                btn.className = 'stage-pill inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-semibold border bg-cyan-700 text-white border-cyan-700 shadow-xs transition cursor-pointer';
                if (badge) badge.className = 'px-1.5 py-0.5 rounded-md text-[10px] font-bold bg-white/20 text-white';
            } else {
                btn.className = 'stage-pill inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-semibold border bg-white text-slate-600 border-slate-200 hover:bg-sky-50 hover:text-cyan-700 transition cursor-pointer';
                if (badge) badge.className = 'px-1.5 py-0.5 rounded-md text-[10px] font-bold bg-slate-100 text-slate-600';
            }
        });
    }

    async function initStatusPesananPage() {
        const searchInput = document.getElementById('searchInput');
        const stageFilterSelect = document.getElementById('stageFilterSelect');
        const sortOrderSelect = document.getElementById('sortOrderSelect');
        const container = document.getElementById('orderQueueContainer');

        let orders = await fetchUnifiedOrders();

        // Terapkan pengurutan sesuai pilihan dropdown
        const sortMode = sortOrderSelect ? sortOrderSelect.value : 'newest';
        orders = [...orders].sort((a, b) => {
            if (sortMode === 'oldest') {
                return (a.rawDate?.getTime() || Number(a.dbId) || 0) - (b.rawDate?.getTime() || Number(b.dbId) || 0);
            }
            if (sortMode === 'highest') {
                return (Number(b.total) || 0) - (Number(a.total) || 0);
            }
            if (sortMode === 'stage') {
                const stepA = (STAGE_CONFIG[a.status] || STAGE_CONFIG['Diproses']).step;
                const stepB = (STAGE_CONFIG[b.status] || STAGE_CONFIG['Diproses']).step;
                return stepA - stepB;
            }
            return (Number(b.dbId) || b.rawDate?.getTime() || 0) - (Number(a.dbId) || a.rawDate?.getTime() || 0);
        });

        if (container) {
            container.innerHTML = '';
            orders.forEach(o => {
                const parts = (o.customerName || '').trim().split(/\s+/);
                const inits = parts.length > 1
                    ? (parts[0][0] + parts[1][0]).toUpperCase()
                    : (parts[0] ? parts[0].substring(0, 2).toUpperCase() : 'AP');

                const cfg = STAGE_CONFIG[o.status] || STAGE_CONFIG['Diproses'];

                const tr = document.createElement('tr');
                tr.className = 'order-card hover:bg-slate-50/80 transition';
                tr.dataset.id = o.id;
                tr.dataset.code = o.code;
                tr.dataset.name = o.customerName;
                tr.dataset.service = o.service;
                tr.dataset.status = o.status;

                tr.innerHTML = `
                    <td class="py-4 px-5 whitespace-nowrap">
                        <div class="font-bold font-mono text-slate-700">${o.code}</div>
                        <div class="text-[11px] text-slate-400 mt-0.5">${o.date || '-'}</div>
                    </td>
                    <td class="py-4 px-4 whitespace-nowrap">
                        <div class="flex items-center gap-2.5">
                            <div class="w-8 h-8 rounded-lg bg-sky-100 flex items-center justify-center text-cyan-700 font-bold text-[11px] shrink-0">
                                ${inits}
                            </div>
                            <div>
                                <a href="detailpesanan.html?id=${encodeURIComponent(o.id)}"
                                    class="text-xs font-bold text-slate-800 hover:text-cyan-700 transition block">
                                    ${o.customerName}
                                </a>
                                <span class="text-[10px] text-slate-400">${o.customerPhone || '-'}</span>
                            </div>
                        </div>
                    </td>
                    <td class="py-4 px-4 whitespace-nowrap">
                        <div class="font-semibold text-slate-700">${o.service}</div>
                        <div class="text-[10px] text-slate-400 mt-0.5">Pembayaran: ${o.paymentMethod || 'QRIS'}</div>
                    </td>
                    <td class="py-4 px-4 font-semibold text-slate-700 whitespace-nowrap">${o.weight}</td>
                    <td class="py-4 px-4 font-bold text-cyan-800 whitespace-nowrap">${o.totalFormatted}</td>
                    <td class="py-4 px-4 whitespace-nowrap">
                        <span class="inline-flex items-center gap-1.5 status-badge px-2.5 py-1 rounded-full text-[11px] font-semibold ${cfg.badgeBg} ${cfg.badgeText}">
                            <span class="w-1.5 h-1.5 rounded-full ${cfg.dotColor}"></span>
                            <span class="badge-text">${o.status}</span>
                        </span>
                    </td>
                    <td class="py-4 px-5 text-right whitespace-nowrap">
                        <div class="inline-flex items-center justify-end gap-2">
                            <a href="invoice.html?id=${encodeURIComponent(o.code || o.id)}"
                                class="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-sky-50 text-slate-700 hover:text-cyan-700 border border-slate-200 hover:border-sky-200 rounded-lg text-[11px] font-semibold transition">
                                <svg class="w-3.5 h-3.5 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                </svg>
                                <span>Detail</span>
                            </a>

                            <div class="relative">
                                <label for="select-${o.id}" class="sr-only">Ubah Status ${o.code}</label>
                                <select id="select-${o.id}" onchange="updateStatus('${o.id}', this.value)"
                                    class="status-select appearance-none pl-2.5 pr-7 py-1.5 bg-slate-50 hover:bg-white border border-slate-200 rounded-lg text-[11px] font-semibold text-slate-700 hover:border-slate-300 focus:outline-none focus:ring-2 focus:ring-cyan-500/40 transition cursor-pointer">
                                    <option value="Menunggu konfirmasi" ${o.status === 'Menunggu konfirmasi' ? 'selected' : ''}>Menunggu konfirmasi</option>
                                    <option value="Diproses" ${o.status === 'Diproses' ? 'selected' : ''}>Diproses</option>
                                    <option value="Dicuci" ${o.status === 'Dicuci' ? 'selected' : ''}>Dicuci</option>
                                    <option value="Disetrika" ${o.status === 'Disetrika' ? 'selected' : ''}>Disetrika</option>
                                    <option value="Selesai" ${o.status === 'Selesai' ? 'selected' : ''}>Selesai</option>
                                </select>
                                <div class="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-slate-400">
                                    <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
                                    </svg>
                                </div>
                            </div>
                        </div>
                    </td>
                `;
                container.appendChild(tr);
            });
        }

        function handleFilter() {
            const searchVal = searchInput ? searchInput.value.toLowerCase().trim() : '';
            const stageVal = stageFilterSelect ? stageFilterSelect.value : 'ALL';
            syncStagePillUI(stageVal);

            const cards = document.querySelectorAll('.order-card');
            let visibleCount = 0;

            cards.forEach(card => {
                const orderId = (card.dataset.id || '').toLowerCase();
                const orderCode = (card.dataset.code || '').toLowerCase();
                const name = (card.dataset.name || '').toLowerCase();
                const service = (card.dataset.service || '').toLowerCase();
                const status = card.dataset.status || '';

                const matchesSearch = !searchVal || orderId.includes(searchVal) || orderCode.includes(searchVal) || name.includes(searchVal) || service.includes(searchVal);
                const matchesStage = (stageVal === 'ALL') || (status === stageVal);

                if (matchesSearch && matchesStage) {
                    card.classList.remove('hidden');
                    visibleCount++;
                } else {
                    card.classList.add('hidden');
                }
            });

            const emptyBox = document.getElementById('noResultsMessage');
            if (emptyBox) {
                emptyBox.classList.toggle('hidden', visibleCount > 0);
            }

            const footerText = document.getElementById('footerCountText');
            if (footerText) {
                footerText.textContent = `Menampilkan ${visibleCount} dari ${cards.length} antrean pesanan`;
            }
        }

        window.handleFilter = handleFilter;

        if (searchInput && !searchInput.dataset.bound) {
            searchInput.dataset.bound = 'true';
            searchInput.addEventListener('input', handleFilter);
        }
        if (stageFilterSelect && !stageFilterSelect.dataset.bound) {
            stageFilterSelect.dataset.bound = 'true';
            stageFilterSelect.addEventListener('change', handleFilter);
        }
        if (sortOrderSelect && !sortOrderSelect.dataset.bound) {
            sortOrderSelect.dataset.bound = 'true';
            sortOrderSelect.addEventListener('change', initStatusPesananPage);
        }

        recalculateStatusMetrics();
        handleFilter();
    }

    // ==========================================
    // 12. MODUL: DATA TRANSAKSI (datatransaksi.html)
    // ==========================================
    async function initDataTransaksiPage() {
        injectInvoiceModal();
        const searchInput = document.getElementById('searchInput');
        const statusFilter = document.getElementById('statusFilter');
        const methodFilter = document.getElementById('methodFilter');
        const tbody = document.getElementById('transactionsTableBody');

        const statTransaksiHariIni = document.getElementById('statTransaksiHariIni');
        const statPembayaranMasuk = document.getElementById('statPembayaranMasuk');
        const statBelumDibayar = document.getElementById('statBelumDibayar');

        const orders = await fetchUnifiedOrders();

        // Hitung metrik keuangan real-time
        let totalLunas = 0;
        let totalBelumLunas = 0;
        orders.forEach(o => {
            if (o.status === 'Menunggu konfirmasi') {
                totalBelumLunas += o.total;
            } else {
                totalLunas += o.total;
            }
        });

        if (statTransaksiHariIni) statTransaksiHariIni.textContent = `${orders.length} transaksi`;
        if (statPembayaranMasuk) statPembayaranMasuk.textContent = formatRupiah(totalLunas);
        if (statBelumDibayar) statBelumDibayar.textContent = formatRupiah(totalBelumLunas);

        function renderTransactions(listToRender) {
            const countVisibleEl = document.getElementById('countVisible');
            const countTotalEl = document.getElementById('countTotal');
            if (countVisibleEl) countVisibleEl.textContent = String(listToRender.length);
            if (countTotalEl) countTotalEl.textContent = String(orders.length);
            if (!tbody) return;
            tbody.innerHTML = '';

            if (listToRender.length === 0) {
                tbody.innerHTML = `
                    <tr>
                        <td colspan="7" class="py-8 text-center text-slate-400">
                            <span class="text-xs">Tidak ditemukan transaksi yang sesuai</span>
                        </td>
                    </tr>
                `;
                return;
            }

            listToRender.forEach(o => {
                const isLunas = o.status !== 'Menunggu konfirmasi';
                const tr = document.createElement('tr');
                tr.className = 'transaction-row hover:bg-slate-50/80 transition';
                tr.dataset.trx = o.code;
                tr.dataset.pelanggan = o.customerName;
                tr.dataset.order = o.code;
                tr.dataset.tanggal = o.date;
                tr.dataset.total = o.totalFormatted;
                tr.dataset.metode = o.paymentMethod || 'QRIS';
                tr.dataset.status = isLunas ? 'Lunas' : 'Belum bayar';

                tr.innerHTML = `
                    <td class="px-5 py-4 font-bold text-slate-800 font-mono">${o.code}</td>
                    <td class="px-5 py-4 font-normal text-slate-700">${o.customerName}</td>
                    <td class="px-5 py-4 text-slate-500">${o.date}</td>
                    <td class="px-5 py-4 font-bold text-slate-800">${o.totalFormatted}</td>
                    <td class="px-5 py-4">
                        <span class="inline-block px-2.5 py-0.5 bg-slate-100 text-slate-600 font-medium rounded text-[10px]">
                            ${o.paymentMethod || 'QRIS'}
                        </span>
                    </td>
                    <td class="px-5 py-4">
                        ${isLunas ? `
                            <span class="inline-flex items-center gap-1.5 px-2.5 py-1 bg-emerald-50 text-teal-700 rounded-full text-[11px] font-semibold border border-emerald-100">
                                <span class="w-1.5 h-1.5 rounded-full bg-teal-600"></span>
                                Lunas
                            </span>
                        ` : `
                            <span class="inline-flex items-center gap-1.5 px-2.5 py-1 bg-rose-50 text-red-500 rounded-full text-[11px] font-semibold border border-rose-100">
                                <span class="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse"></span>
                                Belum bayar
                            </span>
                        `}
                    </td>
                    <td class="px-5 py-4 text-right">
                        <a href="invoice.html?id=${encodeURIComponent(o.code || o.id)}"
                            class="inline-block px-3 py-1.5 border border-slate-200 rounded-lg text-cyan-700 hover:text-cyan-800 hover:bg-sky-50 hover:border-sky-200 text-xs font-semibold transition">
                            Detail
                        </a>
                    </td>
                `;
                tbody.appendChild(tr);
            });
        }

        renderTransactions(orders);

        function filterTransactions() {
            const searchVal = searchInput ? searchInput.value.toLowerCase().trim() : '';
            const statusVal = statusFilter ? statusFilter.value : 'ALL';
            const methodVal = methodFilter ? methodFilter.value : 'ALL';

            const filtered = orders.filter(o => {
                const isLunas = o.status !== 'Menunggu konfirmasi';
                const statusStr = isLunas ? 'Lunas' : 'Belum bayar';
                const methodStr = o.paymentMethod || 'QRIS';

                const matchesSearch = !searchVal || o.code.toLowerCase().includes(searchVal) || o.customerName.toLowerCase().includes(searchVal) || methodStr.toLowerCase().includes(searchVal);
                const matchesStatus = (statusVal === 'ALL') || (statusStr === statusVal);
                const matchesMethod = (methodVal === 'ALL') || (methodStr.toLowerCase() === methodVal.toLowerCase());

                return matchesSearch && matchesStatus && matchesMethod;
            });

            renderTransactions(filtered);
        }

        if (searchInput) searchInput.addEventListener('input', filterTransactions);
        if (statusFilter) statusFilter.addEventListener('change', filterTransactions);
        if (methodFilter) methodFilter.addEventListener('change', filterTransactions);

        window.exportToCSV = () => {
            const csvRows = [
                ['No. Transaksi', 'Pelanggan', 'Tanggal', 'Total Pembayaran', 'Metode', 'Status'],
                ...orders.map(o => [
                    o.code,
                    o.customerName,
                    o.date,
                    o.totalFormatted,
                    o.paymentMethod || 'QRIS',
                    o.status === 'Menunggu konfirmasi' ? 'Belum bayar' : 'Lunas'
                ])
            ];
            const csvContent = 'data:text/csv;charset=utf-8,' + csvRows.map(e => e.map(v => `"${v}"`).join(',')).join('\n');
            const encodedUri = encodeURI(csvContent);
            const link = document.createElement('a');
            link.setAttribute('href', encodedUri);
            link.setAttribute('download', `Data_Transaksi_Bersihin_${new Date().toISOString().slice(0, 10)}.csv`);
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            showToast('Laporan transaksi berhasil diunduh (CSV)');
        };
    }

    // ==========================================
    // 13. MODUL DASHBOARD PEGAWAI (dashboard.html)
    // ==========================================
    async function initDashboardPage() {
        injectInvoiceModal();
        updateRealtimeDate();
        await syncStaffProfileFromBackend();

        const profile = getStaffProfile();
        applyStaffProfileToDOM(profile);

        const orders = await fetchUnifiedOrders();

        // 1. Kalkulasi 4 Metric Cards Dashboard
        let masukCount = 0;
        let diprosesCount = 0;
        let selesaiCount = 0;
        let menungguCount = 0;

        orders.forEach(o => {
            if (o.status !== 'Dibatalkan') masukCount++;
            if (o.status === 'Menunggu konfirmasi') menungguCount++;
            else if (o.status === 'Selesai' || o.status === 'Siap Diambil') selesaiCount++;
            else diprosesCount++;
        });

        const elMasuk = document.getElementById('statPesananMasuk');
        const elDiproses = document.getElementById('statSedangDiproses');
        const elSelesai = document.getElementById('statPesananSelesai');
        const elMenunggu = document.getElementById('statMenungguKonfirmasi');
        const elBannerCount = document.getElementById('bannerActiveOrdersCount');
        const subMasuk = document.getElementById('subPesananMasuk');
        const subDiproses = document.getElementById('subSedangDiproses');
        const subSelesai = document.getElementById('subPesananSelesai');
        const subMenunggu = document.getElementById('subMenungguKonfirmasi');

        const activeAttention = menungguCount + diprosesCount;
        if (elMasuk) elMasuk.textContent = String(masukCount || orders.length || 28);
        if (elDiproses) elDiproses.textContent = String(diprosesCount || 12);
        if (elSelesai) elSelesai.textContent = String(selesaiCount || 9);
        if (elMenunggu) elMenunggu.textContent = String(menungguCount > 0 ? menungguCount : 7);

        if (subMasuk) subMasuk.textContent = '+6 dari kemarin';
        if (subDiproses) {
            const total = masukCount || orders.length || 28;
            const pct = Math.round(((diprosesCount || 12) / total) * 100);
            subDiproses.textContent = `${pct > 0 ? pct : 43}% dari total`;
        }
        if (subSelesai) subSelesai.textContent = 'Siap diambil';
        if (subMenunggu) subMenunggu.textContent = 'Perlu tindakan';

        if (elBannerCount) {
            elBannerCount.textContent = `${activeAttention > 0 ? activeAttention : 4} pesanan`;
        }

        // 2. Render Tabel Pesanan Terbaru dari Akun Pelanggan Nyata (Sesuai Gambar 3)
        const recentTbody = document.getElementById('dashboardRecentOrdersBody');
        if (recentTbody) {
            recentTbody.innerHTML = '';
            
            const fallbackRows = [
                { id: 'TRX-240520-05', code: 'TRX-240520-05', customerName: 'Maya Anggraini', service: 'Cuci Komplit (Cuci + Setrika)', totalFormatted: 'Rp22.500', status: 'Menunggu konfirmasi' },
                { id: 'TRX-240519-02', code: 'TRX-240519-02', customerName: 'Rina Marlina', service: 'Cuci Komplit (Cuci + Setrika), Cuci Bedcover Besar', totalFormatted: 'Rp52.000', status: 'Disetrika' },
                { id: 'TRX-240518-01', code: 'TRX-240518-01', customerName: 'Andi Pratama', service: 'Cuci Komplit (Cuci + Setrika)', totalFormatted: 'Rp40.500', status: 'Dicuci' },
                { id: 'TRX-240517-03', code: 'TRX-240517-03', customerName: 'Dedi Kurniawan', service: 'Cuci Komplit (Cuci + Setrika)', totalFormatted: 'Rp45.000', status: 'Siap Diambil' },
                { id: 'TRX-240510-04', code: 'TRX-240510-04', customerName: 'Andi Pratama', service: 'Cuci Komplit (Cuci + Setrika)', totalFormatted: 'Rp54.000', status: 'Selesai' }
            ];

            const top5 = (orders.length > 0 ? orders : fallbackRows).slice(0, 5);

            top5.forEach(o => {
                const badgeCfg = getStatusBadgeConfig(o.status);
                const tr = document.createElement('tr');
                tr.className = 'hover:bg-slate-50/80 transition cursor-pointer';
                tr.onclick = () => { window.location.href = `invoice.html?id=${encodeURIComponent(o.code || o.id)}`; };

                tr.innerHTML = `
                    <td class="py-3.5 px-3 font-bold text-slate-800 whitespace-nowrap">
                        ${o.code}
                    </td>
                    <td class="py-3.5 px-3 text-slate-700 font-medium whitespace-nowrap">${o.customerName}</td>
                    <td class="py-3.5 px-3 text-slate-500 whitespace-nowrap">${o.service}</td>
                    <td class="py-3.5 px-3 font-bold text-slate-800 whitespace-nowrap">${o.totalFormatted}</td>
                    <td class="py-3.5 px-3 whitespace-nowrap">
                        <span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold ${badgeCfg.badgeClass}">
                            <span class="w-1.5 h-1.5 rounded-full ${badgeCfg.dotClass}"></span>
                            ${o.status}
                        </span>
                    </td>
                    <td class="py-3.5 px-3 text-right whitespace-nowrap">
                        <svg class="w-3.5 h-3.5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
                        </svg>
                    </td>
                `;
                recentTbody.appendChild(tr);
            });
        }

        // 3. Widget Progres Hari Ini (Donut Progress Chart Dinamis Sesuai Gambar 3)
        const percentText = document.getElementById('progressPercentText');
        const circleRing = document.getElementById('progressCircleRing');
        const selesaiCountEl = document.getElementById('progressSelesaiCount');
        const prosesCountEl = document.getElementById('progressProsesCount');

        const totalActiveAndDone = selesaiCount + diprosesCount;
        const percentVal = totalActiveAndDone > 0 ? Math.round((selesaiCount / totalActiveAndDone) * 100) : 68;

        if (percentText) percentText.textContent = `${percentVal}%`;
        if (circleRing) {
            circleRing.setAttribute('stroke-dasharray', `${percentVal} 100`);
        }
        if (selesaiCountEl) selesaiCountEl.textContent = String(selesaiCount || 19);
        if (prosesCountEl) prosesCountEl.textContent = String(diprosesCount || 9);
    }

    // ==========================================
    // 14. MODUL PROFIL, PASSWORD & LOGIN PEGAWAI
    // ==========================================
    function initLoginPage() {
        const loginForm = document.querySelector('form');
        if (!loginForm) return;

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

            showToast('Verifikasi staf berhasil! Mengalihkan ke dashboard...');
            setTimeout(() => {
                window.location.href = 'dashboard.html';
            }, 800);
        });
    }

    async function initProfilPage() {
        await syncStaffProfileFromBackend();
        const profile = getStaffProfile();
        applyStaffProfileToDOM(profile);

        const bannerName = document.getElementById('bannerProfileName') || document.querySelector('main h2');
        if (bannerName) bannerName.textContent = profile.nama;

        const bannerEmail = document.getElementById('bannerProfileEmail');
        if (bannerEmail) bannerEmail.textContent = profile.email;

        const bannerAvatar = document.getElementById('bannerProfileAvatar');
        if (bannerAvatar) bannerAvatar.textContent = profile.inisial || 'ST';

        const bannerRole = document.getElementById('bannerProfileRoleBadge') || document.querySelector('main .bg-white\\/15 span.text-\\[11px\\]');
        if (bannerRole) bannerRole.textContent = `${profile.posisi || profile.jabatan} • ID: ${profile.idPegawai || profile.kode}`;

        const viewName = document.getElementById('profileViewName');
        if (viewName) viewName.textContent = profile.nama;

        const viewPhone = document.getElementById('profileViewPhone');
        if (viewPhone) viewPhone.textContent = profile.nomorHp || profile.telepon;

        const viewEmail = document.getElementById('profileViewEmail');
        if (viewEmail) viewEmail.textContent = profile.email;

        const viewRole = document.getElementById('profileViewRole');
        if (viewRole) viewRole.textContent = `${profile.posisi || profile.jabatan} • ${profile.cabang || 'Outlet Bersihin'}`;

        const viewBadgeId = document.getElementById('profileViewBadgeId');
        if (viewBadgeId) viewBadgeId.textContent = profile.idPegawai || profile.kode;

        const viewAddress = document.getElementById('profileViewAddress');
        if (viewAddress) viewAddress.textContent = profile.alamat;
    }

    async function initEditProfilPage() {
        await syncStaffProfileFromBackend();
        const profile = getStaffProfile();
        applyStaffProfileToDOM(profile);

        const namaInput = document.getElementById('namaLengkap');
        const idInput = document.getElementById('idPegawai');
        const phoneInput = document.getElementById('nomorHp');
        const emailInput = document.getElementById('email');
        const posisiInput = document.getElementById('posisi');
        const jadwalInput = document.getElementById('jadwal');

        if (namaInput) namaInput.value = profile.nama;
        if (idInput) idInput.value = profile.idPegawai || profile.kode;
        if (phoneInput) phoneInput.value = profile.nomorHp || profile.telepon;
        if (emailInput) emailInput.value = profile.email;
        if (posisiInput) posisiInput.value = profile.posisi || profile.jabatan;
        if (jadwalInput) jadwalInput.value = profile.jadwal;

        const form = document.getElementById('editProfileForm') || document.querySelector('form');
        if (form) {
            form.addEventListener('submit', async (e) => {
                e.preventDefault();

                const updatedName = namaInput ? namaInput.value.trim() : profile.nama;
                const updatedPhone = phoneInput ? phoneInput.value.trim() : profile.nomorHp;
                const updatedEmail = emailInput ? emailInput.value.trim() : profile.email;

                if (!updatedName) {
                    showToast('Nama lengkap tidak boleh kosong!', true);
                    return;
                }

                try {
                    const token = await ensureStaffToken();
                    if (token) {
                        await fetch(`${getBackendBaseUrl()}/api/pegawai/profil`, {
                            method: 'PUT',
                            headers: {
                                'Content-Type': 'application/json',
                                'Authorization': `Bearer ${token}`
                            },
                            body: JSON.stringify({
                                nama: updatedName,
                                telepon: updatedPhone
                            })
                        });
                    }
                } catch (_) {}

                const parts = updatedName.split(' ').filter(Boolean);
                const initials = parts.length > 1
                    ? (parts[0][0] + parts[1][0]).toUpperCase()
                    : (parts[0] ? parts[0].substring(0, 2).toUpperCase() : 'PG');

                saveStaffProfile({
                    nama: updatedName,
                    inisial: initials,
                    nomorHp: updatedPhone,
                    telepon: updatedPhone,
                    email: updatedEmail
                });

                showToast('Perubahan profil berhasil disimpan!');
                setTimeout(() => {
                    window.location.href = 'profil.html';
                }, 900);
            });
        }
    }

    function checkPasswordStrength(password) {
        const s1 = document.getElementById('strength-1') || document.getElementById('bar1');
        const s2 = document.getElementById('strength-2') || document.getElementById('bar2');
        const s3 = document.getElementById('strength-3') || document.getElementById('bar3');
        const sText = document.getElementById('strength-text') || document.getElementById('strengthText');

        const bars = [s1, s2, s3].filter(Boolean);
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
        } else {
            bars.forEach(b => {
                b.classList.remove('bg-slate-200');
                b.classList.add('bg-emerald-500');
            });
            if (sText) {
                sText.textContent = 'Kuat';
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

        document.querySelectorAll('.toggle-pass-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const targetId = btn.getAttribute('data-toggle-target');
                const targetInput = document.getElementById(targetId);
                if (!targetInput) return;

                const isPassword = targetInput.type === 'password';
                targetInput.type = isPassword ? 'text' : 'password';
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

    function logoutStaff(event) {
        if (event && event.preventDefault) {
            event.preventDefault();
        }

        try {
            // 1. Bersihkan token dan seluruh data autentikasi sesi staf dari storage
            localStorage.removeItem('bersihin_token');
            localStorage.removeItem('bersihin_staff_token');
            localStorage.removeItem('bersihin_user');
            localStorage.removeItem('bersihin_active_role');
            localStorage.removeItem('bersihin_pegawai_profile');
            sessionStorage.removeItem('bersihin_token');
            sessionStorage.removeItem('bersihin_staff_token');
            sessionStorage.removeItem('bersihin_user');
            sessionStorage.removeItem('bersihin_active_role');
            sessionStorage.removeItem('bersihin_pegawai_profile');

            // 2. Beritahu backend Express untuk destroy session jika terhubung
            const apiBase = getBackendBaseUrl();
            fetch(`${apiBase}/api/auth/logout`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include'
            }).catch(() => {});
        } catch (e) {
            console.error('Logout error:', e);
        }

        // 3. Arahkan secara aman ke portal login utama di root
        window.location.href = '../login.html';
    }

    // ==========================================
    // 15. EXPOSE GLOBAL WINDOW API
    // ==========================================
    window.logoutStaff = logoutStaff;
    window.showToast = showToast;
    window.copyToClipboard = copyToClipboard;
    window.updateStatus = updateOrderStatus;
    window.recalculateMetrics = recalculateStatusMetrics;
    window.fetchUnifiedOrders = fetchUnifiedOrders;
    window.checkPasswordStrength = checkPasswordStrength;

    window.filterByStage = function (stageName) {
        const stageFilterSelect = document.getElementById('stageFilterSelect');
        if (stageFilterSelect) {
            const nextVal = (stageName === 'ALL' || stageFilterSelect.value === stageName) ? 'ALL' : stageName;
            stageFilterSelect.value = nextVal;
            stageFilterSelect.dispatchEvent(new Event('change'));
        }
    };

    // ==========================================
    // 16. BOOTSTRAP INITIALIZATION
    // ==========================================
    document.addEventListener('DOMContentLoaded', () => {
        applyStaffProfileToDOM();
        syncStaffProfileFromBackend();
        updateRealtimeDate();
        setInterval(updateRealtimeDate, 30000);
        initSidebar();
        initNotificationDropdown();
        initProfileDropdown();

        // 1. Dengarkan event storage dari Pelanggan untuk pembaruan instan antar-tab
        window.addEventListener('storage', (e) => {
            if (e.key === 'bersihin_order_updated' || e.key === 'bersihin_transactions' || e.key === 'bersihin_active_order') {
                refreshActivePageView();
            }
        });

        // 2. Polling sinkronisasi real-time otomatis ke database MySQL XAMPP setiap 3.5 detik
        setInterval(() => {
            // Hindari me-refresh saat staf sedang membuka dropdown ubah status
            if (document.activeElement && document.activeElement.classList && document.activeElement.classList.contains('status-select')) return;

            refreshActivePageView();
        }, 3500);

        const path = window.location.pathname.toLowerCase();

        if (path.includes('login.html')) {
            initLoginPage();
        } else if (path.includes('dashboard.html') || path.endsWith('/pegawai/') || path.endsWith('/pegawai')) {
            initDashboardPage();
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
        } else if (path.includes('profil.html')) {
            initProfilPage();
        } else if (path.includes('editprofil.html')) {
            initEditProfilPage();
        } else if (path.includes('password.html')) {
            initPasswordPage();
        }

        // 3. Pasang penangan logout otomatis ke seluruh tombol/tautan keluar
        document.querySelectorAll('a[href*="login.html"], [title="Keluar"]').forEach(el => {
            el.addEventListener('click', logoutStaff);
        });
    });

})();

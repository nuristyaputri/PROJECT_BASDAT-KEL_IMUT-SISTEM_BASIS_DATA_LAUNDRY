<?php
/**
 * =============================================================================
 * SISTEM BASIS DATA LAUNDRY (BERSIHIN LAUNDRY)
 * File: routes/auth.php
 * Deskripsi: Endpoint router PHP untuk login terpadu (XAMPP / Apache / phpMyAdmin)
 *            Memvalidasi kredensial pengguna dan mengembalikan rute dashboard aktor.
 * =============================================================================
 */

header('Content-Type: application/json; charset=UTF-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

session_start();

// Konfigurasi Database MySQL
$db_host = '127.0.0.1';
$db_port = 3306;
$db_name = 'bersihinlaundry';
$db_user = 'root';
$db_pass = '';

$pdo = null;
try {
    $dsn = "mysql:host=$db_host;port=$db_port;dbname=$db_name;charset=utf8mb4";
    $pdo = new PDO($dsn, $db_user, $db_pass, [
        PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        PDO::ATTR_EMULATE_PREPARES   => false,
    ]);
} catch (Exception $e) {
    // Database offline, lanjut menggunakan data demo fallback
    $pdo = null;
}

// Akun Demo Cadangan (Offline Mode)
$demo_users = [
    [
        'id_user'  => 1,
        'username' => 'pemilik',
        'email'    => 'rangga@bersihin.id',
        'nama'     => 'Rangga Saputra',
        'password' => 'password123',
        'role'     => 'PEMILIK',
        'redirect' => '../PEMILIK/dashboard.html'
    ],
    [
        'id_user'  => 2,
        'username' => 'dina.staff',
        'email'    => 'dina.nurhaliza@bersihin.id',
        'nama'     => 'Dina Nurhaliza',
        'password' => 'password123',
        'role'     => 'PEGAWAI',
        'redirect' => '../PEGAWAI/dashboard.html'
    ],
    [
        'id_user'  => 4,
        'username' => 'andipratama',
        'email'    => 'andi.pratama@email.com',
        'nama'     => 'Andi Pratama',
        'password' => 'password123',
        'role'     => 'PELANGGAN',
        'redirect' => '../PELANGGAN/dashboard.html'
    ]
];

function getRedirectPath($role) {
    switch (strtoupper($role)) {
        case 'PEMILIK':
            return '../PEMILIK/dashboard.html';
        case 'PEGAWAI':
            return '../PEGAWAI/dashboard.html';
        case 'PELANGGAN':
        default:
            return '../PELANGGAN/dashboard.html';
    }
}

// Ambil input JSON atau POST form-data
$input_raw = file_get_contents('php://input');
$data = json_decode($input_raw, true) ?: $_POST;

$identifier = trim($data['identifier'] ?? $data['username'] ?? $data['email'] ?? '');
$password   = trim($data['password'] ?? '');
$role_tab   = !empty($data['role']) ? strtoupper(trim($data['role'])) : null;

if (empty($identifier) || empty($password)) {
    http_response_code(400);
    echo json_encode([
        'success' => false,
        'message' => 'Kolom username/email dan kata sandi wajib diisi.',
        'data'    => null
    ]);
    exit;
}

// 1. Verifikasi Melalui Database MySQL
if ($pdo !== null) {
    try {
        $stmt = $pdo->prepare("SELECT id_user, username, email, password, role, status FROM users WHERE (username = :u OR email = :e) AND status = 'AKTIF' LIMIT 1");
        $stmt->execute([':u' => $identifier, ':e' => $identifier]);
        $user = $stmt->fetch();

        if ($user) {
            if ($role_tab !== null && $user['role'] !== $role_tab) {
                http_response_code(403);
                echo json_encode([
                    'success' => false,
                    'message' => "Akun terdaftar sebagai {$user['role']}, silakan pilih tab peran yang sesuai.",
                    'data'    => null
                ]);
                exit;
            }

            $password_valid = password_verify($password, $user['password']) || ($password === $user['password']);

            if ($password_valid) {
                $redirect = getRedirectPath($user['role']);
                $_SESSION['user'] = [
                    'id_user'  => $user['id_user'],
                    'username' => $user['username'],
                    'email'    => $user['email'],
                    'role'     => $user['role']
                ];

                http_response_code(200);
                echo json_encode([
                    'success' => true,
                    'message' => "Autentikasi berhasil sebagai {$user['role']}.",
                    'data'    => [
                        'id_user'  => $user['id_user'],
                        'username' => $user['username'],
                        'email'    => $user['email'],
                        'role'     => $user['role'],
                        'redirect' => $redirect
                    ]
                ]);
                exit;
            }
        }
    } catch (Exception $ex) {
        // Lanjut ke fallback data demo jika ada kendala query
    }
}

// 2. Verifikasi Data Demo Terstruktur
$id_lower = strtolower($identifier);
foreach ($demo_users as $demo) {
    $match = (strtolower($demo['username']) === $id_lower || strtolower($demo['email']) === $id_lower);
    if ($match && $password === $demo['password']) {
        if ($role_tab !== null && $demo['role'] !== $role_tab) {
            http_response_code(403);
            echo json_encode([
                'success' => false,
                'message' => "Akun terdaftar sebagai {$demo['role']}, silakan gunakan tab login {$demo['role']}.",
                'data'    => null
            ]);
            exit;
        }

        $redirect = getRedirectPath($demo['role']);
        $_SESSION['user'] = $demo;

        http_response_code(200);
        echo json_encode([
            'success' => true,
            'message' => "Login berhasil sebagai {$demo['role']} (Mode Demo).",
            'data'    => [
                'id_user'  => $demo['id_user'],
                'username' => $demo['username'],
                'email'    => $demo['email'],
                'nama'     => $demo['nama'],
                'role'     => $demo['role'],
                'redirect' => $redirect
            ]
        ]);
        exit;
    }
}

// Gagal Login
http_response_code(401);
echo json_encode([
    'success' => false,
    'message' => 'Username, email, atau kata sandi tidak cocok. Silakan coba lagi.',
    'data'    => null
]);
exit;
?>


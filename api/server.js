// api/server.js
const express = require('express');
const multer = require('multer');
const sharp = require('sharp');
const cors = require('cors');
const { v4: uuidv4 } = require('uuid');
const jwt = require('jsonwebtoken');
require('dotenv').config();
const path = require('path');

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '..')));

// --- CẤU HÌNH ---
const PREDEFINED_KEYS = [
    'a1b2c3d4-e5f6-7890-1234-abcdeffedcba', 'f0e9d8c7-b6a5-4321-fedc-ba9876543210',
    '12345678-abcd-efab-cdef-1234567890ab', 'abcdef12-3456-7890-abcd-ef1234567890',
    'fedcba98-7654-3210-fedc-ba9876543210', 'a2b3c4d5-e6f7-8901-2345-bcdeffedcbaa',
    'f1e0d9c8-b7a6-4321-fedd-cb9876543211', '23456789-bcde-fabc-def1-234567890abc',
    'bcdef123-4567-890a-bcde-f1234567890a', 'edcba987-6543-210f-edcb-a9876543210f',
    'c3b4d5e6-f7g8-9012-3456-cdeffedcbaab', 'd2c1e0d9-c8b7-5432-gfee-dc9876543212',
    '34567890-cdef-1234-ef12-34567890abcd', 'cdef1234-5678-90ab-cdef-1234567890ab',
    'dcba9876-5432-10fe-dcb9-a876543210fe', 'd4c5e6f7-g8h9-0123-4567-deffedcbaabc',
    'e3d2f1e0-d9c8-6543-hffg-ed9876543213', '45678901-def1-2345-f123-4567890abcde',
    'def12345-6789-0abc-def1-234567890abc', 'cba98765-4321-0fed-cba9-876543210fed'
];
const validKeys = new Set(PREDEFINED_KEYS);
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin123';
const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-key';
const ONLINE_TIMEOUT = 60 * 1000; // 1 phút

// THAY ĐỔI: Dùng cấu trúc này để theo dõi key nào đang được phiên nào sử dụng.
// { 'key-abc': { sessionId: 'user-xyz', lastSeen: 167... } }
let activeKeySessions = {};

const upload = multer({ storage: multer.memoryStorage() });

// --- MIDDLEWARE ---
function authenticateAdmin(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    if (token == null) return res.sendStatus(401);
    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) return res.sendStatus(403);
        req.user = user;
        next();
    });
}

// --- API ROUTES ---

// 1. API cho người dùng: Xác thực key (LOGIC ĐÃ ĐƯỢC CẬP NHẬT)
app.post('/api/validate-key', (req, res) => {
    const { key } = req.body;

    // Bước 1: Kiểm tra key có hợp lệ không
    if (!validKeys.has(key)) {
        return res.status(401).json({ success: false, message: 'Key không hợp lệ.' });
    }

    const existingSession = activeKeySessions[key];
    const now = Date.now();

    // Bước 2: Kiểm tra key có đang được sử dụng không
    if (existingSession && (now - existingSession.lastSeen < ONLINE_TIMEOUT)) {
        return res.status(409).json({ success: false, message: 'Key này đang được một thiết bị khác sử dụng.' }); // 409 Conflict
    }

    // Bước 3: Key hợp lệ và không bị ai dùng (hoặc người dùng cũ đã timeout) -> Cấp phiên mới
    const userId = `user-${Date.now()}-${Math.random()}`;
    activeKeySessions[key] = {
        sessionId: userId,
        lastSeen: now
    };

    res.json({ success: true, userId: userId });
});

// 2. API cho người dùng: Chuyển đổi ảnh (Không đổi)
app.post('/api/convert', upload.single('image'), async (req, res) => {
    if (!req.file) return res.status(400).send('Không có file nào được tải lên.');
    try {
        const gifBuffer = await sharp(req.file.buffer).gif().toBuffer();
        res.set('Content-Type', 'image/gif').send(gifBuffer);
    } catch (error) {
        console.error('Lỗi chuyển đổi ảnh:', error);
        res.status(500).send('Lỗi trong quá trình chuyển đổi ảnh.');
    }
});

// 3. API cho người dùng: Heartbeat (LOGIC ĐÃ ĐƯỢC CẬP NHẬT)
app.post('/api/heartbeat', (req, res) => {
    const { key, userId } = req.body;
    const session = activeKeySessions[key];

    // Cập nhật lastSeen nếu key và userId khớp với phiên đang hoạt động
    if (session && session.sessionId === userId) {
        session.lastSeen = Date.now();
    }
    res.sendStatus(200);
});

// 4. API cho Admin: Đăng nhập (Không đổi)
app.post('/api/admin-login', (req, res) => {
    const { password } = req.body;
    if (password === ADMIN_PASSWORD) {
        const token = jwt.sign({ user: 'admin' }, JWT_SECRET, { expiresIn: '1h' });
        res.json({ success: true, token });
    } else {
        res.status(401).json({ success: false, message: 'Sai mật khẩu.' });
    }
});

// --- API CẦN XÁC THỰC ADMIN ---

// 5. API cho Admin: Lấy thông tin (LOGIC ĐÃ ĐƯỢC CẬP NHẬT)
app.get('/api/admin/stats', authenticateAdmin, (req, res) => {
    const now = Date.now();
    // Đếm số người online dựa trên các phiên còn hoạt động
    const currentOnlineUsers = Object.values(activeKeySessions).filter(
        session => (now - session.lastSeen) < ONLINE_TIMEOUT
    ).length;

    res.json({
        onlineUsers: currentOnlineUsers,
        keys: PREDEFINED_KEYS,
    });
});

// 6. API cho Admin: Tạo key mới (Đã vô hiệu hóa)
app.post('/api/admin/generate-key', authenticateAdmin, (req, res) => {
    res.status(400).json({
        success: false,
        message: 'Không thể tạo key mới vì đang sử dụng danh sách key cố định.'
    });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});

module.exports = app;
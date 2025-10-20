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

// Cấu hình multer để lưu file vào bộ nhớ
const upload = multer({ storage: multer.memoryStorage() });

// --- CƠ SỞ DỮ LIỆU IN-MEMORY (LƯU Ý: Sẽ bị reset trên Vercel) ---
// Trong thực tế, hãy dùng Vercel KV, Redis, hoặc một DB khác.
let validKeys = new Set(['initial-key-123']); // Thêm một key mặc định để test
let onlineUsers = {}; // { userId: lastSeenTimestamp }

// Cấu hình cho Admin
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin123';
const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-key';
const ONLINE_TIMEOUT = 60 * 1000; // 1 phút

// --- MIDDLEWARE ---
// Middleware để xác thực token của Admin
function authenticateAdmin(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (token == null) return res.sendStatus(401); // Unauthorized

    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) return res.sendStatus(403); // Forbidden
        req.user = user;
        next();
    });
}

// --- API ROUTES ---

// 1. API cho người dùng: Xác thực key
app.post('/api/validate-key', (req, res) => {
    const { key } = req.body;
    if (validKeys.has(key)) {
        res.json({ success: true });
    } else {
        res.status(401).json({ success: false, message: 'Key không hợp lệ.' });
    }
});

// 2. API cho người dùng: Chuyển đổi ảnh
app.post('/api/convert', upload.single('image'), async (req, res) => {
    if (!req.file) {
        return res.status(400).send('Không có file nào được tải lên.');
    }

    try {
        const gifBuffer = await sharp(req.file.buffer)
            .gif()
            .toBuffer();

        res.set('Content-Type', 'image/gif');
        res.send(gifBuffer);
    } catch (error) {
        console.error('Lỗi chuyển đổi ảnh:', error);
        res.status(500).send('Lỗi trong quá trình chuyển đổi ảnh.');
    }
});

// 3. API cho người dùng: Báo cáo "tôi đang online" (heartbeat)
app.post('/api/heartbeat', (req, res) => {
    const { userId } = req.body;
    if (userId) {
        onlineUsers[userId] = Date.now();
    }
    res.sendStatus(200);
});


// 4. API cho Admin: Đăng nhập
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

// 5. API cho Admin: Lấy thông tin (số người online, danh sách key)
app.get('/api/admin/stats', authenticateAdmin, (req, res) => {
    const now = Date.now();
    // Lọc những user có heartbeat trong khoảng thời gian timeout
    const currentOnlineUsers = Object.keys(onlineUsers).filter(
        userId => now - onlineUsers[userId] < ONLINE_TIMEOUT
    ).length;

    res.json({
        onlineUsers: currentOnlineUsers,
        keys: Array.from(validKeys),
    });
});

// 6. API cho Admin: Tạo key mới
app.post('/api/admin/generate-key', authenticateAdmin, (req, res) => {
    const newKey = uuidv4();
    validKeys.add(newKey);
    res.json({ success: true, newKey });
});

// Vercel sẽ tự động lắng nghe, nhưng để chạy local thì cần dòng này
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});

module.exports = app; // Export app cho Vercel
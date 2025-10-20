const express = require('express');
const path = require('path');
const multer = require('multer');
const sharp = require('sharp');
const { v4: uuidv4 } = require('uuid');
const { kv } = require('@vercel/kv'); // Sử dụng Vercel KV

const app = express();
const PORT = process.env.PORT || 3000;

// Cấu hình Multer để lưu file vào bộ nhớ
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

// Middleware
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json());

// --- API Endpoints ---

// API để người dùng xác thực key
app.post('/api/verify-key', async (req, res) => {
    try {
        const { key } = req.body;
        // Kiểm tra xem key có tồn tại trong Vercel KV không
        const keyData = await kv.get(key);

        if (keyData) {
            res.json({ success: true, message: 'Key hợp lệ.' });
        } else {
            res.status(403).json({ success: false, message: 'Key không hợp lệ hoặc không tồn tại.' });
        }
    } catch (error) {
        console.error('Lỗi xác thực key:', error);
        res.status(500).json({ success: false, message: 'Lỗi server.' });
    }
});

// API chuyển đổi PNG sang GIF
app.post('/api/convert', upload.single('pngfile'), async (req, res) => {
    try {
        const userKey = req.body.key;

        // 1. Kiểm tra key trước khi xử lý
        const keyData = await kv.get(userKey);
        if (!keyData) {
            return res.status(403).json({ message: 'Key không hợp lệ.' });
        }

        // 2. Kiểm tra file đã được upload chưa
        if (!req.file) {
            return res.status(400).json({ message: 'Vui lòng upload một file PNG.' });
        }

        // 3. Dùng Sharp để chuyển đổi
        const gifBuffer = await sharp(req.file.buffer).gif().toBuffer();
        
        res.setHeader('Content-Type', 'image/gif');
        res.setHeader('Content-Disposition', 'attachment; filename=converted.gif');
        res.send(gifBuffer);

    } catch (err) {
        console.error('Lỗi chuyển đổi ảnh:', err);
        res.status(500).json({ message: 'Không thể chuyển đổi file này.' });
    }
});

// --- ADMIN APIs ---
// Lưu ý: Cần thêm một lớp xác thực admin trong thực tế!

// API để tạo key mới
app.post('/api/admin/generate-key', async (req, res) => {
    try {
        const newKey = uuidv4();
        const createdAt = new Date().toISOString();
        
        // Lưu key và ngày tạo vào Vercel KV
        await kv.set(newKey, { createdAt });

        res.json({ success: true, key: newKey });
    } catch (error) {
        console.error('Lỗi tạo key:', error);
        res.status(500).json({ success: false, message: 'Lỗi khi tạo key.' });
    }
});

// API để lấy danh sách tất cả các key
app.get('/api/admin/get-keys', async (req, res) => {
    try {
        const keysList = [];
        // Quét tất cả các key trong KV store
        for await (const key of kv.scanIterator()) {
            const value = await kv.get(key);
            keysList.push({ key: key, created_at: value.createdAt });
        }

        // Sắp xếp theo ngày tạo mới nhất
        keysList.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
        
        res.json(keysList);
    } catch (error) {
        console.error('Lỗi lấy danh sách key:', error);
        res.status(500).json({ success: false, message: 'Lỗi khi lấy danh sách key.' });
    }
});

// Chạy server (Vercel sẽ quản lý việc này khi deploy)
app.listen(PORT, () => {
    console.log(`Server đang chạy tại http://localhost:${PORT}`);
});

module.exports = app; // Export app cho Vercel
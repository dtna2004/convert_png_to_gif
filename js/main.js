document.addEventListener('DOMContentLoaded', () => {
    // Logic cho trang index.html
    const keyInput = document.getElementById('access-key');
    const submitKeyBtn = document.getElementById('submit-key');
    const errorMessage = document.getElementById('error-message');

    if (submitKeyBtn) {
        submitKeyBtn.addEventListener('click', async () => {
            const key = keyInput.value.trim();
            if (!key) {
                errorMessage.textContent = 'Vui lòng nhập key.';
                return;
            }
            try {
                const response = await fetch('/api/validate-key', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ key })
                });

                if (response.ok) {
                    // Lưu key vào sessionStorage để dùng ở trang converter
                    sessionStorage.setItem('access_key', key);
                    // Tạo một user ID duy nhất cho session này
                    sessionStorage.setItem('user_id', `user-${Date.now()}-${Math.random()}`);
                    window.location.href = '/converter.html';
                } else {
                    const data = await response.json();
                    errorMessage.textContent = data.message || 'Key không hợp lệ.';
                }
            } catch (error) {
                errorMessage.textContent = 'Lỗi kết nối đến server.';
            }
        });
    }

    // Logic cho trang converter.html
    const imageUpload = document.getElementById('image-upload');
    const convertBtn = document.getElementById('convert-btn');

    if (convertBtn) {
        // Kiểm tra xem người dùng đã có key hợp lệ chưa
        const userKey = sessionStorage.getItem('access_key');
        if (!userKey) {
            window.location.href = '/index.html'; // Nếu chưa, quay về trang đăng nhập
            return;
        }

        // Bắt đầu gửi tín hiệu heartbeat
        const userId = sessionStorage.getItem('user_id');
        setInterval(() => {
            navigator.sendBeacon('/api/heartbeat', JSON.stringify({ userId }));
        }, 15000); // Gửi mỗi 15 giây

        convertBtn.addEventListener('click', async () => {
            const file = imageUpload.files[0];
            if (!file) {
                alert('Vui lòng chọn một file ảnh PNG.');
                return;
            }

            const loadingDiv = document.getElementById('loading');
            const resultDiv = document.getElementById('result');
            
            loadingDiv.classList.remove('hidden');
            resultDiv.classList.add('hidden');

            const formData = new FormData();
            formData.append('image', file);

            try {
                const response = await fetch('/api/convert', {
                    method: 'POST',
                    body: formData
                });

                if (response.ok) {
                    const imageBlob = await response.blob();
                    const imageUrl = URL.createObjectURL(imageBlob);
                    
                    document.getElementById('result-image').src = imageUrl;
                    document.getElementById('download-link').href = imageUrl;
                    
                    resultDiv.classList.remove('hidden');
                } else {
                    alert('Lỗi: Không thể chuyển đổi ảnh.');
                }
            } catch (error) {
                alert('Lỗi kết nối server.');
            } finally {
                loadingDiv.classList.add('hidden');
            }
        });
    }
});
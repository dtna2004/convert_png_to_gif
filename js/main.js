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
            errorMessage.textContent = ''; // Xóa thông báo lỗi cũ

            try {
                const response = await fetch('/api/validate-key', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ key })
                });
                
                const data = await response.json();

                if (response.ok) {
                    // THAY ĐỔI: Lưu cả key và userId mà server trả về
                    sessionStorage.setItem('access_key', key);
                    sessionStorage.setItem('user_id', data.userId);
                    window.location.href = '/converter.html';
                } else {
                    errorMessage.textContent = data.message || 'Key không hợp lệ hoặc đang được sử dụng.';
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
        const userKey = sessionStorage.getItem('access_key');
        const userId = sessionStorage.getItem('user_id');

        if (!userKey || !userId) {
            window.location.href = '/index.html';
            return;
        }

        // Bắt đầu gửi tín hiệu heartbeat
        const sendHeartbeat = () => {
            // THAY ĐỔI: Gửi cả key và userId
            const payload = JSON.stringify({ key: userKey, userId: userId });
            // sendBeacon là cách tốt nhất để gửi request khi người dùng có thể đang rời khỏi trang
            if (navigator.sendBeacon) {
                navigator.sendBeacon('/api/heartbeat', payload);
            } else {
                fetch('/api/heartbeat', { method: 'POST', body: payload, keepalive: true });
            }
        };

        sendHeartbeat(); // Gửi ngay lần đầu tiên
        setInterval(sendHeartbeat, 15000); // Gửi mỗi 15 giây

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
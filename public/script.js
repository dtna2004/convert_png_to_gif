document.addEventListener('DOMContentLoaded', () => {
    const keySection = document.getElementById('key-section');
    const converterSection = document.getElementById('converter-section');
    const submitKeyBtn = document.getElementById('submit-key');
    const keyInput = document.getElementById('access-key');
    const keyMessage = document.getElementById('key-message');
    const uploadForm = document.getElementById('upload-form');
    const fileInput = document.getElementById('png-file-input');
    const convertMessage = document.getElementById('convert-message');
    const resultSection = document.getElementById('result-section');
    const downloadLink = document.getElementById('download-link');

    let validKey = null;

    submitKeyBtn.addEventListener('click', async () => {
        const key = keyInput.value.trim();
        if (!key) {
            keyMessage.textContent = 'Vui lòng nhập key.';
            keyMessage.className = 'message error';
            return;
        }

        try {
            const response = await fetch('/api/verify-key', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ key })
            });

            const result = await response.json();

            if (response.ok && result.success) {
                validKey = key;
                keySection.style.display = 'none';
                converterSection.style.display = 'block';
            } else {
                keyMessage.textContent = result.message || 'Key không hợp lệ.';
                keyMessage.className = 'message error';
            }
        } catch (error) {
            keyMessage.textContent = 'Lỗi kết nối tới server.';
            keyMessage.className = 'message error';
        }
    });

    uploadForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        if (!fileInput.files.length) {
            convertMessage.textContent = 'Bạn chưa chọn file nào.';
            convertMessage.className = 'message error';
            return;
        }

        convertMessage.textContent = 'Đang xử lý, vui lòng chờ...';
        convertMessage.className = 'message info';
        resultSection.style.display = 'none';

        const formData = new FormData();
        formData.append('pngfile', fileInput.files[0]);
        formData.append('key', validKey);

        try {
            const response = await fetch('/api/convert', {
                method: 'POST',
                body: formData
            });

            if (response.ok) {
                const blob = await response.blob();
                const url = URL.createObjectURL(blob);
                downloadLink.href = url;
                resultSection.style.display = 'block';
                convertMessage.textContent = '';
            } else {
                const errorResult = await response.json();
                convertMessage.textContent = errorResult.message || 'Chuyển đổi thất bại.';
                convertMessage.className = 'message error';
            }
        } catch (error) {
            convertMessage.textContent = 'Lỗi server trong quá trình chuyển đổi.';
            convertMessage.className = 'message error';
        }
    });
});
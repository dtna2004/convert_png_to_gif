document.addEventListener('DOMContentLoaded', () => {
    const generateKeyBtn = document.getElementById('generate-key-btn');
    const newKeyDisplay = document.getElementById('new-key-display');
    const keyListUl = document.getElementById('key-list');

    async function fetchKeys() {
        try {
            const response = await fetch('/api/admin/get-keys');
            const keys = await response.json();
            keyListUl.innerHTML = ''; // Xóa danh sách cũ
            keys.forEach(item => {
                const li = document.createElement('li');
                li.textContent = `${item.key} (Tạo lúc: ${new Date(item.created_at).toLocaleString()})`;
                keyListUl.appendChild(li);
            });
        } catch (error) {
            console.error('Lỗi khi lấy danh sách key:', error);
            const li = document.createElement('li');
            li.textContent = 'Không thể tải danh sách key.';
            li.style.color = 'red';
            keyListUl.innerHTML = '';
            keyListUl.appendChild(li);
        }
    }

    generateKeyBtn.addEventListener('click', async () => {
        generateKeyBtn.disabled = true;
        generateKeyBtn.textContent = 'Đang tạo...';
        try {
            const response = await fetch('/api/admin/generate-key', { method: 'POST' });
            const result = await response.json();
            if (result.success) {
                newKeyDisplay.textContent = `Key mới: ${result.key}`;
                fetchKeys(); // Cập nhật lại danh sách key
            } else {
                newKeyDisplay.textContent = 'Tạo key thất bại.';
            }
        } catch (error) {
            console.error('Lỗi khi tạo key:', error);
            newKeyDisplay.textContent = 'Lỗi server khi tạo key.';
        } finally {
            generateKeyBtn.disabled = false;
            generateKeyBtn.textContent = 'Tạo Key Mới';
        }
    });

    fetchKeys();
});
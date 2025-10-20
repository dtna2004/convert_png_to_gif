document.addEventListener('DOMContentLoaded', () => {
    const loginView = document.getElementById('admin-login-view');
    const dashboardView = document.getElementById('admin-dashboard-view');
    const loginBtn = document.getElementById('admin-login-btn');
    const passwordInput = document.getElementById('admin-password');
    const errorMessage = document.getElementById('admin-error-message');

    // Kiểm tra xem có token trong localStorage không
    const token = localStorage.getItem('admin_token');
    if (token) {
        showDashboard();
    }

    loginBtn.addEventListener('click', async () => {
        const password = passwordInput.value;
        try {
            const response = await fetch('/api/admin-login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ password })
            });
            const data = await response.json();
            if (response.ok && data.success) {
                localStorage.setItem('admin_token', data.token);
                showDashboard();
            } else {
                errorMessage.textContent = data.message || 'Đăng nhập thất bại.';
            }
        } catch (error) {
            errorMessage.textContent = 'Lỗi kết nối server.';
        }
    });

    function showDashboard() {
        loginView.classList.add('hidden');
        dashboardView.classList.remove('hidden');
        fetchStats(); // Lấy dữ liệu ngay khi hiển thị
        setInterval(fetchStats, 10000); // Cập nhật mỗi 10 giây

        const generateKeyBtn = document.getElementById('generate-key-btn');
        generateKeyBtn.addEventListener('click', generateNewKey);
    }

    async function fetchStats() {
        const token = localStorage.getItem('admin_token');
        if (!token) return;

        try {
            const response = await fetch('/api/admin/stats', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            
            if (response.status === 401 || response.status === 403) {
                 // Token hết hạn hoặc không hợp lệ, quay về màn hình login
                 localStorage.removeItem('admin_token');
                 window.location.reload();
                 return;
            }

            const data = await response.json();
            document.getElementById('online-users-count').textContent = data.onlineUsers;
            
            const keyList = document.getElementById('key-list');
            keyList.innerHTML = '';
            data.keys.forEach(key => {
                const li = document.createElement('li');
                li.textContent = key;
                keyList.appendChild(li);
            });
        } catch (error) {
            console.error('Lỗi khi lấy dữ liệu admin:', error);
        }
    }

    async function generateNewKey() {
        const token = localStorage.getItem('admin_token');
        if (!token) return;

        try {
            const response = await fetch('/api/admin/generate-key', {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (response.ok) {
                fetchStats(); // Cập nhật lại danh sách key
            } else {
                alert('Không thể tạo key mới.');
            }
        } catch (error) {
            console.error('Lỗi khi tạo key:', error);
        }
    }
});
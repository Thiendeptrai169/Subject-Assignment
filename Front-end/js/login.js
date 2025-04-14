document.getElementById('cms_bm_frm_login').addEventListener('submit', async (event) => {
    event.preventDefault();

    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;
    const messageElement = document.getElementById('message');

    try {
        console.log('Đang gửi yêu cầu đăng nhập...');
        const response = await fetch('/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ username, password })
        });

        console.log('Nhận được response:', response.status);
        const data = await response.json();
        console.log('Dữ liệu response:', data);

        if (!response.ok) {
            throw new Error(data.message || 'Có lỗi xảy ra');
        }
        // Xóa toàn bộ nếu không lưu gì quan trọng khác
        localStorage.clear();

        // Lưu token vào localStorage
        // localStorage.setItem('token', data.token);
        // console.log('Token saved:', data.token);
        localStorage.setItem('token', data.token);
        localStorage.setItem('role', data.role);



        // Kiểm tra token đã được lưu
        const savedToken = localStorage.getItem('token');
        console.log('Token after save:', savedToken);

        // Chuyển hướng dựa vào role
        if (data.role === 1) { // Admin
            window.location.href = './index.html';
        } else if (data.role === 2) { // Teacher
            window.location.href = './index.html';
        }
    } catch (error) {
        console.error('Lỗi đăng nhập:', error);
        messageElement.innerText = error.message || 'Có lỗi xảy ra. Vui lòng thử lại.';
    }
});

// Xử lý hiển thị/ẩn mật khẩu
const showPass = document.querySelector('.show-pass');
const hidePass = document.querySelector('.hide-pass');
const passwordInput = document.querySelector('#password');

showPass.addEventListener('click', () => {
    passwordInput.type = 'text';
    showPass.style.display = 'none';
    hidePass.style.display = 'block';
});

hidePass.addEventListener('click', () => {
    passwordInput.type = 'password';
    showPass.style.display = 'block';
    hidePass.style.display = 'none';
});
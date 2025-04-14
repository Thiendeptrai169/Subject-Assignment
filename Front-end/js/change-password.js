
const form = document.getElementById('changePasswordForm');
const message = document.getElementById('message');

form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const oldPassword = document.getElementById('oldPassword').value;
    const newPassword = document.getElementById('newPassword').value;
    const confirmPassword = document.getElementById('confirmPassword').value;
    const token = localStorage.getItem('token');

    if (newPassword !== confirmPassword) {
        message.textContent = 'Mật khẩu mới không khớp.';
        message.classList.add('text-danger');
        return;
    }

    if (!token) {
        message.textContent = 'Bạn chưa đăng nhập.';
        message.classList.add('text-danger');
        return;
    }

    try {
        const response = await fetch('/change-password', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer ' + token
            },
            body: JSON.stringify({ oldPassword, newPassword })
        });

        const result = await response.json();

        if (response.ok) {
            message.textContent = result.message;
            message.classList.remove('text-danger');
            message.classList.add('text-success');
            form.reset();
        } else {
            message.textContent = result.message;
            message.classList.remove('text-success');
            message.classList.add('text-danger');
        }
    } catch (error) {
        console.error('Lỗi:', error);
        message.textContent = 'Có lỗi xảy ra khi đổi mật khẩu.';
        message.classList.add('text-danger');
    }
});
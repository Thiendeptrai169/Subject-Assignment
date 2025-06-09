(function() {
    console.log('Notification script loaded');

    let editingNotificationId = null;

    // Kiểm tra đăng nhập và quyền
    function checkAuth() {
        const token = localStorage.getItem('token');
        if (!token) {
            window.location.href = '/login.html';
            return false;
        }
        try {
            const payload = JSON.parse(atob(token.split('.')[1]));
            if (payload.role !== 1) {
                window.location.href = '/login.html';
                return false;
            }
            return true;
        } catch {
            window.location.href = '/login.html';
            return false;
        }
    }

    // Gọi API có token
    async function fetchWithAuth(url, options = {}) {
        const token = localStorage.getItem('token');
        if (!token) throw new Error('Chưa đăng nhập');
        const response = await fetch(url, {
            ...options,
            headers: {
                ...(options.headers || {}),
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });
        if (!response.ok) throw new Error(await response.text());
        return response.json();
    }

    // Hiển thị đúng các trường chọn
    function updateTargetSelection() {
        const type = document.getElementById('RecipientType').value;
        document.getElementById('classSelection').style.display = 'block';
        document.getElementById('groupSelection').style.display = (type === 'GROUP') ? 'block' : 'none';
        document.getElementById('studentSelection').style.display = (type === 'STUDENT') ? 'block' : 'none';
    }

    // Load danh sách lớp
    async function loadClasses() {
        console.log('Gọi loadClasses');
        try {
            const data = await fetchWithAuth('/api/notifications/classes/lecturer');
            console.log('Danh sách lớp:', data);
            const classSelect = document.getElementById('classSelect');
            classSelect.innerHTML = '<option value="">Chọn lớp</option>';
            data.forEach(cls => {
                    const option = document.createElement('option');
                option.value = cls.Id;
                option.textContent = cls.ClassName;
                classSelect.appendChild(option);
            });
        } catch (err) {
            console.error('Lỗi loadClasses:', err);
            alert('Không thể tải danh sách lớp');
        }
    }

    // Load nhóm theo lớp
    async function loadGroups(classId) {
        console.log('Gọi loadGroups với classId:', classId);
        if (!classId) return;
        try {
            const data = await fetchWithAuth(`/api/notifications/groups?classId=${classId}`);
            console.log('Danh sách nhóm:', data);
            const groupSelect = document.getElementById('groupSelect');
                groupSelect.innerHTML = '<option value="">Chọn nhóm</option>';
                data.forEach(group => {
                    const option = document.createElement('option');
                    option.value = group.Id;
                    option.textContent = group.GroupName;
                    groupSelect.appendChild(option);
                });
        } catch {
            alert('Không thể tải nhóm');
        }
    }

    // Load sinh viên theo lớp
    async function loadStudents(classId) {
        console.log('Gọi loadStudents với classId:', classId);
        if (!classId) return;
        try {
            const data = await fetchWithAuth(`/api/notifications/students?classId=${classId}`);
            console.log('Danh sách sinh viên:', data);
            const studentSelect = document.getElementById('studentSelect');
            studentSelect.innerHTML = '<option value="">Chọn sinh viên</option>';
            data.forEach(stu => {
                const option = document.createElement('option');
                option.value = stu.StudentCode;
                option.textContent = `${stu.StudentCode} - ${stu.FullName}`;
                studentSelect.appendChild(option);
            });
        } catch {
            alert('Không thể tải sinh viên');
        }
    }

    // Khi chọn lớp, load nhóm và sinh viên
    function onClassChange() {
        const classId = document.getElementById('classSelect').value;
        if (document.getElementById('groupSelection').style.display === 'block') {
            loadGroups(classId);
        }
        if (document.getElementById('studentSelection').style.display === 'block') {
            loadStudents(classId);
        }
    }

    // Gửi thông báo
    async function submitNotification(e) {
        e.preventDefault();
        const action = document.querySelector('input[name="action"]:checked').value;
        const title = document.getElementById('title').value.trim();
        const content = document.getElementById('content').value.trim();
        const type = document.getElementById('RecipientType').value;
        const classId = document.getElementById('classSelect').value;
        let body = { title, content, classId: parseInt(classId) };

        if (!title || !content || !classId) {
            alert('Vui lòng nhập đủ thông tin!');
            return;
        }
        if (type === 'GROUP') {
            const groupId = document.getElementById('groupSelect').value;
            if (!groupId) return alert('Chọn nhóm!');
            body.groupId = parseInt(groupId);
        }
        if (type === 'STUDENT') {
            const studentCode = document.getElementById('studentSelect').value;
            if (!studentCode) return alert('Chọn sinh viên!');
            body.studentCode = studentCode;
        }

        // Kiểm tra chế độ sửa/thêm
        if (action === 'edit') {
            if (!editingNotificationId) {
                alert('Bạn phải nhập mã thông báo và bấm Tìm để sửa!');
                return;
            }
            // Sửa thông báo
            await fetchWithAuth(`/api/notifications/${editingNotificationId}`, {
                method: 'PUT',
                body: JSON.stringify(body)
            });
            alert('Đã cập nhật thông báo!');
            editingNotificationId = null;
            updateSubmitButton();
        } else {
            // Thêm mới
            await fetchWithAuth('/api/notifications', {
                method: 'POST',
                body: JSON.stringify(body)
            });
            alert('Đã gửi thông báo!');
        }
        document.getElementById('notificationForm').reset();
        updateTargetSelection();
        loadNotifications();
    }

    // Load danh sách thông báo
    async function loadNotifications() {
        console.log('Gọi loadNotifications');
        try {
            const data = await fetchWithAuth('/api/notifications');
            console.log('Danh sách thông báo:', data);
            const list = document.getElementById('notificationList');
            list.innerHTML = '';
            data.forEach(noti => {
                const tr = document.createElement('tr');
                tr.innerHTML = `
                    <td>${noti.Id}</td>
                    <td>${noti.Title || noti.title || ''}</td>
                    <td>${noti.RecipientName || noti.recipientName || ''}</td>
                    <td>${noti.CreatedAt ? new Date(noti.CreatedAt).toLocaleString() : (noti.createdAt ? new Date(noti.createdAt).toLocaleString() : '')}</td>
                    <td>${noti.Content || noti.content || ''}</td>
                `;
                list.appendChild(tr);
            });
        } catch {
            alert('Không thể tải thông báo');
        }
    }

    function updateEditSection() {
        const action = document.querySelector('input[name="action"]:checked').value;
        const editSection = document.getElementById('editSection');
        if (action === 'edit') {
            editSection.style.display = 'block';
            document.getElementById('notificationId').disabled = false;
        } else {
            editSection.style.display = 'none';
            document.getElementById('notificationId').disabled = true;
            editingNotificationId = null;
            updateSubmitButton();
        }
    }

    function updateSubmitButton() {
        const btn = document.querySelector('#notificationForm button[type="submit"]');
        if (editingNotificationId) {
            btn.innerHTML = '<i class="fas fa-save"></i> Cập nhật';
        } else {
            btn.innerHTML = '<i class="fas fa-paper-plane"></i> Gửi Thông Báo';
        }
    }

    function initNotificationPage() {
        if (!checkAuth()) return;
        updateTargetSelection();
        loadClasses();
        loadNotifications();

        document.getElementById('RecipientType').addEventListener('change', function() {
            updateTargetSelection();
            onClassChange();
        });
        document.getElementById('classSelect').addEventListener('change', onClassChange);
        document.getElementById('notificationForm').addEventListener('submit', submitNotification);

        // Gắn sự kiện cho radio group
        document.querySelectorAll('input[name="action"]').forEach(radio => {
            radio.addEventListener('change', updateEditSection);
        });
        updateEditSection(); // Gọi lần đầu để set đúng trạng thái

        document.querySelector('#editSection button').addEventListener('click', async function() {
            const notificationId = document.getElementById('notificationId').value.trim();
            if (!notificationId) {
                alert('Vui lòng nhập mã thông báo!');
                return;
            }
            try {
                const data = await fetchWithAuth(`/api/notifications/${notificationId}`);
                // Hiện thông tin thông báo ra form để sửa
                // Ví dụ:
                document.getElementById('title').value = data.Title || data.title || '';
                document.getElementById('content').value = data.Content || data.content || '';
                // ... các trường khác nếu cần
                alert('Đã tìm thấy thông báo!');
                editingNotificationId = notificationId; // Lưu lại id đang sửa
                updateSubmitButton();
            } catch (err) {
                alert('Không thấy thông báo!');
            }
        });
    }

    window.initNotificationPage = initNotificationPage;
})();
document.addEventListener("DOMContentLoaded", function () {
    initNotificationPage();
});
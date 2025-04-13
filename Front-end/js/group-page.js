async function fetchWithAuth(url, options = {}) {
    const token = localStorage.getItem('token');
    if (!token) throw new Error('Chưa đăng nhập hoặc thiếu token');

    const response = await fetch(url, {
        ...options,
        headers: {
            ...(options.headers || {}),
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        }
    });

    if (!response.ok) {
        const err = await response.json();
        throw new Error(err.message || 'Lỗi server');
    }

    return response.json();
}
async function loadSemester() {
    try {
        // Gọi API để lấy học kỳ hiện tại
        const res = await fetch('/api/semesters/current', {
            headers: {
                Authorization: `Bearer ${localStorage.getItem('token')}`
            }
        });
        const data = await res.json();

        // Kiểm tra nếu không có học kỳ hiện tại
        if (!data.AcademicYear || !data.Semester) {
            alert('Không tìm thấy học kỳ hiện tại.');
            return;
        }

        // Hiển thị thông tin học kỳ
        const semesterInfo = document.getElementById('semesterInfo');
        semesterInfo.textContent = `Học kỳ ${data.Semester} - Năm học ${data.AcademicYear}`;
    } catch (err) {
        console.error('Lỗi khi tải học kỳ:', err);
        alert('Không thể tải thông tin học kỳ, vui lòng thử lại');
    }
}



function getStatusBadgeClass(status) {
    switch (status) {
        case 'ĐANG LÀM':
            return 'status-active';
        case 'ĐÃ BÁO CÁO':
            return 'status-completed';
        case 'TRỐNG':
            return 'status-pending';
        default:
            return 'status-pending';
    }
}

function formatDate(dateString) {
    if (!dateString) return 'Chưa có';
    const date = new Date(dateString);
    return date.toLocaleDateString('vi-VN');
}

async function loadMyGroups() {
    try {
        const data = await fetchWithAuth('/api/my-groups');
        const groupList = document.getElementById('groupList');

        if (data.length === 0) {
            groupList.innerHTML = `
    <div class="text-center text-muted">
      <i class="fas fa-users fa-2x"></i>
      <p class="mt-2">Bạn chưa tham gia nhóm nào trong học kì này.</p>
    </div>
  `;
            return;
        }

        groupList.innerHTML = data.map(group => `
  <div class="group-item">
    <div class="group-header">
        <div class="d-flex align-items-center">
            <div class="group-icon"><i class="fas fa-users"></i></div>
        <h2 class="group-name">${group.GroupName}</h2>
      </div>
      <span class="status-badge ${getStatusBadgeClass(group.GroupStatus)}">${group.GroupStatus}</span>
    </div>
    <div class="group-info">
      <div class="info-row">
        <i class="fas fa-book"></i>
        <span class="label fw-bold">Môn học:</span>
        <span>${group.SubjectName}</span>
      </div>
      <div class="info-row">
        <i class="fas fa-tasks"></i>
        <span class="label fw-bold">Đề tài:</span>
        <span>${group.ProjectName}</span>
      </div>
      <div class="info-row">
        <i class="fas fa-user-friends"></i>
        <span class="label fw-bold">Số thành viên:</span>
        <span>${group.TotalMember}</span>
      </div>
      <div class="info-row">
        <i class="fas fa-calendar-alt"></i>
        <span class="label fw-bold">Ngày thuyết trình:</span>
        <span>${formatDate(group.PresentationDate)}</span>
        <a href="group-detail.html?groupId=${group.GroupId}" class="view-detail">Xem chi tiết</a>
      </div>
    </div>
  </div>
`).join('');
    } catch (err) {
        console.error('Lỗi khi tải danh sách nhóm:', err);
        alert('Không thể tải danh sách nhóm, vui lòng thử lại');
    }
}


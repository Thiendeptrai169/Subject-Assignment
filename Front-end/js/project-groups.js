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


async function renderProjectGroups() {
    const container = document.getElementById("group-list");
    const params = new URLSearchParams(window.location.search);
    const projectId = params.get("projectId");

    const token = localStorage.getItem("token");
    if (!token) {
        container.innerHTML = `<div class="alert alert-warning">Không tìm thấy token.</div>`;
        return;
    }

    try {
        const response = await fetch(`/api/project-groups/${projectId}`, {
            headers: {
                Authorization: `Bearer ${token}`
            }
        });

        if (!response.ok) throw new Error("Không thể lấy dữ liệu");

        const data = await response.json();
        if (data.length === 0) {
            container.innerHTML = `<div class="alert alert-info">Chưa có nhóm nào thực hiện đề tài này.</div>`;
            return;
        }

        container.innerHTML = data.map(group => `
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
        console.error("Lỗi:", err);
        container.innerHTML = `<div class="alert alert-danger">${err.message}</div>`;
    }
}

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

function formatDate(dateString) {
  if (!dateString) return 'Chưa có';
  const date = new Date(dateString);
  return date.toLocaleDateString('vi-VN');
}


function renderReportDetails(reports) {
  const container = document.getElementById('reportDetailsModalBody');
  if (!reports || reports.length === 0) {
    container.innerHTML = '<p>Chưa có báo cáo nào.</p>';
    return;
  }

  // Tạo bảng hoặc danh sách chi tiết
  let html = `
    <table class="table table-bordered">
      <thead>
        <tr>
          <th>Đợt báo cáo</th>
          <th>Trạng thái</th>
          <th>Điểm</th>
          <th>Tỷ lệ phần trăm</th>
          <th>Ngày báo cáo</th>
          <th>Mô tả</th>
        </tr>
      </thead>
      <tbody>
  `;

  reports.forEach(report => {
    const dateStr = report.ReportDate ? new Date(report.ReportDate).toLocaleDateString('vi-VN') : 'Chưa có';
    html += `
      <tr>
        <td>${report.ReportOrder}</td>
        <td>${report.ReportPeriodStatus}</td>
        <td>${report.ScorePeriod}</td>
        <td>${report.PercentScorePeriod}%</td>
        <td>${dateStr}</td>
        <td>${report.Description || ''}</td>
      </tr>
    `;
  });

  html += '</tbody></table>';
  container.innerHTML = html;


}

async function loadMyGroups() {
  try {
    const data = await fetchWithAuth('/api/my-groups');
    const groupList = document.getElementById('groupList');

    if (data.length === 0) {
      groupList.innerHTML = `
        <div class="text-center text-muted">
          <i class="fas fa-users fa-2x"></i>
          <p class="mt-2">Bạn chưa tham gia nhóm nào.</p>
        </div>
      `;
      return;
    }

    groupList.innerHTML = data.map(group => `
      <div class="group-item">
        <div class="group-header d-flex justify-content-between align-items-center">
          <div class="d-flex align-items-center gap-2">
            <div class="group-icon"><i class="fas fa-users"></i></div>
            <h2 class="group-name mb-0">${group.GroupName}</h2> 
          </div>
          <a href="group-detail.html?groupId=${group.GroupId}" class="view-detail ms-3">Chi tiết nhóm</a>
         </div>
        <div class="group-info mt-2">
          <div class="info-row">
            <i class="fas fa-book"></i>
            <span class="label fw-bold ms-2">Môn học:</span>
            <span class="ms-1">${group.SubjectName || 'N/A'}</span>
          </div>
          <div class="info-row">
            <i class="fas fa-book"></i>
            <span class="label fw-bold ms-2">Lớp:</span>
            <span class="ms-1">${group.ClassCode || 'N/A'}</span>
          </div>
          <div class="info-row">
            <i class="fas fa-tasks"></i>
            <span class="label fw-bold ms-2">Đề tài:</span>
            <span class="ms-1">${group.ProjectName || 'N/A'}</span>
          </div>
          <div class="info-row">
            <i class="fas fa-user-friends"></i>
            <span class="label fw-bold ms-2">Số thành viên:</span>
            <span class="ms-1">${group.TotalMembers ?? 'Chưa rõ'}</span>
          </div>
          <div class="info-row">
            <i class="fas fa-file-alt"></i>
            <span class="label fw-bold ms-2">Trạng thái báo cáo:</span>
            <button class="btn btn-link btn-sm view-report-details" data-group-id="${group.GroupId}">
              Xem chi tiết
            </button>
          </div>
        </div>
      </div>
    `).join('');

  } catch (err) {
    console.error('Lỗi khi tải danh sách nhóm:', err);
    alert('Không thể tải danh sách nhóm, vui lòng thử lại');
  }
}

document.addEventListener('click', async function (event) {
  if (event.target.matches('.view-report-details')) {
    const groupId = event.target.getAttribute('data-group-id');
    if (!groupId) return;

    try {
      const data = await fetchWithAuth(`/api/report-period/${groupId}/reports`);
      renderReportDetails(data.reports);

      // Mở lại modal mỗi lần (đảm bảo không lỗi)
      const modalElement = document.getElementById('reportDetailsModal');
      const modal = bootstrap.Modal.getOrCreateInstance(modalElement);
      modal.show();

    } catch (error) {
      console.error(error);
      alert('Có lỗi xảy ra khi tải dữ liệu báo cáo');
    }
  }
});



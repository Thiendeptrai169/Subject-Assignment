// Các hàm render được tách ra bên ngoài (giữ nguyên)
function renderReportDetails(reports) {
  const container = document.getElementById('reportDetailsModalBody');
  if (!reports || reports.length === 0) {
    container.innerHTML = '<p>Chưa có báo cáo nào.</p>';
    return;
  }

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

function renderMemberListManage(members) {
  const membersTableBody = document.querySelector('#membersTable tbody');
  
  if (!members || members.length === 0) {
    membersTableBody.innerHTML = '<tr><td colspan="5" class="text-center">Nhóm chưa có thành viên nào.</td></tr>';
    return;
  }

  let html = '';
  members.forEach(member => {
    const joinDate = member.JoinGroupDate ? new Date(member.JoinGroupDate).toLocaleDateString('vi-VN') : '';
    html += `
      <tr>
        <td>${member.StudentCode}</td>
        <td>${member.FullName}</td>
        <td>${member.StudentRole}</td>
        <td>${joinDate}</td>
        <td>
          <button class="btn btn-sm btn-danger btn-remove-member" data-student-code="${member.StudentCode}" title="Xóa thành viên">
            <i class="fa fa-trash"></i>
          </button>
        </td>
      </tr>
    `;
  });

  membersTableBody.innerHTML = html;
}

function renderEligibleStudentsSelect(students) {
  const addMemberSelect = document.getElementById('addMemberSelect');
  const addMemberBtn = document.getElementById('addMemberBtn');

  // Lưu danh sách sinh viên gốc
  let originalStudentsList = students || [];

  // Xóa Select2 cũ nếu có
  if ($(addMemberSelect).hasClass('select2-hidden-accessible')) {
    $(addMemberSelect).select2('destroy');
  }

  // Xóa các option cũ và thêm option mặc định
  addMemberSelect.innerHTML = '<option value="">-- Chọn sinh viên thêm --</option>';

  if (!originalStudentsList || originalStudentsList.length === 0) {
    addMemberSelect.innerHTML += `<option disabled>Không có sinh viên phù hợp</option>`;
    addMemberBtn.disabled = true;
  } else {
    // Thêm tất cả sinh viên vào select
    originalStudentsList.forEach(student => {
      const option = document.createElement('option');
      option.value = student.StudentCode;
      option.textContent = `${student.FullName} (${student.StudentCode})`;
      addMemberSelect.appendChild(option);
    });
  }

  // Khởi tạo Select2 với tính năng tìm kiếm và fix z-index cho modal
  $(addMemberSelect).select2({
    placeholder: '-- Chọn sinh viên thêm --',
    allowClear: true,
    width: '100%',
    dropdownParent: $('#manageMembersModal'), // Fix cho modal
    language: {
      noResults: function() {
        return "Không tìm thấy sinh viên";
      },
      searching: function() {
        return "Đang tìm kiếm...";
      }
    },
    matcher: function(params, data) {
      // Nếu không có từ khóa tìm kiếm, hiển thị tất cả
      if ($.trim(params.term) === '') {
        return data;
      }

      // Nếu không có text (option mặc định), bỏ qua
      if (typeof data.text === 'undefined') {
        return null;
      }

      // Tìm kiếm theo tên và mã sinh viên (không phân biệt hoa thường)
      const searchTerm = params.term.toLowerCase();
      const optionText = data.text.toLowerCase();
      
      if (optionText.indexOf(searchTerm) > -1) {
        return data;
      }

      // Trả về null nếu không khớp
      return null;
    }
  });

  // Xử lý sự kiện thay đổi selection
  $(addMemberSelect).on('change', function() {
    addMemberBtn.disabled = this.value === '';
  });

  // Đặt trạng thái ban đầu cho nút thêm
  addMemberBtn.disabled = addMemberSelect.value === '';
}

// Utility function cho debounce
function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

// Biến global để theo dõi trạng thái khởi tạo
let lecturerSubjectsPageInitialized = false;
let lecturerSubjectsPageCleanup = null;

// Hàm init với việc cleanup event listeners
function initLecturerSubjectsPage() {
  // Nếu đã khởi tạo rồi, cleanup trước khi khởi tạo lại
  if (lecturerSubjectsPageInitialized && lecturerSubjectsPageCleanup) {
    lecturerSubjectsPageCleanup();
  }

  const API_URL = '/api/lecturer-subjects';
  const token = localStorage.getItem('token');

  // DOM elements
  const tableBody = document.querySelector('#student-groups-table tbody');
  const groupCountSpan = document.getElementById('group-count');
  const subjectFilter = document.getElementById('subject-filter');
  const classFilter = document.getElementById('class-filter');
  const projectFilter = document.getElementById('project-filter');
  const statusFilter = document.getElementById('status-filter');
  const searchInput = document.getElementById('search-input');
  const searchButton = document.getElementById('search-button');
  const pagination = document.getElementById('pagination');

  // Modal elements
  const editGroupModalElement = document.getElementById('editGroupModal');
  const editGroupModal = new bootstrap.Modal(editGroupModalElement);
  const editGroupForm = document.getElementById('editGroupForm');
  const confirmDeleteModalElement = document.getElementById('confirmDeleteModal');
  const confirmDeleteModal = new bootstrap.Modal(confirmDeleteModalElement);
  const confirmDeleteBtn = document.getElementById('confirmDeleteBtn');
  const deleteSuccessModalElement = document.getElementById('deleteSuccessModal');
  const deleteSuccessModal = new bootstrap.Modal(deleteSuccessModalElement);
  const manageMembersModalElement = document.getElementById('manageMembersModal');
  const manageMembersModal = new bootstrap.Modal(manageMembersModalElement);
  const membersTableBody = document.querySelector('#membersTable tbody');
  const addMemberBtn = document.getElementById('addMemberBtn');

  // State variables
  let currentGroupId = null;
  let currentMembers = [];
  let eligibleStudents = [];
  let groupsData = [];
  let currentPage = 1;
  let groupIdToDelete = null;
  const pageSize = 10;

  // Array để lưu trữ các event listeners để cleanup sau
  const eventListeners = [];

  // Helper function để thêm event listener và lưu trữ để cleanup
  function addEventListenerWithCleanup(element, event, handler, options = false) {
    if (element) {
      element.addEventListener(event, handler, options);
      eventListeners.push({ element, event, handler, options });
    }
  }

  // Utility functions
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

  async function fetchProjects(subjectClassId) {
    try {
      const data = await fetchWithAuth(`/api/subclass-projects/${subjectClassId}/projects`);
      return data.projects || [];
    } catch (err) {
      console.error('Lỗi lấy danh sách đề tài:', err);
      return [];
    }
  }

  async function fetchGroupMembers(groupId) {
    try {
      const data = await fetchWithAuth(`/api/my-group-detail/group-detail/${groupId}`);
      return data.Members || [];
    } catch (err) {
      console.error('Lỗi lấy thành viên nhóm:', err);
      return [];
    }
  }

  // Các hàm xử lý sự kiện (sử dụng closure)
  async function handleViewReportDetails(groupId) {
    if (!groupId) return alert('Không xác định được nhóm');

    try {
      const data = await fetchWithAuth(`/api/report-period/${groupId}/reports`);
      renderReportDetails(data.reports);

      const modalElement = document.getElementById('reportDetailsModal');
      const modal = bootstrap.Modal.getOrCreateInstance(modalElement);
      modal.show();
    } catch (error) {
      console.error(error);
      alert('Có lỗi xảy ra khi tải dữ liệu báo cáo');
    }
  }

  async function handleViewMembers(groupId) {
    if (!groupId) return alert('Không xác định được nhóm');

    try {
      const data = await fetchWithAuth(`/api/my-group-detail/group-detail/${groupId}`);
      renderMemberListManage(data.Members);

      const membersModalElement = document.getElementById('manageMembersModal');
      const membersModal = bootstrap.Modal.getOrCreateInstance(membersModalElement);
      membersModal.show();
    } catch (error) {
      console.error(error);
      alert('Không thể tải danh sách thành viên');
    }
  }

  async function handleEditGroup(groupId) {
    if (!groupId) return alert('Không xác định được nhóm');

    const group = groupsData.find(g => g.GroupId == groupId);
    if (!group) return alert('Nhóm không tồn tại');

    // Điền các trường disabled
    const editGroupIdInput = document.getElementById('editGroupId');
    const editGroupCodeInput = document.getElementById('editGroupCode');
    const editGroupNameInput = document.getElementById('editGroupName');
    const editSubjectNameInput = document.getElementById('editSubjectName');
    const editClassNameInput = document.getElementById('editClassName');
    const editTotalMembersInput = document.getElementById('editTotalMembers');
    const editProjectSelect = document.getElementById('editProject');
    const editGroupLeaderSelect = document.getElementById('editGroupLeader');

    editGroupIdInput.value = group.GroupId;
    editGroupCodeInput.value = group.GroupId || '';
    editGroupNameInput.value = group.GroupName || '';
    editSubjectNameInput.value = group.SubjectName || '';
    editClassNameInput.value = group.ClassCode || '';
    editTotalMembersInput.value = group.TotalMembers || 0;

    // Load đề tài vào select
    const groupDetail = await fetchWithAuth(`/api/my-group-detail/group-detail/${groupId}`);
    const subjectClassId = groupDetail.SubjectClassId;
    const projects = await fetchProjects(subjectClassId);
    editProjectSelect.innerHTML = '<option value="">-- Chọn đề tài --</option>';
    projects.forEach(proj => {
      const opt = document.createElement('option');
      opt.value = proj.ProjectCode;
      opt.textContent = proj.ProjectName;
      if (proj.ProjectCode === group.ProjectCode) opt.selected = true;
      editProjectSelect.appendChild(opt);
    });

    // Load thành viên nhóm vào select trưởng nhóm
    const members = await fetchGroupMembers(groupId);
    editGroupLeaderSelect.innerHTML = '<option value="">-- Chọn trưởng nhóm --</option>';
    members.forEach(mem => {
      const opt = document.createElement('option');
      opt.value = mem.StudentCode;
      opt.textContent = mem.FullName +' (' + mem.StudentCode + ')';
      if (mem.StudentCode === group.LeaderCode) opt.selected = true;
      editGroupLeaderSelect.appendChild(opt);
    });

    editGroupModal.show();
  }

  async function handleRemoveMember(studentCode) {
    if (!studentCode) return;
    if (!confirm('Bạn có chắc muốn xóa thành viên này khỏi nhóm?')) return;

    try {
      await fetchWithAuth(`/api/my-group-detail/${currentGroupId}/members/${studentCode}`, {
        method: 'DELETE'
      });
      alert('Xóa thành viên thành công!');
      manageMembersModal.hide();
      fetchData();
    } catch (error) {
      console.error(error);
      alert('Lỗi khi xóa thành viên');
    }
  }

  async function handleAddMember(studentCodeToAdd) {
    if (!studentCodeToAdd) {
      alert('Vui lòng chọn sinh viên để thêm');
      return;
    }

    try {
      await fetchWithAuth(`/api/my-group-detail/${currentGroupId}/members`, {
        method: 'POST',
        body: JSON.stringify({ StudentCode: studentCodeToAdd })
      });

      alert('Thêm thành viên thành công!');
      manageMembersModal.hide();
      fetchData();
    } catch (error) {
      console.error(error);
      alert('Lỗi khi thêm thành viên');
    }
  }

  async function loadManageMembersData(groupId) {
    try {
      currentGroupId = groupId;

      // 1. Lấy thành viên nhóm
      const membersData = await fetchWithAuth(`/api/my-group-detail/group-detail/${groupId}`);
      currentMembers = membersData.Members || [];
      renderMemberListManage(currentMembers);

      // 2. Lấy SubjectClassId của nhóm
      const subjectClassId = membersData.SubjectClassId;
      if (!subjectClassId) {
        alert('Không xác định được lớp tín chỉ của nhóm');
        return { currentMembers: [], eligibleStudents: [] };
      }

      // 3. Gọi API lấy danh sách sinh viên lớp tín chỉ
      const classStudentsData = await fetchWithAuth(`/api/subject-class/${subjectClassId}/students`);
      let eligibleStudentsTemp = classStudentsData.students || [];

      // 4. Loại bỏ sinh viên đã có trong nhóm
      const currentStudentCodes = new Set(currentMembers.map(m => m.StudentCode));
      eligibleStudentsTemp = eligibleStudentsTemp.filter(stu => !currentStudentCodes.has(stu.StudentCode));

      // 5. Render select thêm thành viên với Select2
      eligibleStudents = eligibleStudentsTemp;
      
      // Show modal trước khi render Select2
      manageMembersModal.show();
      
      // Render Select2 sau khi modal đã hiển thị
      setTimeout(() => {
        renderEligibleStudentsSelect(eligibleStudents);
      }, 100);

      return { currentMembers, eligibleStudents };
    } catch (error) {
      console.error('Lỗi tải dữ liệu thành viên:', error);
      alert('Không thể tải dữ liệu thành viên nhóm');
      return { currentMembers: [], eligibleStudents: [] };
    }
  }

  async function fetchData() {

    try {
      const res = await fetch(API_URL, {
        headers: { Authorization: 'Bearer ' + token }
      });
      if (!res.ok) throw new Error('Lỗi khi lấy dữ liệu nhóm');
      const data = await res.json();
      groupsData = data.groups || [];
      groupCountSpan.textContent = `Tổng số nhóm: ${data.total || 0}`;

      populateFilters();
      renderTable();
    } catch (e) {
      console.error(e);
      groupCountSpan.textContent = 'Lỗi khi tải dữ liệu nhóm';
      tableBody.innerHTML = `<tr><td colspan="10" class="text-center">Lỗi khi tải dữ liệu nhóm</td></tr>`;
    }
  }

  function renderTable() {
    let filtered = groupsData.filter(group => {
      // Lọc theo dropdown filters
      if (subjectFilter.value && group.SubjectName !== subjectFilter.value) return false;
      if (classFilter.value && group.ClassCode !== classFilter.value) return false;
      if (projectFilter.value && group.ProjectName !== projectFilter.value) return false;


      // Tìm kiếm theo tên nhóm hoặc tên đề tài
      const search = searchInput.value.trim().toLowerCase();
      if (search) {
        const groupName = (group.GroupName || '').toLowerCase();
        const projectName = (group.ProjectName || '').toLowerCase();
        
        if (!groupName.includes(search) && !projectName.includes(search)) {
          return false;
        }
      }
      return true;
    });

    const totalPage = Math.ceil(filtered.length / pageSize);
    if (currentPage > totalPage) currentPage = totalPage || 1;

    const start = (currentPage - 1) * pageSize;
    const end = start + pageSize;
    const pageData = filtered.slice(start, end);

    tableBody.innerHTML = '';
    if (pageData.length === 0) {
      const searchTerm = searchInput.value.trim();
      const message = searchTerm 
        ? `Không tìm thấy nhóm nào có tên nhóm hoặc tên đề tài chứa "${searchTerm}"`
        : 'Không có nhóm phù hợp';
      tableBody.innerHTML = `<tr><td colspan="10" class="text-center">${message}</td></tr>`;
    } else {
      pageData.forEach((group, idx) => {
        const tr = document.createElement('tr');
        tr.setAttribute('data-group-id', group.GroupId);
        tr.innerHTML = `
          <td>${start + idx + 1}</td>
          <td>${group.GroupName}</td>
          <td>${group.SubjectName || ''}</td>
          <td>${group.ClassCode || ''}</td>
          <td>${group.ProjectName || ''}</td>
          <td>${group.LeaderName || ''}</td>
          <td>${group.TotalMembers || 0}</td>
          <td>
            <button class="btn btn-link btn-sm view-report-details" data-group-id="${group.GroupId}">
              Xem chi tiết
            </button>
          </td>
          <td class="d-flex">
          <button class="btn btn-sm btn-success btn-view-members m-1" data-group-id="${group.GroupId}" title="Xem thành viên"><i class="fa fa-user"></i></button>
            <button class="btn btn-sm btn-primary btn-edit m-1" title="Sửa nhóm"><i class="fa fa-pencil-square"></i></button>
            <button class="btn btn-sm btn-danger btn-delete m-1" title="Xóa nhóm"><i class="fa fa-trash"></i></button>
          </td>
        `;
        tableBody.appendChild(tr);
      });
    }

    renderPagination(totalPage);
    
    // Cập nhật số lượng kết quả
    groupCountSpan.textContent = `Hiển thị ${filtered.length} trong tổng số ${groupsData.length} nhóm`;
  }

  function renderPagination(totalPage) {
    pagination.innerHTML = '';
    for (let i = 1; i <= totalPage; i++) {
      const li = document.createElement('li');
      li.className = 'page-item' + (i === currentPage ? ' active' : '');
      li.innerHTML = `<a class="page-link" href="#">${i}</a>`;
      li.addEventListener('click', e => {
        e.preventDefault();
        currentPage = i;
        renderTable();
      });
      pagination.appendChild(li);
    }
  }

  function populateFilters() {
    const subjects = [...new Set(groupsData.map(g => g.SubjectName).filter(Boolean))].sort();
    const classes = [...new Set(groupsData.map(g => g.ClassCode).filter(Boolean))].sort();
    const projects = [...new Set(groupsData.map(g => g.ProjectName).filter(Boolean))].sort();

    fillSelectOptions(subjectFilter, subjects);
    fillSelectOptions(classFilter, classes);
    fillSelectOptions(projectFilter, projects);
  }

  function fillSelectOptions(selectEl, options) {
    const firstOption = selectEl.options[0];
    selectEl.innerHTML = '';
    selectEl.appendChild(firstOption);
    options.forEach(opt => {
      const option = document.createElement('option');
      option.value = opt;
      option.textContent = opt;
      selectEl.appendChild(option);
    });
  }

  // Debounced search function
  const debouncedSearch = debounce(() => {
    currentPage = 1;
    renderTable();
  }, 300);

  // Event handlers
  const handleSearchButtonClick = () => {
    currentPage = 1;
    renderTable();
  };

  const handleSearchInputKeypress = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      currentPage = 1;
      renderTable();
    }
  };

  const handleFilterChange = () => {
    currentPage = 1;
    renderTable();
  };

  const handleMainDocumentClick = async function (event) {
    // Xử lý xem chi tiết báo cáo
    const detailBtn = event.target.closest('.view-report-details');
    if (detailBtn) {
      const groupId = detailBtn.getAttribute('data-group-id');
      await handleViewReportDetails(groupId);
      return;
    }

    // Xử lý xem thành viên nhóm
    const membersBtn = event.target.closest('.btn-view-members');
    if (membersBtn) {
      const groupId = membersBtn.getAttribute('data-group-id');
      await loadManageMembersData(groupId);
      return;
    }

    // Xử lý sửa nhóm
    const editBtn = event.target.closest('.btn-edit');
    if (editBtn) {
      const tr = editBtn.closest('tr');
      const groupId = tr.getAttribute('data-group-id');
      await handleEditGroup(groupId);
      return;
    }

    // Xử lý nút xóa nhóm
    const deleteBtn = event.target.closest('.btn-delete');
    if (deleteBtn) {
      const tr = deleteBtn.closest('tr');
      groupIdToDelete = tr.getAttribute('data-group-id');
      if (!groupIdToDelete) {
        alert('Không xác định được nhóm cần xóa.');
        return;
      }
      confirmDeleteModal.show();
      return;
    }
  };

  const handleMembersTableClick = async (e) => {
    if (e.target.closest('.btn-remove-member')) {
      const btn = e.target.closest('.btn-remove-member');
      const studentCode = btn.getAttribute('data-student-code');
      await handleRemoveMember(studentCode);
    }
  };

  const handleAddMemberClick = async () => {
    const addMemberSelect = document.getElementById('addMemberSelect');
    const studentCodeToAdd = addMemberSelect.value;
    console.log('Student code to add:', studentCodeToAdd);
    await handleAddMember(studentCodeToAdd);
  };

  const handleEditGroupFormSubmit = async (e) => {
    e.preventDefault();

    const editGroupIdInput = document.getElementById('editGroupId');
    const editGroupNameInput = document.getElementById('editGroupName');
    const editGroupLeaderSelect = document.getElementById('editGroupLeader');
    const editProjectSelect = document.getElementById('editProject');

    const groupId = editGroupIdInput.value;
    const groupName = editGroupNameInput.value.trim();
    const leaderCode = editGroupLeaderSelect.value;
    const projectCode = editProjectSelect.value;

    if (!groupName) {
      alert('Tên nhóm không được để trống');
      return;
    }
    if (!leaderCode) {
      alert('Vui lòng chọn trưởng nhóm');
      return;
    }
    if (!projectCode) {
      alert('Vui lòng chọn đề tài');
      return;
    }

    try {
      await fetchWithAuth(`/api/student-groups/${groupId}`, {
        method: 'PUT',
        body: JSON.stringify({
          GroupName: groupName,
          LeaderCode: leaderCode,
          ProjectCode: projectCode
        })
      });
      alert('Cập nhật nhóm thành công');
      editGroupModal.hide();
      fetchData();
    } catch (err) {
      console.error(err);
      alert('Lỗi khi cập nhật nhóm');
    }
  };

  const handleConfirmDeleteClick = async () => {
    if (!groupIdToDelete) return;

    try {
      await fetchWithAuth(`/api/student-groups/${groupIdToDelete}`, {
        method: 'DELETE'
      });
      confirmDeleteModal.hide();
      deleteSuccessModal.show();
      fetchData();
    } catch (error) {
      console.error(error);
      alert('Lỗi khi xóa nhóm');
    }
  };

  // Thêm event listeners với cleanup tracking
  addEventListenerWithCleanup(searchButton, 'click', handleSearchButtonClick);
  addEventListenerWithCleanup(searchInput, 'input', debouncedSearch);
  addEventListenerWithCleanup(searchInput, 'keypress', handleSearchInputKeypress);
  addEventListenerWithCleanup(subjectFilter, 'change', handleFilterChange);
  addEventListenerWithCleanup(classFilter, 'change', handleFilterChange);
  addEventListenerWithCleanup(projectFilter, 'change', handleFilterChange);
  addEventListenerWithCleanup(statusFilter, 'change', handleFilterChange);
  addEventListenerWithCleanup(document, 'click', handleMainDocumentClick);
  addEventListenerWithCleanup(membersTableBody, 'click', handleMembersTableClick);
  addEventListenerWithCleanup(addMemberBtn, 'click', handleAddMemberClick);
  addEventListenerWithCleanup(editGroupForm, 'submit', handleEditGroupFormSubmit);
  addEventListenerWithCleanup(confirmDeleteBtn, 'click', handleConfirmDeleteClick);

  // Cleanup function
  lecturerSubjectsPageCleanup = () => {
    // Xóa tất cả event listeners
    eventListeners.forEach(({ element, event, handler, options }) => {
      if (element && element.removeEventListener) {
        element.removeEventListener(event, handler, options);
      }
    });
    eventListeners.length = 0; // Clear array

    // Cleanup Select2
    const addMemberSelect = document.getElementById('addMemberSelect');
    if (addMemberSelect && $(addMemberSelect).hasClass('select2-hidden-accessible')) {
      $(addMemberSelect).select2('destroy');
    }

    // Cleanup global variables
    if (window.originalStudentsList) {
      delete window.originalStudentsList;
    }

    // Đóng tất cả modals nếu đang mở
    try {
      editGroupModal.hide();
      confirmDeleteModal.hide();
      deleteSuccessModal.hide();
      manageMembersModal.hide();
    } catch (e) {
      // Ignore errors khi modal không tồn tại
    }

    // Reset state
    currentGroupId = null;
    currentMembers = [];
    eligibleStudents = [];
    groupsData = [];
    currentPage = 1;
    groupIdToDelete = null;

    console.log('Lecturer subjects page cleaned up');
  };

  // Đánh dấu đã khởi tạo
  lecturerSubjectsPageInitialized = true;

  // Load dữ liệu lần đầu
  fetchData();

  console.log('Lecturer subjects page initialized');
}

// Hàm cleanup để gọi từ bên ngoài khi cần
function cleanupLecturerSubjectsPage() {
  if (lecturerSubjectsPageCleanup) {
    lecturerSubjectsPageCleanup();
    lecturerSubjectsPageInitialized = false;
    lecturerSubjectsPageCleanup = null;
  }
}

// Export cleanup function nếu cần
window.cleanupLecturerSubjectsPage = cleanupLecturerSubjectsPage;
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

function getRoleBadgeClass(role) {
    return role === 'Trưởng nhóm' ? 'role-leader' : 'role-member';
}

function formatDate(dateString) {
    if (!dateString) return 'Chưa có';
    const date = new Date(dateString);
    return date.toLocaleDateString('vi-VN');
}

async function loadGroupDetail() {
    const urlParams = new URLSearchParams(window.location.search);
    const groupId = urlParams.get('groupId');
    if (!groupId) {
        alert('Thiếu thông tin nhóm');
        return;
    }

    try {
        const data = await fetchWithAuth(`/api/my-group-detail/group-detail/${groupId}`);


        // Cập nhật thông tin nhóm
        document.querySelector('.group-title').textContent = data.GroupName;
        document.getElementById('subjectName').textContent = data.SubjectName;
        document.getElementById('projectName').textContent = data.ProjectName;
        document.getElementById('memberCount').textContent = data.Members.length;
        document.getElementById('groupNote').textContent = data.Notes || 'Không có ghi chú';

        // Hiển thị danh sách thành viên
        const memberList = document.getElementById('memberList');
        if (data.Members && data.Members.length > 0) {
            memberList.innerHTML = data.Members.map(member => `
                <div class="member-card">
                    <span class="member-role ${getRoleBadgeClass(member.StudentRole)}">${member.StudentRole}</span>
                    <h3 class="member-name">${member.FullName}</h3>
                    <div class="member-info">
                        <i class="fa-solid fa-id-badge"></i>${member.StudentCode}
                    </div>
                    <div class="member-info">
                        <i class="fas fa-graduation-cap"></i>${member.ClassCode}
                    </div>
                    <div class="member-info">
                        <i class="fas fa-birthday-cake"></i>${formatDate(member.DateOfBirth)}
                    </div>
                    ${member.Notes ? `<div class="note">${member.Notes}</div>` : ''}
                </div>
            `).join('');
        } else {
            memberList.innerHTML = '<p class="text-center">Không có thành viên nào trong nhóm.</p>';
        }
    } catch (err) {
        console.error('Lỗi khi tải chi tiết nhóm:', err);
        alert('Không thể tải thông tin nhóm');
    }
}

document.addEventListener('DOMContentLoaded', loadGroupDetail);
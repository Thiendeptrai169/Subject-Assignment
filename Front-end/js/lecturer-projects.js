async function renderLecturerProjects() {
    const container = document.getElementById("project-list");
    container.innerHTML = "<p>Đang tải dữ liệu...</p>";

    const token = localStorage.getItem("token");
    if (!token) {
        container.innerHTML = "<p>Không tìm thấy token đăng nhập.</p>";
        return;
    }

    try {
        const response = await fetch("/api/lecturer-projects", {
            headers: {
                Authorization: `Bearer ${token}`
            }
        });

        if (!response.ok) throw new Error("Không thể lấy dữ liệu");

        const data = await response.json();
        container.innerHTML = "";

        if (data.length === 0) {
            container.innerHTML = "<p>Không có dự án nào.</p>";
            return;
        }
          data.forEach(project => {
            const projectDiv = document.createElement("div");
            projectDiv.className = "groupList";

            // const startDate = project.StartDate ? new Date(project.StartDate).toLocaleDateString() : "Chưa có";
            // const endDate = project.EndDate ? new Date(project.EndDate).toLocaleDateString() : "Chưa có";

            projectDiv.innerHTML = `
                <div class="group-item">
                    <div class="group-header">
                        <h4 class="text-primary">${project.ProjectName}</h4>
                    </div>
                    <div class="group-info">
                    <div class="info-row">
                        <p><strong>Mã đề tài:</strong> ${project.ProjectCode}</p>
                    </div>
                    <div class="info-row">
                        <p><strong>Môn học:</strong> ${project.SubjectName}</p>
                    </div>
                    <div class="info-row">
                        <p><strong>Lớp:</strong> ${project.ClassCode}</p>
                    </div>
                    <div class="info-row">
                        <p><strong>Mô tả:</strong> ${project.Description}</p>
                        <a href="project-groups.html?projectId=${project.ProjectId}" class="view-detail">
                                    Xem các nhóm
                                </a>
                    </div>
                 </div>
                `;
            container.appendChild(projectDiv);
        });

    } catch (error) {
        console.error("Lỗi khi load project:", error);
        container.innerHTML = `<p style="color: red;">${error.message}</p>`;
    }
}
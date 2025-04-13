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
            projectDiv.className = "mb-4 p-3 border rounded shadow-sm";

            const startDate = project.StartDate ? new Date(project.StartDate).toLocaleDateString() : "Chưa có";
            const endDate = project.EndDate ? new Date(project.EndDate).toLocaleDateString() : "Chưa có";

            projectDiv.innerHTML = `
                <h4 class="text-primary">${project.ProjectName}</h4>
                <p><strong>Môn học:</strong> ${project.SubjectName}</p>
                <p><strong>Bắt đầu:</strong> ${startDate}</p>
                <p><strong>Kết thúc:</strong> ${endDate}</p>
                <a href="project-groups.html?projectId=${project.ProjectId}" class="btn btn-outline-primary btn-sm">
                    Xem các nhóm
                </a>
            `;

            container.appendChild(projectDiv);
        });

    } catch (error) {
        console.error("Lỗi khi load project:", error);
        container.innerHTML = `<p style="color: red;">${error.message}</p>`;
    }
}

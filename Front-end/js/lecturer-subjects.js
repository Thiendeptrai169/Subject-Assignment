async function renderLecturerSubject() {
    const container = document.getElementById("subject-list");
    container.innerHTML = "<p>Đang tải dữ liệu...</p>";

    const token = localStorage.getItem("token");
    if (!token) {
        container.innerHTML = "<p>Không tìm thấy token đăng nhập.</p>";
        return;
    }

    try {
        const response = await fetch("/api/lecturer-subjects", {
            headers: {
                Authorization: `Bearer ${token}`
            }
        });

        if (!response.ok) throw new Error("Không thể lấy dữ liệu");

        const data = await response.json();
        container.innerHTML = "";
        console.log(data);

        if (data.length === 0) {
            container.innerHTML = "<p>Bạn không phụ trách môn học nào.</p>";
            return;
        }

        data.forEach(subject => {
            const subjectDiv = document.createElement("div");
            subjectDiv.className = "groupList";

            subjectDiv.innerHTML = `
                <div class="group-item">
                    <div class="group-header">
                        <h4 class="text-primary">${subject.SubjectName}</h4>
                    </div>
                    <div class="group-info">
                        <div class="info-row">
                            <p><strong>Mã môn học:</strong> ${subject.SubjectCode}</p>
                        </div>
                        <div class="info-row">
                            <p><strong>ID môn học:</strong> ${subject.SubjectId}</p>
                        </div>
                        <div class="info-row">
                            <p><strong>Tổng số dự án:</strong> ${subject.TotalProjects}</p>
                        </div>
                        <div class="info-row">
                            <a href="lecturer-projects.html?subjectId=${subject.SubjectId}" class="view-detail">
                                Xem các dự án
                            </a>
                        </div>
                    </div>
                </div>
            `;

            container.appendChild(subjectDiv);
        });

    } catch (error) {
        console.error("Lỗi khi load dữ liệu môn học:", error);
        container.innerHTML = `<p style="color: red;">${error.message}</p>`;
    }
}

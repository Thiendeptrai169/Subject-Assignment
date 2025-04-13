async function renderProjectGroups() {
    const container = document.getElementById("group-list");
    const params = new URLSearchParams(window.location.search);
    const projectId = params.get("projectId");

    const token = localStorage.getItem("token");
    if (!token) {
        container.innerHTML = "<p>Không tìm thấy token.</p>";
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
            container.innerHTML = "<p>Chưa có nhóm nào thực hiện đề tài này.</p>";
            return;
        }

        container.innerHTML = "<ul>" + data.map(g => `
            <li>
                <a href="project-groups?groupId=${g.GroupId}">
                    Nhóm: ${g.GroupName} | Trình bày: ${g.PresentationDate || 'Chưa có'} | Trạng thái: ${g.GroupStatus}
                </a>
            </li>
        `).join("") + "</ul>";
    } catch (err) {
        console.error("Lỗi:", err);
        container.innerHTML = `<p style="color:red;">${err.message}</p>`;
    }
}


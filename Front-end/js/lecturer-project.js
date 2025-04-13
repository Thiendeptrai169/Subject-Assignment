// async function renderLecturerProjects() {
//     const container = document.getElementById("project-list");
//     container.innerHTML = "<p>Đang tải dữ liệu...</p>";

//     const token = localStorage.getItem("token");
//     if (!token) {
//         container.innerHTML = "<p>Không tìm thấy token đăng nhập.</p>";
//         return;
//     }

//     try {
//         const response = await fetch("/api/lecturer-projects", {
//             headers: {
//                 Authorization: `Bearer ${token}`
//             }
//         });

//         if (!response.ok) throw new Error("Không thể lấy dữ liệu");

//         const data = await response.json();
//         container.innerHTML = "";

//         if (data.length === 0) {
//             container.innerHTML = "<p>Không có dự án nào.</p>";
//             return;
//         }

//         const grouped = {};
//         data.forEach(item => {
//             if (!grouped[item.ProjectId]) {
//                 grouped[item.ProjectId] = {
//                     ProjectCode: item.ProjectCode,
//                     ProjectName: item.ProjectName,
//                     groups: []
//                 };
//             }
//             if (item.GroupId) {
//                 grouped[item.ProjectId].groups.push({
//                     GroupId: item.GroupId,
//                     GroupName: item.GroupName,
//                     GroupStatus: item.GroupStatus,
//                     PresentationDate: item.PresentationDate
//                 });
//             }
//         });

//         Object.entries(grouped).forEach(([projectId, project]) => {
//             const projectDiv = document.createElement("div");
//             projectDiv.className = "mb-4 p-3 border rounded";

//             const groupsHTML = project.groups.length > 0
//                 ? `<ul>${project.groups.map(g => `
//               <li>
//                 <a href="group-page.html?groupId=${g.GroupId}">
//                   Nhóm: ${g.GroupName} (${g.GroupStatus})
//                 </a>
//               </li>`).join("")}</ul>`
//                 : "<p><em>Chưa có nhóm đăng ký</em></p>";

//             projectDiv.innerHTML = `
//           <h4>${project.ProjectCode} - ${project.ProjectName}</h4>
//           ${groupsHTML}
//         `;
//             container.appendChild(projectDiv);
//         });

//     } catch (error) {
//         console.error("Lỗi khi load project:", error);
//         container.innerHTML = `<p style="color: red;">${error.message}</p>`;
//     }
// }
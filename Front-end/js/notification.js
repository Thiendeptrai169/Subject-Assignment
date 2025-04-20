


function initNotificationPage(){
// Hàm gửi thông báo
    async function initNotification() {
        const isEditMode = document.querySelector('input[name="action"]:checked').value === "edit";
        const notificationId = document.getElementById("notificationId").value.trim();
        const title = document.getElementById("title").value.trim();
        const content = document.getElementById("content").value.trim();
        const recipientType = document.getElementById("RecipientType").value;

        const mainInput = document.querySelector("#targetSelection input#mainInput");
        const subjectInput = document.getElementById("subjectInput");
        const mainValue = mainInput?.value.trim();
        const subjectValue = subjectInput?.value.trim();

        let body = {
            NotificationTitle: title,
            Content: content,
            RecipientType: recipientType,
            StudentId: null,
            GroupId: null,
            ClassId: null,
            SubjectId: null,
            CreatedByLecturer: 1 // tạm hard-code ID giảng viên
        };

        if (recipientType === "student") {
            if (!mainValue) return alert("Vui lòng nhập mã sinh viên!");
            body.StudentId = parseInt(mainValue);
        } else if (recipientType === "group") {
            if (!mainValue) return alert("Vui lòng nhập mã nhóm!");
            body.GroupId = parseInt(mainValue);
        } else if (recipientType === "class") {
            if (!mainValue || !subjectValue) return alert("Vui lòng nhập mã lớp và mã môn!");
            body.ClassId = parseInt(mainValue);
            body.SubjectId = parseInt(subjectValue);
        }

        try {
            const url = 'http://localhost:3000/api/notifications';
            const res = await fetch(
                isEditMode && notificationId ? `${url}/${notificationId}` : url,
                {
                    method: isEditMode && notificationId ? "PUT" : "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(body)
                }
            );

            if (!res.ok) throw new Error(`Lỗi API: ${res.status} ${res.statusText}`);
            const data = await res.json();

            alert(isEditMode ? "✔️ Đã sửa thông báo." : "🎉 Thông báo đã được gửi!");
            document.getElementById("notificationForm").reset();
            updateTargetSelection();
            loadNotifications();  // Tải lại danh sách thông báo sau khi gửi thành công
        } catch (err) {
            alert("❌ Lỗi khi gửi thông báo: " + err.message);
        }
    }

    // Đổi chế độ Add/Edit
    document.querySelectorAll('input[name="action"]').forEach(radio => {
        radio.addEventListener("change", function () {
            const isEdit = this.value === "edit";
            document.getElementById("editSection").style.display = isEdit ? "block" : "none";
            document.getElementById("notificationId").disabled = !isEdit;
        });
    });

    // Tải thông báo cần chỉnh sửa
    async function fetchNotification() {
        const notificationId = document.getElementById("notificationId").value.trim();
        if (!notificationId) return alert("Vui lòng nhập ID thông báo.");

        try {
            const res = await fetch('http://localhost:3000/api/notifications');
            const data = await res.json();
            const noti = data.find(n => n.Id == notificationId);

            if (!noti) return alert("Không tìm thấy thông báo!");

            document.getElementById("title").value = noti.NotificationTitle;
            document.getElementById("content").value = noti.Content;
            document.getElementById("RecipientType").value = noti.RecipientType;

            updateTargetSelection();  // Cập nhật lại form khi nhận thông báo từ server

            setTimeout(() => {
                if (noti.RecipientType === "student") {
                    document.getElementById("mainInput").value = noti.StudentId;
                } else if (noti.RecipientType === "group") {
                    document.getElementById("mainInput").value = noti.GroupId;
                } else if (noti.RecipientType === "class") {
                    document.getElementById("mainInput").value = noti.ClassId;
                    document.getElementById("subjectInput").value = noti.SubjectId;
                }
            }, 50);

            alert("Đã tải thông báo để chỉnh sửa!");
        } catch (err) {
            alert("Lỗi khi tải thông báo: " + err.message);
        }
    }

    // Hiển thị trường nhập phù hợp với loại người nhận
    function updateTargetSelection() {
        const container = document.getElementById("targetSelection");
        container.innerHTML = "";

        const recipientType = document.getElementById("RecipientType").value;
        let labelText = "", placeholder = "", showSubject = false;

        if (recipientType === "student") {
            labelText = "Id Sinh viên:";
            placeholder = "VD: 1,2,3...";
        } else if (recipientType === "group") {
            labelText = "Id nhóm:";
            placeholder = "VD: 1,2,3...";
        } else if (recipientType === "class") {
            labelText = "Id lớp:";
            placeholder = "VD: 1,2,3...";
            showSubject = true;
        }

        const label = document.createElement("label");
        label.innerText = labelText;

        const input = document.createElement("input");
        input.type = "text";
        input.placeholder = placeholder;
        input.id = "mainInput";

        container.appendChild(label);
        container.appendChild(input);

        if (showSubject) {
            const subjectLabel = document.createElement("label");
            subjectLabel.innerText = "Id môn học:";

            const subjectInput = document.createElement("input");
            subjectInput.type = "text";
            subjectInput.id = "subjectInput";
            subjectInput.placeholder = "VD: 1,2,3...";

            container.appendChild(subjectLabel);
            container.appendChild(subjectInput);
        }
    }

    // Tải danh sách thông báo
    async function loadNotifications() {
        try {
            const res = await fetch('http://localhost:3000/api/notifications');
            const data = await res.json();
            console.log(data);


            const tbody = document.getElementById("notificationList");
            tbody.innerHTML = "";

            data.forEach(noti => {
                const row = document.createElement("tr");
                row.innerHTML = `
                    <td>${noti.Id}</td>
                    <td>${noti.NotificationTitle}</td>
                    <td>${getTargetText(noti)}</td>
                    <td>${new Date(noti.CreatedAt).toLocaleString('vi-VN')}</td>
                    <td>${noti.Content}</td>
                `;
                tbody.appendChild(row);
            });
        } catch (err) {
            console.error("❌ Lỗi khi tải danh sách:", err);
            document.getElementById("notificationList").innerHTML = `
                <tr><td colspan="5" style="text-align:center;">Không thể tải dữ liệu</td></tr>
            `;
        }
    }

    // Hiển thị mô tả loại người nhận
    function getTargetText(noti) {
        if (noti.RecipientType === "student") return `Sinh viên ${noti.StudentId}`;
        if (noti.RecipientType === "group") return `Nhóm ${noti.GroupId}`;
        if (noti.RecipientType === "class") return `Lớp ${noti.ClassId} - Môn ${noti.SubjectId}`;
        return "Không rõ";
    }

    document.getElementById("notificationForm").addEventListener("submit", function (event) {
        event.preventDefault();
        initNotification(); // chỉ gọi khi cần gửi thông báo
    });

    document.querySelector("#editSection .input-with-button button").addEventListener("click", fetchNotification);

    // Khi load trang
    updateTargetSelection();  // Cập nhật form khi tải trang
    loadNotifications();  // Tải danh sách thông báo khi tải trang
}

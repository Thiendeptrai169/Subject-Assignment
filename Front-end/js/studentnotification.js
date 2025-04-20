const API_BASE = "http://localhost:3000"; 
const notificationListEl = document.getElementById("notification-list");
const detailView = document.getElementById("notification-detail");
const detailTitle = document.getElementById("detail-title");
const detailSender = document.getElementById("detail-sender");
const detailTime = document.getElementById("detail-time");
const detailContent = document.getElementById("detail-content");

let notifications = [];
function initStudentNotificationPage(){
  async function fetchNotifications() {
    const studentId = 1;
    try {
      const res = await fetch(`${API_BASE}/api/StudentNotifications/${studentId}`);
      
      if (!res.ok) {
        throw new Error(`Server trả về lỗi ${res.status}`);
      }

      notifications = await res.json();
      console.log(notifications);


      renderNotificationList();
    } catch (error) {
      console.error("Lỗi khi fetch thông báo:", error);
      notificationListEl.innerHTML = "<p>Lỗi khi tải thông báo.</p>";
    }
  }

  function renderNotificationList() {
    notificationListEl.innerHTML = "";
    //console.log('........');
    if (notifications.length === 0) {
      notificationListEl.innerHTML = "<p>Không có thông báo nào.</p>";
      return;
    }

    notifications.forEach((noti, index) => {
      const item = document.createElement("div");
      item.className = `notification-item ${noti.isRead ? "read" : "unread"}`;
      item.innerHTML = `
        <div style="display: flex; align-items: center; gap: 8px;">
          ${!noti.isRead ? '<span class="dot-indicator"></span>' : ''}
          <div>
            <strong>${noti.notificationTitle}</strong><br>
            <small>${new Date(noti.createdAt).toLocaleString()}</small>
          </div>
        </div>
      `;
      item.onclick = () => showDetail(index);
      notificationListEl.appendChild(item);
    });
  }


  async function showDetail(index) {
    const noti = notifications[index];
    const studentId = 1;

    if (Number(noti.isRead) === 0) {
      try {
        await fetch(`${API_BASE}/api/StudentNotifications/${noti.id}/read`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ studentId })
        });

        // Cập nhật trực tiếp trong mảng gốc
        notifications[index].isRead = 1;

        // Vẽ lại danh sách sau khi cập nhật trạng thái đọc
        renderNotificationList();
        
      } catch (err) {
        console.error("Lỗi khi cập nhật đã đọc:", err);
      }
    }

    detailTitle.textContent = noti.notificationTitle;
    detailSender.textContent = noti.createdByLecturerName || "Giảng viên";
    detailTime.textContent = new Date(noti.createdAt).toLocaleString();
    detailContent.textContent = noti.content;

    notificationListEl.classList.add("hidden");
    detailView.classList.remove("hidden");
  }


  
  fetchNotifications();
}

function hideDetail() {
  detailView.classList.add("hidden");
  notificationListEl.classList.remove("hidden");
}
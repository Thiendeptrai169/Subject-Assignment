document.addEventListener('DOMContentLoaded', ()=>{
    const contentElement = document.getElementById('page-content');
    const sidebar = document.querySelector('.sidebar');
    
    let currentPageCSS = null;

    //load
    function loadPageCSS(cssUrl){
        unloadPageCSS();

        if(document.querySelector(`link[href="${cssUrl}"]`)){
            console.log(`CSS ${cssUrl} đã tồn tại.`);
            return;
        }
    


        const link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = cssUrl;
        link.id = 'page-specific-css';
        document.head.appendChild(link);
        currentPageCSS = cssUrl;
        console.log(`Đã tải CSS: ${cssUrl}`);
    }

    //unload

    function unloadPageCSS(){
        const currentCSSLink = document.getElementById('page-specific-css');
        if(currentCSSLink){

            document.head.removeChild(currentCSSLink);
            console.log(`Đã gỡ bỏ CSS: ${currentPageCSS}`);
            currentPageCSS = null;
        }
    }

    let loadedScripts = {};

    function loadAndExecuteScript(scriptUrl){
    //     const oldScript = document.querySelector(`script[src^="${scriptUrl.split('?')[0]}"]`); // Tìm cả khi có version cũ
    // if (oldScript) {
    //     console.log(`Removing existing script tag for: ${scriptUrl}`);
    //     oldScript.remove();
    // }

        

        const script = document.createElement('script');
        script.src = scriptUrl + '?v=' + Date.now();
        script.defer = true;

        script.onload = () => {
            console.log(`Đã tải ${scriptUrl}.`);
            loadedScripts[scriptUrl] = true;

            if(scriptUrl === '/script.js' && typeof initMainPage === 'function'){
                initMainPage();

            }else if (scriptUrl === '/js/profile-script.js' && typeof initProfilePage === 'function'){
                initProfilePage();
          
            }else if (scriptUrl === '/js/studentnotification.js' && typeof initStudentNotificationPage === 'function'){
                initStudentNotificationPage();
            
            }else if (scriptUrl === '/js/notification.js' && typeof initNotificationPage === 'function'){
                initNotificationPage();
            }else if(scriptUrl === '/js/manageproject-script.js' && typeof initManageProjectPage === 'function'){
                initManageProjectPage();
            } else if (scriptUrl === '/js/group-page.js' && typeof loadMyGroups === 'function') {
                loadMyGroups();
                loadSemester();
            } else if (scriptUrl === '/js/group-detail.js' && typeof loadGroupDetail === 'function') {
                loadGroupDetail();
            } else if (scriptUrl === '/js/lecturer-projects.js' && typeof renderLecturerProjects === 'function') {
                renderLecturerProjects();
            } else if (scriptUrl === '/js/project-groups.js' && typeof renderProjectGroups === 'function') {
                renderProjectGroups();
            } else if (scriptUrl === '/js/lecturer-subjects.js' && typeof renderLecturerSubject === 'function') {
                renderLecturerSubject();
            }

                
        
            // }else if (scriptUrl === '/js/notification.js' && typeof initMainPage === 'function'){
            //     loadNotifications();
            // }



        };

        script.onerror = () => {
            console.error(`Lỗi khi tải ${scriptUrl}.`);
            delete loadedScripts[scriptUrl];
        };
        document.body.appendChild(script);
    }

    const loadContent = async (url, pushState = true) => {
        console.log(`Đang tải nội dung từ ${url}...`);

        

        unloadPageCSS();

        let contentUrl = '';
        let pageTitle = 'Trang Web';
        let pageCSS = null;
        let pageScript = null;


        // url = window.location.pathname;
        

        // Loại bỏ /Front-end nếu có 
        if (url.startsWith('/Front-end')) {
            url = url.replace('/Front-end', '');
        }

        switch(url){

            case '/':
            case '/index.html':
            case '/mainpage.html':
                contentUrl = '/pages/mainpage-content.html';
                pageTitle = 'Trang chủ - Đăng ký đề tài';
                pageCSS = null;
                pageScript = '/script.js';
                break;
            case '/profile.html':
                contentUrl = '/pages/profile-content.html';
                pageTitle = 'Thông tin sinh viên';
                pageCSS = '/css/profile.css';
                pageScript = '/js/profile-script.js';
                break;
            // add another case here
            case '/notification-content.html':
                contentUrl = '/pages/notification-content.html';
                pageTitle = 'Trang chủ - Gửi thông báo';
                pageCSS = '/css/notification.css';
                pageScript = '/js/notification.js';
                break;
            case '/studentnotification-content.html':
                contentUrl = '/pages/studentnotification-content.html';
                pageTitle = 'Trang chủ - Xem thông báo';
                pageCSS = '/css/studentnotification.css';
                pageScript = '/js/studentnotification.js';
                break;
            case '/manageproject.html':
                contentUrl = '/pages/manageproject-content.html';
                pageTitle = 'Trang chủ - Quản lý đề tài';
                pageCSS = '/css/manageproject.css';
                pageScript = '/js/manageproject-script.js';
                break;
            case '/group-page.html':
                contentUrl = '/pages/group-page.html';
                pageTitle = 'Danh sách nhóm';
                pageCSS = '/css/groups.css';
                pageScript = '/js/group-page.js';
                break;
            case '/group-detail.html':
                contentUrl = '/pages/group-detail.html';
                pageTitle = 'Danh sách nhóm';
                pageCSS = '/css/groups.css';
                pageScript = '/js/group-detail.js';
                break;
            case '/change-password.html':
                contentUrl = '/pages/change-password.html';
                pageTitle = 'Đổi mật khẩu';
                pageCSS = null;
                pageScript = '/js/change-password.js';
                break;
            case '/lecturer-projects.html':
                contentUrl = '/pages/lecturer-projects.html';
                pageTitle = 'Quản lý nhóm';
                pageCSS = '/css/groups.css';
                pageScript = '/js/lecturer-projects.js';
                break;
            case '/project-groups.html':
                contentUrl = '/pages/project-groups.html';
                pageTitle = 'Quản lý nhóm';
                pageCSS = '/css/groups.css';
                pageScript = '/js/project-groups.js';
                break;
            case '/lecturer-subjects.html':
                contentUrl = '/pages/lecturer-subjects.html';
                pageTitle = 'Quản lý nhóm';
                pageCSS = '/css/groups.css';
                pageScript = '/js/lecturer-subjects.js';
                break;
                

            default:
                console.error(`Không xác định được route cho URL: ${url}`);
                contentElement.innerHTML = `<p>Trang không tồn tại.</p>`;
                document.title = 'Lỗi 404';
                return;
        }

 
        if(!contentElement) return;
        contentElement.innerHTML = '<p>Đang tải...</p>';

        try{
            const respone = await fetch(contentUrl);
            if(!respone.ok) throw new Error(`HTTP error! status: ${respone.status}, không thể tải ${contentUrl}`);
            const html = await respone.text();
            contentElement.innerHTML = html;
            // console.log(contentElement.innerHTML)
            document.title = pageTitle;

            if(pageCSS){
                loadPageCSS(pageCSS);
            }

            if(pageScript){
                loadAndExecuteScript(pageScript);
            }

            if(pushState){
                history.pushState({ pageUrl: url, css: pageCSS, script: pageScript }, pageTitle, url);
            }
        } catch(err){
            console.error('Lỗi khi tải nội dung:', err);
            contentElement.innerHTML = `<p>Không thể tải trang. Vui lòng thử lại.</p><p><i>${err.message}</i></p>`;
            document.title = 'Lỗi';
        }
    };

    //handle click from navbar and sidebar
    const handleNavClick = (e) => {
        const link = e.target.closest('a.sidebar-link, .navbar a, a.popup-nav-link, a.spa-link');

        if(link && link.href && link.origin === window.location.origin && !link.href.includes('#')){

            e.preventDefault();
            const targetUrl = link.getAttribute('href');
            const currentPath = window.location.pathname;
            const isSamePage = (targetUrl === currentPath || targetUrl === currentPath + '/');

            if(!isSamePage){

                loadContent(targetUrl, true);
                if (link.classList.contains('popup-nav-link')) {
                    const userPopup = document.getElementById('userPopup');
                    if (userPopup) userPopup.classList.remove('show');
                }
            }
        }
    };


    if(sidebar){
        sidebar.addEventListener('click', handleNavClick);
    }
    const navbar = document.querySelector('.navbar');
    if(navbar){
        navbar.addEventListener('click', handleNavClick);
    }

    
const userAvatar = document.getElementById('userAvatar');
const userPopup = document.getElementById('userPopup');

if (userAvatar && userPopup) {
    userAvatar.addEventListener('click', function(e) {
        e.stopPropagation();
        userPopup.classList.toggle('show');
    });

    // Listener để đóng popup khi click ra ngoài
    document.addEventListener('click', function(e) {
        if (userPopup.classList.contains('show') && !userPopup.contains(e.target) && e.target !== userAvatar) {
            userPopup.classList.remove('show');
            console.log("Clicked outside popup, closing.");
        }
    });

    const logoutBtn = userPopup.querySelector('.logout-btn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', function() {
            userPopup.classList.remove('show'); 
            localStorage.removeItem('token');
            // window.location.remove('token');
            window.location.href = '/';
        });
    }
} else {
    console.warn("User avatar or popup element not found in the main shell.");
}


    //handle back and forward button
    window.addEventListener('popstate', (e) => {
        const previousUrl = window.location.pathname;
        loadContent(previousUrl, false);
    });


    //load initial content
    const initialUrl = window.location.pathname;

    if(initialUrl === '/' || initialUrl === '/index.html'){
        unloadPageCSS();
        loadAndExecuteScript('/script.js');
    }else{
        loadContent(initialUrl, false);
    }

    

    // === XỬ LÝ CHUÔNG THÔNG BÁO ===
    const notificationDiv = document.querySelector('.notification');
    const badge = notificationDiv ? notificationDiv.querySelector('.badge') : null;
    const token = localStorage.getItem('token');

    if (!token && badge) {
        badge.textContent = '0'; // hoặc badge.style.display = 'none';
    }

    // Hàm cập nhật số thông báo chưa đọc
    async function updateUnreadCount() {
        if (!badge || !token) return;
        try {
            const res = await fetch('/api/StudentNotifications/me/unread-count', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await res.json();
            badge.textContent = data.unreadCount || 0;
        } catch (err) {
            badge.textContent = '!';
        }
    }
    window.updateUnreadCount = updateUnreadCount;
    updateUnreadCount();

    // Khi bấm chuông, hiện popup danh sách thông báo chưa đọc
    if (notificationDiv) {
        notificationDiv.addEventListener('click', async (e) => {
            e.stopPropagation();
            if (!token) {
                alert('Vui lòng đăng nhập để xem thông báo!');
                return;
            }
            let popup = document.getElementById('notification-popup');
            if (popup) {
                popup.remove();
                return;
            }
            popup = document.createElement('div');
            popup.id = 'notification-popup';
            popup.style.position = 'absolute';
            popup.style.top = '40px';
            popup.style.right = '0';
            popup.style.background = '#fff';
            popup.style.border = '1px solid #ccc';
            popup.style.zIndex = 1000;
            popup.style.width = '350px';
            popup.style.maxHeight = '400px';
            popup.style.overflowY = 'auto';
            popup.style.boxShadow = '0 2px 8px rgba(0,0,0,0.15)';

            // Lấy danh sách thông báo chưa đọc
            try {
                const res = await fetch('/api/StudentNotifications/me/unread', {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                const notifications = await res.json();
                if (!notifications.length) {
                    popup.innerHTML = '<div style="padding:10px">Không có thông báo chưa đọc.</div>';
                } else {
                    popup.innerHTML = `<div style="padding:8px 16px; font-weight:bold; border-bottom:1px solid #eee;">
                        Thông báo chưa đọc (${notifications.length})
                    </div>` + notifications.map(n => `
                        <div class="noti-item" style="padding:10px; border-bottom:1px solid #eee; cursor:pointer" data-id="${n.id}">
                            <strong>${n.title}</strong><br>
                            <small>${new Date(n.createdAt).toLocaleString()}</small>
                        </div>
                    `).join('');
                }
            } catch (err) {
                popup.innerHTML = '<div style="padding:10px">Lỗi khi tải thông báo.</div>';
            }
            notificationDiv.appendChild(popup);

            // Khi bấm vào 1 thông báo, chuyển sang trang chi tiết
            popup.addEventListener('click', async (e) => {
                const item = e.target.closest('.noti-item');
                if (item) {
                    const id = item.getAttribute('data-id');
                    // Gọi API đánh dấu đã đọc
                    try {
                        await fetch(`/api/StudentNotifications/${id}/read`, {
                            method: "PUT",
                            headers: { "Authorization": `Bearer ${token}` }
                        });
                        if (window.updateUnreadCount) window.updateUnreadCount();
                    } catch (err) {
                        // Có thể báo lỗi nếu muốn
                        console.error("Lỗi khi đánh dấu đã đọc:", err);
                    }
                    // Xóa popup trước khi chuyển trang
                    popup.remove();
                    window.location.href = `/studentnotification-content.html?id=${id}`;
                }
            });
        });

        // Đóng popup khi click ra ngoài
        document.addEventListener('click', (e) => {
            const popup = document.getElementById('notification-popup');
            if (popup && !popup.contains(e.target) && !e.target.closest('.notification')) {
                popup.remove();
            }
        });
    }

    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            const popup = document.getElementById('notification-popup');
            if (popup) popup.remove();
        }
    });

    localStorage.setItem('notificationRead', Date.now());

    window.addEventListener('storage', function(e) {
      if (e.key === 'notificationRead') {
        if (window.updateUnreadCount) window.updateUnreadCount();
      }
    });

});


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
        const oldScript = document.querySelector(`script[src^="${scriptUrl.split('?')[0]}"]`); // Tìm cả khi có version cũ
    if (oldScript) {
        console.log(`Removing existing script tag for: ${scriptUrl}`);
        oldScript.remove();
    }

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
            }else if(scriptUrl === '/js/manageproject-script.js' && typeof initManageProjectPage === 'function'){
                initManageProjectPage();
            }
            //add)//add elseif for other scripts

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

});
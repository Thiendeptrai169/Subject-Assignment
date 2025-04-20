if (typeof window.managedProjectsData === 'undefined') {
    window.managedProjectsData = []; 
} else {
    window.managedProjectsData = []; 
}


const baseProjects = [
    {
        projectCode: 101, 
        name: 'Xây dựng website bán hàng trực tuyến',
        min: 1,
        max: 5,
        description: 'Phát triển website thương mại điện tử bằng PHP/MySQL'
    },
    {
        projectCode: 102,
        name: 'Ứng dụng quản lý sinh viên', // Same name as below, distinct ID
        min: 1,
        max: 3,
        description: 'Sử dụng pandas và matplotlib để phân tích dữ liệu'
    },
    {
        projectCode: 103, // Even if data looks similar, base projects usually have unique IDs
        name: 'Ứng dụng quản lý sinh viên',
        min: 1,
        max: 3,
        description: 'Sử dụng pandas và matplotlib để phân tích dữ liệu'
        // You might want slightly different descriptions in reality, e.g., focus on UI vs logic
    },
    {
        projectCode: 104,
        name: 'Ứng dụng quản lý sinh viên',
        min: 1,
        max: 3,
        description: 'Sử dụng pandas và matplotlib để phân tích dữ liệu'
    },
    {
        projectCode: 105,
        name: 'Phân tích Hệ thống Quản lý Thư viện',
        min: 2,
        max: 4,
        description: 'Phân tích yêu cầu, thiết kế use case và class diagram cho hệ thống thư viện.'
    },
    {
        projectCode: 106,
        name: 'Tìm hiểu về React Native',
        min: 1,
        max: 2,
        description: 'Nghiên cứu và xây dựng một ứng dụng di động đơn giản bằng React Native.'
    }
];

window.initManageProjectPage = function() {
    console.log("DEBUG: === initManageProjectPage() started ===");

    const projectListBody = document.getElementById('lecturer-project-list');


    const filterClassSelect = document.getElementById('filter-class-manage');
    const filterSubjectSelect = document.getElementById('filter-subject-manage');
    const filterNameInput = document.getElementById('filter-name-manage');
    const filterSearchBtn = document.getElementById('filter-search-btn-manage');


    const openPopupBtn = document.getElementById('create-project-btn'); 
    const popupOverlay = document.querySelector('.popup-overlay');     
    const popupBox = document.querySelector('.create-project-popup'); 
    const closePopupBtn = document.querySelector('.close-popup-btn');  
    const tabs = popupBox.querySelectorAll('.popup-tabs .tab-btn');
    const tabContents = popupBox.querySelectorAll('.popup-content');

    const createEditTabContent = document.getElementById('tab-create-edit');
    const createForm  = document.getElementById('create-project-form');
    const updateBtn = document.getElementById('update');
    const createSubmitBtn = document.getElementById('submit');  
    const cancelEditBtn = document.getElementById('cancel-edit-btn'); 
    const existingProjects = document.querySelector('.project-existing');
    const projectNameInput = document.getElementById('project-name');
    const minStudentsInput = document.getElementById('min-students');
    const maxStudentsInput = document.getElementById('max-students');
    const descriptionInput = document.getElementById('project-description');


    const assignTabContent = document.getElementById('tab-assign');

    const createCell = (text, align = 'left') => {
        const cell = document.createElement("td");
        cell.textContent = text !== null && text !== undefined && text !== '' ? text : 'N/A';
        cell.style.textAlign = align;
        return cell;
    };
    

    const formatDate = (dateStr) => {
        if (!dateStr) return 'N/A'; 
        try {
            return new Date(dateStr).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
        } catch {
            return dateStr; 
        }
    };


    let currentPopupMode = 'create';
    let currentEditingProjectCode = '';
    function switchToCreateMode(clearForm = true) {
        currentPopupMode = 'create';
        currentEditingProjectCode = null;
        if (clearForm) {
            createForm.reset();
       }
       createSubmitBtn.style.display = 'inline-block';
       updateBtn.style.display = 'none';
       cancelEditBtn.style.display = 'none';
       existingProjects.querySelectorAll('.project-row.selected').forEach(row => row.classList.remove('selected'));
    }


    function switchToUpdateMode(projectData) {
        //console.log("Switching to update mode for project ID:", projectData.projectId);
        currentPopupMode = 'update';
        currentEditingProjectCode = projectData.projectCode; 


        projectNameInput.value = projectData.projectName || '';
        minStudentsInput.value = projectData.minStudents || '';
        maxStudentsInput.value = projectData.maxStudents || '';
        descriptionInput.value = projectData.description || '';

        createSubmitBtn.style.display = 'none';
        updateBtn.style.display = 'inline-block';
        cancelEditBtn.style.display = 'inline-block';

        switchTab(0);
    }


    function showPopup(mode = 'create', data = null) {
        console.log(`Showing popup in mode: ${mode}`);
        if (mode === 'update' && data) {
            switchToUpdateMode(data);
        } else {
            switchToCreateMode(true);
        }

        
        fetchAndRenderExistingProjects();

        popupOverlay.style.display = 'block';
        popupBox.style.display = 'block';
         switchTab(0);
    }

    function closePopup() {
        //console.log("Closing popup");
        popupOverlay.style.display = 'none';
        popupBox.style.display = 'none';
        switchToCreateMode(true); 
    }


    function switchTab(activeIndex) {
        tabs.forEach((tab, index) => {
            const tabId = tab.dataset.tab; 
            const correspondingContent = document.getElementById(tabId);

            if (index === activeIndex) {
                tab.classList.add('active');
                if (correspondingContent) {
                    correspondingContent.classList.add('active');
                    correspondingContent.style.display = 'block'; 
                }
            
                 if (index === 0) {
                     if (currentPopupMode === 'update') {
                         createSubmitBtn.style.display = 'none';
                         updateBtn.style.display = 'inline-block';
                         cancelEditBtn.style.display = 'inline-block';
                     } else {
                         createSubmitBtn.style.display = 'inline-block';
                         updateBtn.style.display = 'none';
                         cancelEditBtn.style.display = 'none';
                     }
                 }

            } else {
                tab.classList.remove('active');
                 if (correspondingContent) {
                     correspondingContent.classList.remove('active');
                     correspondingContent.style.display = 'none'; 
                 }
            }
        });
    }


    function renderProjectTable(projects) {
        projectListBody.innerHTML = ""; 
        if (!projects || projects.length === 0) {
            projectListBody.innerHTML = '<tr><td colspan="11" style="text-align:center; padding: 20px;">Bạn chưa có đề tài nào được quản lý trong kỳ này hoặc không có kết quả phù hợp.</td></tr>';
            return;
        }

        projects.forEach((project) => {
            const row = document.createElement("tr");
            row.dataset.subjectProjectId = project.SubjectProjectId;
            // row.dataset.projectName = project.ProjectName;
            // row.dataset.minStudents = project.MinStudents;
            // row.dataset.maxStudents = project.MaxStudents;
            // row.dataset.description = project.Description;

            row.appendChild(createCell(project.ProjectCode));        
            row.appendChild(createCell(project.ProjectName));        
            row.appendChild(createCell(project.MinStudents, 'center'));  
            row.appendChild(createCell(project.MaxStudents, 'center')); 


            row.appendChild(createCell(project.MaxRegisteredGroups, 'center')); 

            row.appendChild(createCell(project.SubjectName));      
            row.appendChild(createCell(project.ClassCode));       
            row.appendChild(createCell(formatDate(project.RegistrationStartDate), 'center'));  // Ngày BĐ (Của SubjectProject)
            row.appendChild(createCell(formatDate(project.RegistrationEndDate), 'center'));    // Ngày KT (Của SubjectProject)
            row.appendChild(createCell(project.Description));    

            const actionCell = document.createElement("td");
            actionCell.classList.add("action-buttons");
            actionCell.style.textAlign = 'center';

            const editButton = document.createElement("button");
            editButton.classList.add("btn-edit");
            editButton.innerHTML = '<i class="fas fa-edit"></i>';
            editButton.dataset.subjectProjectId = project.SubjectProjectId; 

            const deleteButton = document.createElement("button");
            deleteButton.classList.add("btn-delete");
            deleteButton.innerHTML = '<i class="fas fa-trash-alt"></i>';
            deleteButton.dataset.subjectProjectId = project.SubjectProjectId; 

            actionCell.appendChild(editButton);
            actionCell.appendChild(deleteButton);
            row.appendChild(actionCell);

            // row.addEventListener('click', () => {
            //     projectNameInput.value = project.ProjectName;
            //     minStudentsInput.value = project.MinStudents;
            //     maxStudentsInput.value = project.MaxStudents;
            //     descriptionInput.value = project.Description;

            //     updateBtn.style.display = 'inline-block';
            //     popupOverlay.style.display = 'block';
            //     popupBox.style.display = 'block';
            // });

            projectListBody.appendChild(row);
        });
    }

    async function fetchManagedProjects() {
        projectListBody.innerHTML = '<tr><td colspan="11" style="text-align:center; padding: 20px;">Đang tải danh sách đề tài...</td></tr>';

        try {
            const response = await fetch(`/api/projects/managed`);

            if (!response.ok) {
                const errData = await response.json().catch(() => ({}));
                throw new Error(errData.message || `Lỗi ${response.status}`);
            }
            const data = await response.json();
            window.managedProjectsData = data; 
            applyFiltersAndRender(); 
        } catch (error) {
            console.error("Error fetching managed projects:", error);
            projectListBody.innerHTML = `<tr><td colspan="11" style="text-align:center; padding: 20px; color: red;">Lỗi tải danh sách đề tài: ${error.message}</td></tr>`;
        }
    }


    async function fetchAndRenderExistingProjects() {
        console.log("Fetching existing base projects for Tab 1 list...");
        //existingProjects.innerHTML = '<div class="loading-placeholder" style="padding: 15px; text-align: center;">Đang tải danh sách đề tài gốc...</div>';

        existingProjects.innerHTML = '';
        const header = document.createElement('div');
             header.className = 'project-row header';
             header.innerHTML = `
                 <div>Tên đề tài</div>
                 <div>SL Min</div>
                 <div>SL Max</div>
                 <div>Mô Tả</div>`;
             existingProjects.appendChild(header);

             if (!baseProjects || baseProjects.length === 0) {
                 existingProjects.innerHTML += '<div style="padding: 15px; text-align: center;">Không có đề tài gốc nào.</div>';
                 return;
             }

   
             baseProjects.forEach(proj => {
                 const row = document.createElement('div');
                 row.className = 'project-row';
    
                 row.dataset.projectCode = proj.projectCode;
                 row.dataset.projectName = proj.name;
                 row.dataset.minStudents = proj.min;
                 row.dataset.maxStudents = proj.max;
                 row.dataset.description = proj.description;

                 row.innerHTML = `
                     <div>${proj.name || 'N/A'}</div>
                     <div>${proj.min !== null ? proj.min : 'N/A'}</div>
                     <div>${proj.max !== null ? proj.max : 'N/A'}</div>
                     <div>${proj.description || 'N/A'}</div>`;
                 existingProjects.appendChild(row);
             });

    }
     async function populateFilters() {
          const populateSelect = (selectElement, data, valueField, textField, defaultOptionText = "Tất cả") => {
              selectElement.innerHTML = "";
              const defaultOption = document.createElement("option");
              defaultOption.value = ""; 
              defaultOption.textContent = defaultOptionText;
              selectElement.appendChild(defaultOption);

              data.forEach(item => {
                  const option = document.createElement("option");
                  option.value = item[valueField]; 
                  option.textContent = item[textField];
                  selectElement.appendChild(option);
              });
          };

         try {
             const response = await fetch('/api/teachingassignments/filters');
             if (!response.ok) throw new Error(`Lỗi ${response.status}`);
             const filterData = await response.json();

             populateSelect(filterClassSelect, filterData.classes || [], 'ClassCode', 'ClassCode', 'Tất cả Lớp');
             populateSelect(filterSubjectSelect, filterData.subjects || [], 'SubjectCode', 'SubjectName', 'Tất cả Môn');

         } catch (error) {
             console.error("Error populating filters:", error);
         }
     }

     function applyFiltersAndRender() {
        const classFilter = filterClassSelect.value; 
        const subjectFilter = filterSubjectSelect.value; 
        const nameFilter = filterNameInput.value.trim().toLowerCase();


        const filteredData = window.managedProjectsData.filter(project => {
            const classMatch = !classFilter || project.ClassCode === classFilter;
            const subjectMatch = !subjectFilter || project.SubjectCode === subjectFilter;
            const nameMatch = !nameFilter || project.ProjectName?.toLowerCase().includes(nameFilter);
            return classMatch && subjectMatch && nameMatch;
        });

        renderProjectTable(filteredData); 
    }




    filterClassSelect.addEventListener('change', applyFiltersAndRender);
    filterSubjectSelect.addEventListener('change', applyFiltersAndRender);
    filterSearchBtn.addEventListener('click', applyFiltersAndRender);
    filterNameInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            applyFiltersAndRender();
        }
    });
    populateFilters();      
    fetchManagedProjects();

    openPopupBtn.addEventListener('click', () => {
        showPopup('create');
    });

    if (closePopupBtn) closePopupBtn.addEventListener('click', closePopup);
    if (popupOverlay) popupOverlay.addEventListener('click', closePopup);

    tabs.forEach((tab, index) => {
        tab.addEventListener('click', () => switchTab(index));
    });


    existingProjects.addEventListener('click', (event) => {
        const clickedRow = event.target.closest('.project-row:not(.header)');
        if (clickedRow) {
            //console.log("Existing project row (in Tab 1) clicked:", clickedRow.dataset.projectId);
     
            existingProjects.querySelectorAll('.project-row.selected').forEach(row => row.classList.remove('selected'));
            clickedRow.classList.add('selected');

            const projectData = {
                projectCode: clickedRow.dataset.projectCode, 
                projectName: clickedRow.dataset.projectName,
                minStudents: clickedRow.dataset.minStudents,
                maxStudents: clickedRow.dataset.maxStudents,
                description: clickedRow.dataset.description
            };

            switchToUpdateMode(projectData);

        }
    });

    cancelEditBtn.addEventListener('click', () => {
         switchToCreateMode(true); 
    });
}
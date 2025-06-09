if (typeof window.managedProjectsData === 'undefined') {
    window.managedProjectsData = []; 
} else {
    window.managedProjectsData = []; 
}

if (typeof window.myProjectTemplates === 'undefined') {
    window.myProjectTemplates = [];
}

if (typeof window.isManageProjectPageInitialized === 'undefined') { 
    window.isManageProjectPageInitialized = false;
}

let currentActionData = {
    projectTemplate: null, // { ProjectCode, ProjectName, Description, isNew: true/false }
};


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
    const popupTitle = document.getElementById('popup-title');

    const tabs = popupBox.querySelectorAll('.popup-tabs .tab-btn');
    const tabTemplateContent = document.getElementById('tab-create-edit'); 
    const tabAssignContent = document.getElementById('tab-assign');    


    const formTemplate = document.getElementById('project-template-form');
    const inputNewProjectCode = document.getElementById('new-project-code');
    const inputProjectName = document.getElementById('project-template-name');
    const inputProjectDescription = document.getElementById('project-template-description');
    const existingProjectsListDiv = document.querySelector('.project-existing-list');

    const formAssign = document.getElementById('assign-to-class-form');
    const selectAssignSubject = document.getElementById('assign-subject');
    const selectAssignClass = document.getElementById('assign-class');
    const inputAssignMaxRegisteredGroups = document.getElementById('assign-max-groups');

    const btnNextOrAssign = document.getElementById('btn-next-or-assign'); // Sẽ đổi text
    const btnCancelEditTemplate = document.getElementById('btn-cancel-edit-template');
    const btnSaveOrUpdateTemplate = document.getElementById('btn-save-update-template'); 
    const btnUpdateAssignment = document.getElementById('btn-update-assignment');
    const btnCancelPopup = document.getElementById('btn-cancel-popup');


    let currentPopupMode = 'CREATE_NEW_TEMPLATE';
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


     function resetTemplateForm() {
        if(formTemplate) formTemplate.reset();
        if(inputNewProjectCode) inputNewProjectCode.disabled = false;
        if(inputNewProjectCode) inputNewProjectCode.value = ''; 
        if(inputProjectName) inputProjectName.value = '';
        if(inputProjectDescription) inputProjectDescription.value = '';
        currentActionData.projectTemplate = null;
        if(existingProjectsListDiv) existingProjectsListDiv.querySelectorAll('.project-row.selected').forEach(r => r.classList.remove('selected'));
    }


     function configureTemplateTabMode() {
        if (currentPopupMode === 'CREATE_NEW_TEMPLATE' && (!currentActionData.projectTemplate || !currentActionData.projectTemplate.isPotentiallyCreating) ) {
            resetTemplateForm(true); 
        } else if (currentPopupMode === 'EDIT_EXISTING_TEMPLATE' && currentActionData.projectTemplate) {
           
            if(inputNewProjectCode) {
                inputNewProjectCode.value = currentActionData.projectTemplate.ProjectCode;
                inputNewProjectCode.disabled = true; 
            }
            if(inputProjectName) inputProjectName.value = currentActionData.projectTemplate.ProjectName;
            if(inputProjectDescription) inputProjectDescription.value = currentActionData.projectTemplate.Description;
        }

        if (currentPopupMode === 'CREATE_NEW_TEMPLATE') {
            if (popupTitle) popupTitle.textContent = 'Tạo Đề Tài Mẫu Mới';
            if (inputNewProjectCode) inputNewProjectCode.disabled = false;
            if (btnSaveOrUpdateTemplate) {
                btnSaveOrUpdateTemplate.textContent = 'Lưu Đề Tài Mới';
                btnSaveOrUpdateTemplate.style.display = 'inline-block';
            }
            if (btnCancelEditTemplate) btnCancelEditTemplate.style.display = 'none'; 
        } else if (currentPopupMode === 'EDIT_EXISTING_TEMPLATE') {
            if (popupTitle) popupTitle.textContent = `Sửa Đề Tài Mẫu: ${currentActionData.projectTemplate?.ProjectCode || ''}`;
            if (inputNewProjectCode) inputNewProjectCode.disabled = true;
            if (btnSaveOrUpdateTemplate) {
                btnSaveOrUpdateTemplate.textContent = 'Cập Nhật Đề Tài';
                btnSaveOrUpdateTemplate.style.display = 'inline-block';
            }
            if (btnCancelEditTemplate) btnCancelEditTemplate.style.display = 'inline-block'; 
        }

        if(btnCancelPopup) btnCancelPopup.style.display = 'inline-block'; 
        switchTab(0);
    }



    function showPopupOverlay() {
        const popupOverlay = document.querySelector('.popup-overlay');
        const popupBox = document.querySelector('.create-project-popup');

        if (popupOverlay) {
            popupOverlay.style.display = 'block';
        } else {
            console.error("Element .popup-overlay không tìm thấy!");
        }
        if (popupBox) {
            popupBox.style.display = 'block';
        } else {
            console.error("Element .create-project-popup không tìm thấy!");
        }
    }   

   function openCreateNewTemplatePopup() {
        fetchAndRenderMyProjectTemplates(); 
        currentPopupMode = 'CREATE_NEW_TEMPLATE';
        currentActionData.projectTemplate = { isPotentiallyCreating: true }; 
        configureTemplateTabMode();
        currentActionData.projectTemplate = null; 
        showPopupOverlay();
    }

   function closePopup() {
        if(popupOverlay) popupOverlay.style.display = 'none';
        if(popupBox) popupBox.style.display = 'none';
        resetTemplateForm(); 
        currentPopupMode = 'CREATE_NEW_TEMPLATE'; 
    }


    function switchTab(activeIndex) {

        tabs.forEach((tab, index) => {
            const contentId = tab.dataset.tab;
            const contentElement = document.getElementById(contentId);
            if (!contentElement) return;

            if (index === 0 && activeIndex === 0) { 
                tab.classList.add('active');
                contentElement.style.display = 'block';
            } else {
                tab.classList.remove('active');
                contentElement.style.display = 'none';
            }
        });
        if (activeIndex !== 0) {
             console.warn("Đang cố gắng chuyển sang tab không được hỗ trợ trong logic hiện tại của Tab 1.");
             tabs[0].classList.add('active'); 
             if(tabTemplateContent) tabTemplateContent.style.display = 'block';
             if(tabAssignContent) tabAssignContent.style.display = 'none';
        }
        console.log(`Switched to tab index (forced): ${activeIndex === 0 ? 0 : 'invalid -> 0'}`);
    }



    async function fetchAndRenderMyProjectTemplates() {
         if (!existingProjectsListDiv) { console.warn("Element .project-existing-list not found for fetchAndRenderMyProjectTemplates"); return; }
        existingProjectsListDiv.innerHTML = '<div>Đang tải...</div>'; 
        try {
            const response = await fetch(`/api/projects/my-templates`);
            if (!response.ok) {
                const errData = await response.json().catch(() => ({}));
                throw new Error(errData.message || `Lỗi HTTP ${response.status}`);
            }
            window.myProjectTemplates = await response.json();
            existingProjectsListDiv.innerHTML = ''; 
            const header = document.createElement('div');
            header.className = 'project-row header';
            header.innerHTML = `
                 <div>Mã ĐT Mẫu</div>
                 <div>Tên đề tài Mẫu</div>
                 <div>Mô Tả Mẫu</div>
                 <div>Hành động</div>`;
            existingProjectsListDiv.appendChild(header);

            if (!window.myProjectTemplates || window.myProjectTemplates.length === 0) {
                existingProjectsListDiv.innerHTML += '<div style="text-align: center; padding:10px;">Bạn chưa tạo đề tài mẫu nào.</div>';
                return;
            }
            window.myProjectTemplates.forEach(proj => {
                const row = document.createElement('div');
                row.className = 'project-row';
                row.dataset.projectCode = proj.ProjectCode;
                row.dataset.projectName = proj.ProjectName;
                row.dataset.description = proj.Description || '';

                const actionsDiv = document.createElement('div');
                actionsDiv.className = 'template-actions';

                const editTemplateButton = document.createElement('button');
                editTemplateButton.textContent = 'Sửa Mẫu Này'; 
                editTemplateButton.className = 'btn-edit-template btn-small';
                editTemplateButton.type = 'button';
                editTemplateButton.onclick = () => {
                     currentActionData.projectTemplate = { ProjectCode: proj.ProjectCode, ProjectName: proj.ProjectName, Description: proj.Description || '' };
                     currentPopupMode = 'EDIT_EXISTING_TEMPLATE';
                     configureTemplateTabMode();
                };
                actionsDiv.appendChild(editTemplateButton);

                row.innerHTML = `
                     <div>${proj.ProjectCode || 'N/A'}</div>
                     <div>${proj.ProjectName || 'N/A'}</div>
                     <div>${proj.Description || 'N/A'}</div>
                     <div class="template-actions-placeholder"></div>`;
                const placeholder = row.querySelector('.template-actions-placeholder');
                if(placeholder) placeholder.appendChild(actionsDiv);
                else row.appendChild(actionsDiv);

                existingProjectsListDiv.appendChild(row);
            });
        } catch (error) {
            console.error("Error fetching my project templates:", error);
            existingProjectsListDiv.innerHTML = `<div style="color: red; text-align:center; padding:10px;">Lỗi tải: ${error.message}</div>`;
        }
    }

    function renderProjectTable(projects) {
        if (!projectListBody) return;
        projectListBody.innerHTML = "";
        if (!projects || projects.length === 0) {
            projectListBody.innerHTML = '<tr><td colspan="11" style="text-align:center; padding: 20px;">Bạn chưa có đề tài nào được quản lý hoặc không có kết quả phù hợp.</td></tr>';
            return;
        }

        projects.forEach((project) => {
            const row = document.createElement("tr");
            row.dataset.projectData = JSON.stringify(project);

            row.appendChild(createCell(project.ProjectCode));
            row.appendChild(createCell(project.ProjectName));
            row.appendChild(createCell(project.TotalStudentsOfGroup, 'center')); // SL SV/Nhóm (SV tự ĐK)
            let lecturerCanAdd = 0;
            if (typeof project.MaxStudentsOfGroup === 'number' && typeof project.TotalStudentsOfGroup === 'number') {
                lecturerCanAdd = Math.max(0, project.MaxStudentsOfGroup - project.TotalStudentsOfGroup);
            } else {
                lecturerCanAdd = 'N/A';
            }
        row.appendChild(createCell(lecturerCanAdd, 'center'));

            row.appendChild(createCell(`${project.CurrentRegisteredGroups || 0}/${project.MaxRegisteredGroups !== null ? project.MaxRegisteredGroups : 'Không giới hạn'}`, 'center')); // Chỗ trống

            row.appendChild(createCell(project.SubjectName));
            row.appendChild(createCell(project.ClassCode));
            row.appendChild(createCell(formatDate(project.RegistrationStartDate), 'center'));
            row.appendChild(createCell(formatDate(project.RegistrationEndDate), 'center'));
            row.appendChild(createCell(project.ProjectDescription));

            const actionCell = document.createElement("td");
            actionCell.classList.add("action-buttons");
            actionCell.style.textAlign = 'center';

            const editButton = document.createElement("button");
            editButton.classList.add("btn-edit");
            editButton.innerHTML = '<i class="fas fa-edit"></i>';
            editButton.title = "Sửa thiết lập gán";
            editButton.onclick = () => {
                const projectDataForEdit = JSON.parse(row.dataset.projectData);
                switchToEditSubjectClassProjectMode(projectDataForEdit);
            };

            const deleteButton = document.createElement("button");
            deleteButton.classList.add("btn-delete");
            deleteButton.innerHTML = '<i class="fas fa-trash-alt"></i>';
            deleteButton.title = "Xóa gán đề tài này";
            deleteButton.dataset.subjectClassProjectId = project.SubjectClassProjectId;

            actionCell.appendChild(editButton);
            actionCell.appendChild(deleteButton);
            row.appendChild(actionCell);

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


    // async function fetchAndRenderExistingProjects() {
    //     console.log("Fetching existing base projects for Tab 1 list...");
    //     //existingProjects.innerHTML = '<div class="loading-placeholder" style="padding: 15px; text-align: center;">Đang tải danh sách đề tài gốc...</div>';

    //       try {
    //         const response = await fetch(`/api/projects/my-templates`); 
    //         if (!response.ok) {
    //             const errData = await response.json().catch(() => ({}));
    //             throw new Error(errData.message || `Lỗi ${response.status}`);
    //         }
    //         window.myProjectTemplates = await response.json();
    //         existingProjects.innerHTML = '';

    //         const header = document.createElement('div'); 
    //         header.className = 'project-row header';
    //         header.innerHTML = `
    //              <div>Mã ĐT Mẫu</div>
    //              <div>Tên đề tài Mẫu</div>
    //              <div>Mô Tả Mẫu</div>
    //              <div>Hành động</div>`;
    //         existingProjectsListDiv.appendChild(header);

    //         if (!window.myProjectTemplates || window.myProjectTemplates.length === 0) {
    //             existingProjectsListDiv.innerHTML += '<div style="padding: 15px; text-align: center;">Bạn chưa tạo đề tài mẫu nào.</div>';
    //             return;
    //         }

    //         window.myProjectTemplates.forEach(proj => {
    //             const row = document.createElement('div');
    //             row.className = 'project-row';
    //             row.dataset.projectCode = proj.ProjectCode; 
    //             row.dataset.projectName = proj.ProjectName;
    //             row.dataset.description = proj.Description;

    //             const selectButton = document.createElement('button');
    //             selectButton.textContent = 'Chọn để Gán';
    //             selectButton.classList.add('btn-select-template');
    //             selectButton.onclick = (e) => {
    //                 e.stopPropagation(); 
    //                 const templateData = {
    //                     ProjectCode: proj.ProjectCode,
    //                     ProjectName: proj.ProjectName,
    //                     Description: proj.Description
    //                 };
    //                 selectExistingTemplateForAssignment(templateData);
    //             };

    //             const editTemplateButton = document.createElement('button');
    //             editTemplateButton.textContent = 'Sửa Template';
    //             editTemplateButton.classList.add('btn-edit-template');
    //             editTemplateButton.onclick = (e) => {
    //                  e.stopPropagation();
    //                  const templateData = {
    //                      ProjectCode: proj.ProjectCode,
    //                      ProjectName: proj.ProjectName,
    //                      Description: proj.Description
    //                  };
    //                  switchToEditTemplateMode(templateData);
    //             };


    //             row.innerHTML = `
    //                  <div>${proj.ProjectCode || 'N/A'}</div>
    //                  <div>${proj.ProjectName || 'N/A'}</div>
    //                  <div>${proj.Description || 'N/A'}</div>
    //                  <div class="template-actions"></div>`; 
    //             row.querySelector('.template-actions').appendChild(selectButton);
    //             row.querySelector('.template-actions').appendChild(editTemplateButton);
    //             existingProjectsListDiv.appendChild(row);
    //         });

    //     } catch (error) {
    //         console.error("Error fetching my project templates:", error);
    //         existingProjectsListDiv.innerHTML = `<div style="padding: 15px; text-align: center; color: red;">Lỗi tải danh sách đề tài mẫu: ${error.message}</div>`;
    //     }
    // }

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



    if (openPopupBtn) openPopupBtn.addEventListener('click', openCreateNewTemplatePopup);
    if (closePopupBtn) closePopupBtn.addEventListener('click', closePopup);
    if (popupOverlay) popupOverlay.addEventListener('click', (e) => { if (e.target === popupOverlay) closePopup(); });
    if (btnCancelPopup) btnCancelPopup.addEventListener('click', closePopup);

    tabs.forEach((tab, index) => {
        tab.addEventListener('click', () => {
            if (index === 0) { 
                switchTab(0);
            } else {
                console.log("Tab 2 (Gán cho lớp) sẽ được xử lý sau.");
            }
        });
    });


    
    if (btnCancelEditTemplate) {
        btnCancelEditTemplate.addEventListener('click', () => {
            currentPopupMode = 'CREATE_NEW_TEMPLATE';
            currentActionData.projectTemplate = { isPotentiallyCreating: true }; 
            configureTemplateTabMode();
            currentActionData.projectTemplate = null;
        });
    }

    if (btnSaveOrUpdateTemplate) {
        btnSaveOrUpdateTemplate.addEventListener('click', async () => {
            const projName = inputProjectName.value.trim();
            const projDesc = inputProjectDescription.value.trim();

            if (!projName) {
                alert("Tên đề tài mẫu không được để trống.");
                return;
            }

            let apiEndpoint = '';
            let method = '';
            let payload = {};
            let successMessage = '';

            if (currentPopupMode === 'CREATE_NEW_TEMPLATE') {
                const projCode = inputNewProjectCode.value.trim();
                if (!projCode) {
                    alert("Mã đề tài mẫu không được để trống khi tạo mới.");
                    return;
                }
                apiEndpoint = '/api/projects/templates';
                method = 'POST';
                payload = {
                    projectCode: projCode,
                    projectName: projName,
                    description: projDesc
                };
                successMessage = "Tạo đề tài mẫu thành công!";
            } else if (currentPopupMode === 'EDIT_EXISTING_TEMPLATE') {
                if (!currentActionData.projectTemplate || !currentActionData.projectTemplate.ProjectCode) {
                    alert("Lỗi: Không có thông tin đề tài mẫu để cập nhật.");
                    return;
                }
                const projectCodeToUpdate = currentActionData.projectTemplate.ProjectCode;
                
                apiEndpoint = `/api/projects/templates/${projectCodeToUpdate}`;
                method = 'PUT';
                payload = {
                    projectName: projName,
                    description: projDesc
                };
                successMessage = "Cập nhật đề tài mẫu thành công!";
            } else {
                console.error("Chế độ hoạt động không hợp lệ cho nút Lưu/Cập nhật Template:", currentPopupMode);
                alert("Thao tác không xác định.");
                return;
            }

            try {
                const response = await fetch(apiEndpoint, {
                    method: method,
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });
                const result = await response.json().then(data => ({ status: response.status, ok: response.ok, body: data }));

                if (!result.ok) throw new Error(result.body.message || `Lỗi ${result.status}`);

                alert(result.body.message || successMessage);
                fetchAndRenderMyProjectTemplates(); 
      
            } catch (error) {
                console.error("Lỗi khi xử lý template:", error);
                alert(`Lỗi: ${error.message}`);
            }
        });
    }


    if (filterClassSelect) filterClassSelect.addEventListener('change', applyFiltersAndRender);
    if (filterSubjectSelect) filterSubjectSelect.addEventListener('change', applyFiltersAndRender);
    if (filterSearchBtn) filterSearchBtn.addEventListener('click', applyFiltersAndRender); 
    if (filterNameInput) filterNameInput.addEventListener('input', applyFiltersAndRender); 


    populateFilters();
    fetchManagedProjects(); 
    window.isManageProjectPageInitialized = true;
}
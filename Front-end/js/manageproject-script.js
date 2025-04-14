if (typeof window.managedProjectsData === 'undefined') {
    window.managedProjectsData = []; 
} else {
    window.managedProjectsData = []; 
}

window.initManageProjectPage = function() {
    console.log("DEBUG: === initManageProjectPage() started ===");

    const projectListBody = document.getElementById('lecturer-project-list');
    const createBtn = document.getElementById('create-project-btn');
    const filterClassSelect = document.getElementById('filter-class-manage');
    const filterSubjectSelect = document.getElementById('filter-subject-manage');
    const filterNameInput = document.getElementById('filter-name-manage');
    const filterSearchBtn = document.getElementById('filter-search-btn-manage');


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

    function renderProjectTable(projects) {
        projectListBody.innerHTML = ""; 
        if (!projects || projects.length === 0) {
            projectListBody.innerHTML = '<tr><td colspan="11" style="text-align:center; padding: 20px;">Bạn chưa có đề tài nào được quản lý trong kỳ này hoặc không có kết quả phù hợp.</td></tr>';
            return;
        }

        projects.forEach((project) => {
            const row = document.createElement("tr");
            row.dataset.subjectProjectId = project.SubjectProjectId;

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
}
// --- Global State Variables ---
if (typeof window.selectedTopic === 'undefined') {
    window.selectedTopic = null;
} else {
    window.selectedTopic = null;
}

if (typeof window.mainPageData === 'undefined') {
    window.mainPageData = [];
} else {
    window.mainPageData = [];
}
if (typeof window.isMainPageInitialized === 'undefined') {
    window.isMainPageInitialized = false;
} else {
    window.isMainPageInitialized = false;
}

if (typeof window.eligibleStudentsForGroup === 'undefined') {
    window.eligibleStudentsForGroup = []; 
}
if (typeof window.loggedInStudentData === 'undefined') {
    window.loggedInStudentData = { studentCode: 'N22DCCN001' };
}

window.initMainPage = function(){
    const tableBody1 = document.getElementById("data-table-1");
    const selectedTopicInfo = document.getElementById("selected-topic-info");
    const selectedTopicText = document.getElementById("selected-topic-text");
    const groupInfoForm = document.getElementById("group-info-form");
    const subresBtn = document.getElementById("sub-res-button");



    //const filterClass = document.getElementById("filter-class");
    const filterSubject = document.getElementById("filter-subject");
    const filterNameInput = document.getElementById("filter-name");
    const memberCountSelect = document.getElementById("member-count");
    const submitBtn = document.getElementById("submit-btn");
    const resetBtn = document.getElementById("reset-btn");
    

    if (!tableBody1 || !filterSubject || !filterNameInput || !memberCountSelect || !submitBtn || !resetBtn || !selectedTopicInfo) {
        console.error("Thiếu các thành phần DOM cần thiết cho Main Page. Không thể khởi tạo.");
        return; 
    }

    function populateSelect(selectElement, data) {
        selectElement.innerHTML = "";
        const defaultOption = document.createElement("option");
        defaultOption.value = "ALL";
        defaultOption.textContent = "Tất cả";
        selectElement.appendChild(defaultOption);
    
        data.forEach(item => {
            const option = document.createElement("option");
            option.value = item.value;
            option.textContent = item.text;
            selectElement.appendChild(option);
        });
    }

    async function loadFiltersFromAPI() {
        try {
            const  subjectRes = await fetch('http://localhost:3000/api/subjects');
            if (!subjectRes.ok) {
                throw new Error(`Lỗi fetch môn học: ${subjectRes.status} ${subjectRes.statusText}`);
            }
    
            const subjectData = await subjectRes.json();
    
            const subjectOptions = subjectData.map(s => ({ value: s.SubjectCode, text: s.SubjectName }));
    
            populateSelect(filterSubject, subjectOptions);
            filterTable();
        } catch (err) {
            console.error('Lỗi khi fetch filter data:', err);
            filterSubject.innerHTML = '<option value="ALL">Lỗi tải dữ liệu</option>';
        }
    }

    function renderTable(tableBody, data) {
        const formatDate = (dateStr) => {
            if (!dateStr) return '';
            try { return new Date(dateStr).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' }); } // Thêm format dd/mm/yyyy
            catch { return dateStr; }
        };

        tableBody.innerHTML = "";
        if(!data || data.length === 0) {
            tableBody.innerHTML = '<tr><td colspan="11" style="text-align:center; padding: 20px;">Không có dữ liệu phù hợp.</td></tr>';
            return;
       }
       data.forEach((item, index) => {
        const row = document.createElement("tr");
        row.dataset.index = index;
        const checkboxCell = document.createElement("td");
        const checkbox = document.createElement("input");
        checkbox.type = "checkbox";
        checkbox.id = `check-${item.subjectClassProjectId}`;
        checkbox.dataset.originalIndex = index;
        checkbox.value = item.subjectClassProjectId;

        if (item.isRegistrationOpen === false) {
            checkbox.disabled = true;
            row.classList.add('registration-closed');
            row.classList.add('disabled-row');
        }
        // if (item.isRegistered) {
        //     checkbox.disabled = true;
        //     row.classList.add('registered-project');
        // }
        
        if (!checkbox.disabled) {
            checkbox.addEventListener('change', handleCheckboxChange);
        }


        checkboxCell.appendChild(checkbox);
        row.appendChild(checkboxCell);

        const createCell = (text) => {
            const cell = document.createElement("td");
            cell.textContent = text === null || text === undefined ? '' : text;
            return cell;
        };

        row.appendChild(createCell(item.ProjectCode));
        row.appendChild(createCell(item.ProjectName));

        const maxStudentCell = createCell(item.TotalStudentsOfGroup);
        maxStudentCell.style.textAlign = 'center';
        row.appendChild(maxStudentCell);

        const slotsCell = document.createElement("td");
        let slotsText = '';
        if (item.MaxRegisteredGroups === null || item.MaxRegisteredGroups === undefined) {
                slotsText = 'Không giới hạn';
        } else if (typeof item.MaxRegisteredGroups === 'number' && typeof item.CurrentRegisteredGroups === 'number') {
                const availableSlots = Math.max(0, item.MaxRegisteredGroups - item.CurrentRegisteredGroups);
                slotsText = `${item.CurrentRegisteredGroups}/${item.MaxRegisteredGroups}`;
                if (availableSlots === 0) {
                    slotsCell.style.color = 'red';
                    slotsCell.style.fontWeight = 'bold';
                }
        } else {
                slotsText = 'N/A';
            }
        slotsCell.textContent = slotsText;
        slotsCell.style.textAlign = 'center';
        row.appendChild(slotsCell);

        row.appendChild(createCell(item.LecturerName));
        row.appendChild(createCell(item.SubjectName));
        row.appendChild(createCell(item.ClassCode)); 
        row.appendChild(createCell(formatDate(item.RegistrationStartDate)));
        row.appendChild(createCell(formatDate(item.RegistrationEndDate)));
        row.appendChild(createCell(item.ProjectDescription));   

        tableBody.appendChild(row);

    });
    }

    const handleCheckboxChange = (e) => {
        const checkbox = e.target;
        const originalIndex  = parseInt(checkbox.dataset.originalIndex, 10); 
        const subjectClassProjectId  = checkbox.value;
        selectTopic(originalIndex, subjectClassProjectId, checkbox.checked);
    }

    async function fetchEligibleStudents(subjectClassId) {
        console.log(`Fetching eligible students for subjectClassId: ${subjectClassId}`);
        try {
            const response = await fetch(`http://localhost:3000/api/enrollments/students-for-subjectclass/${subjectClassId}`);
            if (!response.ok) {
                const errBody = await response.json().catch(() => ({}));
                throw new Error(errBody.message || `Lỗi ${response.status}: Không lấy được danh sách SV.`);
            }
            window.eligibleStudentsForGroup = await response.json();
        } catch (error) {
            console.error("Lỗi fetchEligibleStudents:", error);
            window.eligibleStudentsForGroup = []; 
            alert(`Không thể tải danh sách sinh viên cho nhóm: ${error.message}`);  
        }
    }



    async function selectTopic(originalIndex, subjectClassProjectIdStr, isChecked) {
        const subjectClassProjectIdNum = parseInt(subjectClassProjectIdStr, 10);
        const checkbox = document.getElementById(`check-${subjectClassProjectIdNum}`);
        const row = checkbox ? checkbox.closest("tr") : null;
        const memberFields = document.getElementById("member-fields");
    

        document.querySelectorAll('#data-table-1 input[type="checkbox"]').forEach(cb => {
            if (cb.value !== subjectClassProjectIdStr) { 
                cb.checked = false;
                const otherRow = cb.closest("tr");
                if (otherRow) otherRow.classList.remove('selected-row');
            }
        });
    
        if (isChecked && row) {
            const topicDataFromMain = window.mainPageData.find(item => item.subjectClassProjectId === subjectClassProjectIdNum);
            if (!topicDataFromMain) {
                 console.error("Không tìm thấy dữ liệu đề tài tương ứng với checkbox được chọn.");
                 selectedTopicInfo.style.display = 'none';
                 groupInfoForm.style.display = 'none';
                 subresBtn.style.display = 'none';
                 memberFields.innerHTML = "";
                 if (row) row.classList.remove('selected-row');
                 return;
            }
            
            window.selectedTopic = { ...topicDataFromMain };
               
            selectedTopicText.textContent = `Mã ĐT Lớp: ${selectedTopic.subjectClassProjectId}, Tên: ${selectedTopic.ProjectName}, GV: ${selectedTopic.LecturerName}`;
            selectedTopicInfo.style.display = 'block';
            groupInfoForm.style.display = 'block';
            subresBtn.style.display = 'flex';
            row.classList.add('selected-row');


            // Gọi API lấy danh sách SV đủ điều kiện
            if (window.selectedTopic && window.selectedTopic.subjectClassId) { 
                await fetchEligibleStudents(window.selectedTopic.subjectClassId);
            } else {
                 console.error("Không có subjectClassId để fetch danh sách sinh viên.");
                 window.eligibleStudentsForGroup = [];
            }



            const maxMemberCountForStudentChoice = parseInt(selectedTopic.TotalStudentsOfGroup, 10); // Giới hạn cho SV tự ĐK
            const MIN_MEMBERS_PER_GROUP_FRONTEND = 1;
            memberCountSelect.innerHTML = "";
            const placeholderOption = document.createElement("option");
            placeholderOption.value = "";
            placeholderOption.textContent = "Chọn số lượng"; 
            placeholderOption.disabled = true;
            placeholderOption.selected = true;
            memberCountSelect.appendChild(placeholderOption);


            if (!isNaN(maxMemberCountForStudentChoice) && MIN_MEMBERS_PER_GROUP_FRONTEND <= maxMemberCountForStudentChoice) {
                for (let i = MIN_MEMBERS_PER_GROUP_FRONTEND; i <= maxMemberCountForStudentChoice; i++) {
                    const option = document.createElement("option");
                    option.value = i;
                    option.textContent = i;
                    memberCountSelect.appendChild(option);
                }
                memberCountSelect.disabled = false;
            } else {
                console.warn("Số lượng thành viên tối đa (cho SV đăng ký) không hợp lệ:", selectedTopic.TotalStudentsOfGroup);
                memberCountSelect.disabled = true;
                const errorOption = document.createElement("option");
                errorOption.value = "";
                errorOption.textContent = "Không thể chọn";
                memberCountSelect.appendChild(errorOption);
            }


            document.getElementById("group-name").value = "";
            //document.getElementById("member-count").value = "";
            memberFields.innerHTML = "";

        } else {
            window.selectedTopic = null;
            selectedTopicInfo.style.display = 'none';
            groupInfoForm.style.display = 'none';
            subresBtn.style.display = 'none';
            memberFields.innerHTML = "";
            if (row) row.classList.remove('selected-row');
            memberCountSelect.innerHTML = ""; 
            document.getElementById("member-count").value = "";
            document.getElementById("group-name").value = "";
            memberFields.innerHTML = "";
        }
    }

    function updateMemberFields() {
        const memberCount = +document.getElementById("member-count").value;
        const memberFields = document.getElementById("member-fields");
        memberFields.innerHTML = "";

        const leaderStudentCode = window.loggedInStudentData ? window.loggedInStudentData.studentCode : '';
    
       for (let i = 1; i <= memberCount; i++) {
            const memberInfo = document.createElement("div");
            memberInfo.classList.add("member-info");
            const label = document.createElement("label");
            label.setAttribute("for", `member-student-code-${i}`);
            label.textContent = i === 1 ? "MSSV trưởng nhóm (bạn):" : `MSSV thành viên ${i}:`;

            memberInfo.appendChild(label);
            memberInfo.appendChild(document.createElement("br"));

            if (i === 1) { 
                const input = document.createElement("input");
                input.type = "text";
                input.id = `member-student-code-${i}`;
                input.name = `member-student-code-${i}`;
                input.value = leaderStudentCode;
                input.disabled = true; 
                input.required = true;
                memberInfo.appendChild(input);
            } else { 
                const select = document.createElement("select");
                select.id = `member-student-code-${i}`;
                select.name = `member-student-code-${i}`;
                select.required = true;

                const defaultOption = document.createElement("option");
                defaultOption.value = "";
                defaultOption.textContent = "Chọn thành viên";
                defaultOption.disabled = true;
                defaultOption.selected = true;
                select.appendChild(defaultOption);

                const availableStudents = window.eligibleStudentsForGroup.filter(
                    student => student.StudentCode !== leaderStudentCode
                );

                availableStudents.forEach(student => {
                    const option = document.createElement("option");
                    option.value = student.StudentCode;
                    option.textContent = `${student.FullName} (${student.StudentCode})`;

                    if (student.IsAlreadyInGroupForThisSubjectClass) {
                        option.disabled = true;
                    }
                    select.appendChild(option);
                });
                memberInfo.appendChild(select);
                select.addEventListener('change', handleMemberSelectionChange);
                
            }
            memberFields.appendChild(memberInfo);        
    }
    if (memberCount > 1) { 
        handleMemberSelectionChange();
    }
}
    
     function handleMemberSelectionChange() {
        const memberSelects = Array.from(document.querySelectorAll('#member-fields select'));
        const selectedValues = new Set();

        memberSelects.forEach(select => {
            if (select.value) {
                selectedValues.add(select.value);
            }
        });

        memberSelects.forEach(currentSelect => {
            Array.from(currentSelect.options).forEach(option => {
                if (option.value && option.value !== currentSelect.value && selectedValues.has(option.value)) {
                    option.disabled = true;
                } else if (option.value) { 
                    option.disabled = false;
                }
            });
        });
    }



    function submitRegistration() {
        const groupName = document.getElementById("group-name").value.trim();
        const memberCountEl = document.getElementById("member-count");
        const totalMembersStr = memberCountEl ? memberCountEl.value : null;
        const members = [];
    
        if (!window.selectedTopic || window.selectedTopic.subjectClassProjectId === undefined || window.selectedTopic.subjectClassProjectId === null) {
            return alert("Vui lòng chọn đề tài!");
        }
        if (!groupName) {
            return alert("Vui lòng nhập tên nhóm!");
        }
        if (!totalMembersStr || isNaN(parseInt(totalMembersStr)) || parseInt(totalMembersStr) <= 0) {
            return alert("Vui lòng chọn số lượng thành viên hợp lệ!");
        }
        
        
        
        const totalMembers = parseInt(totalMembersStr);
        const leaderStudentCode = window.loggedInStudentData ? window.loggedInStudentData.studentCode : '';
        if (!leaderStudentCode) {
            return alert("Không xác định được thông tin nhóm trưởng (người đăng nhập).");
        }
         members.push({ studentCode: leaderStudentCode, studentRole: "NHÓM TRƯỞNG" });
        const enteredStudentCodes = new Set([leaderStudentCode.toUpperCase()]);
        

        try {
        for (let i = 2; i <= totalMembers; i++) {
            const memberSelectElement = document.getElementById(`member-student-code-${i}`);
            if (!memberSelectElement) { 
                throw new Error(`Lỗi: Không tìm thấy ô chọn cho thành viên vị trí ${i}.`);
            }
            const studentCode = memberSelectElement.value; 

            if (!studentCode) { 
                memberSelectElement.focus();
                throw new Error(`Vui lòng chọn MSSV cho thành viên ${i}!`);
            }

            members.push({ studentCode: studentCode, studentRole: "THÀNH VIÊN" });
        }
        } catch (error) {
            return alert(error.message);
        }
        if (members.length !== totalMembers) {
            console.error("Số lượng thành viên thu thập được không khớp:", members, totalMembers);
            return alert("Có lỗi trong quá trình thu thập thông tin thành viên. Vui lòng thử lại.");
        }

    
        const dataToSend = {
            groupName: groupName,
            subjectClassProjectId: window.selectedTopic.subjectClassProjectId,
            members: members
        }
    
        fetch('http://localhost:3000/api/projects/register', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(dataToSend)
            })
        .then(response => response.json().then(data => ({ status: response.status, ok: response.ok, body: data })))
        .then(result => {
            if (!result.ok) throw new Error(result.body.message || `Lỗi ${result.status}`);
            alert(result.body.message || `Đăng ký thành công!`);
            resetForm();
            filterTable();
        })
        .catch(err => {
            console.error('Lỗi khi đăng ký nhóm:', err);      
            alert(`Đăng ký nhóm thất bại: ${err.message}`);    
        });
    }


    function resetForm() {
        document.querySelectorAll('input[type="checkbox"]').forEach(cb => {
            cb.checked = false;
            cb.closest("tr").classList.remove('selected-row');
        });
        window.selectedTopic = null;
        selectedTopicInfo.style.display = 'none';        selectedTopicText.textContent = "none";
        groupInfoForm.style.display = 'none'; 
        subresBtn.style.display = 'none'; 
        document.getElementById("member-fields").innerHTML = "";
        document.getElementById("member-count").value = "";
        document.getElementById("group-name").value = "";
    }

    function filterTable() {
        const selectedSubject = filterSubject.value;
        const nameKeyword = document.getElementById("filter-name").value.toLowerCase().trim();
        console.log(`Filtering by subject: ${selectedSubject}, name keyword: ${nameKeyword}`);
        const queryParams = new URLSearchParams();
        if (selectedSubject !== 'ALL') {
            queryParams.append('subjectCodeFilter', selectedSubject);
        }
        const queryString = queryParams.toString() ? `?${queryParams.toString()}` : '';
        
        console.log(`Fetching filtered data with query: ${queryString}`);
        fetch(`http://localhost:3000/api/projects/filter${queryString}`)
            .then(response => response.json())  
            .then(result => {
                let filtered = result;
                if(nameKeyword) {
                    filtered = result.filter(item =>
                         item.ProjectName.toLowerCase().includes(nameKeyword));
                }
                window.mainPageData = filtered.map(item => ({
                    subjectClassProjectId: item.subjectClassProjectId,
                    subjectClassId: item.subjectClassId,
                    ProjectCode: item.ProjectCode,
                    ProjectName: item.ProjectName,
                    TotalStudentsOfGroup: item.TotalStudentsOfGroup, // Giới hạn SV tự ĐK
                    MaxStudentsOfGroup: item.MaxStudentsOfGroup,     // Giới hạn tuyệt đối (GV có thể thêm)
                    MaxRegisteredGroups: item.MaxRegisteredGroups,
                    CurrentRegisteredGroups: item.CurrentRegisteredGroups,
                    LecturerName: item.LecturerName,
                    SubjectName: item.SubjectName,
                    ClassCode: item.ClassCode,
                    RegistrationStartDate: item.RegistrationStartDate,
                    RegistrationEndDate: item.RegistrationEndDate,
                    ProjectDescription: item.ProjectDescription || '',
                    isRegistrationOpen: item.isRegistrationOpen
                }));
                renderTable(tableBody1, mainPageData);
                //resetForm();
            })
            .catch(err => {
                console.error('Lỗi khi fetch filtered data:', err);
                tableBody1.innerHTML = `<tr><td colspan="12" style="text-align:center;">Không thể tải dữ liệu từ server</td></tr>`;
            });
    }

    if(filterSubject) filterSubject.onchange = filterTable;
    if(filterNameInput) filterNameInput.oninput = filterTable;
    if(memberCountSelect) memberCountSelect.onchange = updateMemberFields;
    if(submitBtn) submitBtn.onclick = submitRegistration;
    if(resetBtn) resetBtn.onclick = resetForm;

    loadFiltersFromAPI();
    window.isMainPageInitialized  = true; 

}
 
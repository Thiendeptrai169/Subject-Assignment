let selectedTopic = null;
let mainPageData = [];
let isMainPageInitialized = false;

function initMainPage(){
    const tableBody1 = document.getElementById("data-table-1");
    const selectedTopicInfo = document.getElementById("selected-topic-info");
    const selectedTopicText = document.getElementById("selected-topic-text");
    const groupInfoForm = document.getElementById("group-info-form");
    const subresBtn = document.getElementById("sub-res-button");
    const filterClass = document.getElementById("filter-class");
    const filterSubject = document.getElementById("filter-subject");
    const filterNameInput = document.getElementById("filter-name");
    const memberCountSelect = document.getElementById("member-count");
    const submitBtn = document.getElementById("submit-btn");
    const resetBtn = document.getElementById("reset-btn");

    if (!tableBody1 || !filterClass || !filterSubject || !filterNameInput || !memberCountSelect || !submitBtn || !resetBtn || !selectedTopicInfo) {
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
            const [classRes, subjectRes] = await Promise.all([
                fetch('http://localhost:3000/api/classes'),
                fetch('http://localhost:3000/api/subjects')
            ]);
    
            const classData = await classRes.json();
            const subjectData = await subjectRes.json();
    
            const classOptions = classData.map(c => ({ value: c.ClassCode, text: c.ClassCode }));
            const subjectOptions = subjectData.map(s => ({ value: s.SubjectCode, text: s.SubjectName }));
    
            populateSelect(filterClass, classOptions);
            populateSelect(filterSubject, subjectOptions);
            filterTable();
        } catch (err) {
            console.error('Lỗi khi fetch filter data:', err);
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
        checkbox.id = `check-${index}`;
        checkbox.dataset.index = index; 

        const maxGroups = item.soLuongGroupToiDa;       
        const currentGroups = item.soLuongGroupDaDangKy; 

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


        if (item.subjectProjectId === undefined|| item.subjectProjectId === null) {
            console.warn(`Mục dữ liệu thứ ${index} thiếu subjectProjectId:`, item);
             checkbox.value = ""; 
             checkbox.disabled = true; 
        } else {
             checkbox.value = item.subjectProjectId; 
        }


        checkboxCell.appendChild(checkbox);
        row.appendChild(checkboxCell);

        const createCell = (text) => {
            const cell = document.createElement("td");
            cell.textContent = text === null || text === undefined ? '' : text;
            return cell;
        };

        row.appendChild(createCell(item.maDeTai));
        row.appendChild(createCell(item.ten));
        row.appendChild(createCell(item.soLuongSVToiThieu));
        row.appendChild(createCell(item.soLuongSVToiDa));
        const slotsCell = document.createElement("td");
        let slotsText = '';
        if (maxGroups === null) {
            slotsText = 'Không giới hạn';
            slotsCell.style.textAlign = 'center';
        } else if (typeof maxGroups === 'number' && typeof currentGroups === 'number') {
            const availableSlots = Math.max(0, maxGroups - currentGroups);
            slotsText = `${currentGroups}/${maxGroups}`;
            if (availableSlots === 0) {
                slotsCell.style.color = 'red';
                slotsCell.style.fontWeight = 'bold';
            }
            slotsCell.style.textAlign = 'center';
        } else {
            slotsText = 'N/A';
            slotsCell.style.textAlign = 'center';
        }
        slotsCell.textContent = slotsText;
        row.appendChild(slotsCell);
        row.appendChild(createCell(item.nguoiTao));
        row.appendChild(createCell(item.monHoc));
        row.appendChild(createCell(item.lop));
        row.appendChild(createCell(formatDate(item.ngayBatDau)));
        row.appendChild(createCell(formatDate(item.ngayKetThuc)));
        row.appendChild(createCell(item.moTa));

        tableBody.appendChild(row);

    });
    }

    const handleCheckboxChange = (e) => {
        const checkbox = e.target;
        const index = parseInt(checkbox.dataset.index, 10); 
        const subjectProjectId = checkbox.value;
        selectTopic(index, subjectProjectId, checkbox.checked);
    }

    function selectTopic(index, subjectProjectIdStr, isChecked) {
        const checkbox = document.getElementById(`check-${index}`);
        const row = checkbox.closest("tr");
        const memberFields = document.getElementById("member-fields");
    
    
        if (isChecked) {
            document.querySelectorAll('#data-table-1 input[type = "checkbox"]').forEach(cb => {
                if(cb.id !== `check-${index}`) {
                    cb.checked = false;
                    const otherRow = cb.closest("tr")
                    if(otherRow) otherRow.classList.remove('selected-row');
               
                }
            });
    
            selectedTopic = {...mainPageData[index]};
            const subjectProjectIdNum = parseInt(subjectProjectIdStr, 10);
            selectedTopic = {
                ...selectedTopic,
                subjectProjectId: parseInt(subjectProjectIdNum, 10)
            };
    
            
                selectedTopicText.textContent = `Mã: ${selectedTopic.maDeTai}, Tên: ${selectedTopic.ten}, Giảng viên: ${selectedTopic.nguoiTao}`;
                selectedTopicInfo.style.display = 'block';
                groupInfoForm.style.display = 'block';
                subresBtn.style.display = 'flex';
                row.classList.add('selected-row');
                const minStudents = parseInt(selectedTopic.soLuongSVToiThieu, 10);
                const maxStudents = parseInt(selectedTopic.soLuongSVToiDa, 10);
                memberCountSelect.innerHTML = "";
                const placeholderOption = document.createElement("option");
                placeholderOption.value = "";
                placeholderOption.textContent = "Chọn số lượng"; 
                placeholderOption.disabled = true;
                placeholderOption.selected = true;
                memberCountSelect.appendChild(placeholderOption);
                for (let i = minStudents; i <= maxStudents; i++) {
                    const option = document.createElement("option");
                    option.value = i;
                    option.textContent = i;
                    memberCountSelect.appendChild(option);
                }
                memberCountSelect.disabled = false;


                document.getElementById("group-name").value = "";
                document.getElementById("member-count").value = "";
                memberFields.innerHTML = "";
    
            } else {
                selectedTopic = null;
                selectedTopicInfo.style.display = 'none';
                groupInfoForm.style.display = 'none';
                subresBtn.style.display = 'none';
                memberFields.innerHTML = "";
                row.classList.remove('selected-row');
                document.getElementById("member-count").value = "";
                document.getElementById("group-name").value = "";
            }
    }

    function updateMemberFields() {
        const memberCount = +document.getElementById("member-count").value;
        const memberFields = document.getElementById("member-fields");
        memberFields.innerHTML = "";
    
        for (let i = 1; i <= memberCount; i++) {
            const memberInfo = document.createElement("div");
            memberInfo.classList.add("member-info");
    
            const label = document.createElement("label");
            label.setAttribute("for", `member-${i}`);
            label.textContent = i === 1 ? "MSSV trưởng nhóm:" : `MSSV thành viên ${i}:`;
    
            const input = document.createElement("input");
            input.type = "text";
            input.id = `member-${i}`;
            input.name = `member-${i}`;
            input.required = true;
            input.placeholder = `Nhập MSSV ${i}`;
    
            memberInfo.append(label, document.createElement("br"), input);
            memberFields.appendChild(memberInfo);
        }
    }
    

    function submitRegistration() {
        const groupName = document.getElementById("group-name").value.trim();
        const memberCountEl = document.getElementById("member-count");
        const totalMembersStr = memberCountEl ? memberCountEl.value : null;
        const members = [];
    
        if (!selectedTopic || selectedTopic.subjectProjectId === undefined || selectedTopic.subjectProjectId === null) {
            return alert("Vui lòng chọn đề tài!");
        }
        if (!groupName) {
            return alert("Vui lòng nhập tên nhóm!");
        }
        if (!totalMembersStr || isNaN(parseInt(totalMembersStr)) || parseInt(totalMembersStr) <= 0) {
            return alert("Vui lòng chọn số lượng thành viên hợp lệ!");
        }
        
        
        
        const totalMembers = parseInt(totalMembersStr);
        const enteredStudentIds = new Set();
        try { 
            for (let i = 1; i <= parseInt(totalMembers); i++) { 
                const memberInput = document.getElementById(`member-${i}`);
                if (!memberInput) throw new Error(`Lỗi: Không tìm thấy ô nhập cho thành viên ${i}.`);
                const memberId = memberInput.value.trim(); 
                if (!memberId) { 
                    throw new Error(`Vui lòng nhập MSSV cho thành viên ${i}!`);
                }
                if (enteredStudentIds.has(memberId)) {
                    isValid = false;
                    alert(`MSSV ${memberId} bị trùng lặp trong nhóm.`);
                    memberInput.focus();
                    break;
               }
                enteredStudentIds.add(memberId);
                let role = 'THÀNH VIÊN';
                if (i === 1) role = 'NHÓM TRƯỞNG';
                members.push({ studentId: memberId, studentRole: role });
            }
        } catch (error) {
             return alert(error.message); 
        }
    
        const dataToSend = {
            groupName: groupName,
            subjectProjectId: selectedTopic.subjectProjectId,
            totalMember: members.length,
            members: members
        }
    
        fetch('http://localhost:3000/api/projects/register', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(dataToSend)
            })
        .then(response => {
            if (!response.ok) {
                 return response.json().then(errBody => {
                      throw new Error(errBody.message || `Lỗi ${response.status}: ${response.statusText}`);
                 }).catch(() => {
                     throw new Error(`Lỗi HTTP ${response.status}: ${response.statusText}`);
                 });
            }
            return response.json();
        })
        .then(result => {
            alert(result?.message || `Đăng ký thành công!`);
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
        selectedTopic = null;
        selectedTopicInfo.style.display = 'none';        selectedTopicText.textContent = "none";
        groupInfoForm.style.display = 'none'; 
        subresBtn.style.display = 'none'; 
        document.getElementById("member-fields").innerHTML = "";
        document.getElementById("member-count").value = "";
        document.getElementById("group-name").value = "";
    }

    function filterTable() {
        const selectedClass = filterClass.value;
        const selectedSubject = filterSubject.value;
        const nameKeyword = document.getElementById("filter-name").value.toLowerCase().trim();
    
        const query = [];
        if (selectedClass !== 'ALL') query.push(`classCode=${selectedClass}`);
        if (selectedSubject !== 'ALL') query.push(`subjectCode=${selectedSubject}`);
        const queryString = query.length ? '?' + query.join('&') : '';
    
        fetch(`http://localhost:3000/api/projects/filter${queryString}`)
            .then(response => response.json())
            .then(result => {
                let filtered = result;
                if(nameKeyword) {
                    filtered = filtered.filter(item =>
                         item.ProjectName.toLowerCase().includes(nameKeyword));
                }
                mainPageData = filtered.map(item => ({
                    subjectProjectId: item.subjectProjectId,
                    maDeTai: item.ProjectCode,
                    ten: item.ProjectName,
                    soLuongSVToiThieu: item.MinStudents,
                    soLuongSVToiDa: item.MaxStudents,
                    soLuongGroupToiDa: item.MaxRegisteredGroups,
                    soLuongGroupDaDangKy: item.CurrentRegisteredGroups,
                    nguoiTao: item.LecturerName,
                    monHoc: item.SubjectName,
                    lop: item.ClassCode,
                    ngayBatDau: item.RegistrationStartDate?.split('T')[0],
                    ngayKetThuc: item.RegistrationEndDate?.split('T')[0],
                    moTa: item.Description || '',
                    isRegistrationOpen: item.isRegistrationOpen 
                }));
                renderTable(tableBody1, mainPageData);
            })
            .catch(err => {
                console.error('Lỗi khi fetch filtered data:', err);
                tableBody1.innerHTML = `<tr><td colspan="12" style="text-align:center;">Không thể tải dữ liệu từ server</td></tr>`;
            });
    }

    if(filterClass) filterClass.onchange = filterTable;
    if(filterSubject) filterSubject.onchange = filterTable;
    if(filterNameInput) filterNameInput.oninput = filterTable;
    if(memberCountSelect) memberCountSelect.onchange = updateMemberFields;
    if(submitBtn) submitBtn.onclick = submitRegistration;
    if(resetBtn) resetBtn.onclick = resetForm;

    loadFiltersFromAPI();
    isMainPageInitialized = true; 


}
 
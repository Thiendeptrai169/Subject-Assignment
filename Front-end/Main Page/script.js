// DOM Elements
const tableBody1 = document.getElementById("data-table-1");
const selectedTopicInfo = document.getElementById("selected-topic-info");
const selectedTopicText = document.getElementById("selected-topic-text");
const groupInfoForm = document.getElementById("group-info-form");
const subresBtn = document.getElementById("sub-res-button");
const groupInfo = document.getElementById("group-info");
const filterClass = document.getElementById("filter-class");
const filterSubject = document.getElementById("filter-subject");


let selectedTopic = null;
let data = [];
let members = [];

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

        const classOptions = classData.map(c => ({ value: c.Classcode, text: c.ClassName }));
        const subjectOptions = subjectData.map(s => ({ value: s.SubjectCode, text: s.SubjectName }));

        populateSelect(filterClass, classOptions);
        populateSelect(filterSubject, subjectOptions);
        filterTable();
    } catch (err) {
        console.error('Lỗi khi fetch filter data:', err);
    }
}

function renderTable(tableBody, data) {
    tableBody.innerHTML = "";
    data.forEach((item, index) => {
        const row = document.createElement("tr");
        const checkboxCell = document.createElement("td");
        const checkbox = document.createElement("input");
        checkbox.type = "checkbox";
        checkbox.id = `check-${index}`;
        
        if (item.subjectProjectId === undefined|| item.subjectProjectId === null) {
            console.warn(`Mục dữ liệu thứ ${index} thiếu subjectProjectId:`, item);
             checkbox.value = ""; 
             checkbox.disabled = true; 
        } else {
             checkbox.value = item.subjectProjectId; 

             if(item.isRegistered) {
                checkbox.disabled = true; 
                row.classList.add('registered-project');
            }
        }


        if(!checkbox.disabled){
            checkbox.addEventListener('change', (e) => {
                selectTopic(index, e.target.value, e.target.checked);
            });
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
        // row.appendChild(createCell(item.trangThai));
        row.appendChild(createCell(item.nguoiTao));
        row.appendChild(createCell(item.monHoc));
        row.appendChild(createCell(item.lop));
        row.appendChild(createCell(item.ngayBatDau));
        row.appendChild(createCell(item.ngayKetThuc));
        row.appendChild(createCell(item.moTa));

        tableBody.appendChild(row);

    });
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

        const topicData = {...data[index]};
        const subjectProjectIdNum = parseInt(subjectProjectIdStr, 10);
        selectedTopic = {
            ...topicData,
            subjectProjectId: parseInt(subjectProjectIdNum, 10)
        };

        
            selectedTopicText.textContent = `Mã: ${selectedTopic.maDeTai}, Tên: ${selectedTopic.ten}, Giảng viên: ${selectedTopic.nguoiTao}`;
            selectedTopicInfo.classList.add("visible");
            groupInfoForm.classList.add("visible");
            subresBtn.classList.add("visible");
            row.classList.add('selected-row');
            document.getElementById("group-name").value = "";
            document.getElementById("member-count").value = "";
            memberFields.innerHTML = "";

        } else {
            selectedTopic = null;
            selectedTopicInfo.classList.remove("visible");
            groupInfoForm.classList.remove("visible");
            subresBtn.classList.remove("visible");
            row.classList.remove('selected-row');
            memberFields.innerHTML = "";
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

        memberInfo.append(label, document.createElement("br"), input);
        memberFields.appendChild(memberInfo);
    }
}

//update info studentgroup
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
    try { 
        for (let i = 1; i <= parseInt(totalMembers); i++) { 
            const memberInput = document.getElementById(`member-${i}`);
            if (!memberInput) throw new Error(`Lỗi: Không tìm thấy ô nhập cho thành viên ${i}.`);
            const memberId = memberInput.value.trim(); 
            if (!memberId) { 
                throw new Error(`Vui lòng nhập MSSV cho thành viên ${i}!`);
            }
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
    .then(response => response.json())
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
    selectedTopicInfo.classList.remove("visible");
    selectedTopicText.textContent = "none";
    groupInfoForm.classList.remove("visible");
    subresBtn.classList.remove("visible");
    document.getElementById("member-fields").innerHTML = "";
    document.getElementById("member-count").value = "";
    document.getElementById("group-name").value = "";
}

document.getElementById('submit-btn').addEventListener('click', submitRegistration);
document.getElementById('reset-btn').addEventListener('click', resetForm);

//render table projects
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
            data = filtered.map(item => ({
                subjectProjectId: item.subjectProjectId,
                maDeTai: item.ProjectCode,
                ten: item.ProjectName,
                soLuongSVToiThieu: item.MinStudents,
                soLuongSVToiDa: item.MaxStudents,
                trangThai: item.Status,
                nguoiTao: item.LecturerName,
                monHoc: item.SubjectName,
                lop: item.ClassCode,
                ngayBatDau: item.StartDate?.split('T')[0],
                ngayKetThuc: item.EndDate?.split('T')[0],
                moTa: item.Description || '',
                isRegistered: item.IsRegistered 
            }));
            renderTable(tableBody1, data);
        })
        .catch(err => {
            console.error('Lỗi khi fetch filtered data:', err);
            tableBody1.innerHTML = `<tr><td colspan="12" style="text-align:center;">Không thể tải dữ liệu từ server</td></tr>`;
        });
}

//popup avartar-mini
document.addEventListener('DOMContentLoaded', function() {
    const userAvatar = document.getElementById('userAvatar');
    const userPopup = document.getElementById('userPopup');
    
   
    userAvatar.addEventListener('click', function(e) {
        e.stopPropagation();
        userPopup.classList.toggle('show');
    });
    

    document.addEventListener('click', function(e) {
        if (!userPopup.contains(e.target) && e.target !== userAvatar) {
            userPopup.classList.remove('show');
        }
    });
    
    const logoutBtn = document.querySelector('.logout-btn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', function() {
            // add function logout here
            console.log('Đăng xuất');
        });
    }
});



filterClass.addEventListener("change", filterTable);
filterSubject.addEventListener("change", filterTable);
document.getElementById("filter-name").addEventListener("input", filterTable);

loadFiltersFromAPI();
filterTable();
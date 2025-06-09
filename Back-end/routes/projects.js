const express = require('express');
const router = express.Router();
const { sql, pool, poolConnect } = require('../config/db');
const { authenticateToken, attachUserInfo, authorizeRole } = require('../middleware/auth');

//router for filter
router.get('/filter',authenticateToken, attachUserInfo, async (req, res) => {
  const {subjectCodeFilter}  = req.query;
  console.log('Received subjectCodeFilter:', subjectCodeFilter);
  const loggedInStudentCode = req.user.StudentCode; //hard code
    try {
        await poolConnect;
        const request = pool.request();

        request.input('loggedInStudentCode', sql.VarChar, loggedInStudentCode);
        if (subjectCodeFilter && subjectCodeFilter !== "ALL") {
          request.input('subjectCodeFilter', sql.VarChar, subjectCodeFilter);
        } else {
          request.input('subjectCodeFilter', sql.VarChar, null);
        }
      
        //get current date
        const today = new Date().toISOString().split('T')[0];
        request.input('currentDate', sql.Date, today);
        const result = await request.query(`
          SELECT
                SCP.Id AS subjectClassProjectId,
                SCP.MaxRegisteredGroups,
                SCP.subjectClassId,
                (SELECT COUNT(*) FROM StudentGroups sg WHERE sg.SubjectClassProjectsId = SCP.Id) AS CurrentRegisteredGroups,
                SPR.RegistrationStartDate,
                SPR.RegistrationEndDate,
                P.ProjectCode,
                P.ProjectName,
                P.Description AS ProjectDescription,
                Sub.SubjectCode,
                Sub.SubjectName,
                L.FullName AS LecturerName,
                SC.TotalStudentsOfGroup,   
                SC.MaxStudentsOfGroup, 
                SC.ClassCode,

              CAST(
                    CASE
                        WHEN SPR.Id IS NULL THEN 1 
                        WHEN (@currentDate >= SPR.RegistrationStartDate OR SPR.RegistrationStartDate IS NULL) AND
                             (@currentDate <= SPR.RegistrationEndDate OR SPR.RegistrationEndDate IS NULL)
                        THEN 1
                        ELSE 0
                    END
                AS BIT) AS isRegistrationPeriodActive,

              CAST(
                    CASE
                        WHEN (SELECT COUNT(*) FROM StudentGroups sg WHERE sg.SubjectClassProjectsId = SCP.Id) >= SCP.MaxRegisteredGroups THEN 0
                        ELSE 1
                    END
                AS BIT) AS hasSlotsAvailable,

              CAST(
                    CASE
                        WHEN
                            ( (SPR.Id IS NULL) OR
                              ((@currentDate >= SPR.RegistrationStartDate OR SPR.RegistrationStartDate IS NULL) AND
                               (@currentDate <= SPR.RegistrationEndDate OR SPR.RegistrationEndDate IS NULL))
                            )
                            AND
                            ( (SELECT COUNT(*) FROM StudentGroups sg WHERE sg.SubjectClassProjectsId = SCP.Id) < SCP.MaxRegisteredGroups OR SCP.MaxRegisteredGroups IS NULL)
                        THEN 1
                        ELSE 0
                    END
                AS BIT) AS isRegistrationOpen

          FROM SubjectClassProjects SCP
          JOIN Projects P ON SCP.ProjectCode = P.ProjectCode
          JOIN SubjectClasses SC ON SCP.SubjectClassId = SC.Id
          JOIN Subjects Sub ON SC.SubjectCode = Sub.SubjectCode
          JOIN Lecturers L ON SC.LecturerCode = L.LecturerCode
          JOIN Enrollment E ON SC.SubjectCode = E.SubjectCode AND SC.ClassCode = E.ClassCode
                              AND E.StudentCode = @loggedInStudentCode
          LEFT JOIN SubjectProjectsRegistrations SPR ON SC.SubjectCode = SPR.SubjectCode AND SC.ClassCode = SPR.ClassCode
          WHERE
                Sub.ExamType = N'Đồ án' 
                AND (@subjectCodeFilter IS NULL OR Sub.SubjectCode = @subjectCodeFilter)
          ORDER BY Sub.SubjectName, P.ProjectName;


          
        `);
          res.json(result.recordset);   

    } catch (err) {
      console.error('Lỗi khi lọc project theo kỳ hiện tại:', err);
      res.status(500).json('Lỗi truy vấn.');
    }

});


//router for POST info grouptudent
router.post('/register', authenticateToken, attachUserInfo, async (req, res) => {
    const {groupName, subjectClassProjectId, members} = req.body;
    const registrantStudentCode = 'N22DCCN001'; //hard code
    
    if(!groupName || !subjectClassProjectId || !members || members.length === 0){ {
        return res.status(400).json({ message: 'Thiếu thông tin đăng ký bắt buộc (tên nhóm, ID đề tài, số lượng thành viên, danh sách thành viên).' });
      }
    }

    if (typeof groupName !== 'string' || groupName.trim() === '') {
      return res.status(400).json({ message: 'Tên nhóm không hợp lệ.' });
    }
    if (typeof subjectClassProjectId !== 'number' || !Number.isInteger(subjectClassProjectId) || subjectClassProjectId <= 0) {
        return res.status(400).json({ message: 'ID Đề tài không hợp lệ.' });
    }

    

    const expectedLeaderRole = "Nhóm trưởng";
    const expectedMemberRole = "Thành viên"; 
    const allowedRoles = [expectedLeaderRole, expectedMemberRole]; 
    let studentCodesFromRequest  = [];
    let leaderStudentCode = null;

    for (let i = 0; i < members.length; i++) {
      const member = members[i];
      //console.log(typeof member.studentId);
      //const studentIdParse = parseInt(member.studentId, 10);
      if (!member || !member.studentCode || typeof member.studentCode!== 'string' || member.studentCode.trim() === '' || !member.studentRole || typeof member.studentRole !== 'string' || member.studentRole.trim() === '') {
           return res.status(400).json({ message: `Thông tin thành viên thứ ${i + 1} không hợp lệ (cần studentCode và studentRole dạng chuỗi không rỗng).` });
      }
    
      const currentMemberRole = member.studentRole.trim().toUpperCase();
       if (!allowedRoles.includes(currentMemberRole)) {
             return res.status(400).json({ message: `Vai trò '${member.studentRole}' của thành viên thứ ${i + 1} không hợp lệ. Chỉ chấp nhận: ${allowedRoles.join(', ')}.` });
       }
       if (currentMemberRole === expectedLeaderRole.toUpperCase()) {
            if (leaderStudentCode) {
                return res.status(400).json({ message: `Chỉ được phép có một '${expectedLeaderRole}' trong nhóm.` });
            }
            leaderStudentCode = member.studentCode.trim();
        }
        studentCodesFromRequest.push(member.studentCode.trim());
    }

    if (!leaderStudentCode) {
        return res.status(400).json({ message: `Nhóm phải có một '${expectedLeaderRole}'.` });
    }
    
    if (members[0].studentCode.trim() !== leaderStudentCode || members[0].studentRole.trim().toUpperCase() !== expectedLeaderRole.toUpperCase()){
         return res.status(400).json({ message: `Thành viên đầu tiên trong danh sách phải là '${expectedLeaderRole}'.` });
    }

    if (registrantStudentCode !== leaderStudentCode) {
        return res.status(403).json({ message: `Chỉ nhóm trưởng (${leaderStudentCode}) mới được phép đăng ký nhóm.` });
    }

    let transaction;
    try{
      await poolConnect;
      transaction = new sql.Transaction(pool);
      await transaction.begin();
      
      //check quantity of groupstudent and time register
      const projectCheckRequest = new sql.Request(transaction);
        projectCheckRequest.input('subjectClassProjectId', sql.Int, subjectClassProjectId);
        const today = new Date().toISOString().split('T')[0];
        projectCheckRequest.input('currentDate', sql.Date, today);
        const projectCheckResult = await projectCheckRequest.query(`
            SELECT
                SCP.Id AS SCP_Id,
                SCP.SubjectClassId,
                SCP.ProjectCode,
                SCP.MaxRegisteredGroups,
                SC.SubjectCode AS SC_SubjectCode,
                SC.ClassCode AS SC_ClassCode,
                SC.MaxStudentsOfGroup AS SC_MaxStudentsPerGroup,
                SPR.RegistrationStartDate,
                SPR.RegistrationEndDate,
                (SELECT COUNT(*) FROM StudentGroups sg WHERE sg.SubjectClassProjectsId = SCP.Id) AS CurrentRegisteredGroupsCount
            FROM SubjectClassProjects SCP
            JOIN SubjectClasses SC ON SCP.SubjectClassId = SC.Id
            JOIN Projects P ON SCP.ProjectCode = P.ProjectCode
            LEFT JOIN SubjectProjectsRegistrations SPR ON SC.SubjectCode = SPR.SubjectCode AND SC.ClassCode = SPR.ClassCode
            WHERE SCP.Id = @subjectClassProjectId;
        `);

      if (projectCheckResult.recordset.length === 0) {
          await transaction.rollback();
          return res.status(404).json({ message: 'Đề tài lớp học (SubjectClassProject) không tồn tại.' });
      }

      const projectDetails = projectCheckResult.recordset[0];
      const MIN_MEMBERS_PER_GROUP_BACKEND = 1;
      const totalMembersInRequest = members.length;
      const maxMembersForStudentRegistration = projectDetails.SC_TotalStudentsOfGroup;

      if (totalMembersInRequest < MIN_MEMBERS_PER_GROUP_BACKEND || totalMembersInRequest > maxMembersForStudentRegistration) {
        await transaction.rollback();
        return res.status(400).json({
            message: `Số lượng thành viên (${totalMembersInRequest}) không hợp lệ khi sinh viên tự đăng ký. Yêu cầu từ ${MIN_MEMBERS_PER_GROUP_BACKEND} đến ${maxMembersForStudentRegistration} sinh viên.`
        });
      }

      
      let isPeriodActive  = true;
      if (projectDetails.RegistrationStartDate && new Date(today) < new Date(projectDetails.RegistrationStartDate)) {
            isPeriodActive = false;
      }

      if (isPeriodActive && projectDetails.RegistrationEndDate) {
            const endDateCheck = new Date(projectDetails.RegistrationEndDate);
              endDateCheck.setHours(23, 59, 59, 999); 
            if (new Date(today) > endDateCheck) { 
                isPeriodActive = false;
            }
        }
      if (!isPeriodActive && !(projectDetails.RegistrationStartDate === null && projectDetails.RegistrationEndDate === null) ) { 
            await transaction.rollback();
            return res.status(400).json({ message: 'Đã hết hoặc chưa đến hạn đăng ký đề tài này.' });
        }


      if (projectDetails.MaxRegisteredGroups !== null && projectDetails.CurrentRegisteredGroupsCount >= projectDetails.MaxRegisteredGroups) {
            await transaction.rollback();
            return res.status(400).json({ message: `Đề tài này đã đủ số lượng nhóm (${projectDetails.MaxRegisteredGroups}) đăng ký.` });
        }


      //check enrollment of all students in group
      const enrollmentCheckRequest = transaction.request();
      enrollmentCheckRequest.input('subjectCodeParam', sql.VarChar, projectDetails.SC_SubjectCode);
      enrollmentCheckRequest.input('classCodeParam', sql.VarChar, projectDetails.SC_ClassCode);
      const studentCodeParamsSQL = studentCodesFromRequest.map((sc, i) => {
            const paramName = `studentCode_${i}`;
            enrollmentCheckRequest.input(paramName, sql.VarChar, sc);
            return `@${paramName}`;
        }).join(',');
      const enrollmentCheckQuery = `
            SELECT StudentCode FROM Enrollment
            WHERE SubjectCode = @subjectCodeParam
              AND ClassCode = @classCodeParam
              AND StudentCode IN (${studentCodeParamsSQL});
        `;
      const enrollmentResult = await enrollmentCheckRequest.query(enrollmentCheckQuery);
      const enrolledStudentCodes = enrollmentResult.recordset.map(r => r.StudentCode);
      const notEnrolledStudents = studentCodesFromRequest.filter(sc => !enrolledStudentCodes.includes(sc));
      if (notEnrolledStudents.length > 0) {
            await transaction.rollback();
            return res.status(403).json({
                message: `Các sinh viên sau chưa đăng ký học phần '${projectDetails.SC_SubjectCode}' cho lớp '${projectDetails.SC_ClassCode}': ${notEnrolledStudents.join(', ')}. Hoặc các sinh viên này không thuộc lớp ${projectDetails.SC_ClassCode}.`
            });
      }
      
       // Check if any member is already in another group for THE SAME SubjectClass
      const memberConflictCheckRequest = transaction.request();
      memberConflictCheckRequest.input('subjectClassIdParam', sql.Int, projectDetails.SubjectClassId);
      const conflictStudentCodeParamsSQL = studentCodesFromRequest.map((sc, i) => {
            const paramName = `conflictStudentCode_${i}`;
            memberConflictCheckRequest.input(paramName, sql.VarChar, sc);
            return `@${paramName}`;
        }).join(',');
      const conflictQuery = `
            SELECT DISTINCT gm.StudentCode
            FROM GroupMembers gm
            JOIN StudentGroups sg ON gm.StudentGroupId = sg.Id
            WHERE sg.SubjectClassesId = @subjectClassIdParam
              AND gm.StudentCode IN (${conflictStudentCodeParamsSQL});
        `;
      const conflictResult = await memberConflictCheckRequest.query(conflictQuery);
      if (conflictResult.recordset.length > 0) {
            await transaction.rollback();
            const conflictingStudents = conflictResult.recordset.map(r => r.StudentCode);
            return res.status(409).json({
                message: `Các sinh viên sau đã thuộc một nhóm khác trong lớp học phần này: ${conflictingStudents.join(', ')}.`
            });
        }

      // Insert into StudentGroups
      const insertGroupRequest = transaction.request();
      insertGroupRequest.input('leaderCode', sql.VarChar, leaderStudentCode);
      insertGroupRequest.input('subjectClassesId', sql.Int, projectDetails.SubjectClassId);
      insertGroupRequest.input('subjectClassProjectsId', sql.Int, subjectClassProjectId);
      insertGroupRequest.input('groupName', sql.NVarChar, groupName);
      insertGroupRequest.input('notes', sql.NVarChar, req.body.notes || null);

      const groupInsertResult = await insertGroupRequest.query(`
            INSERT INTO StudentGroups (LeaderCode, SubjectClassesId, SubjectClassProjectsId, GroupName, Notes)
            OUTPUT INSERTED.Id
            VALUES (@leaderCode, @subjectClassesId, @subjectClassProjectsId, @groupName, @notes);
        `);
      const newGroupId = groupInsertResult.recordset[0].Id;
        

      //  Insert into GroupMembers
       const joinGroupDate = new Date().toISOString().split('T')[0];
        for (const member of members) {
            const memberInsertRequest = transaction.request();
            memberInsertRequest.input('studentGroupId', sql.Int, newGroupId);
            memberInsertRequest.input('studentCode', sql.VarChar, member.studentCode.trim());
            memberInsertRequest.input('studentRole', sql.NVarChar, member.studentRole.trim()); 
            memberInsertRequest.input('joinGroupDate', sql.Date, joinGroupDate);
          await memberInsertRequest.query(`
                INSERT INTO GroupMembers (StudentGroupId, StudentCode, StudentRole, JoinGroupDate)
                VALUES (@studentGroupId, @studentCode, @studentRole, @joinGroupDate);
            `);
        }
        await transaction.commit();
        res.status(201).json({ message: 'Đăng ký nhóm thành công!'});
    }
    catch(err){
        if (transaction) await transaction.rollback();
        console.error('Lỗi khi đăng ký nhóm:', err);
        res.status(500).json('Đăng ký nhóm thất bại!');
    }
});


router.get('/managed', authenticateToken, attachUserInfo, async (req, res) => {
    const loggedInLecturerCode = req.user.lecturerCode; // Hardcode 

    try {
        await poolConnect;
        const request = pool.request();
        request.input('lecturerCodeParam', sql.VarChar, loggedInLecturerCode);

        const result = await request.query(`
            SELECT
                SCP.Id AS SubjectClassProjectId, 
                P.ProjectCode,
                P.ProjectName,
                P.Description AS ProjectDescription,
                SCP.MaxRegisteredGroups,          
                SPR.RegistrationStartDate,        
                SPR.RegistrationEndDate,         
                S.SubjectCode,
                S.SubjectName,
                SC_assoc.ClassCode,              
                SC.TotalStudentsOfGroup,          
                SC.MaxStudentsOfGroup            
            FROM SubjectClassProjects SCP
            JOIN Projects P ON SCP.ProjectCode = P.ProjectCode
            JOIN SubjectClasses SC ON SCP.SubjectClassId = SC.Id            
            JOIN Subjects S ON SC.SubjectCode = S.SubjectCode
            JOIN Class SC_assoc ON SC.ClassCode = SC_assoc.ClassCode    
            LEFT JOIN SubjectProjectsRegistrations SPR ON SC.SubjectCode = SPR.SubjectCode AND SC.ClassCode = SPR.ClassCode 
            WHERE 
                SC.LecturerCode = @lecturerCodeParam 
                AND S.ExamType = N'Đồ án'            
            ORDER BY S.SubjectName, SC_assoc.ClassCode, P.ProjectCode;
        `);

        res.json(result.recordset);

    } catch (err) {
        console.error('Lỗi khi lấy danh sách đề tài giảng viên quản lý:', err.stack || err);
        res.status(500).json({ message: 'Lỗi server khi lấy danh sách đề tài giảng viên quản lý.', error: err.message });
    }
});

router.get('/my-templates', authenticateToken, attachUserInfo, async (req, res) => {
    const loggedInLecturerCode = req.user.lecturerCode; 

    if (!loggedInLecturerCode) {
        return res.status(401).json({ message: 'Không xác định được thông tin giảng viên. Yêu cầu đăng nhập.' });
    }

    try {
        await poolConnect;
        const request = pool.request();

        request.input('creatorLecturerCode', sql.VarChar, loggedInLecturerCode);

        const query = `
            SELECT
                P.ProjectCode,
                P.ProjectName,
                P.Description
            FROM
                Projects P
            WHERE
                P.CreatedByLecturerCode = @creatorLecturerCode
            ORDER BY
                P.ProjectName, P.ProjectCode;
        `;

        const result = await request.query(query);

        res.json(result.recordset);

    } catch (err) {
        console.error(`Lỗi khi lấy danh sách đề tài mẫu do giảng viên '${loggedInLecturerCode}' tạo:`, err.stack || err);
        res.status(500).json({ message: 'Lỗi server khi lấy danh sách đề tài mẫu đã tạo.', error: err.message });
    }
});



// Trong projects.js

// router.post('/managed', async (req, res) => {
//     const loggedInLecturerCode = 'GV001'; // Hardcode - VARCHAR

//     // BỎ totalStudentsOfGroup, maxStudentsOfGroup khỏi req.body
//     const {
//         newProjectCode,
//         newProjectName,
//         newProjectDescription,
//         existingProjectCode,
//         subjectCode, // VARCHAR - Môn học
//         classCode,   // VARCHAR - Lớp học
//         // totalStudentsOfGroup, // BỎ
//         // maxStudentsOfGroup,   // BỎ
//         maxRegisteredGroups    // INT - Số nhóm tối đa được ĐK đề tài này trong LHP này
//     } = req.body;

//     // ---- VALIDATIONS ----
//     if (!subjectCode || !classCode) {
//         return res.status(400).json({ message: 'Thiếu thông tin Môn học hoặc Lớp học.' });
//     }
//     let isCreatingNewTemplate = false;
//     let projectCodeToUse;
//     if (newProjectCode && newProjectName) {
//         isCreatingNewTemplate = true;
//         projectCodeToUse = newProjectCode.trim();
//         if (!projectCodeToUse) return res.status(400).json({ message: 'Mã đề tài mới không được để trống.' });
//         if (existingProjectCode) return res.status(400).json({ message: 'Không thể vừa tạo đề tài mới vừa chọn đề tài đã có.' });
//     } else if (existingProjectCode) {
//         projectCodeToUse = existingProjectCode.trim();
//         if (!projectCodeToUse) return res.status(400).json({ message: 'Mã đề tài đã có không được để trống.' });
//         isCreatingNewTemplate = false;
//     } else {
//         return res.status(400).json({ message: 'Cần cung cấp thông tin đề tài mới (Mã, Tên) hoặc chọn Mã đề tài đã có.' });
//     }
//     // Bỏ validation cho totalStudentsOfGroup, maxStudentsOfGroup
//     if (maxRegisteredGroups !== undefined && maxRegisteredGroups !== null && (isNaN(parseInt(maxRegisteredGroups)) || +maxRegisteredGroups < 0)) {
//         return res.status(400).json({ message: 'Số lượng nhóm tối đa đăng ký (MaxRegisteredGroups) không hợp lệ.' });
//     }

//     let transaction;
//     try {
//         await poolConnect;
//         transaction = new sql.Transaction(pool);
//         await transaction.begin();
//         console.log("Backend POST /managed (v3 - no SC update): Transaction began.");

//         // 1. XỬ LÝ PROJECT TEMPLATE (Tạo mới hoặc dùng cái có sẵn)
//         // (Logic này giữ nguyên như phiên bản trước - giảng viên tự đặt ProjectCode)
//         if (isCreatingNewTemplate) {
//             const checkCodeRequest = new sql.Request(transaction);
//             checkCodeRequest.input('pProjectCodeToCheck', sql.VarChar, projectCodeToUse);
//             const codeExistsResult = await checkCodeRequest.query(`SELECT ProjectCode FROM Projects WHERE ProjectCode = @pProjectCodeToCheck`);
//             if (codeExistsResult.recordset.length > 0) {
//                 await transaction.rollback();
//                 return res.status(409).json({ message: `Mã đề tài '${projectCodeToUse}' đã tồn tại.` });
//             }
//             const createProjectRequest = new sql.Request(transaction);
//             createProjectRequest.input('pProjectCode', sql.VarChar, projectCodeToUse);
//             createProjectRequest.input('pProjectName', sql.NVarChar, newProjectName);
//             createProjectRequest.input('pDescription', sql.NVarChar, newProjectDescription || null);
//             await createProjectRequest.query(`
//                 INSERT INTO Projects (ProjectCode, ProjectName, Description)
//                 VALUES (@pProjectCode, @pProjectName, @pDescription);
//             `);
//             console.log(`Created new Project Template: ${projectCodeToUse}`);
//         } else {
//             const checkProjectRequest = new sql.Request(transaction);
//             checkProjectRequest.input('pExistingProjectCode', sql.VarChar, projectCodeToUse);
//             const projectExistsResult = await checkProjectRequest.query(`SELECT ProjectCode FROM Projects WHERE ProjectCode = @pExistingProjectCode`);
//             if (projectExistsResult.recordset.length === 0) {
//                 await transaction.rollback();
//                 return res.status(404).json({ message: `Mã đề tài mẫu '${projectCodeToUse}' không tồn tại.` });
//             }
//             console.log(`Using existing Project Template: ${projectCodeToUse}`);
//         }

//         // 2. TÌM SUBJECTCLASS (KHÔNG CẬP NHẬT NỮA)
//         // SubjectClass PHẢI TỒN TẠI cho Giảng viên - Môn - Lớp này
//         const findSubjectClassRequest = new sql.Request(transaction);
//         findSubjectClassRequest.input('scLecturerCode', sql.VarChar, loggedInLecturerCode);
//         findSubjectClassRequest.input('scSubjectCode', sql.VarChar, subjectCode);
//         findSubjectClassRequest.input('scClassCode', sql.VarChar, classCode);

//         const subjectClassResult = await findSubjectClassRequest.query(`
//             SELECT Id FROM SubjectClasses
//             WHERE LecturerCode = @scLecturerCode AND SubjectCode = @scSubjectCode AND ClassCode = @scClassCode;
//         `);

//         if (subjectClassResult.recordset.length === 0) {
//             await transaction.rollback();
//             console.log(`SubjectClass không tìm thấy cho GV: ${loggedInLecturerCode}, Môn: ${subjectCode}, Lớp: ${classCode}`);
//             return res.status(404).json({ message: `Lớp học phần này không tồn tại hoặc bạn không được phân công dạy để gán đề tài.` });
//         }
//         const subjectClassId = subjectClassResult.recordset[0].Id;
//         console.log(`Found SubjectClass ID: ${subjectClassId}. No update to Total/MaxStudentsOfGroup via this API.`);


//         // 3. TẠO SUBJECTCLASSPROJECT (Gán đề tài cho lớp học phần)
//         const createSCPRequest = new sql.Request(transaction);
//         createSCPRequest.input('scpSubjectClassId', sql.Int, subjectClassId);
//         createSCPRequest.input('scpProjectCode', sql.VarChar, projectCodeToUse);
//         createSCPRequest.input('scpMaxRegisteredGroups', sql.Int, maxRegisteredGroups === undefined || maxRegisteredGroups === null ? null : maxRegisteredGroups);

//         const createdSCPResult = await createSCPRequest.query(`
//             INSERT INTO SubjectClassProjects (SubjectClassId, ProjectCode, MaxRegisteredGroups)
//             OUTPUT INSERTED.*
//             VALUES (@scpSubjectClassId, @scpProjectCode, @scpMaxRegisteredGroups);
//         `);
//         console.log(`Created SubjectClassProject ID: ${createdSCPResult.recordset[0].Id}`);

//         await transaction.commit();
//         console.log("Transaction committed.");
//         res.status(201).json({ message: 'Gán đề tài thành công!', subjectClassProject: createdSCPResult.recordset[0] });

//     } catch (err) {
//         console.error('Lỗi khi tạo/gán đề tài:', err.stack || err);
//         if (transaction && !transaction.aborted && !transaction.committed) {
//             try { await transaction.rollback(); }
//             catch (rbErr) { console.error("Rollback error:", rbErr); }
//         }
//         if (err.number === 2627) {
//             if (err.message.includes('UQ_SubjectClassProject')) {
//                  return res.status(409).json({ message: `Đề tài '${projectCodeToUse}' đã được gán cho lớp học phần này rồi.` });
//             } else if (err.message.toLowerCase().includes('projects') && err.message.toLowerCase().includes('projectcode')) {
//                  return res.status(409).json({ message: `Mã đề tài '${projectCodeToUse}' đã tồn tại.` });
//             }
//         }
//         res.status(500).json({ message: 'Lỗi server khi tạo/gán đề tài.', error: err.message });
//     }
// });

// Trong projects.js

router.post('/templates', authenticateToken, attachUserInfo, async (req, res) => {

    const loggedInLecturerCode = req.user.lecturerCode; 

    const { projectCode, projectName, description } = req.body;

    if (!projectCode || typeof projectCode !== 'string' || projectCode.trim() === '') {
        return res.status(400).json({ message: 'Mã đề tài (projectCode) không được để trống.' });
    }
    if (!projectName || typeof projectName !== 'string' || projectName.trim() === '') {
        return res.status(400).json({ message: 'Tên đề tài (projectName) không được để trống.' });
    }
    if (!loggedInLecturerCode || typeof loggedInLecturerCode !== 'string' || loggedInLecturerCode.trim() === '') {
        return res.status(401).json({ message: 'Mã giảng viên tạo (CreatedByLecturerCode) là bắt buộc và không hợp lệ.' });
    }

    let transaction; 
    try {
        await poolConnect;
        transaction = new sql.Transaction(pool); 
        await transaction.begin();
        console.log("POST /templates: Transaction began");

  
        const lecturerCheckRequest = new sql.Request(transaction);
        lecturerCheckRequest.input('pCheckingLecturerCode', sql.VarChar(20), loggedInLecturerCode);
        const lecturerExistsResult = await lecturerCheckRequest.query('SELECT LecturerCode FROM Lecturers WHERE LecturerCode = @pCheckingLecturerCode');
        if (lecturerExistsResult.recordset.length === 0) {
            await transaction.rollback(); 
            console.log("POST /templates: Rollback - Lecturer not found");
            return res.status(400).json({ message: `Giảng viên với mã '${loggedInLecturerCode}' không tồn tại.` });
        }

       
        const checkCodeRequest = new sql.Request(transaction); 
        const pCodeTrimmed = projectCode.trim();
        checkCodeRequest.input('pCodeToCheck', sql.VarChar(20), pCodeTrimmed);
        const codeExistsResult = await checkCodeRequest.query('SELECT ProjectCode FROM Projects WHERE ProjectCode = @pCodeToCheck');
        if (codeExistsResult.recordset.length > 0) {
            await transaction.rollback(); 
            console.log("POST /templates: Rollback - ProjectCode exists");
            return res.status(409).json({ message: `Mã đề tài '${pCodeTrimmed}' đã tồn tại. Vui lòng chọn mã khác.` });
        }


        const createRequest = new sql.Request(transaction); 
        createRequest.input('pProjectCodeInsert', sql.VarChar(20), pCodeTrimmed);
        createRequest.input('pProjectNameInsert', sql.NVarChar(100), projectName.trim());
        createRequest.input('pDescriptionInsert', sql.NVarChar(255), description || null);
        createRequest.input('pCreatedByLecturerCodeInsert', sql.VarChar(20), loggedInLecturerCode);

        const result = await createRequest.query(`
            INSERT INTO Projects (ProjectCode, ProjectName, Description, CreatedByLecturerCode)
            OUTPUT INSERTED.* 
            VALUES (@pProjectCodeInsert, @pProjectNameInsert, @pDescriptionInsert, @pCreatedByLecturerCodeInsert);
        `);

        await transaction.commit(); 
        console.log("POST /templates: Transaction committed");

        res.status(201).json({
            message: `Tạo đề tài mẫu '${pCodeTrimmed}' thành công!`,
            projectTemplate: result.recordset[0] 
        });

    } catch (err) {
        console.error('Lỗi khi tạo Project Template trong API:', err.stack || err);
        if (transaction && !transaction.aborted && !transaction.committed) { 
            try {
                await transaction.rollback();
                console.log("POST /templates: Transaction rolled back due to error");
            } catch (rbErr) {
                console.error("Lỗi khi rollback transaction:", rbErr);
            }
        }
        if (err.number === 2627) {
            return res.status(409).json({ message: `Mã đề tài '${projectCode.trim()}' có thể đã được tạo bởi một tiến trình khác. Vui lòng thử lại.` });
        }
        res.status(500).json({ message: 'Lỗi server khi tạo đề tài mẫu.', error: err.message });
    }
});

router.post('/assign-to-class', authenticateToken, attachUserInfo, async (req, res) => {
    const loggedInLecturerCode = req.user.lecturerCode;

    const {
        projectCode,        // Mã của Project Template đã tồn tại
        subjectCode,        // Môn học
        classCode,          // Lớp học
        maxRegisteredGroups // Số nhóm tối đa được ĐK đề tài này trong LHP này
    } = req.body;

    // ---- VALIDATIONS ----
    if (!projectCode || !subjectCode || !classCode) {
        return res.status(400).json({ message: 'Thiếu thông tin ProjectCode, SubjectCode hoặc ClassCode.' });
    }
    if (maxRegisteredGroups !== undefined && maxRegisteredGroups !== null && (isNaN(parseInt(maxRegisteredGroups)) || +maxRegisteredGroups < 0)) {
        return res.status(400).json({ message: 'Số lượng nhóm tối đa đăng ký (MaxRegisteredGroups) không hợp lệ.' });
    }

    let transaction;
    try {
        await poolConnect;
        transaction = new sql.Transaction(pool);
        await transaction.begin();

        // a. Kiểm tra Project Template có tồn tại không
        const projectCheckRequest = new sql.Request(transaction);
        projectCheckRequest.input('pCode', sql.VarChar, projectCode);
        const projectExistsResult = await projectCheckRequest.query('SELECT ProjectCode FROM Projects WHERE ProjectCode = @pCode');
        if (projectExistsResult.recordset.length === 0) {
            await transaction.rollback();
            return res.status(404).json({ message: `Đề tài mẫu với mã '${projectCode}' không tồn tại.` });
        }

        // b. Tìm SubjectClass (LHP GV dạy) - KHÔNG CẬP NHẬT GÌ Ở SUBJECTCLASS
        const findSubjectClassRequest = new sql.Request(transaction);
        findSubjectClassRequest.input('scLecturerCode', sql.VarChar, loggedInLecturerCode);
        findSubjectClassRequest.input('scSubjectCode', sql.VarChar, subjectCode);
        findSubjectClassRequest.input('scClassCode', sql.VarChar, classCode);
        const subjectClassResult = await findSubjectClassRequest.query(`
            SELECT Id FROM SubjectClasses
            WHERE LecturerCode = @scLecturerCode AND SubjectCode = @scSubjectCode AND ClassCode = @scClassCode;
        `);
        if (subjectClassResult.recordset.length === 0) {
            await transaction.rollback();
            return res.status(404).json({ message: `Lớp học phần (GV: ${loggedInLecturerCode}, Môn: ${subjectCode}, Lớp: ${classCode}) không tồn tại hoặc bạn không được phân công.` });
        }
        const subjectClassId = subjectClassResult.recordset[0].Id;

        // c. Tạo SubjectClassProject
        const createSCPRequest = new sql.Request(transaction);
        createSCPRequest.input('scpSubjectClassId', sql.Int, subjectClassId);
        createSCPRequest.input('scpProjectCode', sql.VarChar, projectCode); // projectCode từ req.body
        createSCPRequest.input('scpMaxRegisteredGroups', sql.Int, maxRegisteredGroups === undefined || maxRegisteredGroups === null ? null : maxRegisteredGroups);
        const createdSCPResult = await createSCPRequest.query(`
            INSERT INTO SubjectClassProjects (SubjectClassId, ProjectCode, MaxRegisteredGroups)
            OUTPUT INSERTED.*
            VALUES (@scpSubjectClassId, @scpProjectCode, @scpMaxRegisteredGroups);
        `);

        await transaction.commit();
        res.status(201).json({ message: `Gán đề tài '${projectCode}' cho lớp học phần thành công!`, subjectClassProject: createdSCPResult.recordset[0] });

    } catch (err) {
        console.error('Lỗi khi gán đề tài cho lớp:', err.stack || err);
        if (transaction && !transaction.aborted && !transaction.committed) {
            try { await transaction.rollback(); } catch (rbErr) { console.error("Rollback error:", rbErr); }
        }
        if (err.number === 2627 && err.message.includes('UQ_SubjectClassProject')) { // Unique Constraint
            return res.status(409).json({ message: `Đề tài '${projectCode}' đã được gán cho lớp học phần (GV: ${loggedInLecturerCode}, Môn: ${subjectCode}, Lớp: ${classCode}) này rồi.` });
        }
        res.status(500).json({ message: 'Lỗi server khi gán đề tài cho lớp.', error: err.message });
    }
});




router.put('/managed/:subjectClassProjectId', authenticateToken, attachUserInfo, async (req, res) => {
    const loggedInLecturerCode = req.user.lecturerCode;
    const { subjectClassProjectId } = req.params;

    const {
        maxRegisteredGroups // Chỉ cho phép cập nhật trường này
    } = req.body;

    // ---- VALIDATIONS ----
    if (isNaN(parseInt(subjectClassProjectId))) {
        return res.status(400).json({ message: 'ID của việc gán đề tài không hợp lệ.' });
    }
    if (maxRegisteredGroups === undefined) { // Chỉ kiểm tra trường này
        return res.status(400).json({ message: 'Không có thông tin MaxRegisteredGroups được cung cấp để cập nhật.' });
    }
    if (maxRegisteredGroups !== null && (isNaN(parseInt(maxRegisteredGroups)) || +maxRegisteredGroups < 0)) {
        return res.status(400).json({ message: 'Số lượng nhóm tối đa đăng ký (MaxRegisteredGroups) không hợp lệ.' });
    }

    let transaction;
    try {
        await poolConnect;
        transaction = new sql.Transaction(pool);
        await transaction.begin();
        console.log(`Backend PUT /managed/${subjectClassProjectId} (chỉ SCP): Transaction began.`);

        // 1. Kiểm tra SubjectClassProject có tồn tại và giảng viên có quyền sửa không
        const scpCheckRequest = new sql.Request(transaction);
        scpCheckRequest.input('scpId', sql.Int, subjectClassProjectId);
        scpCheckRequest.input('lecturerCode', sql.VarChar, loggedInLecturerCode);

        const scpResult = await scpCheckRequest.query(`
            SELECT scp.Id, sc.LecturerCode
            FROM SubjectClassProjects scp
            JOIN SubjectClasses sc ON scp.SubjectClassId = sc.Id
            WHERE scp.Id = @scpId;
        `);

        if (scpResult.recordset.length === 0) {
            await transaction.rollback();
            return res.status(404).json({ message: 'Không tìm thấy thông tin gán đề tài này.' });
        }
        if (scpResult.recordset[0].LecturerCode !== loggedInLecturerCode) {
            await transaction.rollback();
            return res.status(403).json({ message: 'Bạn không có quyền sửa thông tin gán đề tài này.' });
        }

        // 2. Cập nhật SubjectClassProject
        const updateSCPRequest = new sql.Request(transaction);
        updateSCPRequest.input('scpIdToUpdate', sql.Int, subjectClassProjectId);
        updateSCPRequest.input('scpMaxRegGroups', maxRegisteredGroups === null ? sql.TYPES.Int : sql.Int, maxRegisteredGroups === null ? null : parseInt(maxRegisteredGroups));

        // Kiểm tra số nhóm hiện tại đã đăng ký nếu giảm MaxRegisteredGroups
        if (maxRegisteredGroups !== null) {
             const currentGroupsRequest = new sql.Request(transaction);
             currentGroupsRequest.input('checkScpId', sql.Int, subjectClassProjectId);
             const currentGroupsResult = await currentGroupsRequest.query(
                 'SELECT COUNT(*) AS Count FROM StudentGroups WHERE SubjectClassProjectsId = @checkScpId'
             );
             const currentRegisteredCount = currentGroupsResult.recordset[0].Count;
             if (currentRegisteredCount > +maxRegisteredGroups) {
                 await transaction.rollback();
                 return res.status(400).json({ message: `Không thể giảm số lượng nhóm tối đa (${maxRegisteredGroups}) xuống dưới số nhóm đã đăng ký (${currentRegisteredCount}).` });
             }
        }

        await updateSCPRequest.query(`
            UPDATE SubjectClassProjects SET MaxRegisteredGroups = @scpMaxRegGroups
            WHERE Id = @scpIdToUpdate;
        `);
        console.log(`Updated SubjectClassProject ID: ${subjectClassProjectId} with MaxRegisteredGroups: ${maxRegisteredGroups}`);

        await transaction.commit();
        console.log(`Transaction committed for PUT /managed/${subjectClassProjectId}.`);
        res.status(200).json({ message: 'Cập nhật thông tin gán đề tài thành công.' });

    } catch (err) {
        console.error(`Lỗi khi cập nhật gán đề tài ${subjectClassProjectId}:`, err.stack || err);
        if (transaction && !transaction.aborted && !transaction.committed) {
            try { await transaction.rollback(); }
            catch (rbErr) { console.error("Rollback error:", rbErr); }
        }
        res.status(500).json({ message: 'Lỗi server khi cập nhật thông tin gán đề tài.', error: err.message });
    }
});
// Trong projects.js (hoặc file riêng cho project templates)

router.put('/templates/:projectCode', authenticateToken, attachUserInfo, async (req, res) => {
    // const loggedInLecturerCode = req.user.lecturerCode; // Hoặc kiểm tra quyền admin
    const { projectCode } = req.params;
    const { projectName, description } = req.body;

    if (!projectName && description === undefined) { // Cho phép description là chuỗi rỗng
        return res.status(400).json({ message: 'Không có thông tin nào được cung cấp để cập nhật.' });
    }
    if (projectName && (typeof projectName !== 'string' || projectName.trim() === '')) {
        return res.status(400).json({ message: 'Tên đề tài không hợp lệ.' });
    }
    if (description !== undefined && typeof description !== 'string') {
        return res.status(400).json({ message: 'Mô tả không hợp lệ.' });
    }


    let transaction;
    try {
        await poolConnect;
        transaction = new sql.Transaction(pool);
        await transaction.begin();

        // Kiểm tra project có tồn tại
        const projectCheckRequest = new sql.Request(transaction);
        projectCheckRequest.input('pCode', sql.VarChar, projectCode);
        const projectCheckResult = await projectCheckRequest.query('SELECT ProjectCode FROM Projects WHERE ProjectCode = @pCode');

        if (projectCheckResult.recordset.length === 0) {
            await transaction.rollback();
            return res.status(404).json({ message: `Không tìm thấy đề tài mẫu với mã '${projectCode}'.` });
        }

        // TODO: Thêm logic kiểm tra quyền của giảng viên (nếu cần thiết)
        // Ví dụ: projecttemplate.CreatedByLecturerCode === loggedInLecturerCode (nếu Projects có cột này)

        const updateRequest = new sql.Request(transaction);
        updateRequest.input('pCodeToUpdate', sql.VarChar, projectCode);

        let setClauses = [];
        if (projectName) {
            updateRequest.input('pName', sql.NVarChar, projectName);
            setClauses.push('ProjectName = @pName');
        }
        if (description !== undefined) { // Cho phép cập nhật description thành rỗng
            updateRequest.input('pDesc', sql.NVarChar, description);
            setClauses.push('Description = @pDesc');
        }

        if (setClauses.length === 0) { // Không nên xảy ra nếu validation ở trên đúng
             await transaction.rollback();
             return res.status(400).json({ message: 'Không có trường hợp lệ nào để cập nhật.' });
        }

        const updateQuery = `UPDATE Projects SET ${setClauses.join(', ')} WHERE ProjectCode = @pCodeToUpdate;`;
        await updateRequest.query(updateQuery);

        await transaction.commit();
        res.status(200).json({ message: `Cập nhật thông tin đề tài mẫu '${projectCode}' thành công.` });

    } catch (err) {
        console.error(`Lỗi khi cập nhật Project Template '${projectCode}':`, err.stack || err);
        if (transaction && !transaction.aborted && !transaction.committed) {
            try { await transaction.rollback(); } catch (rbErr) { console.error("Rollback error:", rbErr); }
        }
        res.status(500).json({ message: 'Lỗi server khi cập nhật đề tài mẫu.', error: err.message });
    }
});



router.delete('/managed/:subjectClassProjectId', authenticateToken, attachUserInfo, async (req, res) => {
    const loggedInLecturerCode = req.user.lecturerCode;
    const { subjectClassProjectId } = req.params;

    if (isNaN(parseInt(subjectClassProjectId))) {
        return res.status(400).json({ message: 'ID của việc gán đề tài không hợp lệ.' });
    }

    let transaction;
    try {
        await poolConnect;
        transaction = new sql.Transaction(pool);
        await transaction.begin();
        // ... (Logic kiểm tra scpResult, quyền, groupResult như trước) ...

        // 1. Kiểm tra SubjectClassProject có tồn tại và giảng viên có quyền xóa không
        const scpCheckRequest = new sql.Request(transaction);
        scpCheckRequest.input('scpId', sql.Int, subjectClassProjectId);
        scpCheckRequest.input('lecturerCode', sql.VarChar, loggedInLecturerCode);

        const scpResult = await scpCheckRequest.query(`
            SELECT scp.Id, sc.LecturerCode
            FROM SubjectClassProjects scp
            JOIN SubjectClasses sc ON scp.SubjectClassId = sc.Id
            WHERE scp.Id = @scpId;
        `);

        if (scpResult.recordset.length === 0) {
            await transaction.rollback();
            return res.status(404).json({ message: 'Không tìm thấy thông tin gán đề tài này để xóa.' });
        }
        if (scpResult.recordset[0].LecturerCode !== loggedInLecturerCode) {
            await transaction.rollback();
            return res.status(403).json({ message: 'Bạn không có quyền xóa thông tin gán đề tài này.' });
        }

        // 2. Kiểm tra xem đã có nhóm nào đăng ký đề tài này chưa
        const groupCheckRequest = new sql.Request(transaction);
        groupCheckRequest.input('checkScpIdForDelete', sql.Int, subjectClassProjectId);
        const groupResult = await groupCheckRequest.query(`
            SELECT COUNT(*) AS RegisteredGroupCount
            FROM StudentGroups
            WHERE SubjectClassProjectsId = @checkScpIdForDelete;
        `);

        if (groupResult.recordset[0].RegisteredGroupCount > 0) {
            await transaction.rollback();
            return res.status(400).json({ message: `Không thể xóa gán đề tài này vì đã có ${groupResult.recordset[0].RegisteredGroupCount} nhóm đăng ký.` });
        }

        // 3. Thực hiện xóa SubjectClassProject
        const deleteSCPRequest = new sql.Request(transaction);
        deleteSCPRequest.input('scpIdToDelete', sql.Int, subjectClassProjectId);
        const deleteResult = await deleteSCPRequest.query(`
            DELETE FROM SubjectClassProjects WHERE Id = @scpIdToDelete;
        `);

        if (deleteResult.rowsAffected[0] === 0) {
            await transaction.rollback();
            return res.status(404).json({ message: 'Không tìm thấy bản ghi gán đề tài để xóa (có thể đã bị xóa bởi người khác).' });
        }

        await transaction.commit();
        res.status(200).json({ message: 'Hủy gán đề tài thành công.' });

    } catch (err) {
        // ... (catch error như trước) ...
        console.error(`Backend DELETE /managed/${subjectClassProjectId}: Lỗi:`, err.stack || err);
        if (transaction && !transaction.aborted && !transaction.committed) {
            try { await transaction.rollback(); }
            catch (rbErr) { console.error("Rollback error:", rbErr); }
        }
        if (err.number === 547) {
             return res.status(409).json({ message: 'Không thể xóa gán đề tài này do có dữ liệu liên quan.', error: err.message});
        }
        res.status(500).json({ message: 'Lỗi server khi hủy gán đề tài.', error: err.message });
    }
});



router.delete('/templates/:projectCode', authenticateToken, attachUserInfo, async (req, res) => {
    // const loggedInUser = req.user; // Lấy thông tin người dùng và vai trò từ auth
    // Giả sử chỉ admin hoặc người tạo mới có quyền xóa, hoặc chỉ giảng viên tạo ra nó
    // const isAdmin = loggedInUser.role === 'ADMIN';
    // const loggedInLecturerCode = loggedInUser.lecturerCode; // Nếu GV tạo

    const { projectCode } = req.params;

    if (!projectCode || projectCode.trim() === '') {
        return res.status(400).json({ message: 'Mã đề tài mẫu không hợp lệ.' });
    }

    let transaction;
    try {
        await poolConnect;
        transaction = new sql.Transaction(pool);
        await transaction.begin();
        console.log(`Backend DELETE /templates/${projectCode}: Transaction began.`);

        // 1. Kiểm tra project có tồn tại
        const projectCheckRequest = new sql.Request(transaction);
        projectCheckRequest.input('pCode', sql.VarChar, projectCode);
        const projectCheckResult = await projectCheckRequest.query(
            'SELECT ProjectCode FROM Projects WHERE ProjectCode = @pCode' // Có thể lấy thêm CreatedByLecturerCode nếu có
        );

        if (projectCheckResult.recordset.length === 0) {
            await transaction.rollback();
            return res.status(404).json({ message: `Không tìm thấy đề tài mẫu với mã '${projectCode}'.` });
        }

        // TODO: 2. Kiểm tra quyền xóa (ví dụ, nếu bạn có cột CreatedByLecturerCode trong Projects)
        // const projectCreator = projectCheckResult.recordset[0].CreatedByLecturerCode;
        // if (!isAdmin && projectCreator !== loggedInLecturerCode) {
        //     await transaction.rollback();
        //     return res.status(403).json({ message: 'Bạn không có quyền xóa đề tài mẫu này.' });
        // }


        // 3. Kiểm tra xem ProjectCode này có đang được sử dụng bởi SubjectClassProjects không
        const usageCheckRequest = new sql.Request(transaction);
        usageCheckRequest.input('pCodeUsage', sql.VarChar, projectCode);
        const usageResult = await usageCheckRequest.query(`
            SELECT COUNT(*) AS UsageCount
            FROM SubjectClassProjects
            WHERE ProjectCode = @pCodeUsage;
        `);

        if (usageResult.recordset[0].UsageCount > 0) {
            await transaction.rollback();
            return res.status(400).json({
                message: `Không thể xóa đề tài mẫu '${projectCode}' vì nó đang được sử dụng bởi ${usageResult.recordset[0].UsageCount} lớp học phần. Vui lòng hủy các lần gán trước.`
            });
        }

        // 4. Thực hiện xóa Project template
        const deleteRequest = new sql.Request(transaction);
        deleteRequest.input('pCodeToDelete', sql.VarChar, projectCode);
        const deleteResult = await deleteRequest.query('DELETE FROM Projects WHERE ProjectCode = @pCodeToDelete;');

        if (deleteResult.rowsAffected[0] === 0) {
            // Điều này không nên xảy ra nếu bước 1 kiểm tra thành công và không có race condition
            await transaction.rollback();
            return res.status(404).json({ message: `Không tìm thấy đề tài mẫu để xóa (có thể đã bị xóa bởi người khác).` });
        }

        await transaction.commit();
        console.log(`Backend DELETE /templates/${projectCode}: Transaction committed.`);
        res.status(200).json({ message: `Xóa đề tài mẫu '${projectCode}' thành công.` });

    } catch (err) {
        console.error(`Lỗi khi xóa Project Template '${projectCode}':`, err.stack || err);
        if (transaction && !transaction.aborted && !transaction.committed) {
            try { await transaction.rollback(); } catch (rbErr) { console.error("Rollback error:", rbErr); }
        }
        // Không có lỗi Foreign Key nếu đã kiểm tra UsageCount, trừ khi có bảng khác tham chiếu đến Projects.ProjectCode
        res.status(500).json({ message: 'Lỗi server khi xóa đề tài mẫu.', error: err.message });
    }
});



module.exports = router;
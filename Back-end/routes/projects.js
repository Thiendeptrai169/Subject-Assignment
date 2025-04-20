const express = require('express');
const router = express.Router();
const { sql, pool, poolConnect } = require('../config/db');



//router for filter
router.get('/filter', async (req, res) => {
  const { subjectCode, classCode} = req.query;
    try {
        await poolConnect;
        const request = pool.request();
        if (subjectCode && subjectCode !== "ALL") {
          request.input('subjectCode', sql.VarChar, subjectCode);
        } else {
          request.input('subjectCode', sql.VarChar, null);
        }
      
        if (classCode && classCode !== "ALL") {
          request.input('classCode', sql.VarChar, classCode);
        } else {
          request.input('classCode', sql.VarChar, null);
        }
        
        //get current date
        const today = new Date().toISOString().split('T')[0];
        request.input('currentDate', sql.Date, today);
        const result = await request.query(`
          ;WITH CurrentSemester AS (
                 SELECT TOP 1 Id
                 FROM Semesters
                 WHERE @currentDate >= StartDate AND @currentDate <= EndDate
                 ORDER BY StartDate DESC
             )
          SELECT 
            SP.Id AS subjectProjectId,
            SP.MaxRegisteredGroups, SP.CurrentRegisteredGroups,
            SSR.RegistrationStartDate, SSR.RegistrationEndDate,
            P.ProjectCode, P.ProjectName, P.MinStudents, P.MaxStudents, P.Description,
            CAST(
                     CASE
                         
                         WHEN SSR.Id IS NULL THEN 0 
                         WHEN (@currentDate >= SSR.RegistrationStartDate OR SSR.RegistrationStartDate IS NULL)
                          AND (@currentDate <= SSR.RegistrationEndDate OR SSR.RegistrationEndDate IS NULL)
                          AND (SP.MaxRegisteredGroups IS NULL OR SP.CurrentRegisteredGroups < SP.MaxRegisteredGroups)
                         THEN 1 
                         ELSE 0
                     END
                 AS BIT) AS isRegistrationOpen,
            S.SubjectCode, S.SubjectName,
            C.ClassCode,
            L.FullName AS LecturerName
    
          FROM SubjectProjects SP
          JOIN Projects P ON SP.ProjectId = P.Id
          JOIN Subjects S ON SP.SubjectId = S.Id
          JOIN Class C ON SP.ClassId = C.Id
          JOIN Lecturers L ON P.CreatedByLecturer = L.Id
          JOIN CurrentSemester CS ON SP.SemesterId = CS.Id
          LEFT JOIN SubjectSemesterRegistrations SSR ON SP.SubjectId = SSR.SubjectId AND SP.SemesterId = SSR.SemesterId

          WHERE
            (@subjectCode IS NULL OR S.SubjectCode = @subjectCode)
            AND (@classCode IS NULL OR C.ClassCode = @classCode)
        `);
          res.json(result.recordset);   

    } catch (err) {
      console.error('Lỗi khi lọc project theo kỳ hiện tại:', err);
      res.status(500).json('Lỗi truy vấn.');
    }

});


//router for POST info grouptudent
router.post('/register', async (req, res) => {
    const {groupName, subjectProjectId, totalMember, members} = req.body;
    
    
    if(!groupName || !subjectProjectId || !totalMember || !members || members.length === 0){ {
        return res.status(400).send('Thiếu thông tin đăng ký!');
    }
  }

    let transaction;
    let studentIdsToCheck = members.map(member => member.studentId);
    const leaderId = parseInt(studentIdsToCheck[0],10); 
    try{
      await poolConnect;
      transaction = new sql.Transaction(pool);
      await transaction.begin();


      //check quantity of groupstudent and time register
      const checkRequest = new sql.Request(transaction);
        checkRequest.input('SubjectProjectsIdToCheck', sql.Int, subjectProjectId);
        const checkResult = await checkRequest.query(`
            SELECT 
            sp.Id, sp.SubjectId, sp.SemesterId,
            MaxRegisteredGroups, CurrentRegisteredGroups,
            ssr.RegistrationStartDate, 
            ssr.RegistrationEndDate  

            FROM SubjectProjects sp
            LEFT JOIN SubjectSemesterRegistrations ssr ON sp.SubjectId = ssr.SubjectId AND sp.SemesterId = ssr.SemesterId
            WHERE sp.Id = @SubjectProjectsIdToCheck; 
        `);

      if (checkResult.recordset.length === 0) {
        await transaction.rollback(); 
        console.log("Transaction rollback: SubjectProject not found.");
        return res.status(404).json({ message: 'Đề tài không tồn tại.' });
      }

      const { MaxRegisteredGroups, CurrentRegisteredGroups, RegistrationStartDate, RegistrationEndDate} = checkResult.recordset[0];

      const today  = new Date();
      today.setHours(0, 0, 0, 0);
      let isRegistrationOpen = true;
      let deadlineMessage = "";

      if (RegistrationStartDate && today < new Date(RegistrationStartDate)) {
        isRegistrationOpen = false;
        deadlineMessage = `Chưa đến thời gian đăng ký.`;
      }

      if (isRegistrationOpen && RegistrationEndDate) {
        const endDateCheck = new Date(RegistrationEndDate);
        endDateCheck.setHours(23, 59, 59, 999); 
        if (today > endDateCheck) {
            isRegistrationOpen = false;
            deadlineMessage = `Đã hết hạn đăng ký (Hạn chót: ${new Date(RegistrationEndDate).toLocaleDateString('vi-VN')}).`;
          }
      }
  
      if (!isRegistrationOpen) {
        await transaction.rollback();
        console.log("Transaction rollback: Registration period closed.", deadlineMessage);
        return res.status(400).json({ message: deadlineMessage });
    }


      if(MaxRegisteredGroups !== null && CurrentRegisteredGroups >= MaxRegisteredGroups){
        await transaction.rollback();
        console.log("Transaction rollback: Max groups reached.");
        res.status(404).json({message: `Đề tài này đã đủ số lượng nhóm tối đa (${MaxRegisteredGroups}) đăng ký.`})
      }


      //check leaderId & memberId    
      const subjectCheckRequest = transaction.request();
      subjectCheckRequest.input('spId', sql.Int, subjectProjectId);
      const subjectResult = await subjectCheckRequest.query(`
          SELECT SubjectId, SemesterId FROM SubjectProjects WHERE Id = @spId;
        `);
      if(!subjectResult.recordset || subjectResult.recordset.length === 0){
        await transaction.rollback();
        return res.status(400).json('Không tìm thấy thông tin đề tài!');
      }

      //already have not null
      const subjectId = subjectResult.recordset[0].SubjectId;
      const semesterId = subjectResult.recordset[0].SemesterId;
      
      if(studentIdsToCheck && studentIdsToCheck.length > 0){
        const memberCheckRequest = transaction.request();
        memberCheckRequest.input('subjectIdToCheck', sql.Int, subjectId);
        memberCheckRequest.input('semesterIdToCheck', sql.Int, semesterId);
        const paramNames = [];
        studentIdsToCheck.forEach((id, index) => {
          const paramName = `studentId_${index}`;
          memberCheckRequest.input(paramName, sql.Int, id);
          paramNames.push(`@${paramName}`);
      });

      const memberCheckResult = await memberCheckRequest.query(`
          SELECT DISTINCT GM.StudentId 
                FROM GroupMembers GM
                JOIN StudentGroups SG ON GM.GroupId = SG.Id
                JOIN SubjectProjects SP ON SG.SubjectProjectsId = SP.Id
                WHERE
                    SP.SubjectId = @subjectIdToCheck 
                    AND SP.SemesterId = @semesterIdToCheck
                    AND GM.StudentId IN (${paramNames.join(',')})
            `);
      
      if(memberCheckResult && memberCheckResult.recordset && Array.isArray(memberCheckResult.recordset) && memberCheckResult.recordset.length > 0){
          await transaction.rollback();
          conflictingStudents = memberCheckResult.recordset.map(row => row.StudentId);
          console.error(`!!! Xung đột: Các sinh viên sau đã thuộc nhóm khác: ${conflictingStudents.join(', ')}`);
          return res.status(409).json({
            message: `Các sinh viên sau đã là thành viên của nhóm khác trong môn học này: ${conflictingStudents.join(', ')}`
        });    
        } 
      }
    

      // Counting presentationOrder
      const orderQuery = `
        SELECT COUNT(SG.Id) AS GroupCountInSubject
        FROM StudentGroups SG
        JOIN SubjectProjects SP ON SG.SubjectProjectsId = SP.Id
        WHERE SP.SubjectId = @currentSubjectId
        AND SP.SemesterId = @currentSemesterId
      `;
      const orderRequest = transaction.request();
      const orderResult = await orderRequest
            .input('currentSubjectId', sql.Int, subjectId)
            .input('currentSemesterId', sql.Int, semesterId)
            .query(orderQuery);
      const presentationOrder = orderResult.recordset[0].GroupCountInSubject + 1;
   

      // add group infomation to StudentGroups table
      const insertGroupQuery = `
        INSERT INTO StudentGroups(SubjectProjectsId, GroupName, TotalMember, LeaderId, PresentationOrder)
        OUTPUT INSERTED.Id 
        VALUES (@subjectProjectId, @groupName, @totalMember, @leaderId, @presentationOrder);
      `;

      const groupRequest = transaction.request();

      const result = await groupRequest
            .input('subjectProjectId', sql.Int, subjectProjectId)
            .input('groupName', sql.NVarChar, groupName)
            .input('totalMember', sql.Int, totalMember)
            .input('leaderId', sql.Int, leaderId)
            .input('presentationOrder', sql.Int, presentationOrder)
            .query(insertGroupQuery);

        const groupId = result.recordset[0].Id; 

        // add group members to GroupMembers table
        const insertMemberQuery = `
          INSERT INTO GroupMembers(GroupId, StudentId, StudentRole)
          VALUES (@groupId, @studentId, @studentRole);
        `;
        
        for(let i = 0; i < members.length; i++){
            const memberRequest = transaction.request()
            await memberRequest
            .input('groupId', sql.Int, groupId)
            .input('studentId', sql.Int, members[i].studentId)
            .input('studentRole', sql.NVarChar, members[i].studentRole)
            .query(insertMemberQuery);
        }

      //   const updateRequest = new sql.Request(transaction);
      //   updateRequest.input('SubjectProjectsIdToUpdate', sql.Int, subjectProjectId);
      //   await updateRequest.query(`
      //     UPDATE SubjectProjects
      //     SET CurrentRegisteredGroups = CurrentRegisteredGroups + 1
      //     WHERE Id = @SubjectProjectsIdToUpdate;
      // `);

        await transaction.commit();
        res.status(201).json({ message: 'Đăng ký nhóm thành công!'});
    }
    catch(err){
        if (transaction) await transaction.rollback();
        console.error('Lỗi khi đăng ký nhóm:', err);
        res.status(500).json('Đăng ký nhóm thất bại!');
    }
});


router.get('/managed', async (req, res) => {
  const lecturerId = 1;
  try {
    await poolConnect;
    const request = pool.request();
    request.input('lecturerIdParam', sql.Int, lecturerId);
    const today = new Date().toISOString().split('T')[0];
    request.input('currentDateParam', sql.Date, today);
    const result = await request.query(`
      WITH CurrentSemester AS (
           SELECT TOP 1 Id 
           FROM Semesters
           WHERE @currentDateParam >= StartDate AND @currentDateParam <= EndDate
           ORDER BY StartDate DESC
      )

      SELECT
          SP.Id AS SubjectProjectId, 
          P.Id AS ProjectId,        
          P.ProjectCode, P.ProjectName, P.MinStudents, P.MaxStudents,
          SP.MaxRegisteredGroups, SP.CurrentRegisteredGroups,
          SSR.RegistrationStartDate, SSR.RegistrationEndDate,
          P.Description,
          S.SubjectCode, S.SubjectName,
          C.ClassCode
          --L.FullName AS LecturerName 

      FROM SubjectProjects SP
      JOIN Projects P ON SP.ProjectId = P.Id AND P.CreatedByLecturer = @lecturerIdParam 
      JOIN Subjects S ON SP.SubjectId = S.Id
      JOIN Class C ON SP.ClassId = C.Id
      --JOIN Lecturers L ON P.CreatedByLecturer = L.Id --Optional
      --JOIN CurrentSemester CS ON SP.SemesterId = CS.Id 
      JOIN TeachingAssignments TA ON SP.SubjectId = TA.SubjectId
      AND SP.ClassId = TA.ClassId AND SP.SemesterId = TA.SemesterId
      AND TA.LecturerId = @lecturerIdParam
      LEFT JOIN SubjectSemesterRegistrations SSR ON SP.SubjectId = SSR.SubjectId AND SP.SemesterId = SSR.SemesterId AND SP.ClassId = SSR.ClassId

      ORDER BY S.SubjectName, C.ClassCode, P.ProjectCode; 
  `);
  res.json(result.recordset);
  }catch (err) {
    console.error('Lỗi khi lấy danh sách đề tài quản lý:', err);
    res.status(500).json({ message: 'Lỗi server khi lấy danh sách đề tài.', error: err.message });
  }

});


router.post('/managed', async (req, res) => {
  const lecturerId = 1;

  const {
        ProjectName, MinStudents, MaxStudents, Description,
        SubjectId, ClassId,MaxRegisteredGroups
  } = req.body;

  if (!ProjectName || MinStudents === undefined || MaxStudents === undefined || !SubjectId || !ClassId ) {
      return res.status(400).json({ message: 'Thiếu thông tin bắt buộc: Mã/Tên ĐT, SL SV Min/Max, Môn học, Lớp học.' });
  }
  if (isNaN(parseInt(MinStudents)) || isNaN(parseInt(MaxStudents)) || +MinStudents <= 0 || +MaxStudents < +MinStudents) {
       return res.status(400).json({ message: 'Số lượng sinh viên tối thiểu/tối đa không hợp lệ.' });
   }
   if (MaxRegisteredGroups !== undefined && MaxRegisteredGroups !== null && (isNaN(parseInt(MaxRegisteredGroups)) || +MaxRegisteredGroups <= 0)) {
      return res.status(400).json({ message: 'Số lượng nhóm tối đa không hợp lệ.' });
  }


  let transaction;
  try {
      await poolConnect; 
      transaction = new sql.Transaction(pool);
      await transaction.begin();
      console.log("Transaction began for creating project.");

      // 1. Lấy SemesterId hiện tại
      const semesterRequest = new sql.Request(transaction);
      const today = new Date().toISOString().split('T')[0];
      semesterRequest.input('currentDateParam', sql.Date, today);
      const semesterResult = await semesterRequest.query('SELECT TOP 1 Id FROM Semesters WHERE @currentDateParam >= StartDate AND @currentDateParam <= EndDate ORDER BY StartDate DESC');
      if (semesterResult.recordset.length === 0) {
          await transaction.rollback();
          return res.status(400).json({ message: 'Không xác định được học kỳ hiện tại để tạo đề tài.' });
      }
      const currentSemesterId = semesterResult.recordset[0].Id;

      // 2. Kiểm tra giảng viên có được dạy môn/lớp/kỳ này không (bắt buộc)
      const assignmentRequest = new sql.Request(transaction);
      const assignmentResult = await assignmentRequest
          .input('lecturerIdParam', sql.Int, lecturerId)
          .input('subjectIdParam', sql.Int, SubjectId)
          .input('classIdParam', sql.Int, ClassId)
          .input('semesterIdParam', sql.Int, currentSemesterId)
          .query(`SELECT TOP 1 Id FROM TeachingAssignments
                  WHERE LecturerId = @lecturerIdParam
                    AND SubjectId = @subjectIdParam
                    AND ClassId = @classIdParam
                    AND SemesterId = @semesterIdParam`);
      if (assignmentResult.recordset.length === 0) {
         await transaction.rollback();
         return res.status(403).json({ message: 'Bạn không được phân công dạy môn/lớp này trong kỳ hiện tại để tạo đề tài.' });
      }

      //Gen projectcode
      const codeGenRequest = new sql.Request(transaction);
      const codeResult = await codeGenRequest.query(`
        SELECT TOP 1 ProjectCode FROM Projects
        WHERE ProjectCode LIKE 'DT%'
        ORDER BY TRY_CAST(SUBSTRING(ProjectCode, 3, LEN(ProjectCode)) AS INT) DESC
      `);
      let newProjectCode = 'DT01';
      if (codeResult.recordset.length > 0) {
        const lastCode = codeResult.recordset[0].ProjectCode; 
        const lastNumber = parseInt(lastCode.replace('DT', '')) || 0;
        const nextNumber = lastNumber + 1;
        newProjectCode = `DT${nextNumber.toString().padStart(2, '0')}`; 
    }


      // 3. INSERT vào Projects
      const projectRequest = new sql.Request(transaction);
      const projectResult = await projectRequest
          .input('pProjectCode', sql.VarChar, newProjectCode)
          .input('pProjectName', sql.NVarChar, ProjectName)
          .input('pMinStudents', sql.Int, MinStudents)
          .input('pMaxStudents', sql.Int, MaxStudents)
          .input('pCreatedByLecturer', sql.Int, lecturerId)
          .input('pDescription', sql.NVarChar, Description)
          .query(`
              INSERT INTO Projects (ProjectCode, ProjectName, MinStudents, MaxStudents, CreatedByLecturer, Description)
              OUTPUT INSERTED.Id
              VALUES (@pProjectCode, @pProjectName, @pMinStudents, @pMaxStudents, @pCreatedByLecturer, @pDescription);
          `);
      const newProjectId = projectResult.recordset[0].Id;
      console.log("DEBUG: Created Project ID:", newProjectId);

      // 4. INSERT vào SubjectProjects
      const spRequest = new sql.Request(transaction);
      const spResult = await spRequest
          .input('spProjectId', sql.Int, newProjectId)
          .input('spSubjectId', sql.Int, SubjectId)
          .input('spClassId', sql.Int, ClassId)
          .input('spSemesterId', sql.Int, currentSemesterId)
          .input('spMaxRegisteredGroups', sql.Int, MaxRegisteredGroups) // Cho phép NULL
          .input('spRegStartDate', sql.Date, RegistrationStartDate)     // Cho phép NULL
          .input('spRegEndDate', sql.Date, RegistrationEndDate)       // Cho phép NULL
          .input('spStartDate', sql.Date, StartDate)                   // Cho phép NULL
          .input('spEndDate', sql.Date, EndDate)                       // Cho phép NULL
          .query(`
              INSERT INTO SubjectProjects (
                  ProjectId, SubjectId, ClassId, SemesterId, MaxRegisteredGroups,
                  CurrentRegisteredGroups, -- Mặc định là 0
                  RegistrationStartDate, RegistrationEndDate, StartDate, EndDate
              )
              OUTPUT INSERTED.* -- Trả về đầy đủ bản ghi vừa tạo
              VALUES (
                  @spProjectId, @spSubjectId, @spClassId, @spSemesterId, @spMaxRegisteredGroups,
                  0, @spRegStartDate, @spRegEndDate, @spStartDate, @spEndDate
              );
          `);

      await transaction.commit();
      console.log("Transaction committed. New SubjectProject created:", spResult.recordset[0]);
      res.status(201).json(spResult.recordset[0]); // Trả về SubjectProject mới

  } catch (err) {
      console.error('Lỗi khi tạo đề tài:', err);
      if (transaction && transaction._aborted === false && transaction._closed === false) {
          try { await transaction.rollback(); console.log("Transaction rolled back."); }
          catch (rbErr) { console.error("Rollback error:", rbErr); }
      }
      if (err.number === 2627 && err.message.includes('Projects')) { // Lỗi UNIQUE trên Projects
          res.status(409).json({ message: `Mã đề tài "${ProjectCode}" đã tồn tại.` });
      } else if (err.number === 2627 && err.message.includes('SubjectProjects')) { // Lỗi UNIQUE trên SubjectProjects
          res.status(409).json({ message: 'Đề tài này đã được gán cho môn học/lớp/học kỳ này rồi.' });
      } else {
          res.status(500).json({ message: 'Lỗi server khi tạo đề tài.', error: err.message });
      }
  }
});



module.exports = router;
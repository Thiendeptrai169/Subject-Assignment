const express = require('express');
const router = express.Router();
const { sql, pool, poolConnect } = require('../config/db');

//GET /api/projects
// router.get('/', async (req, res) => {
//     try{
//         await poolConnect;
//         const request = pool.request();
//         const result = await request.query(`
//             SELECT 
//               p.Id,
//               p.ProjectCode,
//               p.ProjectName,
//               p.MinStudents,
//               p.MaxStudents,
//               p.Status,
//               p.StartDate,
//               p.EndDate,
//               p.Description,
//               s.SubjectName,
//               c.ClassCode,
//               l.FullName AS LecturerName
//             FROM Projects p
//             JOIN Subjects s ON p.SubjectId = s.Id
//             JOIN Class c ON SP.ClassId = c.Id
//             JOIN Lecturers l ON p.CreatedByLecturer = l.Id
//           `);
//         res.json(result.recordset);
//     }catch (err){
//         res.status(500).send(err.message);
//     }
// });

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
            WHERE Id = @SubjectProjectsIdToCheck; 
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

        const updateRequest = new sql.Request(transaction);
        updateRequest.input('SubjectProjectsIdToUpdate', sql.Int, subjectProjectId);
        await updateRequest.query(`
          UPDATE SubjectProjects
          SET CurrentRegisteredGroups = CurrentRegisteredGroups + 1
          WHERE Id = @SubjectProjectsIdToUpdate;
      `);

        await transaction.commit();
        res.status(201).json({ message: 'Đăng ký nhóm thành công!'});
    }
    catch(err){
        if (transaction) await transaction.rollback();
        console.error('Lỗi khi đăng ký nhóm:', err);
        res.status(500).json('Đăng ký nhóm thất bại!');
    }
});


module.exports = router;
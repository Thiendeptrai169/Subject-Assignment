const express = require('express');
const router = express.Router()
const {sql, pool, poolConnect} = require('../config/db');

router.get('/', async (req,res) =>{
    // const accountId = await req.accountId;
    const accountId = 'SV001';

    try{
        await poolConnect;
        const request = pool.request();
        
        const result = await request
        .input('AccountId', sql.VarChar, accountId)
        .query(`
            SELECT 
                A.Id AS AccountId, A.Username, A.RoleId, R.RoleName,
                UP.*,
                CD.*,
                S.Id AS StudentId,    
                C.ClassCode,
                M.MajorName, M.MajorCode, M.TrainingSystem, M.ExpectedDurationYears, M.MaxDurationYears,
                F.FacultyName, F.FacultyCode,
                AD.EnrollmentDate,
                L.Id AS LecturerId
                FROM Accounts A
                LEFT JOIN Roles R ON A.RoleId = R.RoleId
                LEFT JOIN UserProfiles UP ON A.Id = UP.AccountId
                LEFT JOIN ContactDetails CD ON A.Id = CD.AccountId
                LEFT JOIN Students S ON S.AccountId = A.Id AND R.RoleName = 'STUDENT'
                LEFT JOIN Class C ON S.ClassId = C.Id
                LEFT JOIN Major M ON C.MajorId = M.Id
                LEFT JOIN Faculty F ON M.FacultyId = F.Id
                LEFT JOIN AcademicDetails AD ON S.Id = AD.StudentId
                LEFT JOIN Lecturers L ON A.Id = L.AccountId AND R.RoleName = 'LECTURER' 
                WHERE A.Id = @AccountId;
        `);

        if(result.recordset.length === 0){
            return res.status(404).json({message: 'Không tìm thấy thông tin tài khoản.'})
        }


        const userProfileData = result.recordset[0];
        let enrollmentYear = null;
        //format data
        if (userProfileData.EnrollmentDate instanceof Date) {
            enrollmentYear = userProfileData.EnrollmentDate.getFullYear(); 
            userProfileData.EnrollmentDateFormatted = userProfileData.EnrollmentDate.toLocaleDateString('vi-VN', { year: 'numeric', month: '2-digit', day: '2-digit' });
            userProfileData.EnrollmentYear = enrollmentYear; 
            userProfileData.CourseYear = `Khóa ${enrollmentYear}`; 
        } else {
             userProfileData.EnrollmentDateFormatted = userProfileData.EnrollmentDate;
             userProfileData.EnrollmentYear = null;
             userProfileData.CourseYear = null;
        }

        //count AcademicTerm and MaxDurationYears
        if (enrollmentYear && userProfileData.ExpectedDurationYears) {
            userProfileData.AcademicTerm = `${enrollmentYear} - ${enrollmentYear + userProfileData.ExpectedDurationYears}`;
        } else {
            userProfileData.AcademicTerm = null; 
        }

        if (enrollmentYear && userProfileData.MaxDurationYears) {
            userProfileData.MaxTerm = `${enrollmentYear} - ${enrollmentYear + userProfileData.MaxDurationYears}`;
        } else {
            userProfileData.MaxTerm = null; 
        }
        userProfileData.ProgramName = userProfileData.MajorName || null; 
        res.json(userProfileData);
    }catch(err){
        console.error('Lỗi khi lấy thông tin hồ sơ:', err);
        res.status(500).json('Lỗi server khi lấy thông tin tài hồ sơ')
    }
});

module.exports = router;
// const express = require('express');

// const router = express.Router();
// const { sql, pool, poolConnect } = require('../config/db');
// const { authenticateToken, authorizeRole } = require('../middleware/auth');

// router.get('/', authenticateToken, authorizeRole([2]), async (req, res) => {
//     try {
//         // 1. Kiểm tra token và accountId
//         if (!req.user || !req.user.accountId) {
//             console.error('Token không chứa accountId:', req.user);
//             return res.status(401).json({ message: 'Token không hợp lệ, thiếu accountId' });
//         }
//         const accountId = req.user.accountId;
//         console.log('accountId:', accountId);

//         // 2. Kiểm tra kết nối database
//         await poolConnect;
//         console.log('Kết nối database thành công');

//         // 3. Truy vấn để lấy StudentId
//         const studentRequest = pool.request();
//         const studentResult = await studentRequest
//             .input('accountId', sql.VarChar(20), accountId)
//             .query('SELECT Id FROM Students WHERE AccountId = @accountId');

//         if (!studentResult.recordset || studentResult.recordset.length === 0) {
//             console.log('Không tìm thấy sinh viên:', { accountId });
//             return res.status(404).json({ message: 'Không tìm thấy sinh viên tương ứng' });
//         }

//         const studentId = studentResult.recordset[0].Id;
//         console.log('studentId:', studentId);

//         // 4. Truy vấn thông tin hồ sơ sinh viên
//         const profileRequest = pool.request();
//         const result = await profileRequest
//             .input('studentId', sql.Int, studentId)
//             .input('accountId', sql.VarChar(20), accountId)
//             .query(`
                
//             SELECT 
//                 A.Id AS AccountId, A.Username, A.RoleId, R.RoleName,
//                 UP.*,
//                 CD.*,
//                 S.Id AS StudentId,    
//                 C.ClassCode,
//                 M.MajorName, M.MajorCode, M.TrainingSystem, M.ExpectedDurationYears, M.MaxDurationYears,
//                 F.FacultyName, F.FacultyCode,
//                 AD.EnrollmentDate,
//                 L.Id AS LecturerId

//                 FROM Accounts A
//                 LEFT JOIN Roles R ON A.RoleId = R.RoleId
//                 LEFT JOIN UserProfiles UP ON A.Id = UP.AccountId
//                 LEFT JOIN ContactDetails CD ON A.Id = CD.AccountId

//                 LEFT JOIN Students S ON S.AccountId = A.Id

//                 LEFT JOIN Class C ON S.ClassId = C.Id
//                 LEFT JOIN Major M ON C.MajorId = M.Id
//                 LEFT JOIN Faculty F ON M.FacultyId = F.Id
//                 LEFT JOIN AcademicDetails AD ON S.Id = AD.StudentId

//                 WHERE A.Id = @accountId AND S.Id = @studentId;
//             `);

//         // 5. Kiểm tra kết quả
//         if (!result.recordset || result.recordset.length === 0) {
//             console.log('Không tìm thấy thông tin hồ sơ:', { accountId, studentId });
//             return res.status(404).json({ message: 'Không tìm thấy thông tin hồ sơ sinh viên' });
//         }

//         // 6. Format dữ liệu
//         const userProfileData = result.recordset[0];
//         let enrollmentYear = null;

//         if (userProfileData.EnrollmentDate instanceof Date) {
//             enrollmentYear = userProfileData.EnrollmentDate.getFullYear();
//             userProfileData.EnrollmentDateFormatted = userProfileData.EnrollmentDate.toLocaleDateString('vi-VN', {
//                 year: 'numeric',
//                 month: '2-digit',
//                 day: '2-digit'
//             });
//             userProfileData.EnrollmentYear = enrollmentYear;
//             userProfileData.CourseYear = `Khóa ${enrollmentYear}`;
//         } else {
//             userProfileData.EnrollmentDateFormatted = userProfileData.EnrollmentDate || null;
//             userProfileData.EnrollmentYear = null;
//             userProfileData.CourseYear = null;
//         }

//         if (userProfileData.DateOfBirth instanceof Date) {
//             userProfileData.DateOfBirthFormatted = userProfileData.DateOfBirth.toLocaleDateString('vi-VN', {
//                 year: 'numeric',
//                 month: '2-digit',
//                 day: '2-digit'
//             });
//         } else {
//             userProfileData.DateOfBirthFormatted = userProfileData.DateOfBirth || null;
//         }

//         if (enrollmentYear && userProfileData.ExpectedDurationYears) {
//             userProfileData.AcademicTerm = `${enrollmentYear} - ${enrollmentYear + userProfileData.ExpectedDurationYears}`;
//         } else {
//             userProfileData.AcademicTerm = null;

//         }

//         if (enrollmentYear && userProfileData.MaxDurationYears) {
//             userProfileData.MaxTerm = `${enrollmentYear} - ${enrollmentYear + userProfileData.MaxDurationYears}`;
//         } else {

//             userProfileData.MaxTerm = null;
//         }

//         userProfileData.ProgramName = userProfileData.MajorName || null;

//         // 7. Trả về dữ liệu
//         console.log('Dữ liệu trả về:', userProfileData);
//         res.json(userProfileData);
//     } catch (err) {
//         // 8. Ghi log chi tiết và trả về lỗi
//         console.error('Lỗi khi lấy thông tin hồ sơ:', {
//             message: err.message,
//             stack: err.stack,
//             accountId: req.user?.accountId
//         });
//         res.status(500).json({ message: 'Lỗi server khi lấy thông tin hồ sơ' });

//     }
// });

// module.exports = router;

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

        if(userProfileData.DateOfBirth instanceof Date){
            userProfileData.DateOfBirthFormatted = userProfileData.DateOfBirth.toLocaleDateString('vi-VN', { year: 'numeric', month: '2-digit', day: '2-digit' });
        }  else {
            userProfileData.DateOfBirthFormatted = userProfileData.DateOfBirth;
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
const jwt = require('jsonwebtoken');
const { sql, pool, poolConnect } = require('../config/db');

// Middleware chỉ xác thực token
async function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) return res.status(401).json({ message: 'Không có token' });

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    req.user = { accountId: payload.accountId, role: payload.role };
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError')
      return res.status(401).json({ message: 'Token đã hết hạn, vui lòng đăng nhập lại' });
    return res.status(403).json({ message: 'Token không hợp lệ' });
  }
}

// Lấy thêm thông tin user từ DB, gọi sau authenticateToken
async function attachUserInfo(req, res, next) {
  try {
    await poolConnect;
    const request = pool.request();
    const { accountId, role } = req.user;

    if (role === 1) {
      const lecturerResult = await request
        .input('accountId', sql.VarChar(20), accountId)
        .query('SELECT LecturerCode FROM Lecturers WHERE AccountId = @accountId');
      if (lecturerResult.recordset.length === 0)
        return res.status(404).json({ message: 'Không tìm thấy giảng viên tương ứng' });
      req.user.lecturerId = lecturerResult.recordset[0].Id;
      req.user.lecturerCode = lecturerResult.recordset[0].LecturerCode;
    } else if (role === 2) {
      const studentResult = await request
        .input('accountId', sql.VarChar(20), accountId)
        .query('SELECT StudentCode FROM Students WHERE AccountId = @accountId');
      if (studentResult.recordset.length === 0)
        return res.status(404).json({ message: 'Không tìm thấy sinh viên tương ứng' });
      req.user.studentCode = studentResult.recordset[0].StudentCode;
    } else {
      return res.status(403).json({ message: 'Role không hợp lệ' });
    }

    next();
  } catch (error) {
    console.error('Lỗi lấy thông tin người dùng:', error);
    res.status(500).json({ message: 'Lỗi server khi lấy thông tin người dùng' });
  }
}


function authorizeRole(allowedRoles = []) {
    return (req, res, next) => {
        if (!allowedRoles.includes(req.user.role)) {
            return res.status(403).json({ message: 'Không có quyền truy cập' });
        }
        next();
    };
}

module.exports = { authenticateToken, attachUserInfo, authorizeRole };

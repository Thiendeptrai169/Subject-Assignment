const bcrypt = require('bcrypt');
const fs = require('fs');
const path = require('path');
const { sql, pool, poolConnect } = require('./config/db');
require('dotenv').config();

async function addUser(id, username, password, roleId) {
    try {
        const hashedPassword = await bcrypt.hash(password, 10);
        const createdAt = new Date();

        await poolConnect;
        const request = pool.request();

        // Thêm user vào bảng Accounts
        const result = await request
            .input('id', sql.VarChar, id)
            .input('username', sql.VarChar, username)
            .input('password', sql.VarChar, hashedPassword)
            .input('roleId', sql.Int, roleId)
            .input('isActive', sql.Bit, 1)
            .query(`
                INSERT INTO Accounts (Id, Username, Password, RoleId, IsActive)
                VALUES (@id, @username, @password, @roleId, @isActive)
            `);

        console.log(`Tạo tài khoản thành công`);

        // Đường dẫn tới users.json
        const filePath = path.join(__dirname, 'users.json');
        let existingUsers = [];

        // Đọc file nếu đã tồn tại
        if (fs.existsSync(filePath)) {
            const data = fs.readFileSync(filePath, 'utf8');
            if (data.trim()) {
                existingUsers = JSON.parse(data);
            }
        }
        // Thêm tài khoản mới vào mảng
        existingUsers.push({ id, username, password, roleId });

        // Ghi lại vào file
        fs.writeFileSync(filePath, JSON.stringify(existingUsers, null, 2), 'utf8');
    } catch (error) {
        console.error('Lỗi khi thêm user:', error);
    }
}


addUser('SV001', 'n22dccn154', '12345', 2);
// addUser('SV012', 'n22dccn201', '123456', 2);
// addUser('SV013', 'n22dccn202', '123456', 2);
// addUser('SV014', 'n22dccn203', '123456', 2);
// addUser('SV015', 'n22dccn204', '123456', 2);
// addUser('SV016', 'n22dccn205', '123456', 2);
// addUser('SV017', 'n22dccn206', '123456', 2);
// addUser('SV018', 'n22dccn207', '123456', 2);
// addUser('SV019', 'n22dccn208', '123456', 2);
// addUser('SV020', 'n22dccn209', '123456', 2);
// addUser('SV021', 'n22dccn210', '123456', 2);


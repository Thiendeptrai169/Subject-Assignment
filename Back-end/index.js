const express = require('express');
const jwt = require('jsonwebtoken');
const cors = require('cors');
const path = require('path');
const bcrypt = require('bcrypt');
const fs = require('fs');
const { sql, pool, poolConnect } = require('./config/dbconfig');
const app = express();
const port = process.env.PORT || 3000;


//Middleware
app.use(cors());
app.use(express.json());

// Serve static files
app.use(express.static(path.join(__dirname, '../Front-end'), { index: false }));

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '../Front-end/pages/login.html'));
});

//Route test
// app.get('/', (req,res) => {
//     res.send('API is running...');
// });

//Real routes
const projectRoutes = require('./routes/projects');
const classRoutes = require('./routes/classes');
const subjectRoutes = require('./routes/subjects');
const semesterRoutes = require('./routes/semesters');
const myGroupRoutes = require('./routes/my-groups');
const myGroupDetailRoutes = require('./routes/my-group-detail');
const lecturerProjectsRoutes = require('./routes/lecturerProjects');
app.use('/api/projects', projectRoutes);
app.use('/api/classes', classRoutes);
app.use('/api/subjects', subjectRoutes);
app.use('/api/semesters', semesterRoutes);
app.use('/api/my-groups', myGroupRoutes);
app.use('/api/my-group-detail', myGroupDetailRoutes);
app.use('/api/lecturer-projects', lecturerProjectsRoutes);
// Route bảo vệ (dữ liệu JSON)
app.get('/protected', (req, res) => {
    res.json({
        message: 'Đây là dữ liệu bảo vệ',
        account: {
            id: req.user.Id,
            username: req.user.Username,
            role: req.user.RoleId
        }
    });
});
//Route đổi mật khẩu
app.get('/change-password', (req, res) => {
    res.sendFile(path.join(__dirname, '../Front-end/pages/change-password.html'));
});

// Route đăng nhập
app.post('/login', async (req, res) => {
    try {
        const { username, password } = req.body;
        console.log('Login attempt:', { username }); // Log để debug

        if (!username || !password) {
            return res.status(400).json({
                error: 'Bad Request',
                message: 'Vui lòng nhập đầy đủ tên đăng nhập và mật khẩu'
            });
        }

        await poolConnect;
        const request = pool.request();

        const result = await request
            .input('username', sql.VarChar, username)
            .query('SELECT * FROM Accounts WHERE LOWER(Username) = LOWER(@username)');

        if (result.recordset.length === 0) {
            console.log('User not found:', username);
            return res.status(401).json({
                error: 'Unauthorized',
                message: 'Đăng nhập thất bại: sai tên tài khoản hoặc mật khẩu'
            });
        }
        const account = result.recordset[0];
        // const isMatch = await bcrypt.compare(password, account.Password);
        // if (!isMatch) {
        // So sánh trực tiếp mật khẩu plaintext
        if (password !== account.Password) {
            console.log('Invalid password for user:', username);
            return res.status(401).json({
                error: 'Unauthorized',
                message: 'Đăng nhập thất bại: sai tên tài khoản hoặc mật khẩu'
            });
        }

        if (!account.IsActive) {
            console.log('Inactive account:', username);
            return res.status(403).json({
                error: 'Forbidden',
                message: 'Tài khoản đã bị khóa'
            });
        }

        const token = jwt.sign(
            { accountId: account.Id, username: account.Username, role: account.RoleId },
            process.env.JWT_SECRET,
            { expiresIn: '1h' }
        );
        // const decoded = jwt.verify(token, process.env.JWT_SECRET);
        // console.log('Decoded token:', decoded);


        console.log('Login successful:', username);
        res.json({
            message: 'Đăng nhập thành công',
            token: token,
            role: account.RoleId
        });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({
            error: 'Internal Server Error',
            message: 'Lỗi server: ' + error.message
        });
    }
});

// Đổi mật khẩu
app.post('/change-password', async (req, res) => {
    try {
        const { oldPassword, newPassword } = req.body;
        const authHeader = req.headers['authorization'];

        if (!authHeader) {
            return res.status(401).json({ message: 'Thiếu token' });
        }

        const token = authHeader.split(' ')[1];
        if (!token) {
            return res.status(401).json({ message: 'Token không hợp lệ' });
        }

        let decoded;
        try {
            decoded = jwt.verify(token, JWT_SECRET);
        } catch (err) {
            return res.status(403).json({ message: 'Token không hợp lệ hoặc đã hết hạn' });
        }

        const accountId = decoded.accountId;

        if (!oldPassword || !newPassword) {
            return res.status(400).json({ message: 'Vui lòng nhập mật khẩu cũ và mật khẩu mới' });
        }

        await poolConnect;
        const request = pool.request();

        const result = await request
            .input('id', sql.VarChar, accountId)
            .query('SELECT * FROM Accounts WHERE Id = @id');

        const account = result.recordset[0];
        if (!account) return res.status(404).json({ message: 'Không tìm thấy tài khoản' });

        const isMatch = await bcrypt.compare(oldPassword, account.Password);
        if (!isMatch) {
            return res.status(401).json({ message: 'Mật khẩu cũ không đúng' });
        }

        const hashedNewPassword = await bcrypt.hash(newPassword, 10);
        await pool.request()
            .input('id', sql.VarChar, accountId)
            .input('newPassword', sql.VarChar, hashedNewPassword)
            .input('updatedAt', sql.DateTime, new Date())
            .query(`
                UPDATE Accounts
                SET Password = @newPassword, UpdatedAt = @updatedAt
                WHERE Id = @id
            `);

        res.json({ message: 'Đổi mật khẩu thành công' });

        // Lưu mật khẩu mới vào file users
        const usersPath = path.join(__dirname, 'users.json');
        let users = [];
        if (fs.existsSync(usersPath)) {
            users = JSON.parse(fs.readFileSync(usersPath, 'utf8'));
        }

        // Cập nhật mật khẩu mới cho user
        const userIndex = users.findIndex(u => u.id === account.Id);
        if (userIndex !== -1) {
            users[userIndex].password = newPassword;
            // Ghi lại vào file
            fs.writeFileSync(usersPath, JSON.stringify(users, null, 2), 'utf8');
        }

    } catch (error) {
        console.error('Lỗi đổi mật khẩu:', error.message);
        res.status(500).json({ message: 'Lỗi server' });
    }
});

//Fallback Route cho SPA
app.get(/^\/(?!api).*/, (req, res) => {
    res.sendFile(path.resolve(__dirname, '../Front-end', 'index.html'));
});
//start the server
app.listen(port, () => {
    console.log(`Server is running at http://localhost:${port}`);
});
﻿USE TopicAssignment
GO

-- Account, Roles, Rights
CREATE TABLE Roles (
    RoleId INT PRIMARY KEY IDENTITY,
    RoleName NVARCHAR(255) NOT NULL UNIQUE
);

CREATE TABLE Rights (
    RightId INT PRIMARY KEY IDENTITY,s
    RightName NVARCHAR(255) NOT NULL UNIQUE,
    RightDesc TEXT
);

CREATE TABLE RolesRights (
    Id INT PRIMARY KEY IDENTITY,
    RightId INT FOREIGN KEY REFERENCES Rights(RightId),
    RoleId INT FOREIGN KEY REFERENCES Roles(RoleId),
    CONSTRAINT UQ_RoleRight UNIQUE(RoleId, RightId)
);

CREATE TABLE Accounts (
    Id VARCHAR(20) PRIMARY KEY,
    Username VARCHAR(20) NOT NULL UNIQUE,
    Password VARCHAR(255) NOT NULL,
    RoleId INT NOT NULL FOREIGN KEY REFERENCES Roles(RoleId),
    IsActive BIT DEFAULT 1,
    CreatedAt DATETIME NOT NULL,
    UpdatedAt DATETIME NOT NULL
);

-- Basic organizational structure
CREATE TABLE Faculty (
    Id INT PRIMARY KEY IDENTITY,
    FacultyCode VARCHAR(20) NOT NULL UNIQUE,
    FacultyName NVARCHAR(50) NOT NULL UNIQUE
);

CREATE TABLE Major (
    Id INT PRIMARY KEY IDENTITY,
    MajorCode VARCHAR(50) NOT NULL UNIQUE,
    MajorName NVARCHAR(255) NOT NULL UNIQUE,
	TrainingSystem NVARCHAR(100) NOT NULL,
	ExpectedDurationYears INT NOT NULL,
	MaxDurationYears INT NOT NULL,
    FacultyId INT NOT NULL FOREIGN KEY REFERENCES Faculty(Id)
);

CREATE TABLE Class (
    Id INT PRIMARY KEY IDENTITY,
    ClassCode VARCHAR(50) NOT NULL UNIQUE,
    ClassName NVARCHAR(255) NOT NULL UNIQUE,
    MajorId INT FOREIGN KEY REFERENCES Major(Id)
);

-- Students and Lecturers
CREATE TABLE Students (
    Id INT PRIMARY KEY IDENTITY,
    StudentCode VARCHAR(50) NOT NULL UNIQUE,
    ClassId INT NOT NULL FOREIGN KEY REFERENCES Class(Id),
    AccountId VARCHAR(20) NOT NULL FOREIGN KEY REFERENCES Accounts(Id)
);

CREATE TABLE UserProfiles (
	Id INT PRIMARY KEY IDENTITY,
    AccountId VARCHAR(20) NOT NULL UNIQUE,         
    FullName NVARCHAR(100) NOT NULL,         
    Gender NVARCHAR(10) CHECK (Gender IN (N'NAM', N'NỮ')), 
    DateOfBirth DATE NOT NULL,               
    PlaceOfBirth NVARCHAR(255) NULL,         
    IdentityCardNumber VARCHAR(20) NULL UNIQUE, 
    Ethnicity NVARCHAR(50) NULL,             
    Religion NVARCHAR(50) NULL,              
    ProfileImageUrl VARCHAR(512) NULL,
    CONSTRAINT FK_UserProfiles_Accounts FOREIGN KEY (AccountId) REFERENCES Accounts(Id) ON DELETE CASCADE -- Nếu xóa Account thì xóa Profile
);

CREATE TABLE ContactDetails (
    Id INT PRIMARY KEY IDENTITY,
    AccountId VARCHAR(20) NOT NULL UNIQUE,     
    PhoneNumber VARCHAR(20) NOT NULL,          
    PersonalEmail VARCHAR(255) NULL UNIQUE,    
    SchoolEmail VARCHAR(255) NULL UNIQUE,      
    AddressDetail NVARCHAR(500) NULL,         
    Ward NVARCHAR(100) NULL,                  
    District NVARCHAR(100) NULL,              
    Province NVARCHAR(100) NULL,              
    Country NVARCHAR(100) NULL,               
    CONSTRAINT FK_ContactDetails_Accounts FOREIGN KEY (AccountId) REFERENCES Accounts(Id) ON DELETE CASCADE -- Nếu xóa Account thì xóa Contact
);

CREATE TABLE AcademicDetails (
	Id INT PRIMARY KEY IDENTITY,
    StudentId INT NOT NULL UNIQUE,              
    EnrollmentDate DATE NULL,               
    CONSTRAINT FK_AcademicDetails_Students FOREIGN KEY (StudentId) REFERENCES Students(Id) ON DELETE CASCADE -- Nếu xóa Student thì xóa Academic Detail
);

CREATE TABLE Lecturers (
    Id INT PRIMARY KEY IDENTITY,
    FullName NVARCHAR(50) NOT NULL,
    Gender NVARCHAR(10) CHECK (Gender IN (N'NAM', N'NỮ')),
    PhoneNumber VARCHAR(20) NOT NULL,
    DateOfBirth DATE NOT NULL,
    AccountId VARCHAR(20) NOT NULL FOREIGN KEY REFERENCES Accounts(Id)
);

CREATE TABLE FacultyMembers (
    Id INT PRIMARY KEY IDENTITY,
    FacultyId INT FOREIGN KEY REFERENCES Faculty(Id),
    LecturerId INT FOREIGN KEY REFERENCES Lecturers(Id),
    JoinedAt DATETIME NOT NULL,
    Role NVARCHAR(20) CHECK (Role IN (N'TRƯỞNG KHOA', N'PHÓ KHOA', N'THÀNH VIÊN')) DEFAULT N'THÀNH VIÊN',
    CONSTRAINT UQ_FacultyMember UNIQUE(FacultyId, LecturerId, JoinedAt)
);

-- Subjects and Enrollment
CREATE TABLE Semesters (
    Id INT PRIMARY KEY IDENTITY,
    AcademicYear INT NOT NULL,
    Semester INT NOT NULL,
    StartDate DATE NOT NULL,
    EndDate DATE NOT NULL,
    CONSTRAINT UQ_Semester UNIQUE (AcademicYear, Semester)
);

CREATE TABLE Subjects (
    Id INT PRIMARY KEY IDENTITY,
    SubjectCode VARCHAR(20) NOT NULL UNIQUE,
    SubjectName NVARCHAR(50) NOT NULL UNIQUE,
    Credits INT NOT NULL DEFAULT 1,
    ExamType NVARCHAR(20) CHECK (ExamType IN (N'LÝ THUYẾT', N'THỰC HÀNH', N'ÐỒ ÁN')) DEFAULT N'LÝ THUYẾT'
);

CREATE TABLE SubjectSemesterRegistrations (
    Id INT PRIMARY KEY IDENTITY,
    SubjectId INT NOT NULL,
    SemesterId INT NOT NULL,
	ClassId INT NOT NULL,
    RegistrationStartDate DATE NULL, 
    RegistrationEndDate DATE NULL,  
    
    CONSTRAINT FK_SubjectSemesterReg_Subject FOREIGN KEY (SubjectId) REFERENCES Subjects(Id),
    CONSTRAINT FK_SubjectSemesterReg_Semester FOREIGN KEY (SemesterId) REFERENCES Semesters(Id),
    CONSTRAINT UQ_SubjectSemesterReg UNIQUE (SubjectId, SemesterId) -- Đảm bảo mỗi môn trong 1 kỳ chỉ có 1 dòng
);
GO



--CREATE TABLE LecturerSubjects (
   -- Id INT PRIMARY KEY IDENTITY,
   -- LecturerId INT NOT NULL FOREIGN KEY REFERENCES Lecturers(Id),
   -- SubjectId INT NOT NULL FOREIGN KEY REFERENCES Subjects(Id),
   -- CONSTRAINT UQ_LecturerSubject UNIQUE (LecturerId, SubjectId)
--);

CREATE TABLE TeachingAssignments (
    Id INT PRIMARY KEY IDENTITY,
    LecturerId INT NOT NULL FOREIGN KEY REFERENCES Lecturers(Id),
    SubjectId INT NOT NULL FOREIGN KEY REFERENCES Subjects(Id),
    ClassId INT NOT NULL FOREIGN KEY REFERENCES Class(Id),
    SemesterId INT NOT NULL FOREIGN KEY REFERENCES Semesters(Id),
    CONSTRAINT UQ_TeachingAssignment UNIQUE (LecturerId, SubjectId, ClassId, SemesterId) 
)



CREATE TABLE Enrollment (
    Id INT PRIMARY KEY IDENTITY,
    StudentId INT NOT NULL FOREIGN KEY REFERENCES Students(Id),
    SubjectId INT NOT NULL FOREIGN KEY REFERENCES Subjects(Id),
    SemesterId INT NOT NULL FOREIGN KEY REFERENCES Semesters(Id),
    StudyStatus NVARCHAR(20) CHECK (StudyStatus IN (N'ĐÃ ĐĂNG KÝ', N'ĐANG HỌC', N'KHÔNG CÒN HỌC')) NOT NULL,
    CONSTRAINT UQ_Enrollment UNIQUE (StudentId, SubjectId, SemesterId)
);

-- Projects and Student Groups
CREATE TABLE Projects (
    Id INT PRIMARY KEY IDENTITY,
    ProjectCode VARCHAR(20) NOT NULL UNIQUE,
    ProjectName NVARCHAR(100),
    MinStudents INT NOT NULL,
    MaxStudents INT NOT NULL,
    CreatedByLecturer INT NOT NULL FOREIGN KEY REFERENCES Lecturers(Id),
    Description NVARCHAR(255)
);

CREATE TABLE SubjectProjects (
    Id INT PRIMARY KEY IDENTITY,
    ProjectId INT NOT NULL FOREIGN KEY REFERENCES Projects(Id),
    SubjectId INT NOT NULL FOREIGN KEY REFERENCES Subjects(Id),
    ClassId INT NOT NULL FOREIGN KEY REFERENCES Class(Id),
	SemesterId INT NOT NULL FOREIGN KEY REFERENCES Semesters(Id)
	MaxRegisteredGroups INT NULL,      
    CurrentRegisteredGroups INT NOT NULL DEFAULT 0; 
    --RegistrationStartDate DATE NULL,      
    --RegistrationEndDate DATE NULL,     
    UNIQUE (ProjectId, SubjectId, ClassId, SemesterId)
);



CREATE TABLE StudentGroups (
    Id INT PRIMARY KEY IDENTITY,
    LeaderID INT NOT NULL ,
    SubjectProjectsId INT FOREIGN KEY REFERENCES SubjectProjects(Id) NOT NULL,
    GroupStatus NVARCHAR(30) CHECK (GroupStatus IN (N'CHƯA BÁO CÁO', N'ÐÃ BÁO CÁO')) DEFAULT N'CHƯA BÁO CÁO' NOT NULL,
    PresentationOrder INT NOT NULL,
    PresentationDate DATETIME,
    TotalMember INT NOT NULL,
    GroupName NVARCHAR(50),
    Notes NVARCHAR(255)
);

CREATE TABLE GroupMembers (
    Id INT PRIMARY KEY IDENTITY,
    GroupId INT FOREIGN KEY REFERENCES StudentGroups(Id),
    StudentId INT FOREIGN KEY REFERENCES Students(Id),
    StudentRole NVARCHAR(20) CHECK (StudentRole IN (N'NHÓM TRƯỞNG', N'THÀNH VIÊN')) NOT NULL,
    Score FLOAT DEFAULT 0,
    Notes NVARCHAR(255),
    CONSTRAINT UQ_GroupMember UNIQUE (GroupId, StudentId)
);

--  Notification
CREATE TABLE Notifications (
    Id INT IDENTITY PRIMARY KEY,
    CreatedAt DATETIME NOT NULL,
    CreatedByLecturer INT FOREIGN KEY REFERENCES Lecturers(Id) NOT NULL,
    NotificationTitle NVARCHAR(255) NOT NULL,
    Content NVARCHAR(MAX) NULL,
    StudentId INT NULL,
    ClassId INT NULL,
    GroupId INT NULL,
    SubjectId INT NULL,
    RecipientType NVARCHAR(50) NOT NULL
);

CREATE TABLE NotificationStatus (
    Id INT IDENTITY PRIMARY KEY,
    NotificationId INT NOT NULL,
    StudentId INT FOREIGN KEY REFERENCES Students(Id) NOT NULL,
    IsRead BIT NOT NULL,
    FOREIGN KEY (NotificationId) REFERENCES Notifications(Id)
);
GO
--------------------Field for seed data-----------------------

-- 1. Faculty, Roles, Rights
INSERT INTO Faculty (FacultyCode, FacultyName) VALUES
('CNTT', N'Công Nghệ Thông Tin');

INSERT INTO Roles (RoleName) VALUES ('LECTURER'), ('STUDENT');

INSERT INTO Rights (RightName, RightDesc) VALUES
('CREATE_PROJECT', N'Tạo đề tài'),
('ASSIGN_PROJECT', N'Phân công đề tài'),
('GRADE_PROJECT', N'Chấm điểm đồ án'),
('VIEW_ALL_GROUPS', N'Xem tất cả nhóm sinh viên');

INSERT INTO RolesRights (RoleId, RightId) VALUES
(1, 1), (1, 2), (1, 3), (1, 4),
(2, 4);

-- 2. Accounts
INSERT INTO Accounts (Id, Username, Password, RoleId, IsActive, CreatedAt, UpdatedAt) VALUES
('GV001', 'nguyenvana', 'hashed_password', 1, 1, GETDATE(), GETDATE()),
('GV002', 'tranthib', 'hashed_password', 1, 1, GETDATE(), GETDATE()),
('GV003', 'levanc', 'hashed_password', 1, 1, GETDATE(), GETDATE()),
('GV004', 'phamthid', 'hashed_password', 1, 1, GETDATE(), GETDATE()),
('GV005', 'ngovane', 'hashed_password', 1, 1, GETDATE(), GETDATE()),
('GV006', 'dangthif', 'hashed_password', 1, 1, GETDATE(), GETDATE()),
('GV007', 'hoangvang', 'hashed_password', 1, 1, GETDATE(), GETDATE()),
('SV001', 'sv1', 'hashed_password', 2, 1, GETDATE(), GETDATE()),
('SV002', 'sv2', 'hashed_password', 2, 1, GETDATE(), GETDATE()),
('SV003', 'sv3', 'hashed_password', 2, 1, GETDATE(), GETDATE()),
('SV004', 'sv4', 'hashed_password', 2, 1, GETDATE(), GETDATE()),
('SV005', 'sv5', 'hashed_password', 2, 1, GETDATE(), GETDATE()),
('SV006', 'sv6', 'hashed_password', 2, 1, GETDATE(), GETDATE()),
('SV007', 'sv7', 'hashed_password', 2, 1, GETDATE(), GETDATE());

-- 3. Major, Class
INSERT INTO Major (MajorCode, MajorName, FacultyId, TrainingSystem, ExpectedDurationYears, MaxDurationYears) VALUES
('CNPM', N'Công nghệ phần mềm', 1, N'Đại học chính quy',5,7),
('HTTT', N'Hệ thống thông tin', 1,N'Đại học chính quy',5,7)
('KTPM', N'Kỹ thuật phần mềm', 1, N'Đại học chính quy',5,7);

INSERT INTO Class (ClassCode, ClassName, MajorId) VALUES
('D22CQCN01-N', 'D22CQCN01-N', 1),
('D22CQCN02-N', 'D22CQCN02-N', 1),
('D22CQCN03-N', 'D22CQCN03-N', 1);

-- 4. Subjects
INSERT INTO Subjects (SubjectCode, SubjectName) VALUES 
('CNPM', N'Công Nghệ Phần Mềm'),
('LTW', N'Lập Trình Web'),
('NMLT', N'Nhập Môn Lập Trình'),
('CSDL', N'Cơ Sở Dữ Liệu');

-- 5. Lecturers
INSERT INTO Lecturers (FullName, Gender, PhoneNumber, DateOfBirth, AccountId) VALUES 
(N'Nguyễn Văn A', N'NAM', '0123456789', '1980-01-01', 'GV001'),
(N'Trần Thị B', N'NỮ', '0123456790', '1981-02-01', 'GV002'),
(N'Lê Văn C', N'NAM', '0123456791', '1982-03-01', 'GV003'),
(N'Phạm Thị D', N'NỮ', '0123456792', '1983-04-01', 'GV004'),
(N'Ngô Văn E', N'NAM', '0123456793', '1984-05-01', 'GV005'),
(N'Ðặng Thị F', N'NỮ', '0123456794', '1985-06-01', 'GV006'),
(N'Hoàng Văn G', N'NAM', '0123456795', '1986-07-01', 'GV007');

-- 6. Students
INSERT INTO Students (FullName, Gender, DateOfBirth, PhoneNumber, ClassId, AccountId) VALUES
(N'Sinh Viên 1', N'NAM', '2003-01-01', '0900000001', 1, 'SV001'),
(N'Sinh Viên 2', N'NỮ', '2003-02-02', '0900000002', 1, 'SV002'),
(N'Sinh Viên 3', N'NAM', '2003-03-03', '0900000003', 2, 'SV003'),
(N'Sinh Viên 4', N'NỮ', '2003-04-04', '0900000004', 2, 'SV004'),
(N'Sinh Viên 5', N'NAM', '2003-05-05', '0900000005', 3, 'SV005'),
(N'Sinh Viên 6', N'NỮ', '2003-06-06', '0900000006', 3, 'SV006'),
(N'Sinh Viên 7', N'NAM', '2003-07-07', '0900000007', 1, 'SV007');

-- 7. Faculty Members
INSERT INTO FacultyMembers (FacultyId, LecturerId, JoinedAt, Role) VALUES
(1, 1, GETDATE(), N'TRƯỞNG KHOA'),
(1, 2, GETDATE(), N'PHÓ KHOA'),
(1, 3, GETDATE(), N'THÀNH VIÊN'),
(1, 4, GETDATE(), N'THÀNH VIÊN'),
(1, 5, GETDATE(), N'THÀNH VIÊN'),
(1, 6, GETDATE(), N'THÀNH VIÊN'),
(1, 7, GETDATE(), N'THÀNH VIÊN');

-- 8. LecturerSubjects
--INSERT INTO LecturerSubjects (LecturerId, SubjectId) VALUES
--(1, 1), (2, 2), (3, 3), (4, 4),
--(5, 1), (6, 2), (7, 3);

INSERT INTO TeachingAssignments (LecturerId, SubjectId, ClassId, SemesterId) VALUES 
(1,1,1,3),
(2,2,1,3),
(3,3,1,3)

-- 9. Semesters
INSERT INTO Semesters (AcademicYear, Semester, StartDate, EndDate) VALUES
(2024, 1, 2023-12-26, 2024-05-30),
(2024, 2, 2024-08-01, 2024-12-25),
(2025, 1, 2024-12-26, 2025-05-30), 
(2025, 2, 2025-08-01, 2025-12-25);

-- 10. Projects
INSERT INTO Projects (ProjectCode, ProjectName, MinStudents, MaxStudents, Status, CreatedByLecturer, SubjectId, StartDate, EndDate, Description) VALUES
('DT01', N'Đề tài 1', 1, 5, N'CHƯA HOÀN THIỆN', 1, 1, '2025-03-01', '2025-03-15', N'Mô tả đề tài 1'),
('DT02', N'Đề tài 2', 1, 3, N'CHƯA HOÀN THIỆN', 2, 2, '2025-03-05', '2025-03-20', N'Mô tả đề tài 2'),
('DT03', N'Đề tài 3', 2, 4, N'CHƯA HOÀN THIỆN', 3, 3, '2025-03-10', '2025-03-25', N'Mô tả đề tài 3');

-- SubjectProjects
INSERT INTO SubjectProjects(ProjectId, SubjectId, ClassId) VALUES
(1, 1, 1, 3),
(1, 2, 1, 3),
(1, 3, 1, 3),
(2, 1, 1, 3),
(2, 2, 1, 3),
(2, 3, 1, 3),
(3, 1, 1, 3),
(3, 2, 1, 3),
(3, 3, 1, 3)


-- 13. Enrollment
INSERT INTO Enrollment (StudentId, SubjectId, SemesterId, StudyStatus) VALUES
(1, 1, 3, N'ĐANG HỌC'),
(2, 1, 3, N'ĐANG HỌC'),
(3, 2, 3, N'ĐANG HỌC'),
(4, 2, 3, N'ĐANG HỌC'),
(5, 3, 3, N'ĐANG HỌC'),
(6, 3, 3, N'ĐANG HỌC'),
(7, 4, 3, N'ĐANG HỌC');

-- 14. Notification
INSERT INTO Notification (CreatedAt, CreatedByLecturer, NotificationTitle, Content) VALUES
(GETDATE(), 1, N'Lịch bảo vệ đồ án nhóm 1', N'Nhóm 1 sẽ bảo vệ vào ngày 10/04/2025, phòng A101.'),
(GETDATE(), 2, N'Cập nhật thông tin đề tài', N'Vui lòng cập nhật tiến độ hoàn thành đồ án trước ngày 08/04/2025.'),
(GETDATE(), 3, N'Yêu cầu nộp báo cáo giữa kỳ', N'Hạn chót nộp báo cáo giữa kỳ là 12/04/2025. Nộp muộn sẽ bị trừ điểm.'),
(GETDATE(), 4, N'Thông báo nghỉ học', N'Tuần này lớp LTW nghỉ do giảng viên bận công tác.'),
(GETDATE(), 5, N'Thông báo họp khoa CNTT', N'Toàn bộ giảng viên khoa CNTT họp vào lúc 14h00 ngày 09/04/2025 tại phòng họp B2.');


INSERT INTO UserProfiles (AccountId, FullName, Gender, DateOfBirth, PlaceOfBirth, IdentityCardNumber, Ethnicity, Religion, ProfileImageUrl)
VALUES (
    'SV001',              
    N'Phạm Hùng Thiên',       
    N'Nam',                   
    '2004-09-16',              
    N'Đồng Nai',              
    '075204016944',           
    N'Kinh',                  
    N'Thiên Chúa',            
    NULL                      
);


INSERT INTO UserProfiles (AccountId, FullName, Gender, DateOfBirth, PlaceOfBirth, IdentityCardNumber, Ethnicity, Religion, ProfileImageUrl)
VALUES (
    'GV001',                   
    N'Nguyễn Văn A',           
    N'Nam',                   
    '1985-03-10',              
    N'Hà Nội',              
    '001085123456',           
    N'Kinh',                  
    N'Thiên Chúa',                     
    NULL                      
);

INSERT INTO UserProfiles (AccountId, FullName, Gender, DateOfBirth, PlaceOfBirth, IdentityCardNumber, Ethnicity, Religion, ProfileImageUrl)
VALUES (
    'SV001',              
    N'Phạm Hùng Thiên',       
    N'Nam',                   
    '2004-09-16',              
    N'Đồng Nai',              
    '075204016944',           
    N'Kinh',                  
    N'Thiên Chúa',            
    NULL                      
);


INSERT INTO UserProfiles (AccountId, FullName, Gender, DateOfBirth, PlaceOfBirth, IdentityCardNumber, Ethnicity, Religion, ProfileImageUrl)
VALUES (
    'GV001',                   
    N'Nguyễn Văn A',           
    N'Nam',                   
    '1985-03-10',              
    N'Hà Nội',              
    '001085123456',           
    N'Kinh',                  
    N'Thiên Chúa',                     
    NULL                      
);

INSERT INTO AcademicDetails (StudentId, EnrollmentDate)
VALUES (
    1,                          
    '2022-09-23'                
);

INSERT INTO NotificationStatus (
    NotificationId, StudentId, IsRead
)
VALUES
(1, 1, 1),
(1, 2, 0),
(2, 3, 0),
(3, 4, 1),
(4, 3, 0),
(5, 1, 1),
(5, 2, 0),
(130, 1, 1),
(131, 1, 1),
(131, 2, 0);

INSERT INTO Notifications (
    CreatedAt, CreatedByLecturer, NotificationTitle, Content,
    StudentId, ClassId, GroupId, SubjectId, RecipientType
)
VALUES
('2025-04-08 05:28:32.003', 1, N'licj kclak', N'Nhóm 1 sẽ bảo vệ vào ngày 10/04/2025, phòng A101.', 2, NULL, NULL, NULL, N'student'),
('2025-04-08 05:28:32.003', 2, N'klajsdlkajsdlkjalksdasqdwqwdqwdqwd', N'Vui lòng', NULL, NULL, 2, NULL, N'group'),
('2025-04-08 05:28:32.003', 3, N'Yêu cầu nộp báo cáo giữa kỳ', N'Hạn chót nộp báo cáo giữa kỳ là 12/04/2025. Nộp muộn sẽ bị trừ điểm.', NULL, NULL, 5, NULL, N'group'),
('2025-04-08 05:28:32.003', 4, N'Thông báo nghỉ học', N'Tuần này lớp LTW nghỉ do giảng viên bận công tác.', NULL, NULL, 2, NULL, N'group'),
('2025-04-08 05:28:32.003', 5, N'Thông báo họp khoa CNTT', N'Toàn bộ giảng viên khoa CNTT họp vào lúc 14h00 ngày 09/04/2025 tại phòng họp B2.', NULL, NULL, 1, NULL, N'group'),
('2025-04-10 04:08:25.120', 1, N'ádas', N'đá', 1, NULL, NULL, NULL, N'student'),
('2025-04-10 04:08:38.153', 1, N'oiajhsdasd', N'adlajsnd.ajlskd', 2, NULL, NULL, NULL, N'student'),
('2025-04-10 04:09:05.333', 1, N'asdasdaskdhg', N'asdasd', 3, NULL, NULL, NULL, N'student'),
('2025-04-10 05:55:36.527', 1, N'asdioahdas', N'askhgdaskd', 1, NULL, NULL, NULL, N'student'),
('2025-04-10 05:56:42.750', 1, N'askdjhasd', N'aiusdga', 2, NULL, NULL, NULL, N'student');

USE 
SELECT *
FROM SubjectProjects
USE TopicAssignment;
GO

--virtual table
CREATE TYPE dbo.GroupMemberTableType AS TABLE (
    StudentId INT NOT NULL,
    StudentRole NVARCHAR(20) NOT NULL
);
GO




CREATE PROCEDURE dbo.SP_RegisterStudentGroup
    @GroupName NVARCHAR(50),
    @SubjectProjectId INT,
    @Members dbo.GroupMemberTableType READONLY, 
    --@AccountId VARCHAR(20) 
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON; --auto rollback if false


    DECLARE @ErrorMessage NVARCHAR(MAX);
    DECLARE @ErrorSeverity INT;
    DECLARE @ErrorState INT;
    DECLARE @CurrentSemesterId INT;
    DECLARE @SubjectId INT;
    DECLARE @MaxRegisteredGroups INT;
    DECLARE @CurrentRegisteredGroups INT;
    DECLARE @RegistrationStartDate DATE;
    DECLARE @RegistrationEndDate DATE;
    DECLARE @MinStudents INT;
    DECLARE @MaxStudents INT;
    DECLARE @TotalMember INT = (SELECT COUNT(*) FROM @Members); 
    DECLARE @LeaderId INT = (SELECT TOP 1 StudentId FROM @Members WHERE StudentRole = N'NHÓM TRƯỞNG'); 
    DECLARE @Today DATE = CAST(GETDATE() AS DATE);
    DECLARE @NewGroupId INT;
	DECLARE @NewGroupIdTable TABLE (GroupId INT);
    DECLARE @ConflictingStudentId INT;

    BEGIN TRY
        BEGIN TRANSACTION;

        IF @LeaderId IS NULL
        BEGIN
            THROW 50001, N'Danh sách thành viên phải bao gồm một NHÓM TRƯỞNG.', 1;
        END

        SELECT TOP 1
            @SubjectId = sp.SubjectId,
            @CurrentSemesterId = sp.SemesterId,
            @MaxRegisteredGroups = sp.MaxRegisteredGroups,
            @CurrentRegisteredGroups = sp.CurrentRegisteredGroups,
            @RegistrationStartDate = ssr.RegistrationStartDate,
            @RegistrationEndDate = ssr.RegistrationEndDate,
            @MinStudents = p.MinStudents,
            @MaxStudents = p.MaxStudents
        FROM SubjectProjects sp
        LEFT JOIN SubjectSemesterRegistrations ssr ON sp.SubjectId = ssr.SubjectId AND sp.SemesterId = ssr.SemesterId
        INNER JOIN Projects p ON sp.ProjectId = p.Id 
        WHERE sp.Id = @SubjectProjectId;

        IF @SubjectId IS NULL
        BEGIN
            THROW 50002, N'Đề tài không tồn tại.', 1;
        END

        IF @RegistrationStartDate IS NOT NULL AND @Today < @RegistrationStartDate
        BEGIN
            THROW 50003, N'Chưa đến thời gian đăng ký cho môn học này.', 1;
        END
        IF @RegistrationEndDate IS NOT NULL AND @Today > @RegistrationEndDate 
        BEGIN
            THROW 50004, N'Đã hết hạn đăng ký cho môn học này.', 1;
        END

        IF @MaxRegisteredGroups IS NOT NULL AND @CurrentRegisteredGroups >= @MaxRegisteredGroups
        BEGIN
            THROW 50005, N'Đề tài này đã đủ số lượng nhóm tối đa đăng ký.', 1;
        END

        IF @TotalMember < @MinStudents OR @TotalMember > @MaxStudents
        BEGIN
            DECLARE @StudentRangeError NVARCHAR(100) = CONCAT(N'Số lượng thành viên nhóm (', @TotalMember, ') phải nằm trong khoảng [', @MinStudents, ', ', @MaxStudents, '].');
            THROW 50006, @StudentRangeError, 1;
        END

        SELECT TOP 1 @ConflictingStudentId = GM.StudentId
        FROM GroupMembers GM
        JOIN StudentGroups SG ON GM.GroupId = SG.Id
        JOIN SubjectProjects SP ON SG.SubjectProjectsId = SP.Id
        JOIN @Members m ON GM.StudentId = m.StudentId 
        WHERE SP.SubjectId = @SubjectId
          AND SP.SemesterId = @CurrentSemesterId;

        IF @ConflictingStudentId IS NOT NULL
        BEGIN
            DECLARE @ConflictError NVARCHAR(150) = CONCAT(N'Sinh viên có ID ', @ConflictingStudentId, ' đã là thành viên của nhóm khác trong môn học này.');
            THROW 50007, @ConflictError, 1;
        END

        DECLARE @PresentationOrder INT;
        SELECT @PresentationOrder = COUNT(SG.Id) + 1
        FROM StudentGroups SG
        JOIN SubjectProjects SP ON SG.SubjectProjectsId = SP.Id
        WHERE SP.SubjectId = @SubjectId AND SP.SemesterId = @CurrentSemesterId;


        INSERT INTO StudentGroups(SubjectProjectsId, GroupName, TotalMember, LeaderID, PresentationOrder)
        OUTPUT INSERTED.Id INTO @NewGroupIdTable(GroupId) 
        VALUES (@SubjectProjectId, @GroupName, @TotalMember, @LeaderId, @PresentationOrder);

        SELECT TOP 1 @NewGroupId = GroupId FROM @NewGroupIdTable;


        INSERT INTO GroupMembers(GroupId, StudentId, StudentRole)
        SELECT @NewGroupId, StudentId, StudentRole
        FROM @Members;

        -- trigger will update currentregistergroup

        COMMIT TRANSACTION;

        SELECT GroupId = @NewGroupId, Message = N'Đăng ký nhóm thành công!';

    END TRY
    BEGIN CATCH
        IF @@TRANCOUNT > 0
            ROLLBACK TRANSACTION;

        SELECT
            @ErrorMessage = ERROR_MESSAGE(),
            @ErrorSeverity = ERROR_SEVERITY(),
            @ErrorState = ERROR_STATE();

        RAISERROR(@ErrorMessage, @ErrorSeverity, @ErrorState);
        RETURN; 
    END CATCH;
END;
GO

PRINT N'Stored Procedure dbo.SP_RegisterStudentGroup đã được tạo.';
GO

--add check @AccountId (Minh)
--return (GroupName LeaderId) (Minh)
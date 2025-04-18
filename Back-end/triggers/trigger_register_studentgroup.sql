USE TopicAssignment;
GO


CREATE TRIGGER TRG_StudentGroups_UpdateCount_INSERT
ON StudentGroups
AFTER INSERT
AS
BEGIN

    -- SET NOCOUNT ON;


    IF EXISTS (SELECT 1 FROM inserted)
    BEGIN

        UPDATE sp
        SET sp.CurrentRegisteredGroups = sp.CurrentRegisteredGroups + inserted_count.NumInserted
        FROM SubjectProjects AS sp
        INNER JOIN (
            SELECT SubjectProjectsId, COUNT(*) AS NumInserted
            FROM inserted
            GROUP BY SubjectProjectsId
        ) AS inserted_count ON sp.Id = inserted_count.SubjectProjectsId;

        PRINT 'Trigger TRG_StudentGroups_UpdateCount_INSERT executed.';
    END
END;

GO


CREATE TRIGGER TRG_StudentGroups_UpdateCount_DELETE
ON StudentGroups
AFTER DELETE
AS
BEGIN
    -- Chỉ cập nhật nếu có dòng bị DELETE
    IF EXISTS (SELECT 1 FROM deleted)
    BEGIN

        UPDATE sp
        SET sp.CurrentRegisteredGroups = sp.CurrentRegisteredGroups - deleted_count.NumDeleted
        FROM SubjectProjects AS sp
        INNER JOIN (
            SELECT SubjectProjectsId, COUNT(*) AS NumDeleted
            FROM deleted
            GROUP BY SubjectProjectsId
        ) AS deleted_count ON sp.Id = deleted_count.SubjectProjectsId
        WHERE sp.CurrentRegisteredGroups >= deleted_count.NumDeleted;


        PRINT 'Trigger TRG_StudentGroups_UpdateCount_DELETE executed.';
    END
END;
GO



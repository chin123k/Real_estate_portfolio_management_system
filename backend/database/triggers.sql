USE real_estate_portfolio;
DELIMITER //
CREATE TRIGGER update_property_status_after_lease_end
AFTER UPDATE ON Lease
FOR EACH ROW
BEGIN
    IF NEW.Status = 'Terminated' OR NEW.Status = 'Expired' THEN
        UPDATE Property
        SET Status = 'Available'
        WHERE Property_ID = NEW.Property_ID;
    END IF;
END //
DELIMITER ;
DELIMITER //
CREATE TRIGGER check_lease_dates_before_insert
BEFORE INSERT ON Lease
FOR EACH ROW
BEGIN
    IF NEW.Start_Date >= NEW.End_Date THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Lease end date must be after start date';
    END IF;
END //
DELIMITER ;
DELIMITER //
CREATE EVENT auto_expire_leases
ON SCHEDULE EVERY 1 DAY
STARTS CURRENT_DATE
DO
BEGIN
    UPDATE Lease
    SET Status = 'Expired'
    WHERE End_Date < CURRENT_DATE AND Status = 'Active';
    
    UPDATE Property p
    JOIN Lease l ON p.Property_ID = l.Property_ID
    SET p.Status = 'Available'
    WHERE l.Status = 'Expired' AND p.Status = 'Leased';
END //
DELIMITER ;
DELIMITER //
CREATE TABLE IF NOT EXISTS Property_Value_History (
    History_ID INT AUTO_INCREMENT PRIMARY KEY,
    Property_ID INT NOT NULL,
    Old_Value DECIMAL(15, 2),
    New_Value DECIMAL(15, 2),
    Change_Date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (Property_ID) REFERENCES Property(Property_ID) ON DELETE CASCADE
);

CREATE TRIGGER log_property_value_changes
AFTER UPDATE ON Property
FOR EACH ROW
BEGIN
    IF OLD.Current_Value != NEW.Current_Value THEN
        INSERT INTO Property_Value_History (Property_ID, Old_Value, New_Value)
        VALUES (NEW.Property_ID, OLD.Current_Value, NEW.Current_Value);
    END IF;
END //
DELIMITER ;
DELIMITER //
CREATE TRIGGER prevent_active_lease_deletion
BEFORE DELETE ON Lease
FOR EACH ROW
BEGIN
    IF OLD.Status = 'Active' THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Cannot delete an active lease agreement';
    END IF;
END //
DELIMITER ;

DELIMITER //
CREATE TRIGGER auto_expire_insurance_policies
BEFORE UPDATE ON Insurance_Policy
FOR EACH ROW
BEGIN
    IF NEW.End_Date < CURDATE() AND OLD.Status = 'Active' THEN
        SET NEW.Status = 'Expired';
    END IF;
END //
DELIMITER ;
DELIMITER //
CREATE TRIGGER notify_owner_insurance_response
AFTER UPDATE ON Insurance_Offer
FOR EACH ROW
BEGIN
    IF OLD.Status = 'Pending' AND NEW.Status IN ('Accepted', 'Rejected') THEN
        INSERT INTO Notification (User_Type, User_ID, Title, Message, Type, Related_ID)
        SELECT 'Owner', p.Owner_ID,
               CONCAT('Insurance Offer ', NEW.Status),
               CONCAT('Tenant has ', LOWER(NEW.Status), ' your insurance offer'),
               'insurance', NEW.Offer_ID
        FROM Property p
        WHERE p.Property_ID = NEW.Property_ID AND p.Owner_ID IS NOT NULL;
    END IF;
END //
DELIMITER ;
DELIMITER //
CREATE TRIGGER prevent_duplicate_insurance_offers
BEFORE INSERT ON Insurance_Offer
FOR EACH ROW
BEGIN
    DECLARE offer_count INT;
    
    SELECT COUNT(*) INTO offer_count
    FROM Insurance_Offer
    WHERE Property_ID = NEW.Property_ID
    AND Tenant_ID = NEW.Tenant_ID
    AND Status = 'Pending';
    
    IF offer_count > 0 THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Tenant already has a pending insurance offer for this property';
    END IF;
END //
DELIMITER ;
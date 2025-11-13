
USE real_estate_portfolio;

-- ============================================================================
-- PROPERTY AVAILABILITY FUNCTIONS
-- ============================================================================

DELIMITER //
DROP FUNCTION IF EXISTS IsPropertyAvailable //
CREATE FUNCTION IsPropertyAvailable(
    p_property_id INT,
    p_listing_type VARCHAR(20)
) RETURNS BOOLEAN
DETERMINISTIC
READS SQL DATA
BEGIN
    DECLARE property_status VARCHAR(50);
    DECLARE listing_type VARCHAR(20);
    DECLARE is_available BOOLEAN;
    
    SELECT Status, Listing_Type
    INTO property_status, listing_type
    FROM Property
    WHERE Property_ID = p_property_id;
    
    IF property_status = 'Available' AND (p_listing_type IS NULL OR listing_type = p_listing_type) THEN
        SET is_available = TRUE;
    ELSE
        SET is_available = FALSE;
    END IF;
    
    RETURN is_available;
END //
DELIMITER ;
-- ============================================================================
-- PROPERTY INCOME & VALUE FUNCTIONS
-- ============================================================================

-- Function to calculate monthly rental income for a property
DELIMITER //
DROP FUNCTION IF EXISTS GetMonthlyRentalIncome //
CREATE FUNCTION GetMonthlyRentalIncome(
    p_property_id INT
) RETURNS DECIMAL(10, 2)
NOT DETERMINISTIC
READS SQL DATA
BEGIN
    DECLARE monthly_rent DECIMAL(10, 2);
    
    SELECT COALESCE(SUM(Monthly_Rent), 0)
    INTO monthly_rent
    FROM Lease
    WHERE Property_ID = p_property_id
    AND Status = 'Active'
    AND End_Date >= CURRENT_DATE();
    
    RETURN ROUND(monthly_rent, 2);
END //
DELIMITER ;

-- Function to calculate total property value for an owner
DELIMITER //
DROP FUNCTION IF EXISTS GetOwnerTotalPropertyValue //
CREATE FUNCTION GetOwnerTotalPropertyValue(
    p_owner_id INT
) RETURNS DECIMAL(15, 2)
DETERMINISTIC
READS SQL DATA
BEGIN
    DECLARE total_value DECIMAL(15, 2);
    
    SELECT COALESCE(SUM(Current_Value), 0)
    INTO total_value
    FROM Property
    WHERE Owner_ID = p_owner_id;
    
    RETURN ROUND(total_value, 2);
END //
DELIMITER ;

-- ============================================================================
-- MAINTENANCE FUNCTIONS
-- ============================================================================

DELIMITER //
DROP FUNCTION IF EXISTS GetPendingMaintenanceCount //
CREATE FUNCTION GetPendingMaintenanceCount(
    p_property_id INT
) RETURNS INT
DETERMINISTIC
READS SQL DATA
BEGIN
    DECLARE pending_count INT;
    
    SELECT COUNT(*)
    INTO pending_count
    FROM Maintenance_Request
    WHERE Property_ID = p_property_id
    AND Status IN ('Pending', 'In Progress');
    
    RETURN pending_count;
END //
DELIMITER ;
-- Function to get maintenance count for owner
DELIMITER //
DROP FUNCTION IF EXISTS GetOwnerPendingMaintenanceCount //
CREATE FUNCTION GetOwnerPendingMaintenanceCount(
    p_owner_id INT
) RETURNS INT
DETERMINISTIC
READS SQL DATA
BEGIN
    DECLARE pending_count INT;
    
    SELECT COUNT(*)
    INTO pending_count
    FROM Maintenance_Request mr
    JOIN Property p ON mr.Property_ID = p.Property_ID
    WHERE p.Owner_ID = p_owner_id
    AND mr.Status IN ('Pending', 'In Progress');
    
    RETURN pending_count;
END //
DELIMITER ;

-- ============================================================================
-- PAYMENT & TENANT FINANCIAL FUNCTIONS
-- ============================================================================

DELIMITER //
DROP FUNCTION IF EXISTS GetTenantPendingPayments //
CREATE FUNCTION GetTenantPendingPayments(
    p_tenant_id INT
) RETURNS DECIMAL(10, 2)
DETERMINISTIC
READS SQL DATA
BEGIN
    DECLARE pending_amount DECIMAL(10, 2);
    
    SELECT COALESCE(SUM(Amount + COALESCE(Late_Fee, 0)), 0)
    INTO pending_amount
    FROM Payment
    WHERE Tenant_ID = p_tenant_id
    AND Status = 'Pending';
    
    RETURN ROUND(pending_amount, 2);
END //
DELIMITER ;

DELIMITER //
DROP FUNCTION IF EXISTS GetTenantDueAmount //
CREATE FUNCTION GetTenantDueAmount(
    p_tenant_id INT
) RETURNS DECIMAL(10, 2)
NOT DETERMINISTIC
READS SQL DATA
BEGIN
    DECLARE due_amount DECIMAL(10, 2);

    SELECT COALESCE(SUM(p.Amount + COALESCE(p.Late_Fee, 0)), 0)
    INTO due_amount
    FROM Payment p
    WHERE p.Tenant_ID = p_tenant_id
      AND (
            p.Status = 'Pending'
         OR (p.Status <> 'Paid' AND p.Due_Date IS NOT NULL AND CURRENT_DATE() > p.Due_Date)
      );

    RETURN ROUND(due_amount, 2);
END //
DELIMITER ;

-- Function to get tenant's total paid amount
DELIMITER //
DROP FUNCTION IF EXISTS GetTenantTotalPaid //
CREATE FUNCTION GetTenantTotalPaid(
    p_tenant_id INT,
    p_start_date DATE,
    p_end_date DATE
) RETURNS DECIMAL(15, 2)
DETERMINISTIC
READS SQL DATA
BEGIN
    DECLARE total_paid DECIMAL(15, 2);
    
    SELECT COALESCE(SUM(Amount), 0)
    INTO total_paid
    FROM Payment
    WHERE Tenant_ID = p_tenant_id
    AND Status = 'Paid'
    AND (p_start_date IS NULL OR Payment_Date >= p_start_date)
    AND (p_end_date IS NULL OR Payment_Date <= p_end_date);
    
    RETURN ROUND(total_paid, 2);
END //
DELIMITER ;

-- ============================================================================
-- LEASE FUNCTIONS
-- ============================================================================

-- Function to get tenant's active lease count
DELIMITER //
DROP FUNCTION IF EXISTS GetTenantActiveLeaseCount //
CREATE FUNCTION GetTenantActiveLeaseCount(
    p_tenant_id INT
) RETURNS INT
NOT DETERMINISTIC
READS SQL DATA
BEGIN
    DECLARE lease_count INT;
    
    SELECT COUNT(*)
    INTO lease_count
    FROM Lease
    WHERE Tenant_ID = p_tenant_id
    AND Status = 'Active'
    AND End_Date >= CURRENT_DATE();
    
    RETURN lease_count;
END //
DELIMITER ;

-- Function to get owner's active lease count
DELIMITER //
DROP FUNCTION IF EXISTS GetOwnerActiveLeaseCount //
CREATE FUNCTION GetOwnerActiveLeaseCount(
    p_owner_id INT
) RETURNS INT
NOT DETERMINISTIC
READS SQL DATA
BEGIN
    DECLARE lease_count INT;
    
    SELECT COUNT(*)
    INTO lease_count
    FROM Lease l
    JOIN Property p ON l.Property_ID = p.Property_ID
    WHERE p.Owner_ID = p_owner_id
    AND l.Status = 'Active'
    AND l.End_Date >= CURRENT_DATE();
    
    RETURN lease_count;
END //
DELIMITER ;
-- ============================================================================
-- NOTIFICATION FUNCTIONS
-- ============================================================================

DELIMITER //
DROP FUNCTION IF EXISTS GetUnreadNotificationCount //
CREATE FUNCTION GetUnreadNotificationCount(
    p_user_type VARCHAR(20),
    p_user_id INT
) RETURNS INT
DETERMINISTIC
READS SQL DATA
BEGIN
    DECLARE unread_count INT;
    
    SELECT COUNT(*)
    INTO unread_count
    FROM Notification
    WHERE User_Type = p_user_type
    AND User_ID = p_user_id
    AND Is_Read = FALSE;
    
    RETURN unread_count;
END //
DELIMITER ;
-- ============================================================================
-- OWNER FINANCIAL FUNCTIONS
-- ============================================================================
-- Function to get owner's total received payments
DELIMITER //
DROP FUNCTION IF EXISTS GetOwnerTotalReceived //
CREATE FUNCTION GetOwnerTotalReceived(
    p_owner_id INT,
    p_start_date DATE,
    p_end_date DATE
) RETURNS DECIMAL(15, 2)
DETERMINISTIC
READS SQL DATA
BEGIN
    DECLARE total_received DECIMAL(15, 2);
    
    SELECT COALESCE(SUM(p.Amount), 0)
    INTO total_received
    FROM Payment p
    JOIN Lease l ON p.Lease_ID = l.Lease_ID
    JOIN Property pr ON l.Property_ID = pr.Property_ID
    WHERE pr.Owner_ID = p_owner_id
    AND p.Status = 'Paid'
    AND (p_start_date IS NULL OR p.Payment_Date >= p_start_date)
    AND (p_end_date IS NULL OR p.Payment_Date <= p_end_date);
    
    RETURN ROUND(total_received, 2);
END //
DELIMITER ;


-- ============================================================================
-- DOCUMENT FUNCTIONS
-- ============================================================================

-- Function to get document count for property
DELIMITER //
DROP FUNCTION IF EXISTS GetPropertyDocumentCount //
CREATE FUNCTION GetPropertyDocumentCount(
    p_property_id INT,
    p_document_type VARCHAR(50)
) RETURNS INT
DETERMINISTIC
READS SQL DATA
BEGIN
    DECLARE doc_count INT;
    
    SELECT COUNT(*)
    INTO doc_count
    FROM Property_Document
    WHERE Property_ID = p_property_id
    AND (p_document_type IS NULL OR Document_Type = p_document_type);
    
    RETURN doc_count;
END //
DELIMITER ;

-- ============================================================================
-- INSPECTION FUNCTIONS
-- ============================================================================

-- Function to get pending inspection count for owner
DELIMITER //
DROP FUNCTION IF EXISTS GetOwnerPendingInspectionCount //
CREATE FUNCTION GetOwnerPendingInspectionCount(
    p_owner_id INT
) RETURNS INT
DETERMINISTIC
READS SQL DATA
BEGIN
    DECLARE inspection_count INT;
    
    SELECT COUNT(*)
    INTO inspection_count
    FROM Inspection i
    JOIN Property p ON i.Property_ID = p.Property_ID
    WHERE p.Owner_ID = p_owner_id
    AND i.Status = 'Pending';
    
    RETURN inspection_count;
END //
DELIMITER ;

-- ============================================================================
-- REQUEST FUNCTIONS (LEASE & PURCHASE)
-- ============================================================================

-- Function to get pending lease request count for owner
DELIMITER //
DROP FUNCTION IF EXISTS GetOwnerPendingLeaseRequestCount //
CREATE FUNCTION GetOwnerPendingLeaseRequestCount(
    p_owner_id INT
) RETURNS INT
DETERMINISTIC
READS SQL DATA
BEGIN
    DECLARE request_count INT;
    
    SELECT COUNT(*)
    INTO request_count
    FROM LeaseRequest lr
    JOIN Property p ON lr.Property_ID = p.Property_ID
    WHERE p.Owner_ID = p_owner_id
    AND lr.Status = 'Pending';
    
    RETURN request_count;
END //
DELIMITER ;

-- Function to get pending purchase request count for owner
DELIMITER //
DROP FUNCTION IF EXISTS GetOwnerPendingPurchaseRequestCount //
CREATE FUNCTION GetOwnerPendingPurchaseRequestCount(
    p_owner_id INT
) RETURNS INT
DETERMINISTIC
READS SQL DATA
BEGIN
    DECLARE request_count INT;
    
    SELECT COUNT(*)
    INTO request_count
    FROM PurchaseRequest pr
    JOIN Property p ON pr.Property_ID = p.Property_ID
    WHERE p.Owner_ID = p_owner_id
    AND pr.Status = 'Pending';
    
    RETURN request_count;
END //
DELIMITER ;

-- ============================================================================
-- OCCUPANCY & AVAILABILITY FUNCTIONS
-- ============================================================================

-- Function to check if property has active lease
DELIMITER //
DROP FUNCTION IF EXISTS HasActiveLeaseOnProperty //
CREATE FUNCTION HasActiveLeaseOnProperty(
    p_property_id INT
) RETURNS BOOLEAN
NOT DETERMINISTIC
READS SQL DATA
BEGIN
    DECLARE has_lease BOOLEAN;
    DECLARE lease_count INT;
    
    SELECT COUNT(*)
    INTO lease_count
    FROM Lease
    WHERE Property_ID = p_property_id
    AND Status = 'Active'
    AND End_Date >= CURRENT_DATE();
    
    IF lease_count > 0 THEN
        SET has_lease = TRUE;
    ELSE
        SET has_lease = FALSE;
    END IF;
    
    RETURN has_lease;
END //
DELIMITER ;

-- ============================================================================
-- UTILITY FUNCTIONS
-- ============================================================================

-- Function to format property address
DELIMITER //
DROP FUNCTION IF EXISTS FormatPropertyAddress //
CREATE FUNCTION FormatPropertyAddress(
    p_property_id INT
) RETURNS VARCHAR(500)
DETERMINISTIC
READS SQL DATA
BEGIN
    DECLARE formatted_address VARCHAR(500);
    
    SELECT CONCAT(Street_Address, ', ', City, ', ', State, ' ', ZIP_Code)
    INTO formatted_address
    FROM Property
    WHERE Property_ID = p_property_id;
    
    RETURN COALESCE(formatted_address, 'Address not available');
END //
DELIMITER ;

-- Function to get tenant name
DELIMITER //
DROP FUNCTION IF EXISTS GetTenantFullName //
CREATE FUNCTION GetTenantFullName(
    p_tenant_id INT
) RETURNS VARCHAR(200)
DETERMINISTIC
READS SQL DATA
BEGIN
    DECLARE tenant_name VARCHAR(200);
    
    SELECT CONCAT(First_Name, ' ', Last_Name)
    INTO tenant_name
    FROM Tenant
    WHERE Tenant_ID = p_tenant_id;
    
    RETURN COALESCE(tenant_name, 'Unknown Tenant');
END //
DELIMITER ;
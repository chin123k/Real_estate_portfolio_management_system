USE real_estate_portfolio;

DELIMITER //
DROP PROCEDURE IF EXISTS AddProperty //
CREATE PROCEDURE AddProperty(
    IN p_property_name VARCHAR(100),
    IN p_street_address VARCHAR(200),
    IN p_city VARCHAR(100),
    IN p_state VARCHAR(50),
    IN p_zip_code VARCHAR(10),
    IN p_property_type VARCHAR(50),
    IN p_purchase_date DATE,
    IN p_purchase_price DECIMAL(15, 2),
    IN p_current_value DECIMAL(15, 2),
    IN p_square_footage INT,
    IN p_year_built INT,
    IN p_bedrooms INT,
    IN p_bathrooms DECIMAL(3,1),
    IN p_listing_type VARCHAR(20),
    IN p_owner_id INT,
    IN p_description TEXT,
    IN p_image_url VARCHAR(500)
)
BEGIN
    DECLARE v_property_id INT;
    
    INSERT INTO Property (
        Property_Name, Street_Address, City, State, ZIP_Code,
        Property_Type, Purchase_Date, Purchase_Price, Current_Value,
        Square_Footage, Year_Built, Bedrooms, Bathrooms, Status,
        Listing_Type, Owner_ID, Description, Image_URL
    ) VALUES (
        p_property_name, p_street_address, p_city, p_state, p_zip_code,
        p_property_type, p_purchase_date, p_purchase_price, p_current_value,
        p_square_footage, p_year_built, p_bedrooms, p_bathrooms, 'Available',
        COALESCE(p_listing_type, 'Sale'), p_owner_id, p_description, p_image_url
    );
    
    SET v_property_id = LAST_INSERT_ID();
    
    IF p_owner_id IS NOT NULL THEN
        INSERT INTO PropertyOwnership (
            Property_ID, Owner_ID, Ownership_Type, Purchase_Price, Start_Date, Status
        ) VALUES (
            v_property_id, p_owner_id, 'Owned', p_purchase_price, 
            COALESCE(p_purchase_date, CURRENT_DATE), 'Active'
        );
    END IF;
    
    SELECT v_property_id AS Property_ID;
END //
DELIMITER ;


DELIMITER //
DROP PROCEDURE IF EXISTS CreateLeaseRequest //
CREATE PROCEDURE CreateLeaseRequest(
    IN p_property_id INT,
    IN p_tenant_id INT,
    IN p_start_date DATE,
    IN p_end_date DATE,
    IN p_monthly_rent DECIMAL(10, 2),
    IN p_message TEXT
)
BEGIN
    DECLARE v_property_status VARCHAR(50);
    DECLARE v_owner_id INT;
    DECLARE v_property_name VARCHAR(100);
    DECLARE v_request_id INT;
    
    -- Check if property is available
    SELECT Status, Owner_ID, Property_Name 
    INTO v_property_status, v_owner_id, v_property_name
    FROM Property 
    WHERE Property_ID = p_property_id;
    
    IF v_property_status = 'Available' THEN
        -- Create lease request
        INSERT INTO LeaseRequest (
            Property_ID, Tenant_ID, Requested_Start_Date, Requested_End_Date, 
            Monthly_Rent, Message, Status
        ) VALUES (
            p_property_id, p_tenant_id, p_start_date, p_end_date, 
            p_monthly_rent, p_message, 'Pending'
        );
        
        SET v_request_id = LAST_INSERT_ID();
        
        -- Create notification for owner
        IF v_owner_id IS NOT NULL THEN
            INSERT INTO Notification (User_Type, User_ID, Title, Message, Type, Related_ID)
            SELECT 'Owner', v_owner_id, 'New Lease Request',
                   CONCAT('New lease request for ', v_property_name, ' at $', p_monthly_rent, '/month'),
                   'lease', v_request_id;
        END IF;
        
        SELECT v_request_id AS Request_ID, 'Lease request created successfully' AS Message;
    ELSE
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Property is not available for lease';
    END IF;
END //
DELIMITER ;

DELIMITER //
DROP PROCEDURE IF EXISTS ProcessLeaseRequest //
CREATE PROCEDURE ProcessLeaseRequest(
    IN p_request_id INT,
    IN p_status VARCHAR(50),
    IN p_owner_response TEXT
)
BEGIN
    DECLARE v_property_id INT;
    DECLARE v_tenant_id INT;
    DECLARE v_start_date DATE;
    DECLARE v_end_date DATE;
    DECLARE v_monthly_rent DECIMAL(10, 2);
    DECLARE v_lease_id INT;
    
    -- Get request details
    SELECT Property_ID, Tenant_ID, Requested_Start_Date, Requested_End_Date, Monthly_Rent
    INTO v_property_id, v_tenant_id, v_start_date, v_end_date, v_monthly_rent
    FROM LeaseRequest
    WHERE Request_ID = p_request_id;
    
    -- Update request status
    UPDATE LeaseRequest
    SET Status = p_status, Owner_Response = p_owner_response
    WHERE Request_ID = p_request_id;
    
    -- If approved, create actual lease
    IF p_status = 'Approved' THEN
        -- Create lease
        INSERT INTO Lease (
            Property_ID, Tenant_ID, Start_Date, End_Date, 
            Monthly_Rent, Status
        ) VALUES (
            v_property_id, v_tenant_id, v_start_date, v_end_date,
            v_monthly_rent, 'Active'
        );
        
        SET v_lease_id = LAST_INSERT_ID();
        
        -- Update property status to Leased
        UPDATE Property SET Status = 'Leased' WHERE Property_ID = v_property_id;
        
        -- Create ownership record
        INSERT INTO PropertyOwnership (
            Property_ID, Tenant_ID, Ownership_Type, Start_Date, Status
        ) VALUES (
            v_property_id, v_tenant_id, 'Leased', v_start_date, 'Active'
        );
        
        -- Notify tenant
        INSERT INTO Notification (User_Type, User_ID, Title, Message, Type, Related_ID)
        VALUES ('Tenant', v_tenant_id, 'Lease Request Approved',
                CONCAT('Your lease request has been approved. ', COALESCE(p_owner_response, '')),
                'lease', p_request_id);
    ELSE
        -- Notify tenant of rejection
        INSERT INTO Notification (User_Type, User_ID, Title, Message, Type, Related_ID)
        VALUES ('Tenant', v_tenant_id, 'Lease Request Rejected',
                CONCAT('Your lease request has been rejected. ', COALESCE(p_owner_response, '')),
                'lease', p_request_id);
    END IF;
    
    SELECT CONCAT('Lease request ', p_status) AS Message;
END //
DELIMITER ;

DELIMITER //
DROP PROCEDURE IF EXISTS CreatePurchaseRequest //
CREATE PROCEDURE CreatePurchaseRequest(
    IN p_property_id INT,
    IN p_tenant_id INT,
    IN p_offer_price DECIMAL(15, 2),
    IN p_message TEXT,
    IN p_financing_type VARCHAR(50)
)
BEGIN
    DECLARE v_property_status VARCHAR(50);
    DECLARE v_owner_id INT;
    DECLARE v_property_name VARCHAR(100);
    DECLARE v_request_id INT;
    
    -- Check if property is available
    SELECT Status, Owner_ID, Property_Name 
    INTO v_property_status, v_owner_id, v_property_name
    FROM Property 
    WHERE Property_ID = p_property_id;
    
    IF v_property_status = 'Available' THEN
        -- Create purchase request
        INSERT INTO PurchaseRequest (
            Property_ID, Tenant_ID, Offer_Price, Message, Financing_Type, Status
        ) VALUES (
            p_property_id, p_tenant_id, p_offer_price, p_message, p_financing_type, 'Pending'
        );
        
        SET v_request_id = LAST_INSERT_ID();
        
        -- Create notification for owner
        IF v_owner_id IS NOT NULL THEN
            INSERT INTO Notification (User_Type, User_ID, Title, Message, Type, Related_ID)
            SELECT 'Owner', v_owner_id, 'New Purchase Request',
                   CONCAT('Purchase offer of $', p_offer_price, ' for ', v_property_name),
                   'purchase', v_request_id;
        END IF;
        
        SELECT v_request_id AS Request_ID, 'Purchase request created successfully' AS Message;
    ELSE
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Property is not available for purchase';
    END IF;
END //
DELIMITER ;

-- Procedure to approve/reject purchase request (Owner action)
DELIMITER //
DROP PROCEDURE IF EXISTS ProcessPurchaseRequest //
CREATE PROCEDURE ProcessPurchaseRequest(
    IN p_request_id INT,
    IN p_status VARCHAR(50),
    IN p_owner_response TEXT
)
BEGIN
    DECLARE v_property_id INT;
    DECLARE v_tenant_id INT;
    DECLARE v_offer_price DECIMAL(15, 2);
    DECLARE v_property_name VARCHAR(100);
    
    -- Get request details
    SELECT pr.Property_ID, pr.Tenant_ID, pr.Offer_Price, p.Property_Name
    INTO v_property_id, v_tenant_id, v_offer_price, v_property_name
    FROM PurchaseRequest pr
    JOIN Property p ON pr.Property_ID = p.Property_ID
    WHERE pr.Request_ID = p_request_id;
    
    -- Update request status
    UPDATE PurchaseRequest
    SET Status = p_status, Owner_Response = p_owner_response
    WHERE Request_ID = p_request_id;
    
    -- If approved, transfer ownership
    IF p_status = 'Approved' THEN
        -- Close old ownership records
        UPDATE PropertyOwnership
        SET Status = 'Closed', End_Date = CURRENT_DATE
        WHERE Property_ID = v_property_id AND Status = 'Active';
        
        -- Create new ownership record for tenant (buyer)
        INSERT INTO PropertyOwnership (
            Property_ID, Tenant_ID, Ownership_Type, Purchase_Price, Start_Date, Status
        ) VALUES (
            v_property_id, v_tenant_id, 'Owned', v_offer_price, CURRENT_DATE, 'Active'
        );
        
        -- Update property status to Sold
        UPDATE Property 
        SET Status = 'Sold', Owner_ID = NULL 
        WHERE Property_ID = v_property_id;
        
        -- Create sale document
        INSERT INTO Property_Document (
            Property_ID, Document_Type, Document_Name, File_Path
        ) VALUES (
            v_property_id, 'Sale Agreement',
            CONCAT('Sale_Agreement_', REPLACE(v_property_name, ' ', '_'), '_', DATE_FORMAT(NOW(), '%Y%m%d'), '.pdf'),
            CONCAT('/documents/sales/agreement_', p_request_id, '.pdf')
        );
        
        -- Notify tenant
        INSERT INTO Notification (User_Type, User_ID, Title, Message, Type, Related_ID)
        VALUES ('Tenant', v_tenant_id, 'Purchase Request Approved',
                CONCAT('Congratulations! Your purchase offer has been accepted. ', COALESCE(p_owner_response, '')),
                'purchase', p_request_id);
    ELSE
        -- Notify tenant of rejection
        INSERT INTO Notification (User_Type, User_ID, Title, Message, Type, Related_ID)
        VALUES ('Tenant', v_tenant_id, 'Purchase Request Rejected',
                CONCAT('Your purchase offer has been declined. ', COALESCE(p_owner_response, '')),
                'purchase', p_request_id);
    END IF;
    
    SELECT CONCAT('Purchase request ', p_status) AS Message;
END //
DELIMITER ;

-- Procedure to record a rent payment with automatic financial transaction
DELIMITER //
DROP PROCEDURE IF EXISTS RecordRentPayment //
CREATE PROCEDURE RecordRentPayment(
    IN p_lease_id INT,
    IN p_tenant_id INT,
    IN p_amount DECIMAL(10, 2),
    IN p_payment_date DATE,
    IN p_payment_method VARCHAR(50),
    IN p_due_date DATE
)
BEGIN
    DECLARE v_property_id INT;
    DECLARE v_owner_id INT;
    DECLARE v_payment_id INT;
    DECLARE v_late_fee DECIMAL(10, 2);
    DECLARE v_payment_status VARCHAR(20);
    
    -- Get property and lease info
    SELECT p.Property_ID, p.Owner_ID
    INTO v_property_id, v_owner_id
    FROM Lease l
    JOIN Property p ON l.Property_ID = p.Property_ID
    WHERE l.Lease_ID = p_lease_id;
    
    -- Calculate late fee if payment is after due date + grace period (5 days)
    IF p_payment_date > DATE_ADD(p_due_date, INTERVAL 5 DAY) THEN
        SET v_late_fee = p_amount * 0.05; -- 5% late fee
        SET v_payment_status = 'Pending';
    ELSE
        SET v_late_fee = 0;
        SET v_payment_status = 'Pending';
    END IF;
    
    -- Insert payment record
    INSERT INTO Payment (
        Lease_ID, Amount, Payment_Date, Payment_Method,
        Status, Due_Date, Late_Fee
    ) VALUES (
        p_lease_id, p_amount, p_payment_date, p_payment_method,
        v_payment_status, p_due_date, v_late_fee
    );
    
    SET v_payment_id = LAST_INSERT_ID();
    
    -- Notify owner about payment submission
    IF v_owner_id IS NOT NULL THEN
        INSERT INTO Notification (User_Type, User_ID, Title, Message, Type, Related_ID)
        VALUES ('Owner', v_owner_id, 'New Payment Submitted',
                CONCAT('Payment of $', p_amount, ' submitted by tenant'),
                'payment', v_payment_id);
    END IF;
    
    SELECT v_payment_id AS Payment_ID, 'Payment recorded successfully' AS Message;
END //
DELIMITER ;

-- Procedure to confirm payment (Owner action)
DELIMITER //
DROP PROCEDURE IF EXISTS ConfirmPayment //
CREATE PROCEDURE ConfirmPayment(
    IN p_payment_id INT,
    IN p_status VARCHAR(50)
)
BEGIN
    DECLARE v_property_id INT;
    DECLARE v_tenant_id INT;
    DECLARE v_amount DECIMAL(10, 2);
    DECLARE v_late_fee DECIMAL(10, 2);
    DECLARE v_total_amount DECIMAL(10, 2);
    DECLARE v_lease_id INT;
    DECLARE v_payment_method VARCHAR(50);
    
    -- Get payment details
    SELECT p.Lease_ID, l.Tenant_ID, p.Amount, p.Late_Fee, p.Payment_Method, l.Property_ID
    INTO v_lease_id, v_tenant_id, v_amount, v_late_fee, v_payment_method, v_property_id
    FROM Payment p
    JOIN Lease l ON p.Lease_ID = l.Lease_ID
    WHERE p.Payment_ID = p_payment_id;
    
    SET v_total_amount = v_amount + COALESCE(v_late_fee, 0);
    
    -- Update payment status
    UPDATE Payment
    SET Status = p_status, Payment_Date = CURRENT_DATE
    WHERE Payment_ID = p_payment_id;
    
    -- If confirmed as Paid, record financial transaction
    IF p_status = 'Paid' THEN
        INSERT INTO Financial_Transaction (
            Property_ID, Transaction_Type, Amount, Transaction_Date,
            Description, Category
        ) VALUES (
            v_property_id, 'Income', v_total_amount, CURRENT_DATE,
            CONCAT('Rent Payment - Lease #', v_lease_id, ' - Tenant #', v_tenant_id, 
                   ' via ', COALESCE(v_payment_method, 'Bank Transfer')),
            'Rent'
        );
        
        -- Notify tenant
        INSERT INTO Notification (User_Type, User_ID, Title, Message, Type, Related_ID)
        VALUES ('Tenant', v_tenant_id, 'Payment Confirmed',
                'Your payment has been confirmed and processed',
                'payment', p_payment_id);
    END IF;
    
    SELECT 'Payment status updated' AS Message;
END //
DELIMITER ;


-- Procedure to submit maintenance request with notifications
DELIMITER //
DROP PROCEDURE IF EXISTS SubmitMaintenanceRequest //
CREATE PROCEDURE SubmitMaintenanceRequest(
    IN p_property_id INT,
    IN p_tenant_id INT,
    IN p_description TEXT,
    IN p_priority VARCHAR(20),
    IN p_notes TEXT
)
BEGIN
    DECLARE v_owner_id INT;
    DECLARE v_property_name VARCHAR(100);
    DECLARE v_request_id INT;
    DECLARE v_tenant_count INT;
    
    -- Get property owner and name
    SELECT Owner_ID, Property_Name
    INTO v_owner_id, v_property_name
    FROM Property
    WHERE Property_ID = p_property_id;
    
    -- Verify tenant has active lease for this property
    SELECT COUNT(*) INTO v_tenant_count
    FROM Lease
    WHERE Property_ID = p_property_id 
    AND Tenant_ID = p_tenant_id 
    AND Status = 'Active';
    
    IF v_tenant_count > 0 OR p_tenant_id IS NULL THEN
        -- Insert maintenance request
        INSERT INTO Maintenance_Request (
            Property_ID, Tenant_ID, Description, 
            Priority, Status, Notes
        ) VALUES (
            p_property_id, p_tenant_id, p_description,
            COALESCE(p_priority, 'Medium'), 'Pending', p_notes
        );
        
        SET v_request_id = LAST_INSERT_ID();
        
        -- Notify owner
        IF v_owner_id IS NOT NULL THEN
            INSERT INTO Notification (User_Type, User_ID, Title, Message, Type, Related_ID)
            VALUES ('Owner', v_owner_id, 'New Maintenance Request',
                    CONCAT(COALESCE(p_priority, 'Medium'), ' priority maintenance issue at ', 
                           v_property_name, ': ', SUBSTRING(p_description, 1, 100)),
                    'maintenance', v_request_id);
        END IF;
        
        SELECT v_request_id AS Request_ID, 'Maintenance request submitted successfully' AS Message;
    ELSE
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Tenant is not associated with this property';
    END IF;
END //
DELIMITER ;

-- Procedure to update maintenance request status (Owner action)
DELIMITER //
DROP PROCEDURE IF EXISTS UpdateMaintenanceRequest //
CREATE PROCEDURE UpdateMaintenanceRequest(
    IN p_request_id INT,
    IN p_status VARCHAR(50),
    IN p_assigned_to VARCHAR(100),
    IN p_cost DECIMAL(10, 2),
    IN p_notes TEXT
)
BEGIN
    DECLARE v_old_status VARCHAR(50);
    DECLARE v_tenant_id INT;
    DECLARE v_property_id INT;
    
    -- Get current status and tenant
    SELECT Status, Tenant_ID, Property_ID
    INTO v_old_status, v_tenant_id, v_property_id
    FROM Maintenance_Request
    WHERE Request_ID = p_request_id;
    
    -- Update maintenance request
    UPDATE Maintenance_Request
    SET Status = p_status,
        Assigned_To = p_assigned_to,
        Cost = p_cost,
        Notes = p_notes,
        Completion_Date = CASE WHEN p_status = 'Completed' THEN CURRENT_TIMESTAMP ELSE Completion_Date END
    WHERE Request_ID = p_request_id;
    
    -- If status changed, notify tenant
    IF v_old_status != p_status AND v_tenant_id IS NOT NULL THEN
        INSERT INTO Notification (User_Type, User_ID, Title, Message, Type, Related_ID)
        VALUES ('Tenant', v_tenant_id, 'Maintenance Request Updated',
                CONCAT('Your maintenance request status has been updated to: ', p_status),
                'maintenance', p_request_id);
    END IF;
    
    -- If completed, record expense
    IF p_status = 'Completed' AND p_cost IS NOT NULL AND p_cost > 0 THEN
        INSERT INTO Financial_Transaction (
            Property_ID, Transaction_Type, Amount, Transaction_Date,
            Description, Category
        ) VALUES (
            v_property_id, 'Expense', p_cost, CURRENT_DATE,
            CONCAT('Maintenance expense for request #', p_request_id),
            'Maintenance'
        );
    END IF;
    
    SELECT 'Maintenance request updated successfully' AS Message;
END //
DELIMITER ;


-- Procedure to request property inspection (Tenant action)
DELIMITER //
DROP PROCEDURE IF EXISTS RequestPropertyInspection //
CREATE PROCEDURE RequestPropertyInspection(
    IN p_property_id INT,
    IN p_tenant_id INT,
    IN p_inspection_date DATE,
    IN p_inspection_type VARCHAR(50),
    IN p_notes TEXT
)
BEGIN
    DECLARE v_owner_id INT;
    DECLARE v_property_name VARCHAR(100);
    DECLARE v_inspection_id INT;
    
    -- Get property details
    SELECT Owner_ID, Property_Name
    INTO v_owner_id, v_property_name
    FROM Property
    WHERE Property_ID = p_property_id;
    
    -- Create inspection request
    INSERT INTO Property_Inspection (
        Property_ID, Tenant_ID, Inspection_Date, Inspection_Type,
        Request_Type, Status, Notes
    ) VALUES (
        p_property_id, p_tenant_id, p_inspection_date, p_inspection_type,
        'Tenant Requested', 'Scheduled', p_notes
    );
    
    SET v_inspection_id = LAST_INSERT_ID();
    
    -- Notify owner
    IF v_owner_id IS NOT NULL THEN
        INSERT INTO Notification (User_Type, User_ID, Title, Message, Type, Related_ID)
        VALUES ('Owner', v_owner_id, 'Inspection Request',
                CONCAT('Tenant requested ', p_inspection_type, ' inspection for ', v_property_name),
                'inspection', v_inspection_id);
    END IF;
    
    SELECT v_inspection_id AS Inspection_ID, 'Inspection request created' AS Message;
END //
DELIMITER ;

-- Procedure to complete property inspection
DELIMITER //
DROP PROCEDURE IF EXISTS CompletePropertyInspection //
CREATE PROCEDURE CompletePropertyInspection(
    IN p_inspection_id INT,
    IN p_inspector_name VARCHAR(100),
    IN p_results TEXT,
    IN p_status VARCHAR(50)
)
BEGIN
    DECLARE v_tenant_id INT;
    
    -- Get tenant ID if it's a tenant-requested inspection
    SELECT Tenant_ID INTO v_tenant_id
    FROM Property_Inspection
    WHERE Inspection_ID = p_inspection_id;
    
    -- Update inspection
    UPDATE Property_Inspection
    SET Inspector_Name = p_inspector_name,
        Results = p_results,
        Status = p_status
    WHERE Inspection_ID = p_inspection_id;
    
    -- Notify tenant if applicable
    IF v_tenant_id IS NOT NULL THEN
        INSERT INTO Notification (User_Type, User_ID, Title, Message, Type, Related_ID)
        VALUES ('Tenant', v_tenant_id, 'Inspection Completed',
                CONCAT('Property inspection has been completed. Status: ', p_status),
                'inspection', p_inspection_id);
    END IF;
    
    SELECT 'Inspection updated successfully' AS Message;
END //
DELIMITER ;

-- Procedure to generate property financial report
DELIMITER //
CREATE PROCEDURE GeneratePropertyFinancialReport(
    IN p_property_id INT,
    IN p_start_date DATE,
    IN p_end_date DATE
)
BEGIN
    -- Get property details
    SELECT 
        p.Property_ID,
        p.Property_Name,
        p.Street_Address,
        p.City,
        p.State,
        p.ZIP_Code,
        p.Property_Type,
        p.Current_Value
    FROM Property p
    WHERE p.Property_ID = p_property_id;
    
    -- Get income transactions
    SELECT 
        'Income' AS Type,
        COALESCE(SUM(Amount), 0) AS Total_Amount,
        COUNT(*) AS Transaction_Count
    FROM Financial_Transaction
    WHERE Property_ID = p_property_id
    AND Transaction_Type = 'Income'
    AND Transaction_Date BETWEEN p_start_date AND p_end_date;
    
    -- Get expense transactions
    SELECT 
        'Expense' AS Type,
        COALESCE(SUM(Amount), 0) AS Total_Amount,
        COUNT(*) AS Transaction_Count
    FROM Financial_Transaction
    WHERE Property_ID = p_property_id
    AND Transaction_Type = 'Expense'
    AND Transaction_Date BETWEEN p_start_date AND p_end_date;
    
    -- Get detailed transactions
    SELECT 
        Transaction_ID,
        Transaction_Type,
        Amount,
        Transaction_Date,
        Description,
        Category
    FROM Financial_Transaction
    WHERE Property_ID = p_property_id
    AND Transaction_Date BETWEEN p_start_date AND p_end_date
    ORDER BY Transaction_Date DESC;
END //
DELIMITER ;


-- Procedure to find available properties with filters
DELIMITER //
DROP PROCEDURE IF EXISTS FindAvailableProperties //
CREATE PROCEDURE FindAvailableProperties(
    IN p_city VARCHAR(100),
    IN p_property_type VARCHAR(50),
    IN p_listing_type VARCHAR(20),
    IN p_min_price DECIMAL(15, 2),
    IN p_max_price DECIMAL(15, 2),
    IN p_min_bedrooms INT,
    IN p_max_bedrooms INT
)
BEGIN
    SELECT 
        p.Property_ID,
        p.Property_Name,
        p.Street_Address,
        p.City,
        p.State,
        p.ZIP_Code,
        p.Property_Type,
        p.Current_Value,
        p.Square_Footage,
        p.Bedrooms,
        p.Bathrooms,
        p.Year_Built,
        p.Status,
        p.Description,
        p.Image_URL,
        p.Listing_Type,
        p.Is_PG,
        CONCAT(o.First_Name, ' ', o.Last_Name) as Owner_Name
    FROM Property p
    LEFT JOIN Owner o ON p.Owner_ID = o.Owner_ID
    WHERE p.Status = 'Available'
    AND (p_city IS NULL OR p.City = p_city)
    AND (p_property_type IS NULL OR p.Property_Type = p_property_type)
    AND (p_listing_type IS NULL OR p.Listing_Type = p_listing_type)
    AND (p_min_price IS NULL OR p.Current_Value >= p_min_price)
    AND (p_max_price IS NULL OR p.Current_Value <= p_max_price)
    AND (p_min_bedrooms IS NULL OR p.Bedrooms >= p_min_bedrooms)
    AND (p_max_bedrooms IS NULL OR p.Bedrooms <= p_max_bedrooms)
    ORDER BY p.Created_At DESC;
END //
DELIMITER ;

-- Procedure to get tenant's properties (leased/owned)
DELIMITER //
DROP PROCEDURE IF EXISTS GetTenantProperties //
CREATE PROCEDURE GetTenantProperties(
    IN p_tenant_id INT
)
BEGIN
    -- Get properties through active leases
    SELECT DISTINCT
        p.*,
        CONCAT(o.First_Name, ' ', o.Last_Name) as Owner_Name,
        'Leased' as Relationship_Type,
        l.Monthly_Rent,
        l.Start_Date,
        l.End_Date
    FROM Lease l
    JOIN Property p ON p.Property_ID = l.Property_ID
    LEFT JOIN Owner o ON p.Owner_ID = o.Owner_ID
    WHERE l.Tenant_ID = p_tenant_id 
    AND l.Status = 'Active'
    
    UNION
    
    -- Get properties through ownership
    SELECT DISTINCT
        p.*,
        CONCAT(o.First_Name, ' ', o.Last_Name) as Owner_Name,
        po.Ownership_Type as Relationship_Type,
        NULL as Monthly_Rent,
        po.Start_Date,
        po.End_Date
    FROM PropertyOwnership po
    JOIN Property p ON p.Property_ID = po.Property_ID
    LEFT JOIN Owner o ON p.Owner_ID = o.Owner_ID
    WHERE po.Tenant_ID = p_tenant_id 
    AND po.Status = 'Active'
    ORDER BY Start_Date DESC;
END //
DELIMITER ;

-- Procedure to get owner's properties
DELIMITER //
DROP PROCEDURE IF EXISTS GetOwnerProperties //
CREATE PROCEDURE GetOwnerProperties(
    IN p_owner_id INT
)
BEGIN
    SELECT p.*,
           COUNT(DISTINCT l.Lease_ID) as Active_Leases,
           COUNT(DISTINCT mr.Request_ID) as Pending_Maintenance
    FROM Property p
    LEFT JOIN Lease l ON p.Property_ID = l.Property_ID AND l.Status = 'Active'
    LEFT JOIN Maintenance_Request mr ON p.Property_ID = mr.Property_ID AND mr.Status = 'Pending'
    WHERE p.Owner_ID = p_owner_id
    GROUP BY p.Property_ID
    ORDER BY p.Created_At DESC;
END //
DELIMITER ;

-- ============================================================================
-- INSURANCE STORED PROCEDURES
-- ============================================================================

-- Procedure to create insurance offer with validation
DELIMITER //
DROP PROCEDURE IF EXISTS CreateInsuranceOffer //
CREATE PROCEDURE CreateInsuranceOffer(
    IN p_property_id INT,
    IN p_tenant_id INT,
    IN p_provider VARCHAR(100),
    IN p_coverage_type VARCHAR(100),
    IN p_coverage_amount DECIMAL(15, 2),
    IN p_premium_amount DECIMAL(10, 2),
    IN p_premium_frequency VARCHAR(20),
    IN p_start_date DATE,
    IN p_end_date DATE,
    IN p_terms TEXT,
    IN p_benefits TEXT
)
BEGIN
    DECLARE v_lease_count INT;
    DECLARE v_offer_id INT;
    DECLARE v_property_name VARCHAR(100);
    
    -- Check if tenant has active lease for this property
    SELECT COUNT(*) INTO v_lease_count
    FROM Lease
    WHERE Property_ID = p_property_id
    AND Tenant_ID = p_tenant_id
    AND Status = 'Active'
    AND End_Date >= CURDATE();
    
    IF v_lease_count = 0 THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Tenant does not have an active lease for this property';
    END IF;
    
    -- Get property name
    SELECT Property_Name INTO v_property_name
    FROM Property
    WHERE Property_ID = p_property_id;
    
    -- Insert insurance offer
    INSERT INTO Insurance_Offer (
        Property_ID, Tenant_ID, Provider, Coverage_Type, 
        Coverage_Amount, Premium_Amount, Premium_Frequency, 
        Start_Date, End_Date, Terms, Benefits, Status
    ) VALUES (
        p_property_id, p_tenant_id, p_provider, p_coverage_type,
        p_coverage_amount, p_premium_amount, p_premium_frequency,
        p_start_date, p_end_date, p_terms, p_benefits, 'Pending'
    );
    
    SET v_offer_id = LAST_INSERT_ID();
    
    -- Notify tenant
    INSERT INTO Notification (User_Type, User_ID, Title, Message, Type, Related_ID)
    VALUES (
        'Tenant', p_tenant_id, 'New Insurance Offer',
        CONCAT('You have received an insurance offer for ', v_property_name, 
               '. Coverage: ', p_coverage_type, ' - $', p_coverage_amount),
        'insurance', v_offer_id
    );
    
    SELECT v_offer_id AS Offer_ID, 'Insurance offer created successfully' AS Message;
END //
DELIMITER ;

-- Procedure to accept insurance offer
DELIMITER //
DROP PROCEDURE IF EXISTS AcceptInsuranceOffer //
CREATE PROCEDURE AcceptInsuranceOffer(
    IN p_offer_id INT,
    IN p_tenant_response TEXT
)
BEGIN
    DECLARE v_property_id INT;
    DECLARE v_owner_id INT;
    DECLARE v_provider VARCHAR(100);
    DECLARE v_coverage_type VARCHAR(100);
    DECLARE v_premium_amount DECIMAL(10, 2);
    DECLARE v_start_date DATE;
    DECLARE v_end_date DATE;
    DECLARE v_property_name VARCHAR(100);
    DECLARE v_policy_number VARCHAR(100);
    
    -- Get offer details
    SELECT io.Property_ID, p.Owner_ID, io.Provider, io.Coverage_Type,
        io.Premium_Amount, io.Start_Date, io.End_Date, p.Property_Name
    INTO v_property_id, v_owner_id, v_provider, v_coverage_type,
         v_premium_amount, v_start_date, v_end_date, v_property_name
    FROM Insurance_Offer io
    JOIN Property p ON io.Property_ID = p.Property_ID
    WHERE io.Offer_ID = p_offer_id;
    
    -- Update offer status
    UPDATE Insurance_Offer
    SET Status = 'Accepted',
        Tenant_Response = p_tenant_response,
        Response_Date = CURDATE()
    WHERE Offer_ID = p_offer_id;
    
    -- Generate policy number
    SET v_policy_number = CONCAT('POL-', YEAR(CURDATE()), '-', LPAD(p_offer_id, 6, '0'));
    
    -- Create insurance policy
    INSERT INTO Insurance_Policy (
        Property_ID, Provider, Policy_Number, Coverage_Type,
        Premium_Amount, Start_Date, End_Date, Status
    ) VALUES (
        v_property_id, v_provider, v_policy_number, v_coverage_type,
        v_premium_amount, v_start_date, v_end_date, 'Active'
    );
    
    -- Record financial transaction
    INSERT INTO Financial_Transaction (
        Property_ID, Transaction_Type, Amount, Transaction_Date,
        Description, Category
    ) VALUES (
        v_property_id, 'Expense', v_premium_amount, CURDATE(),
        CONCAT('Insurance Premium - ', v_coverage_type, ' - Policy ', v_policy_number),
        'Insurance'
    );
    
    -- Notify owner
    IF v_owner_id IS NOT NULL THEN
        INSERT INTO Notification (User_Type, User_ID, Title, Message, Type, Related_ID)
        VALUES (
            'Owner', v_owner_id, 'Insurance Offer Accepted',
            CONCAT('Tenant has accepted the insurance offer for ', v_property_name),
            'insurance', p_offer_id
        );
    END IF;
    
    SELECT 'Insurance offer accepted and policy created' AS Message, v_policy_number AS Policy_Number;
END //
DELIMITER ;

-- Procedure to get insurance statistics for owner
DELIMITER //
DROP PROCEDURE IF EXISTS GetOwnerInsuranceStats //
CREATE PROCEDURE GetOwnerInsuranceStats(
    IN p_owner_id INT
)
BEGIN
    SELECT 
        COUNT(*) as total_offers,
        SUM(CASE WHEN io.Status = 'Pending' THEN 1 ELSE 0 END) as pending_offers,
        SUM(CASE WHEN io.Status = 'Accepted' THEN 1 ELSE 0 END) as accepted_offers,
        SUM(CASE WHEN io.Status = 'Rejected' THEN 1 ELSE 0 END) as rejected_offers,
        COALESCE(SUM(CASE WHEN io.Status = 'Accepted' THEN io.Premium_Amount ELSE 0 END), 0) as total_premium_revenue,
        COALESCE(SUM(CASE WHEN io.Status = 'Accepted' THEN io.Coverage_Amount ELSE 0 END), 0) as total_coverage_provided,
        COALESCE(AVG(CASE WHEN io.Status = 'Accepted' THEN io.Premium_Amount ELSE NULL END), 0) as avg_premium,
        COUNT(DISTINCT io.Tenant_ID) as tenants_with_insurance
    FROM Insurance_Offer io
    JOIN Property p ON io.Property_ID = p.Property_ID
    WHERE p.Owner_ID = p_owner_id;
END //
DELIMITER ;

-- Procedure to get expiring insurance policies with recommendations
DELIMITER //
DROP PROCEDURE IF EXISTS GetExpiringInsurancePolicies //
CREATE PROCEDURE GetExpiringInsurancePolicies(
    IN p_days_ahead INT
)
BEGIN
    SELECT 
        ip.*,
        p.Property_Name,
        p.Street_Address,
        CONCAT(o.First_Name, ' ', o.Last_Name) as Owner_Name,
        o.Email as Owner_Email,
        DATEDIFF(ip.End_Date, CURDATE()) as Days_Until_Expiry,
        -- Check if renewal offer exists
        (SELECT COUNT(*) 
         FROM Insurance_Offer 
         WHERE Property_ID = ip.Property_ID 
         AND Start_Date > ip.End_Date 
         AND Status = 'Accepted') AS Has_Renewal
    FROM Insurance_Policy ip
    JOIN Property p ON ip.Property_ID = p.Property_ID
    LEFT JOIN Owner o ON p.Owner_ID = o.Owner_ID
    WHERE ip.Status = 'Active'
    AND ip.End_Date BETWEEN CURDATE() AND DATE_ADD(CURDATE(), INTERVAL p_days_ahead DAY)
    ORDER BY Days_Until_Expiry ASC;
END //
DELIMITER ;
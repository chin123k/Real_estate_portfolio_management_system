-- Real Estate Portfolio Management System Views
-- Views provide simplified access to complex queries
USE real_estate_portfolio;

-- Drop existing views if they exist
DROP VIEW IF EXISTS vw_PropertyDetails;
DROP VIEW IF EXISTS vw_ActiveLeases;
DROP VIEW IF EXISTS vw_TenantPaymentHistory;
DROP VIEW IF EXISTS vw_OwnerPortfolio;
DROP VIEW IF EXISTS vw_PendingMaintenanceRequests;
DROP VIEW IF EXISTS vw_PropertyFinancialSummary;
DROP VIEW IF EXISTS vw_TenantProperties;
DROP VIEW IF EXISTS vw_LeaseRequests;
DROP VIEW IF EXISTS vw_PurchaseRequests;

-- View: Property Details with Owner Information
CREATE VIEW vw_PropertyDetails AS
SELECT 
    p.Property_ID,
    p.Property_Name,
    p.Street_Address,
    p.City,
    p.State,
    p.ZIP_Code,
    p.Property_Type,
    p.Purchase_Date,
    p.Purchase_Price,
    p.Current_Value,
    p.Square_Footage,
    p.Year_Built,
    p.Bedrooms,
    p.Bathrooms,
    p.Status,
    p.Listing_Type,
    p.Is_PG,
    p.Description,
    p.Image_URL,
    CONCAT(o.First_Name, ' ', o.Last_Name) AS Owner_Name,
    o.Email AS Owner_Email,
    o.Phone AS Owner_Phone,
    o.Owner_ID,
    CASE 
        WHEN p.Purchase_Price > 0 THEN 
            ROUND(((p.Current_Value - p.Purchase_Price) / p.Purchase_Price) * 100, 2)
        ELSE 0
    END AS Appreciation_Percentage,
    p.Created_At
FROM Property p
LEFT JOIN Owner o ON p.Owner_ID = o.Owner_ID;

-- View: Active Leases with Property and Tenant Details
CREATE VIEW vw_ActiveLeases AS
SELECT 
    l.Lease_ID,
    l.Property_ID,
    p.Property_Name,
    p.Street_Address,
    p.City,
    p.State,
    l.Tenant_ID,
    CONCAT(t.First_Name, ' ', t.Last_Name) AS Tenant_Name,
    t.Email AS Tenant_Email,
    t.Phone AS Tenant_Phone,
    l.Start_Date,
    l.End_Date,
    l.Monthly_Rent,
    l.Security_Deposit,
    l.Status,
    DATEDIFF(l.End_Date, CURDATE()) AS Days_Until_Expiration,
    CONCAT(o.First_Name, ' ', o.Last_Name) AS Owner_Name,
    o.Owner_ID,
    l.Created_At
FROM Lease l
JOIN Property p ON l.Property_ID = p.Property_ID
JOIN Tenant t ON l.Tenant_ID = t.Tenant_ID
LEFT JOIN Owner o ON p.Owner_ID = o.Owner_ID
WHERE l.Status = 'Active';

-- View: Tenant Payment History
CREATE VIEW vw_TenantPaymentHistory AS
SELECT 
    p.Payment_ID,
    p.Tenant_ID,
    CONCAT(t.First_Name, ' ', t.Last_Name) AS Tenant_Name,
    t.Email AS Tenant_Email,
    p.Lease_ID,
    pr.Property_Name,
    pr.Street_Address,
    p.Amount,
    p.Late_Fee,
    (p.Amount + COALESCE(p.Late_Fee, 0)) AS Total_Amount,
    p.Payment_Date,
    p.Due_Date,
    p.Payment_Method,
    p.Status,
    p.Notes,
    CASE 
        WHEN p.Status = 'Pending' THEN 'Awaiting Confirmation'
        WHEN p.Status = 'Paid' THEN 'Completed'
        WHEN p.Status = 'Overdue' THEN 'Payment Overdue'
        ELSE p.Status
    END AS Status_Description,
    p.Created_At
FROM Payment p
JOIN Tenant t ON p.Tenant_ID = t.Tenant_ID
JOIN Lease l ON p.Lease_ID = l.Lease_ID
JOIN Property pr ON l.Property_ID = pr.Property_ID;

-- View: Owner Portfolio Summary
CREATE VIEW vw_OwnerPortfolio AS
SELECT 
    o.Owner_ID,
    CONCAT(o.First_Name, ' ', o.Last_Name) AS Owner_Name,
    o.Email,
    o.Phone,
    COUNT(DISTINCT p.Property_ID) AS Total_Properties,
    COUNT(DISTINCT CASE WHEN p.Status = 'Available' THEN p.Property_ID END) AS Available_Properties,
    COUNT(DISTINCT CASE WHEN p.Status = 'Leased' THEN p.Property_ID END) AS Leased_Properties,
    COUNT(DISTINCT l.Lease_ID) AS Active_Leases,
    COALESCE(SUM(p.Current_Value), 0) AS Total_Portfolio_Value,
    COALESCE(SUM(p.Purchase_Price), 0) AS Total_Investment,
    COALESCE(SUM(l.Monthly_Rent), 0) AS Monthly_Rental_Income,
    COUNT(DISTINCT mr.Request_ID) AS Pending_Maintenance_Requests,
    o.Created_At
FROM Owner o
LEFT JOIN Property p ON o.Owner_ID = p.Owner_ID
LEFT JOIN Lease l ON p.Property_ID = l.Property_ID AND l.Status = 'Active'
LEFT JOIN Maintenance_Request mr ON p.Property_ID = mr.Property_ID AND mr.Status IN ('Pending', 'In Progress')
GROUP BY o.Owner_ID, o.First_Name, o.Last_Name, o.Email, o.Phone, o.Created_At;

-- View: Pending Maintenance Requests with Details
CREATE VIEW vw_PendingMaintenanceRequests AS
SELECT 
    mr.Request_ID,
    mr.Property_ID,
    p.Property_Name,
    p.Street_Address,
    p.City,
    p.State,
    mr.Tenant_ID,
    CONCAT(t.First_Name, ' ', t.Last_Name) AS Tenant_Name,
    t.Email AS Tenant_Email,
    t.Phone AS Tenant_Phone,
    mr.Owner_ID,
    CONCAT(o.First_Name, ' ', o.Last_Name) AS Owner_Name,
    mr.Description,
    mr.Priority,
    mr.Status,
    mr.Cost,
    mr.Assigned_To,
    mr.Notes,
    mr.Request_Date,
    mr.Completion_Date,
    DATEDIFF(CURDATE(), mr.Request_Date) AS Days_Since_Request,
    CASE mr.Priority
        WHEN 'High' THEN 1
        WHEN 'Medium' THEN 2
        WHEN 'Low' THEN 3
        ELSE 4
    END AS Priority_Order
FROM Maintenance_Request mr
JOIN Property p ON mr.Property_ID = p.Property_ID
LEFT JOIN Tenant t ON mr.Tenant_ID = t.Tenant_ID
LEFT JOIN Owner o ON mr.Owner_ID = o.Owner_ID
WHERE mr.Status IN ('Pending', 'In Progress')
ORDER BY Priority_Order, mr.Request_Date;

-- View: Property Financial Summary
CREATE VIEW vw_PropertyFinancialSummary AS
SELECT 
    p.Property_ID,
    p.Property_Name,
    p.Street_Address,
    p.City,
    p.State,
    p.Status,
    p.Purchase_Price,
    p.Current_Value,
    CONCAT(o.First_Name, ' ', o.Last_Name) AS Owner_Name,
    -- Income Summary
    COALESCE(SUM(CASE WHEN ft.Transaction_Type = 'Income' THEN ft.Amount ELSE 0 END), 0) AS Total_Income,
    -- Expense Summary
    COALESCE(SUM(CASE WHEN ft.Transaction_Type = 'Expense' THEN ft.Amount ELSE 0 END), 0) AS Total_Expenses,
    -- Net Income
    COALESCE(SUM(CASE WHEN ft.Transaction_Type = 'Income' THEN ft.Amount 
                      WHEN ft.Transaction_Type = 'Expense' THEN -ft.Amount 
                      ELSE 0 END), 0) AS Net_Income,
    -- Current Monthly Rent
    COALESCE((SELECT SUM(Monthly_Rent) 
              FROM Lease 
              WHERE Property_ID = p.Property_ID 
              AND Status = 'Active'), 0) AS Current_Monthly_Rent,
    -- Maintenance Cost
    COALESCE((SELECT SUM(Cost) 
              FROM Maintenance_Request 
              WHERE Property_ID = p.Property_ID 
              AND Status = 'Completed'), 0) AS Total_Maintenance_Cost
FROM Property p
LEFT JOIN Owner o ON p.Owner_ID = o.Owner_ID
LEFT JOIN Financial_Transaction ft ON p.Property_ID = ft.Property_ID
GROUP BY p.Property_ID, p.Property_Name, p.Street_Address, p.City, p.State, 
         p.Status, p.Purchase_Price, p.Current_Value, o.First_Name, o.Last_Name;

-- View: Tenant Properties (Leased and Owned)
CREATE VIEW vw_TenantProperties AS
SELECT DISTINCT
    t.Tenant_ID,
    CONCAT(t.First_Name, ' ', t.Last_Name) AS Tenant_Name,
    p.Property_ID,
    p.Property_Name,
    p.Street_Address,
    p.City,
    p.State,
    p.ZIP_Code,
    p.Property_Type,
    p.Bedrooms,
    p.Bathrooms,
    p.Square_Footage,
    CONCAT(o.First_Name, ' ', o.Last_Name) AS Owner_Name,
    CASE 
        WHEN l.Lease_ID IS NOT NULL THEN 'Leased'
        WHEN po.Ownership_ID IS NOT NULL THEN po.Ownership_Type
        ELSE 'Unknown'
    END AS Relationship_Type,
    l.Monthly_Rent,
    l.Start_Date,
    l.End_Date,
    l.Status AS Lease_Status
FROM Tenant t
LEFT JOIN Lease l ON t.Tenant_ID = l.Tenant_ID AND l.Status = 'Active'
LEFT JOIN PropertyOwnership po ON t.Tenant_ID = po.Tenant_ID AND po.Status = 'Active'
LEFT JOIN Property p ON COALESCE(l.Property_ID, po.Property_ID) = p.Property_ID
LEFT JOIN Owner o ON p.Owner_ID = o.Owner_ID
WHERE p.Property_ID IS NOT NULL;

-- View: Lease Requests with Status
CREATE VIEW vw_LeaseRequests AS
SELECT 
    lr.Request_ID,
    lr.Property_ID,
    p.Property_Name,
    p.Street_Address,
    p.City,
    p.State,
    p.Current_Value,
    lr.Tenant_ID,
    CONCAT(t.First_Name, ' ', t.Last_Name) AS Tenant_Name,
    t.Email AS Tenant_Email,
    t.Phone AS Tenant_Phone,
    p.Owner_ID,
    CONCAT(o.First_Name, ' ', o.Last_Name) AS Owner_Name,
    lr.Requested_Start_Date,
    lr.Requested_End_Date,
    lr.Monthly_Rent,
    lr.Message,
    lr.Status,
    lr.Owner_Response,
    lr.Created_At,
    lr.Updated_At,
    DATEDIFF(CURDATE(), lr.Created_At) AS Days_Pending
FROM LeaseRequest lr
JOIN Property p ON lr.Property_ID = p.Property_ID
JOIN Tenant t ON lr.Tenant_ID = t.Tenant_ID
LEFT JOIN Owner o ON p.Owner_ID = o.Owner_ID;

-- View: Purchase Requests with Status
CREATE VIEW vw_PurchaseRequests AS
SELECT 
    pr.Request_ID,
    pr.Property_ID,
    p.Property_Name,
    p.Street_Address,
    p.City,
    p.State,
    p.Current_Value,
    pr.Tenant_ID,
    CONCAT(t.First_Name, ' ', t.Last_Name) AS Buyer_Name,
    t.Email AS Buyer_Email,
    t.Phone AS Buyer_Phone,
    p.Owner_ID,
    CONCAT(o.First_Name, ' ', o.Last_Name) AS Seller_Name,
    pr.Offer_Price,
    pr.Financing_Type,
    pr.Message,
    pr.Status,
    pr.Owner_Response,
    pr.Created_At,
    pr.Updated_At,
    DATEDIFF(CURDATE(), pr.Created_At) AS Days_Pending,
    (pr.Offer_Price - p.Current_Value) AS Price_Difference
FROM PurchaseRequest pr
JOIN Property p ON pr.Property_ID = p.Property_ID
JOIN Tenant t ON pr.Tenant_ID = t.Tenant_ID
LEFT JOIN Owner o ON p.Owner_ID = o.Owner_ID;

-- Grant SELECT permissions on views (optional, adjust based on your security needs)
-- GRANT SELECT ON vw_PropertyDetails TO 'your_user'@'localhost';
-- GRANT SELECT ON vw_ActiveLeases TO 'your_user'@'localhost';
-- ... etc for other views

COMMIT;

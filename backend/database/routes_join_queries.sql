SELECT Owner_ID FROM Owner WHERE Email = ?;
SELECT pd.*, p.Property_Name
FROM Property_Document pd
JOIN Property p ON pd.Property_ID = p.Property_ID
JOIN Lease l ON p.Property_ID = l.Property_ID
WHERE l.Tenant_ID = ? AND (l.Status = 'Active' OR l.Status IS NULL)
ORDER BY pd.Upload_Date DESC;

SELECT pd.*, p.Property_Name, p.Owner_ID,
       CONCAT(t.First_Name, ' ', t.Last_Name) as Tenant_Name,
       t.Email as Tenant_Email
FROM Property_Document pd
JOIN Property p ON pd.Property_ID = p.Property_ID
LEFT JOIN Lease l ON p.Property_ID = l.Property_ID AND (l.Status = 'Active' OR l.Status IS NULL)
LEFT JOIN Tenant t ON l.Tenant_ID = t.Tenant_ID
WHERE p.Owner_ID = ?
ORDER BY pd.Upload_Date DESC;

SELECT i.*, p.Property_Name, p.Street_Address,
       CONCAT(t.First_Name, ' ', t.Last_Name) as Tenant_Name,
       t.Email as Tenant_Email, t.Phone as Tenant_Phone
FROM property_inspection i
JOIN property p ON i.Property_ID = p.Property_ID
LEFT JOIN tenant t ON i.Tenant_ID = t.Tenant_ID
WHERE p.Owner_ID = ?
ORDER BY 
    CASE i.Status 
        WHEN 'Scheduled' THEN 1 
        WHEN 'Pending' THEN 2 
        WHEN 'Completed' THEN 3 
        ELSE 4 
    END,
    i.Inspection_Date DESC;

SELECT i.*, p.Property_Name, p.Street_Address 
FROM property_inspection i
JOIN property p ON i.Property_ID = p.Property_ID
WHERE i.Tenant_ID = ?
ORDER BY i.Inspection_Date DESC;

SELECT i.*, p.Property_Name, p.Owner_ID,
       CONCAT(t.First_Name, ' ', t.Last_Name) as Tenant_Name 
FROM property_inspection i
JOIN property p ON i.Property_ID = p.Property_ID
LEFT JOIN tenant t ON i.Tenant_ID = t.Tenant_ID
WHERE i.Inspection_ID = ?;

SELECT 
    io.*,
    p.Property_Name,
    p.Street_Address,
    CONCAT(t.First_Name, ' ', t.Last_Name) as Tenant_Name,
    t.Email as Tenant_Email,
    t.Phone as Tenant_Phone
FROM Insurance_Offer io
JOIN Property p ON io.Property_ID = p.Property_ID
JOIN Tenant t ON io.Tenant_ID = t.Tenant_ID
WHERE p.Owner_ID = ?
ORDER BY io.Created_At DESC;

SELECT DISTINCT
    t.Tenant_ID,
    CONCAT(t.First_Name, ' ', t.Last_Name) as Tenant_Name,
    t.Email,
    t.Phone,
    t.Credit_Score,
    t.Monthly_Income,
    p.Property_ID,
    p.Property_Name,
    p.Street_Address,
    l.Monthly_Rent,
    l.Start_Date,
    l.End_Date
FROM Tenant t
JOIN Lease l ON t.Tenant_ID = l.Tenant_ID
JOIN Property p ON l.Property_ID = p.Property_ID
WHERE p.Owner_ID = ?
AND l.Status = 'Active'
AND l.End_Date >= CURDATE()
AND p.Property_ID NOT IN (
    SELECT Property_ID 
    FROM Insurance_Offer 
    WHERE Tenant_ID = t.Tenant_ID 
    AND Status IN ('Pending', 'Accepted')
)
ORDER BY p.Property_Name, Tenant_Name;

SELECT 
    io.*,
    p.Property_Name,
    p.Street_Address,
    p.City,
    p.State,
    CONCAT(o.First_Name, ' ', o.Last_Name) as Owner_Name,
    o.Email as Owner_Email,
    o.Phone as Owner_Phone
FROM Insurance_Offer io
JOIN Property p ON io.Property_ID = p.Property_ID
LEFT JOIN Owner o ON p.Owner_ID = o.Owner_ID
WHERE io.Tenant_ID = ?
ORDER BY io.Created_At DESC;

SELECT 
    ip.*,
    p.Property_Name,
    p.Street_Address,
    CONCAT(o.First_Name, ' ', o.Last_Name) as Owner_Name,
    DATEDIFF(ip.End_Date, CURDATE()) as Days_Until_Expiry
FROM Insurance_Policy ip
JOIN Property p ON ip.Property_ID = p.Property_ID
LEFT JOIN Owner o ON p.Owner_ID = o.Owner_ID
WHERE ip.Status = 'Active'
AND ip.End_Date BETWEEN CURDATE() AND DATE_ADD(CURDATE(), INTERVAL 30 DAY)
ORDER BY Days_Until_Expiry ASC;


-- 11. Get All Leases with Complete Information
-- File: leases.js - Route: GET /
-- Purpose: Fetch all leases with property, tenant, and owner details
SELECT l.*, p.Property_Name, p.Street_Address,
       CONCAT(t.First_Name, ' ', t.Last_Name) as Tenant_Name,
       CONCAT(o.First_Name, ' ', o.Last_Name) as Owner_Name
FROM lease l
JOIN property p ON l.Property_ID = p.Property_ID
JOIN tenant t ON l.Tenant_ID = t.Tenant_ID
LEFT JOIN owner o ON p.Owner_ID = o.Owner_ID;

-- 12. Get Leases for Owner
-- File: leases.js - Route: GET /owner/:ownerId
-- Purpose: Show owner's leases with tenant information
SELECT l.*, p.Property_Name, p.Street_Address,
       CONCAT(t.First_Name, ' ', t.Last_Name) as Tenant_Name,
       t.Email as Tenant_Email, t.Phone as Tenant_Phone
FROM lease l
JOIN property p ON l.Property_ID = p.Property_ID
JOIN tenant t ON l.Tenant_ID = t.Tenant_ID
WHERE p.Owner_ID = ?;

-- 13. Get Leases for Tenant
-- File: leases.js - Route: GET /tenant/:tenantId
-- Purpose: Show tenant's leases with property and owner info
SELECT l.*, p.Property_Name, p.Street_Address, p.City, p.State,
       CONCAT(o.First_Name, ' ', o.Last_Name) as Owner_Name
FROM lease l
JOIN property p ON l.Property_ID = p.Property_ID
LEFT JOIN owner o ON p.Owner_ID = o.Owner_ID
WHERE l.Tenant_ID = ?;

-- 14. Get Lease Requests for Owner
-- File: leases.js - Route: GET /requests/owner/:ownerId
-- Purpose: Show pending lease requests for owner's properties
SELECT lr.*, p.Property_Name, p.Street_Address, p.Current_Value,
       CONCAT(t.First_Name, ' ', t.Last_Name) as Tenant_Name,
       t.Email as Tenant_Email, t.Phone as Tenant_Phone
FROM leaserequest lr
JOIN property p ON lr.Property_ID = p.Property_ID
JOIN tenant t ON lr.Tenant_ID = t.Tenant_ID
WHERE p.Owner_ID = ? AND lr.Status = 'Pending'
ORDER BY lr.Created_At DESC;

-- 15. Get Lease Requests for Tenant
-- File: leases.js - Route: GET /requests/tenant/:tenantId
-- Purpose: Show tenant's lease requests with property info
SELECT lr.*, p.Property_Name, p.Street_Address, p.Current_Value
FROM leaserequest lr
JOIN property p ON lr.Property_ID = p.Property_ID
WHERE lr.Tenant_ID = ?
ORDER BY lr.Created_At DESC;

-- 16. Get Maintenance Requests for Owner
-- File: maintenance.js - Route: GET /owner/:ownerId
-- Purpose: Show all maintenance requests for owner's properties
SELECT m.*, p.Property_Name, p.Street_Address, 
       CONCAT(t.First_Name, ' ', t.Last_Name) as Tenant_Name,
       t.Email as Tenant_Email, t.Phone as Tenant_Phone
FROM maintenance_request m
JOIN property p ON m.Property_ID = p.Property_ID
LEFT JOIN tenant t ON m.Tenant_ID = t.Tenant_ID
WHERE p.Owner_ID = ?
ORDER BY 
    CASE m.Status 
        WHEN 'Pending' THEN 1 
        WHEN 'In Progress' THEN 2 
        ELSE 3 
    END,
    CASE m.Priority 
        WHEN 'High' THEN 1 
        WHEN 'Medium' THEN 2 
        WHEN 'Low' THEN 3 
    END,
    m.Request_Date DESC;

-- 17. Get Maintenance Requests for Tenant
-- File: maintenance.js - Route: GET /tenant/:tenantId
-- Purpose: Show tenant's maintenance requests with property info
SELECT m.*, p.Property_Name, p.Street_Address 
FROM maintenance_request m
JOIN property p ON m.Property_ID = p.Property_ID
WHERE m.Tenant_ID = ?
ORDER BY m.Request_Date DESC;

-- 18. Get All Maintenance Requests (Legacy)
-- File: maintenance.js - Route: GET /
-- Purpose: Fetch all maintenance with property and tenant info
SELECT m.*, p.Property_Name, CONCAT(t.First_Name, ' ', t.Last_Name) as Tenant_Name 
FROM maintenance_request m
JOIN property p ON m.Property_ID = p.Property_ID
LEFT JOIN tenant t ON m.Tenant_ID = t.Tenant_ID;


-- 19. Get Payments for Owner
-- File: payments.js - Route: GET /owner/:ownerId
-- Purpose: Show all payments for owner's properties
SELECT p.*, 
    CONCAT(t.First_Name, ' ', t.Last_Name) as Tenant_Name,
    t.Email as Tenant_Email,
    pr.Property_Name,
    l.Monthly_Rent,
    l.Lease_ID
FROM Payment p
JOIN Lease l ON p.Lease_ID = l.Lease_ID
JOIN Tenant t ON l.Tenant_ID = t.Tenant_ID
JOIN Property pr ON l.Property_ID = pr.Property_ID
WHERE pr.Owner_ID = ?
ORDER BY p.Due_Date DESC;

-- 20. Get Payments for Tenant
-- File: payments.js - Route: GET /tenant/:tenantId
-- Purpose: Show tenant's payment history with property info
SELECT p.*, 
    pr.Property_Name,
    pr.Street_Address,
    l.Monthly_Rent
FROM Payment p
JOIN Lease l ON p.Lease_ID = l.Lease_ID
JOIN Property pr ON l.Property_ID = pr.Property_ID
WHERE l.Tenant_ID = ?
ORDER BY p.Payment_Date DESC;

SELECT p.*, pr.Property_Name, pr.Street_Address, l.Monthly_Rent,
    CONCAT(t.First_Name, ' ', t.Last_Name) as Tenant_Name,
    t.Email as Tenant_Email
FROM Payment p
JOIN Lease l ON p.Lease_ID = l.Lease_ID
JOIN Property pr ON l.Property_ID = pr.Property_ID
JOIN Tenant t ON l.Tenant_ID = t.Tenant_ID
WHERE p.Payment_ID = ?;

SELECT p.*, CONCAT(o.First_Name, ' ', o.Last_Name) as Owner_Name 
FROM property p
LEFT JOIN owner o ON p.Owner_ID = o.Owner_ID;

SELECT 
    p.*, 
    CONCAT(o.First_Name, ' ', o.Last_Name) AS Owner_Name,
    'Leased' AS Relationship_Type
FROM lease l
JOIN property p ON p.Property_ID = l.Property_ID
LEFT JOIN owner o ON p.Owner_ID = o.Owner_ID
WHERE l.Tenant_ID = ? AND (l.Status IS NULL OR l.Status = 'Active');

SELECT p.*, CONCAT(o.First_Name, ' ', o.Last_Name) AS Owner_Name
FROM property p
LEFT JOIN owner o ON p.Owner_ID = o.Owner_ID
WHERE p.Status = 'Available'
ORDER BY p.Created_At DESC;

SELECT p.*, CONCAT(o.First_Name, ' ', o.Last_Name) as Owner_Name,
       o.Email as Owner_Email, o.Phone as Owner_Phone
FROM property p
LEFT JOIN owner o ON p.Owner_ID = o.Owner_ID
WHERE p.Property_ID = ?;

SELECT pr.*, p.Property_Name, p.Street_Address, p.Current_Value,
       CONCAT(t.First_Name, ' ', t.Last_Name) as Tenant_Name,
       t.Email as Tenant_Email, t.Phone as Tenant_Phone
FROM purchaserequest pr
JOIN property p ON pr.Property_ID = p.Property_ID
JOIN tenant t ON pr.Tenant_ID = t.Tenant_ID
WHERE p.Owner_ID = ? AND pr.Status = 'Pending'
ORDER BY pr.Created_At DESC;

-- 27. Get Purchase Requests for Tenant
-- File: properties.js - Route: GET /purchases/tenant/:tenantId
-- Purpose: Show tenant's purchase requests with property info
SELECT pr.*, p.Property_Name, p.Street_Address, p.Current_Value
FROM purchaserequest pr
JOIN property p ON pr.Property_ID = p.Property_ID
WHERE pr.Tenant_ID = ?
ORDER BY pr.Created_At DESC;


-- 28. Get PG Properties with Available Rooms
-- File: rooms.js - Route: GET /pg-properties-available
-- Purpose: Show PG accommodations with owner information
SELECT 
    p.*,
    CONCAT(o.First_Name, ' ', o.Last_Name) AS Owner_Name
FROM property p
LEFT JOIN owner o ON p.Owner_ID = o.Owner_ID
WHERE p.Is_PG = TRUE
AND p.Property_ID IN (
    SELECT DISTINCT Property_ID 
    FROM Room 
    WHERE Status = 'Available'
)
ORDER BY p.Created_At DESC;

-- 29. Get Tenants for Owner with Lease Information
-- File: tenants.js - Route: GET /owner/:ownerId
-- Purpose: Show tenants with active lease count and properties
SELECT 
    t.*, 
    COUNT(DISTINCT CASE WHEN l.Status IS NULL OR l.Status = 'Active' THEN l.Lease_ID END) AS Active_Leases,
    GROUP_CONCAT(DISTINCT CASE WHEN p.Property_ID IS NOT NULL THEN p.Property_Name END SEPARATOR ', ') AS Properties
FROM tenant t
LEFT JOIN lease l ON l.Tenant_ID = t.Tenant_ID
LEFT JOIN property p ON p.Property_ID = l.Property_ID
WHERE (t.Owner_ID = ? OR p.Owner_ID = ?)
GROUP BY t.Tenant_ID
ORDER BY t.Created_At DESC;


-- 30. Get All Transactions with Property Info
-- File: transactions.js - Route: GET /
-- Purpose: List all financial transactions with property details
SELECT ft.*, p.Property_Name, p.Street_Address
FROM Financial_Transaction ft
LEFT JOIN Property p ON ft.Property_ID = p.Property_ID
ORDER BY ft.Transaction_Date DESC;

-- 31. Get Transactions for Tenant
-- File: transactions.js - Route: GET /tenant/:tenantId
-- Purpose: Show transactions for tenant's active leases
SELECT ft.*, p.Property_Name, p.Street_Address
FROM Financial_Transaction ft
JOIN Property p ON ft.Property_ID = p.Property_ID
JOIN Lease l ON ft.Property_ID = l.Property_ID
WHERE l.Tenant_ID = ? AND l.Status = 'Active'
ORDER BY ft.Transaction_Date DESC;

-- 32. Get Transactions for Owner
-- File: transactions.js - Route: GET /owner/:ownerId
-- Purpose: Show all transactions for owner's properties
SELECT ft.*, p.Property_Name, p.Street_Address
FROM Financial_Transaction ft
JOIN Property p ON ft.Property_ID = p.Property_ID
WHERE p.Owner_ID = ?
ORDER BY ft.Transaction_Date DESC;

-- 33. Get Pending Payments with Property Info
-- File: transactions.js - Route: GET /pending/:tenantId
-- Purpose: Show tenant's pending rent payments with details
SELECT p.*, l.Monthly_Rent, prop.Property_Name, prop.Street_Address
FROM Payment p
JOIN Lease l ON p.Lease_ID = l.Lease_ID
JOIN Property prop ON l.Property_ID = prop.Property_ID
WHERE l.Tenant_ID = ? AND p.Status IN ('Pending', 'Late')
ORDER BY p.Due_Date ASC;

-- 34. Get Payment History for Tenant
-- File: transactions.js - Route: GET /history/:tenantId
-- Purpose: Show tenant's complete payment history
SELECT p.*, prop.Property_Name, prop.Street_Address
FROM Payment p
JOIN Lease l ON p.Lease_ID = l.Lease_ID
JOIN Property prop ON l.Property_ID = prop.Property_ID
WHERE l.Tenant_ID = ?
ORDER BY p.Payment_Date DESC;


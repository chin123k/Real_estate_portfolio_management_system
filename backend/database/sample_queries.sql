-- Real Estate Portfolio Management System Sample Queries
USE real_estate_portfolio;

-- 1. Find all properties owned by a specific owner
SELECT p.*
FROM Property p
JOIN Owner o ON p.Owner_ID = o.Owner_ID
WHERE o.First_Name = 'John' AND o.Last_Name = 'Doe';

-- 2. List all active leases with tenant information
SELECT 
    l.Lease_ID, 
    p.Property_ID,
    p.Street_Address,
    p.City,
    p.State,
    t.First_Name AS Tenant_First_Name,
    t.Last_Name AS Tenant_Last_Name,
    t.Phone AS Tenant_Phone,
    l.Start_Date,
    l.End_Date,
    l.Monthly_Rent,
    DATEDIFF(l.End_Date, CURDATE()) AS Days_Until_Expiration
FROM Lease l
JOIN Property p ON l.Property_ID = p.Property_ID
JOIN Tenant t ON l.Tenant_ID = t.Tenant_ID
WHERE l.Status = 'Active'
ORDER BY Days_Until_Expiration;

-- 3. Find properties with upcoming lease expirations (within 30 days)
SELECT 
    p.Property_ID,
    p.Street_Address,
    p.City,
    p.State,
    l.Lease_ID,
    l.End_Date,
    t.First_Name AS Tenant_First_Name,
    t.Last_Name AS Tenant_Last_Name,
    DATEDIFF(l.End_Date, CURDATE()) AS Days_Until_Expiration
FROM Property p
JOIN Lease l ON p.Property_ID = l.Property_ID
JOIN Tenant t ON l.Tenant_ID = t.Tenant_ID
WHERE l.Status = 'Active'
AND DATEDIFF(l.End_Date, CURDATE()) BETWEEN 0 AND 30
ORDER BY Days_Until_Expiration;

-- 4. Calculate total rental income by property for current year
SELECT 
    p.Property_ID,
    p.Street_Address,
    p.City,
    p.State,
    SUM(ft.Amount) AS Total_Rental_Income
FROM Property p
JOIN Financial_Transaction ft ON p.Property_ID = ft.Property_ID
WHERE ft.Transaction_Type = 'Income'
AND ft.Category = 'Rent'
AND YEAR(ft.Transaction_Date) = YEAR(CURRENT_DATE)
GROUP BY p.Property_ID, p.Street_Address, p.City, p.State
ORDER BY Total_Rental_Income DESC;

-- 5. Find properties with high maintenance costs (more than 10% of rental income)
SELECT 
    p.Property_ID,
    p.Street_Address,
    p.City,
    p.State,
    SUM(CASE WHEN ft.Transaction_Type = 'Income' THEN ft.Amount ELSE 0 END) AS Total_Income,
    SUM(CASE WHEN ft.Transaction_Type = 'Expense' AND ft.Category = 'Maintenance' THEN ft.Amount ELSE 0 END) AS Maintenance_Cost,
    (SUM(CASE WHEN ft.Transaction_Type = 'Expense' AND ft.Category = 'Maintenance' THEN ft.Amount ELSE 0 END) / 
     NULLIF(SUM(CASE WHEN ft.Transaction_Type = 'Income' THEN ft.Amount ELSE 0 END), 0)) * 100 AS Maintenance_Percentage
FROM Property p
JOIN Financial_Transaction ft ON p.Property_ID = ft.Property_ID
WHERE YEAR(ft.Transaction_Date) = YEAR(CURRENT_DATE)
GROUP BY p.Property_ID, p.Street_Address, p.City, p.State
HAVING Maintenance_Percentage > 10
ORDER BY Maintenance_Percentage DESC;

-- 6. Find tenants with late rent payments
SELECT 
    t.Tenant_ID,
    t.First_Name,
    t.Last_Name,
    t.Email,
    t.Phone,
    COUNT(p.Payment_ID) AS Late_Payment_Count,
    SUM(p.Late_Fee) AS Total_Late_Fees
FROM Tenant t
JOIN Lease l ON t.Tenant_ID = l.Tenant_ID
JOIN Payment p ON l.Lease_ID = p.Lease_ID
WHERE p.Status = 'Late' OR p.Late_Fee > 0
GROUP BY t.Tenant_ID, t.First_Name, t.Last_Name, t.Email, t.Phone
ORDER BY Late_Payment_Count DESC;

-- 7. Calculate property return on investment (ROI)
SELECT 
    p.Property_ID,
    p.Street_Address,
    p.City,
    p.State,
    p.Purchase_Price,
    p.Current_Value,
    ((p.Current_Value - p.Purchase_Price) / NULLIF(p.Purchase_Price, 0)) * 100 AS ROI_Percentage,
    SUM(CASE WHEN ft.Transaction_Type = 'Income' THEN ft.Amount ELSE 0 END) AS Total_Income,
    SUM(CASE WHEN ft.Transaction_Type = 'Expense' THEN ft.Amount ELSE 0 END) AS Total_Expenses
FROM Property p
LEFT JOIN Financial_Transaction ft ON p.Property_ID = ft.Property_ID
WHERE YEAR(ft.Transaction_Date) = YEAR(CURRENT_DATE)
GROUP BY p.Property_ID, p.Street_Address, p.City, p.State, p.Purchase_Price, p.Current_Value
ORDER BY ROI_Percentage DESC;

-- 8. Find available properties by listing type
SELECT 
    p.Property_ID,
    p.Property_Name,
    p.Street_Address,
    p.City,
    p.State,
    p.Property_Type,
    p.Listing_Type,
    p.Current_Value,
    p.Bedrooms,
    p.Bathrooms,
    CONCAT(o.First_Name, ' ', o.Last_Name) AS Owner_Name
FROM Property p
LEFT JOIN Owner o ON p.Owner_ID = o.Owner_ID
WHERE p.Status = 'Available'
ORDER BY p.Listing_Type, p.Current_Value;

-- 9. List all maintenance requests by status and priority
SELECT 
    mr.Request_ID,
    p.Property_ID,
    p.Street_Address,
    t.First_Name AS Tenant_First_Name,
    t.Last_Name AS Tenant_Last_Name,
    mr.Description,
    mr.Priority,
    mr.Request_Date,
    mr.Status,
    mr.Cost,
    mr.Assigned_To
FROM Maintenance_Request mr
JOIN Property p ON mr.Property_ID = p.Property_ID
LEFT JOIN Tenant t ON mr.Tenant_ID = t.Tenant_ID
ORDER BY 
    CASE 
        WHEN mr.Status = 'Pending' THEN 1
        WHEN mr.Status = 'In Progress' THEN 2
        WHEN mr.Status = 'Completed' THEN 3
        ELSE 4
    END,
    CASE 
        WHEN mr.Priority = 'High' THEN 1
        WHEN mr.Priority = 'Medium' THEN 2
        WHEN mr.Priority = 'Low' THEN 3
        ELSE 4
    END,
    mr.Request_Date DESC;

-- 10. Find top-performing properties by net income
SELECT 
    p.Property_ID,
    p.Street_Address,
    p.City,
    p.State,
    p.Property_Type,
    SUM(CASE WHEN ft.Transaction_Type = 'Income' THEN ft.Amount ELSE 0 END) AS Total_Income,
    SUM(CASE WHEN ft.Transaction_Type = 'Expense' THEN ft.Amount ELSE 0 END) AS Total_Expenses,
    SUM(CASE WHEN ft.Transaction_Type = 'Income' THEN ft.Amount ELSE -ft.Amount END) AS Net_Income,
    (SUM(CASE WHEN ft.Transaction_Type = 'Income' THEN ft.Amount ELSE -ft.Amount END) / NULLIF(p.Current_Value, 0)) * 100 AS Cap_Rate
FROM Property p
LEFT JOIN Financial_Transaction ft ON p.Property_ID = ft.Property_ID
WHERE YEAR(ft.Transaction_Date) = YEAR(CURRENT_DATE)
GROUP BY p.Property_ID, p.Street_Address, p.City, p.State, p.Property_Type, p.Current_Value
ORDER BY Net_Income DESC
LIMIT 10;

-- 11. Find pending payments for all tenants
SELECT 
    p.Payment_ID,
    t.First_Name AS Tenant_First_Name,
    t.Last_Name AS Tenant_Last_Name,
    t.Email,
    pr.Property_Name,
    pr.Street_Address,
    p.Amount,
    p.Due_Date,
    DATEDIFF(CURDATE(), p.Due_Date) AS Days_Overdue,
    p.Status
FROM Payment p
JOIN Lease l ON p.Lease_ID = l.Lease_ID
JOIN Tenant t ON p.Tenant_ID = t.Tenant_ID
JOIN Property pr ON l.Property_ID = pr.Property_ID
WHERE p.Status = 'Pending'
ORDER BY p.Due_Date ASC;

-- 12. Find properties with expiring leases and no renewal yet
SELECT 
    p.Property_ID,
    p.Street_Address,
    p.City,
    p.State,
    l.Lease_ID,
    l.End_Date,
    t.First_Name AS Tenant_First_Name,
    t.Last_Name AS Tenant_Last_Name,
    t.Phone,
    DATEDIFF(l.End_Date, CURDATE()) AS Days_Until_Expiration
FROM Property p
JOIN Lease l ON p.Property_ID = l.Property_ID
JOIN Tenant t ON l.Tenant_ID = t.Tenant_ID
WHERE l.Status = 'Active'
AND l.End_Date BETWEEN CURDATE() AND DATE_ADD(CURDATE(), INTERVAL 60 DAY)
AND NOT EXISTS (
    SELECT 1 FROM Lease l2
    WHERE l2.Property_ID = p.Property_ID
    AND l2.Tenant_ID = t.Tenant_ID
    AND l2.Start_Date > l.End_Date
)
ORDER BY l.End_Date;

-- 13. Calculate average days to resolve maintenance requests by priority
SELECT 
    Priority,
    COUNT(*) AS Request_Count,
    AVG(DATEDIFF(Completion_Date, Request_Date)) AS Avg_Days_To_Resolve
FROM Maintenance_Request
WHERE Status = 'Completed' AND Completion_Date IS NOT NULL
GROUP BY Priority
ORDER BY 
    CASE 
        WHEN Priority = 'High' THEN 1
        WHEN Priority = 'Medium' THEN 2
        WHEN Priority = 'Low' THEN 3
        ELSE 4
    END;

-- 14. Find PG properties with available rooms
SELECT 
    p.Property_ID,
    p.Property_Name,
    p.Street_Address,
    p.City,
    p.State,
    COUNT(r.Room_ID) AS Total_Rooms,
    SUM(CASE WHEN r.Status = 'Available' THEN 1 ELSE 0 END) AS Available_Rooms,
    MIN(r.Rent_Per_Month) AS Min_Rent,
    MAX(r.Rent_Per_Month) AS Max_Rent
FROM Property p
JOIN Room r ON p.Property_ID = r.Property_ID
WHERE p.Is_PG = TRUE
GROUP BY p.Property_ID, p.Property_Name, p.Street_Address, p.City, p.State
HAVING Available_Rooms > 0
ORDER BY p.City, p.Property_Name;

-- 15. Generate monthly financial summary for all properties
SELECT 
    DATE_FORMAT(ft.Transaction_Date, '%Y-%m') AS Month,
    SUM(CASE WHEN ft.Transaction_Type = 'Income' THEN ft.Amount ELSE 0 END) AS Total_Income,
    SUM(CASE WHEN ft.Transaction_Type = 'Expense' THEN ft.Amount ELSE 0 END) AS Total_Expenses,
    SUM(CASE WHEN ft.Transaction_Type = 'Income' THEN ft.Amount ELSE -ft.Amount END) AS Net_Cash_Flow
FROM Financial_Transaction ft
WHERE ft.Transaction_Date BETWEEN DATE_SUB(CURRENT_DATE, INTERVAL 12 MONTH) AND CURRENT_DATE
GROUP BY Month
ORDER BY Month DESC;

-- 16. Find all lease requests pending owner approval
SELECT 
    lr.Request_ID,
    p.Property_Name,
    p.Street_Address,
    t.First_Name AS Tenant_First_Name,
    t.Last_Name AS Tenant_Last_Name,
    t.Email AS Tenant_Email,
    lr.Requested_Start_Date,
    lr.Requested_End_Date,
    lr.Monthly_Rent,
    lr.Message,
    lr.Status,
    lr.Created_At
FROM LeaseRequest lr
JOIN Property p ON lr.Property_ID = p.Property_ID
JOIN Tenant t ON lr.Tenant_ID = t.Tenant_ID
WHERE lr.Status = 'Pending'
ORDER BY lr.Created_At DESC;

-- 17. Find all purchase requests pending owner approval
SELECT 
    pr.Request_ID,
    p.Property_Name,
    p.Street_Address,
    p.Current_Value,
    t.First_Name AS Buyer_First_Name,
    t.Last_Name AS Buyer_Last_Name,
    t.Email AS Buyer_Email,
    pr.Offer_Price,
    pr.Financing_Type,
    pr.Message,
    pr.Status,
    pr.Created_At
FROM PurchaseRequest pr
JOIN Property p ON pr.Property_ID = p.Property_ID
JOIN Tenant t ON pr.Tenant_ID = t.Tenant_ID
WHERE pr.Status = 'Pending'
ORDER BY pr.Created_At DESC;

-- 18. Find owner properties with pending notifications
SELECT 
    o.Owner_ID,
    CONCAT(o.First_Name, ' ', o.Last_Name) AS Owner_Name,
    COUNT(n.Notification_ID) AS Unread_Notifications,
    SUM(CASE WHEN n.Type = 'maintenance' THEN 1 ELSE 0 END) AS Maintenance_Requests,
    SUM(CASE WHEN n.Type = 'lease' THEN 1 ELSE 0 END) AS Lease_Requests,
    SUM(CASE WHEN n.Type = 'purchase' THEN 1 ELSE 0 END) AS Purchase_Requests,
    SUM(CASE WHEN n.Type = 'payment' THEN 1 ELSE 0 END) AS Payment_Notifications
FROM Owner o
LEFT JOIN Notification n ON o.Owner_ID = n.User_ID AND n.User_Type = 'Owner' AND n.Is_Read = FALSE
GROUP BY o.Owner_ID, o.First_Name, o.Last_Name
HAVING Unread_Notifications > 0
ORDER BY Unread_Notifications DESC;

-- 19. Find tenant payment history with property details
SELECT 
    t.Tenant_ID,
    CONCAT(t.First_Name, ' ', t.Last_Name) AS Tenant_Name,
    p.Property_Name,
    p.Street_Address,
    pay.Payment_ID,
    pay.Amount,
    pay.Due_Date,
    pay.Payment_Date,
    pay.Status,
    pay.Late_Fee,
    pay.Payment_Method
FROM Tenant t
JOIN Lease l ON t.Tenant_ID = l.Tenant_ID
JOIN Property p ON l.Property_ID = p.Property_ID
JOIN Payment pay ON l.Lease_ID = pay.Lease_ID
WHERE t.Tenant_ID = 1  -- Replace with specific tenant ID
ORDER BY pay.Due_Date DESC;

-- 20. Property ownership history
SELECT 
    p.Property_ID,
    p.Property_Name,
    p.Street_Address,
    po.Ownership_Type,
    CASE 
        WHEN po.Owner_ID IS NOT NULL THEN CONCAT(o.First_Name, ' ', o.Last_Name)
        WHEN po.Tenant_ID IS NOT NULL THEN CONCAT(t.First_Name, ' ', t.Last_Name)
        ELSE 'Unknown'
    END AS Owner_Name,
    po.Purchase_Price,
    po.Start_Date,
    po.End_Date,
    po.Status
FROM PropertyOwnership po
JOIN Property p ON po.Property_ID = p.Property_ID
LEFT JOIN Owner o ON po.Owner_ID = o.Owner_ID
LEFT JOIN Tenant t ON po.Tenant_ID = t.Tenant_ID
ORDER BY p.Property_ID, po.Start_Date DESC;
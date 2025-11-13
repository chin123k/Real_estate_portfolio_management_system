USE real_estate_portfolio;
SELECT p.*,
    (SELECT COUNT(*) FROM Room WHERE Property_ID = p.Property_ID) AS Total_Rooms,
    (SELECT COUNT(*) FROM Room WHERE Property_ID = p.Property_ID AND Status = 'Available') AS Available_Rooms,
    (SELECT MIN(Rent_Per_Month) FROM Room WHERE Property_ID = p.Property_ID) AS Min_Room_Rent,
    (SELECT MAX(Rent_Per_Month) FROM Room WHERE Property_ID = p.Property_ID) AS Max_Room_Rent
FROM Property p
WHERE p.Owner_ID = 1
ORDER BY p.Created_At DESC;

SELECT 
    io.*,
    p.Property_Name,
    p.Street_Address,
    CONCAT(t.First_Name, ' ', t.Last_Name) as Tenant_Name,
    t.Email as Tenant_Email,
    t.Phone as Tenant_Phone,
    (SELECT COALESCE(SUM(Coverage_Amount), 0) 
     FROM Insurance_Offer 
     WHERE Tenant_ID = io.Tenant_ID AND Status = 'Accepted') AS Tenant_Total_Coverage,
    (SELECT COUNT(*) 
     FROM Insurance_Offer 
     WHERE Tenant_ID = io.Tenant_ID AND Status = 'Accepted') AS Tenant_Active_Policies
FROM Insurance_Offer io
JOIN Property p ON io.Property_ID = p.Property_ID
JOIN Tenant t ON io.Tenant_ID = t.Tenant_ID
WHERE p.Owner_ID = 1
ORDER BY io.Created_At DESC;

SELECT 
    ip.*,
    p.Property_Name,
    p.Street_Address,
    DATEDIFF(ip.End_Date, CURDATE()) as Days_Until_Expiry,
    (SELECT COALESCE(SUM(Amount), 0) 
     FROM Financial_Transaction 
     WHERE Property_ID = ip.Property_ID 
     AND Category = 'Insurance' 
     AND Transaction_Date BETWEEN ip.Start_Date AND ip.End_Date) AS Total_Premium_Paid
FROM Insurance_Policy ip
JOIN Property p ON ip.Property_ID = p.Property_ID
WHERE ip.Property_ID = 1
ORDER BY ip.End_Date DESC;

SELECT p.*
FROM Property p
WHERE p.Owner_ID = 1
   OR EXISTS (
      SELECT 1 FROM PropertyOwnership po 
      WHERE po.Property_ID = p.Property_ID 
        AND po.Owner_ID = 1 
        AND (po.Status IS NULL OR po.Status = 'Active')
   )
ORDER BY p.Created_At DESC;

SELECT DISTINCT
    t.Tenant_ID,
    CONCAT(t.First_Name, ' ', t.Last_Name) as Tenant_Name,
    t.Email,
    t.Phone,
    p.Property_ID,
    p.Property_Name,
    l.Monthly_Rent,
    (SELECT COUNT(*) 
     FROM Insurance_Offer 
     WHERE Tenant_ID = t.Tenant_ID 
     AND Property_ID = p.Property_ID 
     AND Status = 'Pending') AS Has_Pending_Offer
FROM Tenant t
JOIN Lease l ON t.Tenant_ID = l.Tenant_ID
JOIN Property p ON l.Property_ID = p.Property_ID
WHERE p.Owner_ID = 1
AND l.Status = 'Active'
AND l.End_Date >= CURDATE()
AND p.Property_ID NOT IN (
    SELECT Property_ID 
    FROM Insurance_Offer 
    WHERE Tenant_ID = t.Tenant_ID 
    AND Status IN ('Pending', 'Accepted')
)
ORDER BY p.Property_Name;
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
AND ip.Property_ID NOT IN (
    SELECT DISTINCT Property_ID 
    FROM Insurance_Offer 
    WHERE Start_Date > ip.End_Date 
    AND Status = 'Accepted'
)
ORDER BY Days_Until_Expiry ASC;
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
    -- Nested aggregates for income
    COALESCE(SUM(CASE WHEN ft.Transaction_Type = 'Income' THEN ft.Amount ELSE 0 END), 0) AS Total_Income,
    -- Nested aggregates for expenses
    COALESCE(SUM(CASE WHEN ft.Transaction_Type = 'Expense' THEN ft.Amount ELSE 0 END), 0) AS Total_Expenses,
    -- Nested calculation for net income
    COALESCE(SUM(CASE WHEN ft.Transaction_Type = 'Income' THEN ft.Amount 
                      WHEN ft.Transaction_Type = 'Expense' THEN -ft.Amount 
                      ELSE 0 END), 0) AS Net_Income,
    -- Nested subquery for current monthly rent
    COALESCE((SELECT SUM(Monthly_Rent) 
              FROM Lease 
              WHERE Property_ID = p.Property_ID 
              AND Status = 'Active'), 0) AS Current_Monthly_Rent,
    -- Nested subquery for total maintenance cost
    COALESCE((SELECT SUM(Cost) 
              FROM Maintenance_Request 
              WHERE Property_ID = p.Property_ID 
              AND Status = 'Completed'), 0) AS Total_Maintenance_Cost
FROM Property p
LEFT JOIN Owner o ON p.Owner_ID = o.Owner_ID
LEFT JOIN Financial_Transaction ft ON p.Property_ID = ft.Property_ID
GROUP BY p.Property_ID, p.Property_Name, p.Street_Address, p.City, p.State, 
         p.Status, p.Purchase_Price, p.Current_Value, o.First_Name, o.Last_Name;

-- Query 8: Owner Portfolio with nested statistics
-- Used in: views.sql - vw_OwnerPortfolio
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
SELECT 
    t.*, 
    COUNT(DISTINCT CASE WHEN l.Status IS NULL OR l.Status = 'Active' THEN l.Lease_ID END) AS Active_Leases,
    GROUP_CONCAT(DISTINCT CASE WHEN p.Property_ID IS NOT NULL THEN p.Property_Name END SEPARATOR ', ') AS Properties
FROM Tenant t
LEFT JOIN Lease l ON l.Tenant_ID = t.Tenant_ID
LEFT JOIN Property p ON p.Property_ID = l.Property_ID
WHERE (t.Owner_ID = 1 OR p.Owner_ID = 1)
GROUP BY t.Tenant_ID
ORDER BY t.Created_At DESC;
SELECT DISTINCT
    p.*, 
    CONCAT(o.First_Name, ' ', o.Last_Name) AS Owner_Name,
    'Leased' AS Relationship_Type
FROM Lease l
JOIN Property p ON p.Property_ID = l.Property_ID
LEFT JOIN Owner o ON p.Owner_ID = o.Owner_ID
WHERE l.Tenant_ID = 1 AND (l.Status IS NULL OR l.Status = 'Active')

UNION

SELECT DISTINCT
    p.*, 
    CONCAT(o.First_Name, ' ', o.Last_Name) AS Owner_Name,
    COALESCE(po.Ownership_Type, 'Owned') AS Relationship_Type
FROM PropertyOwnership po
JOIN Property p ON p.Property_ID = po.Property_ID
LEFT JOIN Owner o ON p.Owner_ID = o.Owner_ID
WHERE po.Tenant_ID = 1 AND (po.Status IS NULL OR po.Status = 'Active')
ORDER BY Created_At DESC;
SELECT 
    'Income' AS Type,
    COALESCE(SUM(Amount), 0) AS Total_Amount,
    COUNT(*) AS Transaction_Count
FROM Financial_Transaction
WHERE Property_ID = 1
AND Transaction_Type = 'Income'
AND Transaction_Date BETWEEN '2024-01-01' AND '2024-12-31';

-- Query 12: Get tenant properties with nested relationship checks
-- Used in: procedures.sql - GetTenantProperties
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
WHERE l.Tenant_ID = 1 
AND l.Status = 'Active'

UNION

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
WHERE po.Tenant_ID = 1 
AND po.Status = 'Active'
ORDER BY Start_Date DESC;
INSERT INTO Notification (User_Type, User_ID, Title, Message, Type, Related_ID)
SELECT 'Owner', p.Owner_ID, 'New Payment Submitted', 
       CONCAT('Payment of $', 1200.00, ' submitted by tenant'),
       'payment', 123
FROM Lease l
JOIN Property p ON l.Property_ID = p.Property_ID
WHERE l.Lease_ID = 1 AND p.Owner_ID IS NOT NULL
LIMIT 1;
INSERT INTO Notification (User_Type, User_ID, Title, Message, Type, Related_ID)
SELECT 'Tenant', l.Tenant_ID, 'Payment Confirmed', 
       'Your payment has been confirmed and processed',
       'payment', 123
FROM Lease l 
WHERE l.Lease_ID = 1;
SELECT 
    payment_summary.*,
    t.First_Name,
    t.Last_Name,
    t.Email
FROM (
    SELECT 
        p.Lease_ID,
        l.Tenant_ID,
        COUNT(*) as Total_Payments,
        SUM(p.Amount) as Total_Amount,
        SUM(CASE WHEN p.Status = 'Paid' THEN p.Amount ELSE 0 END) as Paid_Amount,
        SUM(CASE WHEN p.Status = 'Pending' THEN p.Amount ELSE 0 END) as Pending_Amount
    FROM Payment p
    JOIN Lease l ON p.Lease_ID = l.Lease_ID
    GROUP BY p.Lease_ID, l.Tenant_ID
) AS payment_summary
JOIN Tenant t ON payment_summary.Tenant_ID = t.Tenant_ID;
SELECT 
    property_metrics.*,
    p.Property_Name,
    p.Street_Address
FROM (
    SELECT 
        Property_ID,
        COUNT(*) as Total_Leases,
        AVG(Monthly_Rent) as Avg_Rent,
        MAX(Monthly_Rent) as Max_Rent,
        MIN(Monthly_Rent) as Min_Rent,
        SUM(Security_Deposit) as Total_Deposits
    FROM Lease
    WHERE Status = 'Active'
    GROUP BY Property_ID
) AS property_metrics
JOIN Property p ON property_metrics.Property_ID = p.Property_ID;
SELECT 
    lr.*,
    p.Property_Name,
    t.Tenant_ID,
    CONCAT(t.First_Name, ' ', t.Last_Name) as Tenant_Name,
    t.Credit_Score,
    t.Monthly_Income,
    CASE 
        WHEN t.Credit_Score >= 700 AND t.Monthly_Income >= (lr.Monthly_Rent * 3) THEN 'High'
        WHEN t.Credit_Score >= 650 AND t.Monthly_Income >= (lr.Monthly_Rent * 2.5) THEN 'Medium'
        ELSE 'Low'
    END AS Approval_Likelihood,
    -- Nested query: Check tenant's payment history
    (SELECT COUNT(*) 
     FROM Payment pay
     JOIN Lease l ON pay.Lease_ID = l.Lease_ID
     WHERE l.Tenant_ID = t.Tenant_ID 
     AND pay.Status = 'Paid') AS Successful_Payments,
    -- Nested query: Check for late payments
    (SELECT COUNT(*) 
     FROM Payment pay
     JOIN Lease l ON pay.Lease_ID = l.Lease_ID
     WHERE l.Tenant_ID = t.Tenant_ID 
     AND pay.Late_Fee > 0) AS Late_Payment_Count
FROM LeaseRequest lr
JOIN Property p ON lr.Property_ID = p.Property_ID
JOIN Tenant t ON lr.Tenant_ID = t.Tenant_ID
WHERE lr.Status = 'Pending';

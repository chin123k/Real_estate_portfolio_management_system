
-- Used in: views.sql - vw_OwnerPortfolioSELECT 
    o.Owner_ID,
    CONCAT(o.First_Name, ' ', o.Last_Name) AS Owner_Name,
    COUNT(DISTINCT p.Property_ID) AS Total_Properties,
    COUNT(DISTINCT CASE WHEN p.Status = 'Available' THEN p.Property_ID END) AS Available_Properties,
    COUNT(DISTINCT CASE WHEN p.Status = 'Leased' THEN p.Property_ID END) AS Leased_Properties,
    COUNT(DISTINCT l.Lease_ID) AS Active_Leases,
    COUNT(DISTINCT mr.Request_ID) AS Pending_Maintenance_Requests
FROM Owner o
LEFT JOIN Property p ON o.Owner_ID = p.Owner_ID
LEFT JOIN Lease l ON p.Property_ID = l.Property_ID AND l.Status = 'Active'
LEFT JOIN Maintenance_Request mr ON p.Property_ID = mr.Property_ID AND mr.Status IN ('Pending', 'In Progress')
GROUP BY o.Owner_ID, o.First_Name, o.Last_Name;

-- Query 2: Count rooms by property (nested COUNT)
-- Used in: properties.js - GET /owner/:ownerId
SELECT 
    p.Property_ID,
    p.Property_Name,
    (SELECT COUNT(*) FROM Room WHERE Property_ID = p.Property_ID) AS Total_Rooms,
    (SELECT COUNT(*) FROM Room WHERE Property_ID = p.Property_ID AND Status = 'Available') AS Available_Rooms,
    (SELECT COUNT(*) FROM Room WHERE Property_ID = p.Property_ID AND Status = 'Occupied') AS Occupied_Rooms
FROM Property p
WHERE p.Is_PG = TRUE;

-- Query 3: Count active leases per tenant
-- Used in: tenants.js - GET /owner/:ownerId
SELECT 
    t.Tenant_ID,
    CONCAT(t.First_Name, ' ', t.Last_Name) AS Tenant_Name,
    t.Email,
    COUNT(DISTINCT CASE WHEN l.Status IS NULL OR l.Status = 'Active' THEN l.Lease_ID END) AS Active_Leases
FROM Tenant t
LEFT JOIN Lease l ON l.Tenant_ID = t.Tenant_ID
GROUP BY t.Tenant_ID, t.First_Name, t.Last_Name, t.Email;

-- Query 4: Count insurance offers by status
-- Used in: insurance.js - GET /owner/:ownerId/stats
SELECT 
    COUNT(*) as total_offers,
    SUM(CASE WHEN io.Status = 'Pending' THEN 1 ELSE 0 END) as pending_offers,
    SUM(CASE WHEN io.Status = 'Accepted' THEN 1 ELSE 0 END) as accepted_offers,
    SUM(CASE WHEN io.Status = 'Rejected' THEN 1 ELSE 0 END) as rejected_offers,
    COUNT(DISTINCT io.Tenant_ID) as tenants_with_insurance
FROM Insurance_Offer io
JOIN Property p ON io.Property_ID = p.Property_ID
WHERE p.Owner_ID = 1;

-- ============================================================================
-- CATEGORY 2: SUM AGGREGATES (Financial Totals and Summations)
-- ============================================================================

-- Query 5: Sum payment amounts by status
-- Used in: payments.js - GET /owner/:ownerId/stats
SELECT 
    COUNT(*) as total_payments,
    SUM(CASE WHEN p.Status = 'Paid' THEN p.Amount ELSE 0 END) as total_received,
    SUM(CASE WHEN p.Status = 'Pending' THEN p.Amount ELSE 0 END) as total_pending,
    SUM(CASE WHEN p.Status = 'Overdue' THEN p.Amount ELSE 0 END) as total_overdue,
    SUM(p.Late_Fee) as total_late_fees
FROM Payment p
JOIN Lease l ON p.Lease_ID = l.Lease_ID
JOIN Property pr ON l.Property_ID = pr.Property_ID
WHERE pr.Owner_ID = 1;

-- Query 6: Sum property values by owner
-- Used in: views.sql - vw_OwnerPortfolio
SELECT 
    o.Owner_ID,
    CONCAT(o.First_Name, ' ', o.Last_Name) AS Owner_Name,
    COALESCE(SUM(p.Current_Value), 0) AS Total_Portfolio_Value,
    COALESCE(SUM(p.Purchase_Price), 0) AS Total_Investment,
    COALESCE(SUM(l.Monthly_Rent), 0) AS Monthly_Rental_Income
FROM Owner o
LEFT JOIN Property p ON o.Owner_ID = p.Owner_ID
LEFT JOIN Lease l ON p.Property_ID = l.Property_ID AND l.Status = 'Active'
GROUP BY o.Owner_ID, o.First_Name, o.Last_Name;

-- Query 7: Sum insurance premiums and coverage
-- Used in: insurance.js - GET /owner/:ownerId/stats
SELECT 
    COALESCE(SUM(CASE WHEN io.Status = 'Accepted' THEN io.Premium_Amount ELSE 0 END), 0) as total_premium_revenue,
    COALESCE(SUM(CASE WHEN io.Status = 'Accepted' THEN io.Coverage_Amount ELSE 0 END), 0) as total_coverage_provided
FROM Insurance_Offer io
JOIN Property p ON io.Property_ID = p.Property_ID
WHERE p.Owner_ID = 1;

-- Query 8: Sum financial transactions by type
-- Used in: views.sql - vw_PropertyFinancialSummary
SELECT 
    p.Property_ID,
    p.Property_Name,
    COALESCE(SUM(CASE WHEN ft.Transaction_Type = 'Income' THEN ft.Amount ELSE 0 END), 0) AS Total_Income,
    COALESCE(SUM(CASE WHEN ft.Transaction_Type = 'Expense' THEN ft.Amount ELSE 0 END), 0) AS Total_Expenses,
    COALESCE(SUM(CASE WHEN ft.Transaction_Type = 'Income' THEN ft.Amount 
                      WHEN ft.Transaction_Type = 'Expense' THEN -ft.Amount 
                      ELSE 0 END), 0) AS Net_Income
FROM Property p
LEFT JOIN Financial_Transaction ft ON p.Property_ID = ft.Property_ID
GROUP BY p.Property_ID, p.Property_Name;

-- Query 9: Sum maintenance costs by property
-- Used in: Property maintenance cost tracking
SELECT 
    p.Property_ID,
    p.Property_Name,
    COALESCE(SUM(mr.Cost), 0) AS Total_Maintenance_Cost,
    COUNT(mr.Request_ID) AS Total_Requests,
    COUNT(CASE WHEN mr.Status = 'Completed' THEN 1 END) AS Completed_Requests
FROM Property p
LEFT JOIN Maintenance_Request mr ON p.Property_ID = mr.Property_ID
GROUP BY p.Property_ID, p.Property_Name;

-- Query 10: Sum tenant insurance coverage
-- Used in: insurance.js - GET /owner/:ownerId/offers (nested)
SELECT 
    t.Tenant_ID,
    CONCAT(t.First_Name, ' ', t.Last_Name) as Tenant_Name,
    COALESCE(SUM(io.Coverage_Amount), 0) AS Total_Coverage,
    COALESCE(SUM(io.Premium_Amount), 0) AS Total_Premium
FROM Tenant t
LEFT JOIN Insurance_Offer io ON t.Tenant_ID = io.Tenant_ID AND io.Status = 'Accepted'
GROUP BY t.Tenant_ID, t.First_Name, t.Last_Name;

SELECT 
    COALESCE(AVG(CASE WHEN io.Status = 'Accepted' THEN io.Premium_Amount ELSE NULL END), 0) as avg_premium,
    COALESCE(AVG(CASE WHEN io.Status = 'Accepted' THEN io.Coverage_Amount ELSE NULL END), 0) as avg_coverage
FROM Insurance_Offer io
JOIN Property p ON io.Property_ID = p.Property_ID
WHERE p.Owner_ID = 1;

-- Query 12: Average rent by property type
SELECT 
    p.Property_Type,
    COUNT(*) AS Property_Count,
    AVG(l.Monthly_Rent) AS Avg_Monthly_Rent,
    AVG(p.Current_Value) AS Avg_Property_Value
FROM Property p
LEFT JOIN Lease l ON p.Property_ID = l.Property_ID AND l.Status = 'Active'
GROUP BY p.Property_Type;

-- Query 13: Average payment amount per tenant
SELECT 
    t.Tenant_ID,
    CONCAT(t.First_Name, ' ', t.Last_Name) AS Tenant_Name,
    COUNT(pay.Payment_ID) AS Total_Payments,
    AVG(pay.Amount) AS Avg_Payment_Amount,
    AVG(pay.Late_Fee) AS Avg_Late_Fee
FROM Tenant t
JOIN Lease l ON t.Tenant_ID = l.Tenant_ID
LEFT JOIN Payment pay ON l.Lease_ID = pay.Lease_ID
GROUP BY t.Tenant_ID, t.First_Name, t.Last_Name;

-- Query 14: Average maintenance cost by priority
SELECT 
    mr.Priority,
    COUNT(*) AS Request_Count,
    AVG(mr.Cost) AS Avg_Cost,
    MIN(mr.Cost) AS Min_Cost,
    MAX(mr.Cost) AS Max_Cost
FROM Maintenance_Request mr
WHERE mr.Status = 'Completed' AND mr.Cost IS NOT NULL
GROUP BY mr.Priority
ORDER BY FIELD(mr.Priority, 'High', 'Medium', 'Low');

SELECT 
    p.Property_ID,
    p.Property_Name,
    MIN(r.Rent_Per_Month) AS Min_Room_Rent,
    MAX(r.Rent_Per_Month) AS Max_Room_Rent,
    AVG(r.Rent_Per_Month) AS Avg_Room_Rent
FROM Property p
LEFT JOIN Room r ON p.Property_ID = r.Property_ID
WHERE p.Is_PG = TRUE
GROUP BY p.Property_ID, p.Property_Name;

-- Query 16: Earliest and latest policy dates
-- Used in: insurance.js - GET /tenant/:tenantId/stats
SELECT 
    Tenant_ID,
    MIN(CASE WHEN Status = 'Accepted' THEN Start_Date ELSE NULL END) as earliest_policy_start,
    MAX(CASE WHEN Status = 'Accepted' THEN End_Date ELSE NULL END) as latest_policy_end,
    COUNT(CASE WHEN Status = 'Accepted' THEN 1 END) as active_policies
FROM Insurance_Offer
WHERE Tenant_ID = 1
GROUP BY Tenant_ID;

-- Query 17: Min and Max property values by city
SELECT 
    p.City,
    p.State,
    COUNT(*) AS Property_Count,
    MIN(p.Current_Value) AS Min_Property_Value,
    MAX(p.Current_Value) AS Max_Property_Value,
    AVG(p.Current_Value) AS Avg_Property_Value
FROM Property p
GROUP BY p.City, p.State
ORDER BY Property_Count DESC;

-- Query 18: Find earliest and latest lease dates
SELECT 
    p.Property_ID,
    p.Property_Name,
    MIN(l.Start_Date) AS First_Lease_Date,
    MAX(l.End_Date) AS Last_Lease_Date,
    COUNT(l.Lease_ID) AS Total_Leases
FROM Property p
LEFT JOIN Lease l ON p.Property_ID = l.Property_ID
GROUP BY p.Property_ID, p.Property_Name;


-- Query 19: Concatenate property names for each tenant
-- Used in: tenants.js - GET /owner/:ownerId
SELECT 
    t.Tenant_ID,
    CONCAT(t.First_Name, ' ', t.Last_Name) AS Tenant_Name,
    GROUP_CONCAT(DISTINCT CASE WHEN p.Property_ID IS NOT NULL THEN p.Property_Name END SEPARATOR ', ') AS Properties,
    COUNT(DISTINCT l.Lease_ID) AS Total_Leases
FROM Tenant t
LEFT JOIN Lease l ON l.Tenant_ID = t.Tenant_ID
LEFT JOIN Property p ON p.Property_ID = l.Property_ID
GROUP BY t.Tenant_ID, t.First_Name, t.Last_Name;

-- Query 20: Concatenate amenities for PG rooms
SELECT 
    p.Property_ID,
    p.Property_Name,
    GROUP_CONCAT(DISTINCT r.Room_Type ORDER BY r.Room_Type SEPARATOR ', ') AS Available_Room_Types,
    GROUP_CONCAT(DISTINCT r.Room_Number ORDER BY r.Room_Number SEPARATOR ', ') AS Room_Numbers
FROM Property p
JOIN Room r ON p.Property_ID = r.Property_ID
WHERE p.Is_PG = TRUE AND r.Status = 'Available'
GROUP BY p.Property_ID, p.Property_Name;


-- Query 21: Payment statistics with conditional aggregation
SELECT 
    l.Property_ID,
    p.Property_Name,
    COUNT(pay.Payment_ID) AS Total_Payments,
    SUM(CASE WHEN pay.Status = 'Paid' THEN 1 ELSE 0 END) AS Paid_Count,
    SUM(CASE WHEN pay.Status = 'Pending' THEN 1 ELSE 0 END) AS Pending_Count,
    SUM(CASE WHEN pay.Status = 'Overdue' THEN 1 ELSE 0 END) AS Overdue_Count,
    SUM(CASE WHEN pay.Status = 'Paid' THEN pay.Amount ELSE 0 END) AS Total_Paid_Amount,
    SUM(CASE WHEN pay.Status = 'Pending' THEN pay.Amount ELSE 0 END) AS Total_Pending_Amount,
    SUM(CASE WHEN pay.Late_Fee > 0 THEN 1 ELSE 0 END) AS Late_Payment_Count
FROM Lease l
JOIN Property p ON l.Property_ID = p.Property_ID
LEFT JOIN Payment pay ON l.Lease_ID = pay.Lease_ID
GROUP BY l.Property_ID, p.Property_Name;

-- Query 22: Maintenance request status breakdown
-- Used in: Maintenance dashboard statistics
SELECT 
    p.Owner_ID,
    COUNT(mr.Request_ID) AS Total_Requests,
    SUM(CASE WHEN mr.Status = 'Pending' THEN 1 ELSE 0 END) AS Pending_Requests,
    SUM(CASE WHEN mr.Status = 'In Progress' THEN 1 ELSE 0 END) AS In_Progress_Requests,
    SUM(CASE WHEN mr.Status = 'Completed' THEN 1 ELSE 0 END) AS Completed_Requests,
    SUM(CASE WHEN mr.Priority = 'High' THEN 1 ELSE 0 END) AS High_Priority_Count,
    SUM(CASE WHEN mr.Priority = 'Medium' THEN 1 ELSE 0 END) AS Medium_Priority_Count,
    SUM(CASE WHEN mr.Priority = 'Low' THEN 1 ELSE 0 END) AS Low_Priority_Count,
    SUM(CASE WHEN mr.Status = 'Completed' THEN mr.Cost ELSE 0 END) AS Total_Maintenance_Cost
FROM Property p
LEFT JOIN Maintenance_Request mr ON p.Property_ID = mr.Property_ID
GROUP BY p.Owner_ID;

-- Query 23: Insurance offer response rates
SELECT 
    p.Owner_ID,
    CONCAT(o.First_Name, ' ', o.Last_Name) AS Owner_Name,
    COUNT(io.Offer_ID) AS Total_Offers,
    SUM(CASE WHEN io.Status = 'Pending' THEN 1 ELSE 0 END) AS Pending_Offers,
    SUM(CASE WHEN io.Status = 'Accepted' THEN 1 ELSE 0 END) AS Accepted_Offers,
    SUM(CASE WHEN io.Status = 'Rejected' THEN 1 ELSE 0 END) AS Rejected_Offers,
    ROUND(SUM(CASE WHEN io.Status = 'Accepted' THEN 1 ELSE 0 END) * 100.0 / 
          NULLIF(COUNT(io.Offer_ID), 0), 2) AS Acceptance_Rate
FROM Property p
JOIN Owner o ON p.Owner_ID = o.Owner_ID
LEFT JOIN Insurance_Offer io ON p.Property_ID = io.Property_ID
GROUP BY p.Owner_ID, o.First_Name, o.Last_Name;


-- Query 24: Property performance summary with multiple aggregates
SELECT 
    p.Property_ID,
    p.Property_Name,
    p.Property_Type,
    p.Current_Value,
    -- Lease aggregates
    COUNT(DISTINCT l.Lease_ID) AS Total_Leases,
    SUM(l.Monthly_Rent) AS Total_Monthly_Income,
    AVG(l.Monthly_Rent) AS Avg_Monthly_Rent,
    -- Payment aggregates
    COUNT(DISTINCT pay.Payment_ID) AS Total_Payments,
    SUM(CASE WHEN pay.Status = 'Paid' THEN pay.Amount ELSE 0 END) AS Total_Revenue,
    SUM(pay.Late_Fee) AS Total_Late_Fees,
    -- Maintenance aggregates
    COUNT(DISTINCT mr.Request_ID) AS Total_Maintenance_Requests,
    SUM(CASE WHEN mr.Status = 'Completed' THEN mr.Cost ELSE 0 END) AS Total_Maintenance_Cost,
    -- Financial calculation
    (SUM(CASE WHEN pay.Status = 'Paid' THEN pay.Amount ELSE 0 END) - 
     SUM(CASE WHEN mr.Status = 'Completed' THEN mr.Cost ELSE 0 END)) AS Net_Profit
FROM Property p
LEFT JOIN Lease l ON p.Property_ID = l.Property_ID
LEFT JOIN Payment pay ON l.Lease_ID = pay.Lease_ID
LEFT JOIN Maintenance_Request mr ON p.Property_ID = mr.Property_ID
GROUP BY p.Property_ID, p.Property_Name, p.Property_Type, p.Current_Value;

-- Query 25: Owner comprehensive financial summary
SELECT 
    o.Owner_ID,
    CONCAT(o.First_Name, ' ', o.Last_Name) AS Owner_Name,
    -- Property aggregates
    COUNT(DISTINCT p.Property_ID) AS Total_Properties,
    SUM(p.Current_Value) AS Total_Property_Value,
    SUM(p.Purchase_Price) AS Total_Investment,
    -- Lease aggregates
    COUNT(DISTINCT l.Lease_ID) AS Total_Active_Leases,
    SUM(l.Monthly_Rent) AS Monthly_Rental_Income,
    SUM(l.Monthly_Rent) * 12 AS Annual_Rental_Income,
    -- Payment aggregates
    COUNT(DISTINCT pay.Payment_ID) AS Total_Payments_Received,
    SUM(pay.Amount) AS Total_Payment_Amount,
    SUM(pay.Late_Fee) AS Total_Late_Fees,
    -- Expense aggregates
    SUM(CASE WHEN ft.Transaction_Type = 'Expense' THEN ft.Amount ELSE 0 END) AS Total_Expenses,
    -- Net income calculation
    (SUM(CASE WHEN ft.Transaction_Type = 'Income' THEN ft.Amount ELSE 0 END) - 
     SUM(CASE WHEN ft.Transaction_Type = 'Expense' THEN ft.Amount ELSE 0 END)) AS Net_Income,
    -- ROI calculation
    ROUND(((SUM(CASE WHEN ft.Transaction_Type = 'Income' THEN ft.Amount ELSE 0 END) - 
            SUM(CASE WHEN ft.Transaction_Type = 'Expense' THEN ft.Amount ELSE 0 END)) * 100.0 / 
            NULLIF(SUM(p.Purchase_Price), 0)), 2) AS ROI_Percentage
FROM Owner o
LEFT JOIN Property p ON o.Owner_ID = p.Owner_ID
LEFT JOIN Lease l ON p.Property_ID = l.Property_ID AND l.Status = 'Active'
LEFT JOIN Payment pay ON l.Lease_ID = pay.Lease_ID AND pay.Status = 'Paid'
LEFT JOIN Financial_Transaction ft ON p.Property_ID = ft.Property_ID
GROUP BY o.Owner_ID, o.First_Name, o.Last_Name;


-- Query 26: Find owners with high maintenance costs
SELECT 
    o.Owner_ID,
    CONCAT(o.First_Name, ' ', o.Last_Name) AS Owner_Name,
    COUNT(DISTINCT p.Property_ID) AS Property_Count,
    COUNT(mr.Request_ID) AS Total_Maintenance_Requests,
    SUM(mr.Cost) AS Total_Maintenance_Cost,
    AVG(mr.Cost) AS Avg_Maintenance_Cost
FROM Owner o
JOIN Property p ON o.Owner_ID = p.Owner_ID
LEFT JOIN Maintenance_Request mr ON p.Property_ID = mr.Property_ID AND mr.Status = 'Completed'
GROUP BY o.Owner_ID, o.First_Name, o.Last_Name
HAVING SUM(mr.Cost) > 5000
ORDER BY Total_Maintenance_Cost DESC;

-- Query 27: Find properties with multiple active leases (PG properties)
SELECT 
    p.Property_ID,
    p.Property_Name,
    p.Is_PG,
    COUNT(l.Lease_ID) AS Active_Lease_Count,
    SUM(l.Monthly_Rent) AS Total_Monthly_Income
FROM Property p
JOIN Lease l ON p.Property_ID = l.Property_ID
WHERE l.Status = 'Active'
GROUP BY p.Property_ID, p.Property_Name, p.Is_PG
HAVING COUNT(l.Lease_ID) > 1
ORDER BY Active_Lease_Count DESC;

-- Query 28: Find tenants with excellent payment records
SELECT 
    t.Tenant_ID,
    CONCAT(t.First_Name, ' ', t.Last_Name) AS Tenant_Name,
    t.Credit_Score,
    COUNT(pay.Payment_ID) AS Total_Payments,
    SUM(CASE WHEN pay.Status = 'Paid' THEN 1 ELSE 0 END) AS On_Time_Payments,
    SUM(pay.Late_Fee) AS Total_Late_Fees,
    ROUND(SUM(CASE WHEN pay.Status = 'Paid' THEN 1 ELSE 0 END) * 100.0 / 
          COUNT(pay.Payment_ID), 2) AS On_Time_Percentage
FROM Tenant t
JOIN Lease l ON t.Tenant_ID = l.Tenant_ID
JOIN Payment pay ON l.Lease_ID = pay.Lease_ID
GROUP BY t.Tenant_ID, t.First_Name, t.Last_Name, t.Credit_Score
HAVING COUNT(pay.Payment_ID) >= 5 AND Total_Late_Fees = 0
ORDER BY Total_Payments DESC;


-- Query 29: Monthly revenue analysis
SELECT 
    YEAR(pay.Payment_Date) AS Year,
    MONTH(pay.Payment_Date) AS Month,
    DATE_FORMAT(pay.Payment_Date, '%Y-%m') AS Year_Month,
    COUNT(pay.Payment_ID) AS Payment_Count,
    SUM(pay.Amount) AS Total_Revenue,
    AVG(pay.Amount) AS Avg_Payment,
    SUM(pay.Late_Fee) AS Total_Late_Fees
FROM Payment pay
WHERE pay.Status = 'Paid'
GROUP BY YEAR(pay.Payment_Date), MONTH(pay.Payment_Date), DATE_FORMAT(pay.Payment_Date, '%Y-%m')
ORDER BY Year DESC, Month DESC;

-- Query 30: Days until lease expiration (aggregate with date calculations)
SELECT 
    p.Property_ID,
    p.Property_Name,
    COUNT(l.Lease_ID) AS Active_Leases,
    MIN(DATEDIFF(l.End_Date, CURDATE())) AS Days_Until_First_Expiration,
    MAX(DATEDIFF(l.End_Date, CURDATE())) AS Days_Until_Last_Expiration,
    AVG(DATEDIFF(l.End_Date, CURDATE())) AS Avg_Days_Until_Expiration
FROM Property p
JOIN Lease l ON p.Property_ID = l.Property_ID
WHERE l.Status = 'Active' AND l.End_Date >= CURDATE()
GROUP BY p.Property_ID, p.Property_Name;

SELECT 
    COUNT(*) as total_offers,
    SUM(CASE WHEN io.Status = 'Pending' THEN 1 ELSE 0 END) as pending_offers,
    SUM(CASE WHEN io.Status = 'Accepted' THEN 1 ELSE 0 END) as accepted_offers,
    SUM(CASE WHEN io.Status = 'Rejected' THEN 1 ELSE 0 END) as rejected_offers,
    COALESCE(SUM(CASE WHEN io.Status = 'Accepted' THEN io.Premium_Amount ELSE 0 END), 0) as total_premium_revenue,
    COALESCE(SUM(CASE WHEN io.Status = 'Accepted' THEN io.Coverage_Amount ELSE 0 END), 0) as total_coverage_provided,
    COALESCE(AVG(CASE WHEN io.Status = 'Accepted' THEN io.Premium_Amount ELSE NULL END), 0) as avg_premium
FROM Insurance_Offer io
JOIN Property p ON io.Property_ID = p.Property_ID
WHERE p.Owner_ID = ?;

SELECT 
    COUNT(*) as total_offers,
    SUM(CASE WHEN Status = 'Pending' THEN 1 ELSE 0 END) as pending_offers,
    SUM(CASE WHEN Status = 'Accepted' THEN 1 ELSE 0 END) as active_policies,
    SUM(CASE WHEN Status = 'Rejected' THEN 1 ELSE 0 END) as rejected_offers,
    COALESCE(SUM(CASE WHEN Status = 'Accepted' THEN Premium_Amount ELSE 0 END), 0) as total_monthly_premium,
    COALESCE(SUM(CASE WHEN Status = 'Accepted' THEN Coverage_Amount ELSE 0 END), 0) as total_coverage,
    MIN(CASE WHEN Status = 'Accepted' THEN Start_Date ELSE NULL END) as earliest_policy_start,
    MAX(CASE WHEN Status = 'Accepted' THEN End_Date ELSE NULL END) as latest_policy_end
FROM Insurance_Offer
WHERE Tenant_ID = ?;

SELECT 
    io.*,
    p.Property_Name,
    p.Street_Address,
    CONCAT(t.First_Name, ' ', t.Last_Name) as Tenant_Name,
    t.Email as Tenant_Email,
    t.Phone as Tenant_Phone,
    -- Nested query: Get tenant's total insurance value
    (SELECT COALESCE(SUM(Coverage_Amount), 0) 
     FROM Insurance_Offer 
     WHERE Tenant_ID = io.Tenant_ID AND Status = 'Accepted') AS Tenant_Total_Coverage,
    -- Nested query: Count tenant's active policies
    (SELECT COUNT(*) 
     FROM Insurance_Offer 
     WHERE Tenant_ID = io.Tenant_ID AND Status = 'Accepted') AS Tenant_Active_Policies
FROM Insurance_Offer io
JOIN Property p ON io.Property_ID = p.Property_ID
JOIN Tenant t ON io.Tenant_ID = t.Tenant_ID
WHERE p.Owner_ID = ?
ORDER BY 
    CASE io.Status 
        WHEN 'Pending' THEN 1 
        WHEN 'Accepted' THEN 2 
        WHEN 'Rejected' THEN 3 
        ELSE 4 
    END,
    io.Created_At DESC;

SELECT 
    COUNT(*) as total_payments,
    SUM(CASE WHEN Status = 'Paid' THEN Amount ELSE 0 END) as total_received,
    SUM(CASE WHEN Status = 'Pending' THEN Amount ELSE 0 END) as total_pending,
    SUM(CASE WHEN Status = 'Overdue' THEN Amount ELSE 0 END) as total_overdue,
    SUM(Late_Fee) as total_late_fees
FROM Payment;

SELECT 
    COUNT(*) as total_payments,
    SUM(CASE WHEN p.Status = 'Paid' THEN p.Amount ELSE 0 END) as total_received,
    SUM(CASE WHEN p.Status = 'Pending' THEN p.Amount ELSE 0 END) as total_pending,
    SUM(CASE WHEN p.Status = 'Overdue' THEN p.Amount ELSE 0 END) as total_overdue,
    SUM(p.Late_Fee) as total_late_fees
FROM Payment p
JOIN Lease l ON p.Lease_ID = l.Lease_ID
JOIN Property pr ON l.Property_ID = pr.Property_ID
WHERE pr.Owner_ID = ?;

SELECT p.*,
    (SELECT COUNT(*) FROM Room WHERE Property_ID = p.Property_ID) AS Total_Rooms,
    (SELECT COUNT(*) FROM Room WHERE Property_ID = p.Property_ID AND Status = 'Available') AS Available_Rooms,
    (SELECT MIN(Rent_Per_Month) FROM Room WHERE Property_ID = p.Property_ID) AS Min_Room_Rent,
    (SELECT MAX(Rent_Per_Month) FROM Room WHERE Property_ID = p.Property_ID) AS Max_Room_Rent
FROM property p
WHERE p.Owner_ID = ?
   OR EXISTS (
     SELECT 1 FROM propertyownership po 
     WHERE po.Property_ID = p.Property_ID 
       AND po.Owner_ID = ? 
       AND (po.Status IS NULL OR po.Status = 'Active')
   )
ORDER BY p.Created_At DESC;

SELECT 
    p.*,
    CONCAT(o.First_Name, ' ', o.Last_Name) AS Owner_Name,
    (SELECT COUNT(*) FROM Room WHERE Property_ID = p.Property_ID) AS Total_Rooms,
    (SELECT COUNT(*) FROM Room WHERE Property_ID = p.Property_ID AND Status = 'Available') AS Available_Rooms,
    (SELECT MIN(Rent_Per_Month) FROM Room WHERE Property_ID = p.Property_ID) AS Min_Rent,
    (SELECT MAX(Rent_Per_Month) FROM Room WHERE Property_ID = p.Property_ID) AS Max_Rent
FROM property p
LEFT JOIN owner o ON p.Owner_ID = o.Owner_ID
WHERE p.Is_PG = TRUE
AND p.Property_ID IN (
    SELECT DISTINCT Property_ID 
    FROM Room 
    WHERE Status = 'Available'
)
ORDER BY p.Created_At DESC;

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
SELECT 
    ip.*,
    p.Property_Name,
    p.Street_Address,
    DATEDIFF(ip.End_Date, CURDATE()) as Days_Until_Expiry,
    -- Nested query: Total premium paid for this policy
    (SELECT COALESCE(SUM(Amount), 0) 
     FROM Financial_Transaction 
     WHERE Property_ID = ip.Property_ID 
     AND Category = 'Insurance' 
     AND Transaction_Date BETWEEN ip.Start_Date AND ip.End_Date) AS Total_Premium_Paid
FROM Insurance_Policy ip
JOIN Property p ON ip.Property_ID = p.Property_ID
WHERE ip.Property_ID = ?
ORDER BY ip.End_Date DESC;

SELECT r.*, 
    CONCAT(r.Current_Occupancy, '/', r.Occupancy_Capacity) as Occupancy_Status
FROM Room r 
WHERE r.Property_ID = ?
ORDER BY r.Room_Number;


-- Add Insurance_Offer table to existing database
USE real_estate_portfolio;

-- Drop table if it exists (to handle re-runs)
DROP TABLE IF EXISTS Insurance_Offer;

-- Create Insurance_Offer table (Owner offers insurance to Tenants)
CREATE TABLE Insurance_Offer (
    Offer_ID INT AUTO_INCREMENT PRIMARY KEY,
    Property_ID INT NOT NULL,
    Tenant_ID INT NOT NULL,
    Provider VARCHAR(100) NOT NULL,
    Coverage_Type VARCHAR(100) NOT NULL,
    Coverage_Amount DECIMAL(15, 2) NOT NULL,
    Premium_Amount DECIMAL(10, 2) NOT NULL,
    Premium_Frequency VARCHAR(20) DEFAULT 'Monthly',
    Start_Date DATE NOT NULL,
    End_Date DATE NOT NULL,
    Terms TEXT,
    Benefits TEXT,
    Status VARCHAR(50) DEFAULT 'Pending',
    Owner_Response TEXT,
    Tenant_Response TEXT,
    Response_Date DATE,
    Created_At TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    Updated_At TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (Property_ID) REFERENCES Property(Property_ID) ON DELETE CASCADE,
    FOREIGN KEY (Tenant_ID) REFERENCES Tenant(Tenant_ID) ON DELETE CASCADE
);

SELECT 'Insurance_Offer table created successfully!' AS Result;

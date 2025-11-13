-- Real Estate Portfolio Management System Database Schema

USE real_estate_portfolio;

-- Owner table (must be created first due to foreign key in Property)
CREATE TABLE Owner (
    Owner_ID INT AUTO_INCREMENT PRIMARY KEY,
    First_Name VARCHAR(50) NOT NULL,
    Last_Name VARCHAR(50) NOT NULL,
    Email VARCHAR(100) UNIQUE NOT NULL,
    Password VARCHAR(255),
    Phone VARCHAR(20),
    Created_At TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tenant table
CREATE TABLE Tenant (
    Tenant_ID INT AUTO_INCREMENT PRIMARY KEY,
    Owner_ID INT,
    First_Name VARCHAR(50) NOT NULL,
    Last_Name VARCHAR(50) NOT NULL,
    Email VARCHAR(100) UNIQUE NOT NULL,
    Password VARCHAR(255),
    Phone VARCHAR(20),
    Credit_Score INT,
    Employment_Status VARCHAR(50),
    Monthly_Income DECIMAL(10, 2),
    Created_At TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (Owner_ID) REFERENCES Owner(Owner_ID) ON DELETE SET NULL
);

-- Property table (references Owner)
CREATE TABLE Property (
    Property_ID INT AUTO_INCREMENT PRIMARY KEY,
    Owner_ID INT,
    Property_Name VARCHAR(100),
    Street_Address VARCHAR(200) NOT NULL,
    City VARCHAR(100) NOT NULL,
    State VARCHAR(50) NOT NULL,
    ZIP_Code VARCHAR(10) NOT NULL,
    Property_Type VARCHAR(50),
    Purchase_Date DATE,
    Purchase_Price DECIMAL(15, 2),
    Current_Value DECIMAL(15, 2),
    Square_Footage INT,
    Year_Built INT,
    Status VARCHAR(50) DEFAULT 'Available',
    Bedrooms INT DEFAULT 0,
    Bathrooms DECIMAL(3,1) DEFAULT 0,
    Description TEXT,
    Image_URL VARCHAR(500),
    Listing_Type VARCHAR(20) DEFAULT 'Sale',
    Is_PG BOOLEAN DEFAULT FALSE,
    Created_At TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (Owner_ID) REFERENCES Owner(Owner_ID) ON DELETE SET NULL
);

-- Room table (for PG/Hostel properties)
CREATE TABLE Room (
    Room_ID INT AUTO_INCREMENT PRIMARY KEY,
    Property_ID INT NOT NULL,
    Room_Number VARCHAR(20) NOT NULL,
    Room_Type VARCHAR(20) NOT NULL, -- 'Single', 'Double', 'Shared'
    Occupancy_Capacity INT DEFAULT 1,
    Current_Occupancy INT DEFAULT 0,
    Rent_Per_Month DECIMAL(10, 2) NOT NULL,
    Status VARCHAR(20) DEFAULT 'Available', -- 'Available', 'Occupied', 'Maintenance'
    Amenities TEXT,
    Created_At TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (Property_ID) REFERENCES Property(Property_ID) ON DELETE CASCADE
);

-- Lease table
CREATE TABLE Lease (
    Lease_ID INT AUTO_INCREMENT PRIMARY KEY,
    Property_ID INT NOT NULL,
    Room_ID INT,
    Tenant_ID INT NOT NULL,
    Start_Date DATE NOT NULL,
    End_Date DATE NOT NULL,
    Monthly_Rent DECIMAL(10, 2) NOT NULL,
    Security_Deposit DECIMAL(10, 2),
    Lease_Terms TEXT,
    Status VARCHAR(50) DEFAULT 'Active',
    Created_At TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (Property_ID) REFERENCES Property(Property_ID) ON DELETE CASCADE,
    FOREIGN KEY (Room_ID) REFERENCES Room(Room_ID) ON DELETE SET NULL,
    FOREIGN KEY (Tenant_ID) REFERENCES Tenant(Tenant_ID) ON DELETE CASCADE
);

-- Maintenance_Request table
CREATE TABLE Maintenance_Request (
    Request_ID INT AUTO_INCREMENT PRIMARY KEY,
    Property_ID INT NOT NULL,
    Tenant_ID INT,
    Description TEXT NOT NULL,
    Priority VARCHAR(20) DEFAULT 'Medium',
    Status VARCHAR(50) DEFAULT 'Pending',
    Request_Date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    Completion_Date TIMESTAMP NULL,
    Cost DECIMAL(10, 2),
    Assigned_To VARCHAR(100),
    Notes TEXT,
    Updated_At TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (Property_ID) REFERENCES Property(Property_ID) ON DELETE CASCADE,
    FOREIGN KEY (Tenant_ID) REFERENCES Tenant(Tenant_ID) ON DELETE SET NULL,
    -- Owner_ID is derivable via Property.Owner_ID; removed to satisfy 3NF
);

-- Financial_Transaction table
CREATE TABLE Financial_Transaction (
    Transaction_ID INT AUTO_INCREMENT PRIMARY KEY,
    Property_ID INT NOT NULL,
    Lease_ID INT,
    Tenant_ID INT,
    Transaction_Type VARCHAR(50) NOT NULL,
    Amount DECIMAL(15, 2) NOT NULL,
    Transaction_Date DATE NOT NULL,
    Description TEXT,
    Category VARCHAR(50),
    Payment_Method VARCHAR(50),
    Status VARCHAR(20) DEFAULT 'Pending',
    Created_At TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (Property_ID) REFERENCES Property(Property_ID) ON DELETE CASCADE,
    FOREIGN KEY (Lease_ID) REFERENCES Lease(Lease_ID) ON DELETE SET NULL,
    FOREIGN KEY (Tenant_ID) REFERENCES Tenant(Tenant_ID) ON DELETE SET NULL
);

-- Insurance_Policy table
CREATE TABLE Insurance_Policy (
    Policy_ID INT AUTO_INCREMENT PRIMARY KEY,
    Property_ID INT NOT NULL,
    Provider VARCHAR(100) NOT NULL,
    Policy_Number VARCHAR(100) UNIQUE NOT NULL,
    Coverage_Type VARCHAR(100),
    Premium_Amount DECIMAL(10, 2),
    Start_Date DATE NOT NULL,
    End_Date DATE NOT NULL,
    Status VARCHAR(50) DEFAULT 'Active',
    FOREIGN KEY (Property_ID) REFERENCES Property(Property_ID) ON DELETE CASCADE
);

-- Insurance_Offer table (Owner offers insurance to Tenants)
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
    FOREIGN KEY (Tenant_ID) REFERENCES Tenant(Tenant_ID) ON DELETE CASCADE,
    -- Owner_ID is derivable via Property.Owner_ID; removed to satisfy 3NF
);

-- Property_Document table
CREATE TABLE Property_Document (
    Document_ID INT AUTO_INCREMENT PRIMARY KEY,
    Property_ID INT NOT NULL,
    Document_Type VARCHAR(50) NOT NULL,
    Document_Name VARCHAR(200) NOT NULL,
    File_Path VARCHAR(500),
    Upload_Date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (Property_ID) REFERENCES Property(Property_ID) ON DELETE CASCADE
);

-- Property_Inspection table
CREATE TABLE Property_Inspection (
    Inspection_ID INT AUTO_INCREMENT PRIMARY KEY,
    Property_ID INT NOT NULL,
    Tenant_ID INT,
    Inspection_Date DATE NOT NULL,
    Inspector_Name VARCHAR(100),
    Inspection_Type VARCHAR(50),
    Request_Type VARCHAR(50) DEFAULT 'Owner Initiated', -- 'Owner Initiated', 'Tenant Requested'
    Results TEXT,
    Status VARCHAR(50) DEFAULT 'Scheduled',
    Notes TEXT,
    Created_At TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    Updated_At TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (Property_ID) REFERENCES Property(Property_ID) ON DELETE CASCADE,
    FOREIGN KEY (Tenant_ID) REFERENCES Tenant(Tenant_ID) ON DELETE SET NULL
);

-- Payment table for tracking rent payments
CREATE TABLE IF NOT EXISTS Payment (
    Payment_ID INT AUTO_INCREMENT PRIMARY KEY,
    Lease_ID INT NOT NULL,
    Amount DECIMAL(10, 2) NOT NULL,
    Payment_Date DATE,
    Payment_Method VARCHAR(50),
    Status VARCHAR(50) DEFAULT 'Pending',
    Due_Date DATE,
    Late_Fee DECIMAL(10, 2) DEFAULT 0,
    Notes TEXT,
    Created_At TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (Lease_ID) REFERENCES Lease(Lease_ID) ON DELETE CASCADE,
    -- Tenant_ID is derivable via Lease.Tenant_ID; removed to satisfy 3NF
);

-- Notification table for real-time updates
CREATE TABLE IF NOT EXISTS Notification (
    Notification_ID INT AUTO_INCREMENT PRIMARY KEY,
    User_Type VARCHAR(20) NOT NULL, -- 'Owner' or 'Tenant'
    User_ID INT NOT NULL,
    Title VARCHAR(200) NOT NULL,
    Message TEXT NOT NULL,
    Type VARCHAR(50), -- 'maintenance', 'payment', 'lease', 'inspection', 'purchase', 'general'
    Related_ID INT, -- ID of related record (maintenance request, payment, etc.)
    Is_Read BOOLEAN DEFAULT FALSE,
    Created_At TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- PropertyOwnership table to track ownership history
CREATE TABLE IF NOT EXISTS PropertyOwnership (
    Ownership_ID INT AUTO_INCREMENT PRIMARY KEY,
    Property_ID INT NOT NULL,
    Owner_ID INT,
    Tenant_ID INT,
    Ownership_Type VARCHAR(20) NOT NULL, -- 'Owned', 'Rented', 'Leased'
    Purchase_Price DECIMAL(15, 2),
    Start_Date DATE NOT NULL,
    End_Date DATE,
    Status VARCHAR(20) DEFAULT 'Active',
    Created_At TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (Property_ID) REFERENCES Property(Property_ID) ON DELETE CASCADE,
    FOREIGN KEY (Owner_ID) REFERENCES Owner(Owner_ID) ON DELETE SET NULL,
    FOREIGN KEY (Tenant_ID) REFERENCES Tenant(Tenant_ID) ON DELETE SET NULL
);

-- LeaseRequest table for tenant lease requests
CREATE TABLE IF NOT EXISTS LeaseRequest (
    Request_ID INT AUTO_INCREMENT PRIMARY KEY,
    Property_ID INT NOT NULL,
    Tenant_ID INT NOT NULL,
    Requested_Start_Date DATE NOT NULL,
    Requested_End_Date DATE NOT NULL,
    Monthly_Rent DECIMAL(10, 2),
    Message TEXT,
    Status VARCHAR(50) DEFAULT 'Pending', -- 'Pending', 'Approved', 'Rejected'
    Owner_Response TEXT,
    Created_At TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    Updated_At TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (Property_ID) REFERENCES Property(Property_ID) ON DELETE CASCADE,
    FOREIGN KEY (Tenant_ID) REFERENCES Tenant(Tenant_ID) ON DELETE CASCADE
);

-- PurchaseRequest table for tenant purchase requests
CREATE TABLE IF NOT EXISTS PurchaseRequest (
    Request_ID INT AUTO_INCREMENT PRIMARY KEY,
    Property_ID INT NOT NULL,
    Tenant_ID INT NOT NULL,
    Offer_Price DECIMAL(15, 2) NOT NULL,
    Message TEXT,
    Financing_Type VARCHAR(50), -- 'Cash', 'Mortgage', 'Other'
    Status VARCHAR(50) DEFAULT 'Pending', -- 'Pending', 'Approved', 'Rejected', 'Completed'
    Owner_Response TEXT,
    Created_At TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    Updated_At TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (Property_ID) REFERENCES Property(Property_ID) ON DELETE CASCADE,
    FOREIGN KEY (Tenant_ID) REFERENCES Tenant(Tenant_ID) ON DELETE CASCADE
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_property_status ON Property(Status);
CREATE INDEX IF NOT EXISTS idx_property_listing_type ON Property(Listing_Type);
CREATE INDEX IF NOT EXISTS idx_notification_user ON Notification(User_Type, User_ID, Is_Read);
CREATE INDEX IF NOT EXISTS idx_payment_status ON Payment(Status, Due_Date);
CREATE INDEX IF NOT EXISTS idx_lease_status ON Lease(Status);
CREATE INDEX IF NOT EXISTS idx_maintenance_status ON Maintenance_Request(Status, Property_ID);

-- Note: For sample data and initial setup, run init.sql after this schema file

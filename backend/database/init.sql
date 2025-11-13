-- Real Estate Portfolio Management System Initialization Script
-- This script initializes the entire database with tables, relationships, procedures, functions, and triggers

USE real_estate_portfolio;

-- Create all tables from schema.sql (tables must exist before procedures/functions/triggers)
-- Property table
CREATE TABLE Property (
    Property_ID INT AUTO_INCREMENT PRIMARY KEY,
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
    Created_At TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Room table for PG management
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

-- Tenant table
CREATE TABLE Tenant (
    Tenant_ID INT AUTO_INCREMENT PRIMARY KEY,
    First_Name VARCHAR(50) NOT NULL,
    Last_Name VARCHAR(50) NOT NULL,
    Email VARCHAR(100) UNIQUE NOT NULL,
    Password VARCHAR(255),
    Phone VARCHAR(20),
    Credit_Score INT,
    Employment_Status VARCHAR(50),
    Monthly_Income DECIMAL(10, 2),
    Created_At TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Owner table
CREATE TABLE Owner (
    Owner_ID INT AUTO_INCREMENT PRIMARY KEY,
    First_Name VARCHAR(50) NOT NULL,
    Last_Name VARCHAR(50) NOT NULL,
    Email VARCHAR(100) UNIQUE NOT NULL,
    Phone VARCHAR(20),
    Created_At TIMESTAMP DEFAULT CURRENT_TIMESTAMP
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

-- Rent Payment table
CREATE TABLE Rent_Payment (
    Payment_ID INT AUTO_INCREMENT PRIMARY KEY,
    Lease_ID INT NOT NULL,
    Tenant_ID INT NOT NULL,
    Amount DECIMAL(10, 2) NOT NULL,
    Due_Date DATE NOT NULL,
    Payment_Date DATE,
    Payment_Method VARCHAR(50),
    Payment_Status VARCHAR(20) DEFAULT 'Pending', -- 'Pending', 'Paid', 'Late', 'Partial'
    Late_Fee DECIMAL(10, 2) DEFAULT 0,
    Reference_Number VARCHAR(100),
    Created_At TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (Lease_ID) REFERENCES Lease(Lease_ID) ON DELETE CASCADE,
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
    FOREIGN KEY (Property_ID) REFERENCES Property(Property_ID) ON DELETE CASCADE,
    FOREIGN KEY (Tenant_ID) REFERENCES Tenant(Tenant_ID) ON DELETE SET NULL
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
    Inspection_Date DATE NOT NULL,
    Inspector_Name VARCHAR(100),
    Inspection_Type VARCHAR(50),
    Results TEXT,
    Status VARCHAR(50) DEFAULT 'Scheduled',
    Created_At TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (Property_ID) REFERENCES Property(Property_ID) ON DELETE CASCADE
);

-- NOTE: Run procedures.sql, functions.sql, and triggers.sql separately in MySQL Workbench
-- or use the command: mysql -u root -p real_estate_portfolio < procedures.sql
-- These files contain DELIMITER commands that work in MySQL CLI but need special handling

-- Insert sample data
USE real_estate_portfolio;

-- Sample Owners (with bcrypt hashed passwords for 'password123')
INSERT INTO Owner (First_Name, Last_Name, Email, Phone, Password)
VALUES 
('John', 'mathew', 'johnmathew@email.com', '555-123-4567', '$2b$10$rKZLVJKjw3Xt8P0RhG7QR.X5YvKKZYqYrxKZLVJKjw3Xt8P0RhG7Q'),
('Jane', 'hen', 'janehen@email.com', '555-987-6543', '$2b$10$rKZLVJKjw3Xt8P0RhG7QR.X5YvKKZYqYrxKZLVJKjw3Xt8P0RhG7Q'),
('Robert', 'doe', 'robertd@email.com', '555-456-7890', '$2b$10$rKZLVJKjw3Xt8P0RhG7QR.X5YvKKZYqYrxKZLVJKjw3Xt8P0RhG7Q');

-- First, create the demo owner that will own all properties
INSERT INTO Owner (First_Name, Last_Name, Email, Phone, Password)
VALUES ('Demo', 'Owner', 'owne@email.com', '555-0000', '$2b$10$rKZLVJKjw3Xt8P0RhG7QR.X5YvKKZYqYrxKZLVJKjw3Xt8P0RhG7Q')
ON DUPLICATE KEY UPDATE Owner_ID=LAST_INSERT_ID(Owner_ID);

-- Get the Owner_ID (will be 4 if the above three owners were inserted first)
SET @demo_owner_id = LAST_INSERT_ID();

-- Sample Properties - ALL assigned to owne@email.com
INSERT INTO Property (Owner_ID, Property_Name, Street_Address, City, State, ZIP_Code, Property_Type, Purchase_Date, Purchase_Price, Current_Value, Square_Footage, Year_Built, Status, Bedrooms, Bathrooms, Description, Image_URL, Listing_Type, Is_PG)
VALUES 
(@demo_owner_id, 'Sunset Apartments', '101 Rental Lane', 'Austin', 'TX', '78703', 'Apartment', '2020-03-15', 350000.00, 425000.00, 2200, 2010, 'Available', 3, 2, 'Beautiful apartment in prime location', 'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=800', 'Sale', FALSE),
(@demo_owner_id, 'Green Valley Duplex', '202 Tenant Ave', 'Austin', 'TX', '78704', 'Duplex', '2020-07-22', 450000.00, 520000.00, 3000, 2005, 'Available', 4, 3, 'Spacious duplex with modern amenities', 'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=800', 'Rent', FALSE),
(@demo_owner_id, 'Downtown Lofts', '303 Renter Blvd', 'Dallas', 'TX', '75203', 'Apartment', '2019-11-10', 750000.00, 900000.00, 5000, 2015, 'Available', 2, 2, 'Modern loft-style apartments', 'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?w=800', 'Rent', FALSE),
(@demo_owner_id, 'Riverside Condo', '404 Lease Street', 'Houston', 'TX', '77004', 'Condo', '2021-05-18', 280000.00, 310000.00, 1800, 2018, 'Available', 2, 2, 'Riverside condo with great views', 'https://images.unsplash.com/photo-1600566753190-17f0baa2a6c3?w=800', 'Sale', FALSE),
(@demo_owner_id, 'University PG House', '505 Property Rd', 'Houston', 'TX', '77005', 'PG/Hostel', '2021-08-30', 1200000.00, 1350000.00, 8000, 2012, 'Available', 0, 0, 'Student accommodation near university', 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=800', 'Rent', TRUE);

-- Sample Rooms (for PG properties)
INSERT INTO Room (Property_ID, Room_Number, Room_Type, Occupancy_Capacity, Current_Occupancy, Rent_Per_Month, Status, Amenities)
VALUES 
(5, '101', 'Single', 1, 0, 500.00, 'Available', 'AC, WiFi, Study Table'),
(5, '102', 'Double', 2, 0, 400.00, 'Available', 'AC, WiFi, Study Table'),
(5, '103', 'Shared', 3, 0, 350.00, 'Available', 'WiFi, Study Table'),
(5, '201', 'Single', 1, 0, 550.00, 'Available', 'AC, WiFi, Attached Bathroom'),
(5, '202', 'Double', 2, 0, 450.00, 'Available', 'AC, WiFi, Attached Bathroom');

-- Sample Tenants (with bcrypt hashed passwords for 'password123')
INSERT INTO Tenant (First_Name, Last_Name, Email, Password, Phone, Credit_Score, Employment_Status, Monthly_Income)
VALUES 
('Michael', 'Brown', 'michael.b@email.com', '$2b$10$rKZLVJKjw3Xt8P0RhG7QR.X5YvKKZYqYrxKZLVJKjw3Xt8P0RhG7Q', '555-222-3333', 720, 'Employed', 5000.00),
('Emily', 'Davis', 'emily.d@email.com', '$2b$10$rKZLVJKjw3Xt8P0RhG7QR.X5YvKKZYqYrxKZLVJKjw3Xt8P0RhG7Q', '555-444-5555', 680, 'Self-Employed', 6000.00),
('William', 'Wilson', 'william.w@email.com', '$2b$10$rKZLVJKjw3Xt8P0RhG7QR.X5YvKKZYqYrxKZLVJKjw3Xt8P0RhG7Q', '555-666-7777', 750, 'Employed', 7000.00),
('Olivia', 'Taylor', 'olivia.t@email.com', '$2b$10$rKZLVJKjw3Xt8P0RhG7QR.X5YvKKZYqYrxKZLVJKjw3Xt8P0RhG7Q', '555-888-9999', 710, 'Employed', 5500.00),
('Daniel', 'Martinez', 'daniel.m@email.com', '$2b$10$rKZLVJKjw3Xt8P0RhG7QR.X5YvKKZYqYrxKZLVJKjw3Xt8P0RhG7Q', '555-111-3333', 690, 'Employed', 6500.00);

-- Sample Leases
INSERT INTO Lease (Property_ID, Room_ID, Tenant_ID, Start_Date, End_Date, Monthly_Rent, Security_Deposit, Lease_Terms, Status)
VALUES 
(2, NULL, 1, '2023-01-01', '2024-12-31', 2200.00, 2200.00, 'Standard two-year lease with pet clause', 'Active'),
(3, NULL, 2, '2023-02-15', '2024-02-14', 1800.00, 1800.00, 'Standard one-year lease', 'Active'),
(3, NULL, 3, '2023-03-01', '2024-02-29', 1850.00, 1850.00, 'Standard one-year lease with no pets', 'Active');

-- Sample Maintenance Requests (use @demo_owner_id for consistency)
INSERT INTO Maintenance_Request (Property_ID, Tenant_ID, Description, Priority, Status, Cost, Assigned_To, Notes)
VALUES 
(2, 1, 'Leaking kitchen faucet', 'Medium', 'Completed', 150.00, 'Quick Fix Plumbing', 'Replaced faucet washer and tightened connections'),
(3, 2, 'Electrical outlet not working', 'High', 'Completed', 200.00, 'Ace Electric', 'Replaced faulty outlet and checked circuit'),
(3, 3, 'AC not cooling properly', 'High', 'Completed', 350.00, 'HVAC Solutions', 'Recharged refrigerant and cleaned filters'),
(2, 1, 'Bathroom sink draining slowly', 'Medium', 'Pending', NULL, NULL, NULL);

-- Sample Property Documents
INSERT INTO Property_Document (Property_ID, Document_Type, Document_Name, File_Path)
VALUES 
(1, 'Deed', 'Property_1_Deed.pdf', '/documents/deeds/property_1_deed.pdf'),
(2, 'Deed', 'Property_2_Deed.pdf', '/documents/deeds/property_2_deed.pdf'),
(3, 'Deed', 'Property_3_Deed.pdf', '/documents/deeds/property_3_deed.pdf'),
(4, 'Deed', 'Property_4_Deed.pdf', '/documents/deeds/property_4_deed.pdf'),
(5, 'Deed', 'Property_5_Deed.pdf', '/documents/deeds/property_5_deed.pdf');

-- Sample Insurance Policies (for all demo properties)
INSERT INTO Insurance_Policy (Property_ID, Provider, Policy_Number, Coverage_Type, Premium_Amount, Start_Date, End_Date, Status)
VALUES 
(1, 'State Farm Insurance', 'POL-2020-001', 'Full Coverage', 1200.00, '2020-03-15', '2025-03-15', 'Active'),
(2, 'Allstate Insurance', 'POL-2020-002', 'Comprehensive', 1500.00, '2020-07-22', '2025-07-22', 'Active'),
(3, 'Liberty Mutual', 'POL-2019-003', 'Premium Coverage', 2200.00, '2019-11-10', '2024-11-10', 'Active'),
(4, 'Farmers Insurance', 'POL-2021-004', 'Standard', 900.00, '2021-05-18', '2026-05-18', 'Active'),
(5, 'GEICO Insurance', 'POL-2021-005', 'Commercial Property', 2800.00, '2021-08-30', '2026-08-30', 'Active');

-- Sample Financial Transactions
INSERT INTO Financial_Transaction (Property_ID, Lease_ID, Transaction_Type, Amount, Transaction_Date, Description, Category, Payment_Method, Status)
VALUES 
(2, 1, 'Income', 2200.00, '2023-01-05', 'January 2023 Rent', 'Rent', 'Bank Transfer', 'Pending'),
(2, 1, 'Income', 2200.00, '2023-02-03', 'February 2023 Rent', 'Rent', 'Bank Transfer', 'Pending'),
(2, 1, 'Expense', 150.00, '2023-03-12', 'Plumbing repair', 'Maintenance', 'Credit Card', 'Pending'),
(3, 2, 'Income', 1800.00, '2023-02-15', 'February 2023 Rent (Prorated)', 'Rent', 'Check', 'Pending'),
(3, 2, 'Income', 1800.00, '2023-03-01', 'March 2023 Rent', 'Rent', 'Check', 'Pending'),
(3, 2, 'Expense', 200.00, '2023-04-06', 'Electrical repair', 'Maintenance', 'Credit Card', 'Pending');

-- Sample Payments
INSERT INTO Payment (Lease_ID, Amount, Payment_Date, Payment_Method, Status, Due_Date, Late_Fee, Notes)
VALUES 
(1, 2200.00, '2023-01-05', 'Bank Transfer', 'Paid', '2023-01-01', 0.00, 'On-time payment'),
(1, 2200.00, '2023-02-03', 'Bank Transfer', 'Paid', '2023-02-01', 0.00, 'On-time payment'),
(1, 2200.00, NULL, NULL, 'Pending', '2023-03-01', 0.00, NULL),
(2, 1800.00, '2023-02-15', 'Check', 'Paid', '2023-02-15', 0.00, 'First payment'),
(2, 1800.00, NULL, NULL, 'Pending', '2023-03-01', 0.00, NULL),
(3, 1850.00, '2023-03-01', 'Bank Transfer', 'Paid', '2023-03-01', 0.00, 'On-time payment'),
(3, 1850.00, NULL, NULL, 'Pending', '2023-04-01', 0.00, NULL);

-- Sample Property Inspections
INSERT INTO Property_Inspection (Property_ID, Tenant_ID, Inspection_Date, Inspector_Name, Inspection_Type, Results, Status, Request_Type, Notes)
VALUES 
(1, NULL, '2022-12-10', 'David Williams', 'Annual', 'Property in excellent condition, no issues found', 'Completed', 'Owner Initiated', 'Routine annual inspection'),
(2, 1, '2022-11-15', 'David Williams', 'Move-in', 'Minor wear and tear noted, overall good condition', 'Completed', 'Owner Initiated', 'Pre-lease inspection'),
(3, 2, '2023-02-15', 'Sarah Johnson', 'Annual', 'HVAC system needs maintenance, otherwise good condition', 'Completed', 'Owner Initiated', 'Annual maintenance check');

-- Sample PropertyOwnership records (all owned by @demo_owner_id)
INSERT INTO PropertyOwnership (Property_ID, Owner_ID, Ownership_Type, Purchase_Price, Start_Date, Status)
VALUES 
(1, @demo_owner_id, 'Owned', 350000.00, '2020-03-15', 'Active'),
(2, @demo_owner_id, 'Owned', 450000.00, '2020-07-22', 'Active'),
(3, @demo_owner_id, 'Owned', 750000.00, '2019-11-10', 'Active'),
(4, @demo_owner_id, 'Owned', 280000.00, '2021-05-18', 'Active'),
(5, @demo_owner_id, 'Owned', 1200000.00, '2021-08-30', 'Active');

-- Sample Notifications
INSERT INTO Notification (User_Type, User_ID, Title, Message, Type, Related_ID, Is_Read)
VALUES 
('Owner', @demo_owner_id, 'New Maintenance Request', 'Michael Brown reported a Medium priority maintenance issue at Green Valley Duplex', 'maintenance', 4, FALSE),
('Tenant', 1, 'Payment Due', 'Your rent payment of $2200.00 is due on 2023-03-01', 'payment', 3, FALSE),
('Owner', @demo_owner_id, 'Lease Expiring Soon', 'Lease for Downtown Lofts is expiring in 30 days', 'lease', 2, FALSE);
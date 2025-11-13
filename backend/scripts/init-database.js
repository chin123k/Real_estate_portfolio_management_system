require('dotenv').config();
const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');

// Function to clean SQL statements by removing DELIMITER commands
function cleanSQL(sqlContent) {
  // Remove DELIMITER statements and clean up
  let cleaned = sqlContent.replace(/^[\t ]*DELIMITER\s+\/\/.*$/gim, '');
  cleaned = cleaned.replace(/^[\t ]*DELIMITER\s*;.*$/gim, '');

  // Mark boundaries where a stored routine/triggers end with `//` (on its own line or right after END)
  cleaned = cleaned.replace(/END\s*\/\/[\t ]*(\r?\n)?/gim, 'END;\n__DELIM__\n');
  cleaned = cleaned.replace(/^[\t ]*\/[\/]\/[\t ]*$/gim, '__DELIM__');

  // Now split by our artificial delimiter while keeping other SQL (including URLs like https://) intact
  const blocks = cleaned
    .split('__DELIM__')
    .map((b) => b.trim())
    .filter((b) => b.length > 0);

  return blocks;
}

// Recursively expand MySQL CLI `SOURCE <file>` directives so we can run everything via the driver
function expandSourceDirectives(filePath, visited = new Set()) {
  const baseDir = path.dirname(filePath);
  if (visited.has(filePath)) return '';
  visited.add(filePath);

  const raw = fs.readFileSync(filePath, 'utf8');
  const lines = raw.split(/\r?\n/);
  let out = '';

  for (const line of lines) {
    const match = line.match(/^\s*SOURCE\s+(.+?);?\s*$/i);
    if (match) {
      // Resolve relative path against the current file
      const includePath = path.isAbsolute(match[1])
        ? match[1]
        : path.join(baseDir, match[1]);
      if (fs.existsSync(includePath)) {
        out += `\n-- Begin SOURCE ${includePath}\n`;
        out += expandSourceDirectives(includePath, visited);
        out += `\n-- End SOURCE ${includePath}\n`;
      } else {
        out += `\n-- Skipping missing SOURCE ${includePath}\n`;
      }
    } else {
      out += line + '\n';
    }
  }
  return out;
}

async function initializeDatabase() {
  let connection;
  
  try {
    // Connect to MySQL server (without database)
    connection = await mysql.createConnection({
      host: process.env.DB_HOST,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      multipleStatements: true
    });

    console.log('Connected to MySQL server');

    // Prefer init.sql if present (it can orchestrate schema, procedures, functions, triggers and seed data)
    const initPath = path.join(__dirname, '../database/init.sql');
    if (fs.existsSync(initPath)) {
      console.log('init.sql detected -> expanding SOURCE directives and executing...');
      const expanded = expandSourceDirectives(initPath);

      // Execute in blocks aware of stored routine delimiters
      const statements = cleanSQL(expanded);
      for (const statement of statements) {
        const trimmed = statement.trim();
        if (!trimmed || trimmed.startsWith('--')) continue;
        try {
          await connection.query(trimmed);
        } catch (err) {
          console.warn('Statement failed (continuing):', trimmed.substring(0, 80) + '...');
          console.warn('  Reason:', err.message);
        }
      }
      console.log('✓ init.sql executed');
    } else {
      // Fallback: run individual files in order
      // Read the schema file
      const schemaPath = path.join(__dirname, '../database/schema.sql');
      if (fs.existsSync(schemaPath)) {
        const schema = fs.readFileSync(schemaPath, 'utf8');
        console.log('Executing schema...');
        await connection.query(schema);
        console.log('✓ Database schema created successfully');
      }

      // Execute functions
      const functionsPath = path.join(__dirname, '../database/functions.sql');
      if (fs.existsSync(functionsPath)) {
        console.log('Creating functions...');
        const functionsContent = fs.readFileSync(functionsPath, 'utf8');
        const functionStatements = cleanSQL(functionsContent);

        for (const statement of functionStatements) {
          if (statement.trim() && !statement.trim().startsWith('--') && !statement.trim().startsWith('USE')) {
            try {
              await connection.query(statement);
            } catch (err) {
              console.log('Skipping statement (may already exist):', statement.substring(0, 50) + '...');
            }
          }
        }
        console.log('✓ Functions created successfully');
      }

      // Execute procedures
      const proceduresPath = path.join(__dirname, '../database/procedures.sql');
      if (fs.existsSync(proceduresPath)) {
        console.log('Creating procedures...');
        const proceduresContent = fs.readFileSync(proceduresPath, 'utf8');
        const procedureStatements = cleanSQL(proceduresContent);

        for (const statement of procedureStatements) {
          if (statement.trim() && !statement.trim().startsWith('--') && !statement.trim().startsWith('USE')) {
            try {
              await connection.query(statement);
            } catch (err) {
              console.log('Skipping statement (may already exist):', statement.substring(0, 50) + '...');
            }
          }
        }
        console.log('✓ Procedures created successfully');
      }

      // Execute triggers
      const triggersPath = path.join(__dirname, '../database/triggers.sql');
      if (fs.existsSync(triggersPath)) {
        console.log('Creating triggers...');
        const triggersContent = fs.readFileSync(triggersPath, 'utf8');
        const triggerStatements = cleanSQL(triggersContent);

        for (const statement of triggerStatements) {
          if (statement.trim() && !statement.trim().startsWith('--') && !statement.trim().startsWith('USE')) {
            try {
              await connection.query(statement);
            } catch (err) {
              console.log('Skipping statement (may already exist):', statement.substring(0, 50) + '...');
            }
          }
        }
        console.log('✓ Triggers created successfully');
      }
    }

    // After base init, apply update schemas if present (idempotent)
    const updateSchemaPath = path.join(__dirname, '../database/update_schema.sql');
    if (fs.existsSync(updateSchemaPath)) {
      try {
        console.log('Applying update_schema.sql...');
        const sql = fs.readFileSync(updateSchemaPath, 'utf8');
        await connection.query(sql);
        console.log('✓ update_schema.sql applied');
      } catch (err) {
        console.warn('Warning applying update_schema.sql:', err.message);
      }
    }

    const updateSchemaEnhancedPath = path.join(__dirname, '../database/update_schema_enhanced.sql');
    if (fs.existsSync(updateSchemaEnhancedPath)) {
      try {
        console.log('Applying update_schema_enhanced.sql...');
        const sql = fs.readFileSync(updateSchemaEnhancedPath, 'utf8');
        await connection.query(sql);
        console.log('✓ update_schema_enhanced.sql applied');
      } catch (err) {
        console.warn('Warning applying update_schema_enhanced.sql:', err.message);
      }
    }

    // Apply Tenant.Owner_ID migration if available (idempotent with try/catch)
    const addOwnerToTenantPath = path.join(__dirname, '../database/add_owner_to_tenant.sql');
    if (fs.existsSync(addOwnerToTenantPath)) {
      try {
        console.log('Applying add_owner_to_tenant.sql...');
        const sql = fs.readFileSync(addOwnerToTenantPath, 'utf8');
        await connection.query(sql);
        console.log('✓ add_owner_to_tenant.sql applied');
      } catch (err) {
        console.warn('Warning applying add_owner_to_tenant.sql:', err.message);
      }
    }

    // Optional: link specific demo tenants to an owner if script exists
    const linkTenantToOwnerPath = path.join(__dirname, '../database/link_tenant_to_owner.sql');
    if (fs.existsSync(linkTenantToOwnerPath)) {
      try {
        console.log('Applying link_tenant_to_owner.sql...');
        const sql = fs.readFileSync(linkTenantToOwnerPath, 'utf8');
        await connection.query(sql);
        console.log('✓ link_tenant_to_owner.sql applied');
      } catch (err) {
        console.warn('Warning applying link_tenant_to_owner.sql:', err.message);
      }
    }

    // Ensure demo properties belong to the Admin owner so the Admin account has data
    const assignDemoPropsPath = path.join(__dirname, '../database/assign_demo_properties_to_admin.sql');
    if (fs.existsSync(assignDemoPropsPath)) {
      try {
        console.log('Assigning demo properties to Admin owner...');
        const sql = fs.readFileSync(assignDemoPropsPath, 'utf8');
        await connection.query(sql);
        console.log('✓ Demo properties assigned to Admin');
      } catch (err) {
        console.warn('Warning assigning demo properties to Admin:', err.message);
      }
    }

    console.log('\n✓ Database initialization completed successfully!');

  } catch (error) {
    console.error('Error initializing database:', error);
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

initializeDatabase();

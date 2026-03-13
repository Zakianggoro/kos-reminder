const { google } = require('googleapis');

const getGoogleSheetsClient = () => {
  const privateKey = process.env.GOOGLE_PRIVATE_KEY
    ? process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n')
    : '';

  // Debug: cek panjang private key
  console.log('Private key length:', privateKey.length);
  console.log('Private key starts with:', privateKey.substring(0, 50));
  
  // Panjang normal private key sekitar 1600-1700 karakter
  if (privateKey.length > 2000) {
    console.error('WARNING: Private key terlalu panjang!');
  }

  const auth = new google.auth.GoogleAuth({
    credentials: {
      client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
      private_key: privateKey,
    },
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });

  return google.sheets({ version: 'v4', auth });
};

const SPREADSHEET_ID = process.env.GOOGLE_SHEETS_SPREADSHEET_ID;

// Get all customers
export async function getCustomers() {
  const sheets = getGoogleSheetsClient();
  
  try {
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: 'customers!A2:F', // Skip header row
    });

    const rows = response.data.values || [];
    
    return rows.map(row => ({
      id: parseInt(row[0]),
      name: row[1],
      contractMonths: parseInt(row[2]),
      startDate: row[3],
      monthlyPrice: parseInt(row[4]),
      monthlyPayments: row[5] ? row[5].split(',').map(p => p === 'true') : [],
    }));
  } catch (error) {
    console.error('Error getting customers:', error);
    return [];
  }
}

// Add new customer
export async function addCustomer(customer) {
  const sheets = getGoogleSheetsClient();
  
  try {
    // Get last ID
    const metaResponse = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: 'metadata!B1',
    });
    
    const lastId = parseInt(metaResponse.data.values?.[0]?.[0] || 0);
    const newId = lastId + 1;

    // Add customer
    const monthlyPayments = Array(customer.contractMonths).fill(false).join(',');
    
    await sheets.spreadsheets.values.append({
      spreadsheetId: SPREADSHEET_ID,
      range: 'customers!A:F',
      valueInputOption: 'USER_ENTERED',
      resource: {
        values: [[
          newId,
          customer.name,
          customer.contractMonths,
          customer.startDate,
          customer.monthlyPrice,
          monthlyPayments,
        ]],
      },
    });

    // Update last ID
    await sheets.spreadsheets.values.update({
      spreadsheetId: SPREADSHEET_ID,
      range: 'metadata!B1',
      valueInputOption: 'USER_ENTERED',
      resource: {
        values: [[newId]],
      },
    });

    return { success: true, id: newId };
  } catch (error) {
    console.error('Error adding customer:', error);
    return { success: false, error: error.message };
  }
}

// Update payment status
// Update payment status
export async function updatePaymentStatus(customerId, monthlyPayments) {
  const sheets = getGoogleSheetsClient();
  
  try {
    // Get all customers data INCLUDING header
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: 'customers!A1:F', // Ambil dari A1 (termasuk header)
    });

    const rows = response.data.values || [];
    
    // Skip header (row 0), cari customer mulai dari row 1
    let rowIndex = -1;
    for (let i = 1; i < rows.length; i++) {
      if (parseInt(rows[i][0]) === customerId) {
        rowIndex = i;
        break;
      }
    }
    
    if (rowIndex === -1) {
      console.error('Customer not found. CustomerID:', customerId);
      console.error('Available rows:', rows);
      return { success: false, error: 'Customer not found' };
    }

    // rowIndex + 1 karena sheet 1-indexed
    const rowNumber = rowIndex + 1;
    const paymentsString = monthlyPayments.join(',');

    console.log('Updating row:', rowNumber, 'with:', paymentsString);

    await sheets.spreadsheets.values.update({
      spreadsheetId: SPREADSHEET_ID,
      range: `customers!F${rowNumber}`,
      valueInputOption: 'USER_ENTERED',
      resource: {
        values: [[paymentsString]],
      },
    });

    return { success: true };
  } catch (error) {
    console.error('Error updating payment:', error);
    return { success: false, error: error.message };
  }
}

// Delete customer (optional)
export async function deleteCustomer(customerId) {
  const sheets = getGoogleSheetsClient();
  
  try {
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: 'customers!A2:A',
    });

    const rows = response.data.values || [];
    const rowIndex = rows.findIndex(row => parseInt(row[0]) === customerId);
    
    if (rowIndex === -1) {
      return { success: false, error: 'Customer not found' };
    }

    const rowNumber = rowIndex + 2;

    await sheets.spreadsheets.batchUpdate({
      spreadsheetId: SPREADSHEET_ID,
      resource: {
        requests: [{
          deleteDimension: {
            range: {
              sheetId: 0, // First sheet (customers)
              dimension: 'ROWS',
              startIndex: rowNumber - 1,
              endIndex: rowNumber,
            },
          },
        }],
      },
    });

    return { success: true };
  } catch (error) {
    console.error('Error deleting customer:', error);
    return { success: false, error: error.message };
  }
}
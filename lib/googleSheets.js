const { google } = require('googleapis');

// Initialize Google Sheets API
const getGoogleSheetsClient = () => {
  const auth = new google.auth.GoogleAuth({
    credentials: {
      client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
      private_key: process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n'),
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
export async function updatePaymentStatus(customerId, monthlyPayments) {
  const sheets = getGoogleSheetsClient();
  
  try {
    // Get all customers to find row number
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: 'customers!A2:A',
    });

    const rows = response.data.values || [];
    const rowIndex = rows.findIndex(row => parseInt(row[0]) === customerId);
    
    if (rowIndex === -1) {
      return { success: false, error: 'Customer not found' };
    }

    const rowNumber = rowIndex + 2; // +2 because: 1-indexed and skip header
    const paymentsString = monthlyPayments.join(',');

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
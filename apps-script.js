// ============================================
// mybookmark Backend - Google Apps Script
// ============================================
// Deploy as Web App: Execute as "Me", Access "Anyone"
//
// SETUP: Replace SHEET_ID with your Google Sheet ID
// Then add 3 sheets: "Members", "Issuances", "Signups"

var SHEET_ID = '11H30VGYAQIIjA4wtY2L7GbJBRMIIKM-RjcHLUt3-ze8';

function getSheet(name) {
  return SpreadsheetApp.openById(SHEET_ID).getSheetByName(name);
}

function setupSheets() {
  var ss = SpreadsheetApp.openById(SHEET_ID);

  var members = ss.getSheetByName('Members');
  if (!members) {
    members = ss.insertSheet('Members');
    members.appendRow(['email', 'password', 'name', 'phone', 'idType', 'locality', 'plan', 'status', 'joinedAt']);
    members.getRange(1, 1, 1, 9).setFontWeight('bold');
  }

  var issuances = ss.getSheetByName('Issuances');
  if (!issuances) {
    issuances = ss.insertSheet('Issuances');
    issuances.appendRow(['email', 'bookTitle', 'bookAuthor', 'bookIsbn', 'issuedAt', 'dueDate', 'returnedAt', 'status']);
    issuances.getRange(1, 1, 1, 8).setFontWeight('bold');
  }

  var psRentals = ss.getSheetByName('PSRentals');
  if (!psRentals) {
    psRentals = ss.insertSheet('PSRentals');
    psRentals.appendRow(['email', 'plan', 'amount', 'deposit', 'startDate', 'endDate', 'depositStatus', 'status']);
    psRentals.getRange(1, 1, 1, 8).setFontWeight('bold');
  }

  var payments = ss.getSheetByName('Payments');
  if (!payments) {
    payments = ss.insertSheet('Payments');
    payments.appendRow(['timestamp', 'email', 'name', 'phone', 'plan', 'amount', 'deposit', 'total', 'method', 'site', 'status']);
    payments.getRange(1, 1, 1, 11).setFontWeight('bold');
  }

  return 'Setup complete';
}

function hashPassword(password) {
  var raw = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, password + 'mybookmark_salt_2026');
  return raw.map(function(b) { return ('0' + (b & 0xFF).toString(16)).slice(-2); }).join('');
}

function jsonResponse(data) {
  return ContentService.createTextOutput(JSON.stringify(data)).setMimeType(ContentService.MimeType.JSON);
}

function doPost(e) {
  try {
    var body = JSON.parse(e.postData.contents);
    var action = body.action;

    if (action === 'signup') return handleSignup(body);
    if (action === 'login') return handleLogin(body);
    if (action === 'get_member') return handleGetMember(body);
    if (action === 'get_issuances') return handleGetIssuances(body);
    if (action === 'get_ps_rentals') return handleGetPSRentals(body);
    if (action === 'record_payment') return handleRecordPayment(body);
    if (action === 'forgot_password') return handleForgotPassword(body);
    if (action === 'google_signin') return handleGoogleSignin(body);
    if (action === 'form_signup') return handleFormSignup(body);

    return jsonResponse({ ok: false, error: 'Unknown action' });
  } catch (err) {
    return jsonResponse({ ok: false, error: err.message });
  }
}

function doGet(e) {
  var action = e.parameter.action;
  if (action === 'setup') return jsonResponse({ ok: true, message: setupSheets() });
  return jsonResponse({ ok: true, message: 'mybookmark API running' });
}

// ---- SIGNUP ----
function handleSignup(body) {
  var sheet = getSheet('Members');
  if (!sheet) return jsonResponse({ ok: false, error: 'Members sheet not found. Visit ?action=setup first.' });

  var email = (body.email || '').toLowerCase().trim();
  var password = body.password || '';
  var name = body.name || '';
  var phone = body.phone || '';
  var idType = body.idType || '';
  var locality = body.locality || '';

  if (!email || !password || !name || !phone) {
    return jsonResponse({ ok: false, error: 'Email, password, name, and phone are required' });
  }
  if (password.length < 6) {
    return jsonResponse({ ok: false, error: 'Password must be at least 6 characters' });
  }

  var data = sheet.getDataRange().getValues();
  for (var i = 1; i < data.length; i++) {
    if (data[i][0].toLowerCase().trim() === email) {
      return jsonResponse({ ok: false, error: 'An account with this email already exists' });
    }
  }

  var hashed = hashPassword(password);
  var now = new Date().toISOString();
  sheet.appendRow([email, hashed, name, phone, idType, locality, '', 'active', now]);

  return jsonResponse({ ok: true, member: { email: email, name: name, phone: phone, plan: '', status: 'active', joinedAt: now } });
}

// ---- LOGIN ----
function handleLogin(body) {
  var sheet = getSheet('Members');
  if (!sheet) return jsonResponse({ ok: false, error: 'Members sheet not found' });

  var email = (body.email || '').toLowerCase().trim();
  var password = body.password || '';
  var hashed = hashPassword(password);

  var data = sheet.getDataRange().getValues();
  for (var i = 1; i < data.length; i++) {
    if (data[i][0].toLowerCase().trim() === email && data[i][1] === hashed) {
      return jsonResponse({
        ok: true,
        member: {
          email: data[i][0],
          name: data[i][2],
          phone: data[i][3],
          idType: data[i][4],
          locality: data[i][5],
          plan: data[i][6],
          status: data[i][7],
          joinedAt: data[i][8]
        }
      });
    }
  }

  return jsonResponse({ ok: false, error: 'Invalid email or password' });
}

// ---- GET MEMBER ----
function handleGetMember(body) {
  var sheet = getSheet('Members');
  if (!sheet) return jsonResponse({ ok: false, error: 'Members sheet not found' });

  var email = (body.email || '').toLowerCase().trim();
  var data = sheet.getDataRange().getValues();

  for (var i = 1; i < data.length; i++) {
    if (data[i][0].toLowerCase().trim() === email) {
      return jsonResponse({
        ok: true,
        member: {
          email: data[i][0],
          name: data[i][2],
          phone: data[i][3],
          idType: data[i][4],
          locality: data[i][5],
          plan: data[i][6],
          status: data[i][7],
          joinedAt: data[i][8]
        }
      });
    }
  }

  return jsonResponse({ ok: false, error: 'Member not found' });
}

// ---- GET ISSUANCES ----
function handleGetIssuances(body) {
  var sheet = getSheet('Issuances');
  if (!sheet) return jsonResponse({ ok: false, error: 'Issuances sheet not found' });

  var email = (body.email || '').toLowerCase().trim();
  var data = sheet.getDataRange().getValues();
  var current = [];
  var history = [];

  for (var i = 1; i < data.length; i++) {
    if (data[i][0].toLowerCase().trim() === email) {
      var record = {
        bookTitle: data[i][1],
        bookAuthor: data[i][2],
        bookIsbn: data[i][3],
        issuedAt: data[i][4],
        dueDate: data[i][5],
        returnedAt: data[i][6],
        status: data[i][7]
      };
      if (record.status === 'issued') {
        current.push(record);
      } else {
        history.push(record);
      }
    }
  }

  return jsonResponse({ ok: true, current: current, history: history });
}

// ---- GET PS RENTALS ----
function handleGetPSRentals(body) {
  var sheet = getSheet('PSRentals');
  if (!sheet) return jsonResponse({ ok: true, active: null, history: [] });

  var email = (body.email || '').toLowerCase().trim();
  var data = sheet.getDataRange().getValues();
  var active = null;
  var history = [];

  for (var i = 1; i < data.length; i++) {
    if (data[i][0].toLowerCase().trim() === email) {
      var record = {
        plan: data[i][1],
        amount: data[i][2],
        deposit: data[i][3],
        startDate: data[i][4],
        endDate: data[i][5],
        depositStatus: data[i][6],
        status: data[i][7]
      };
      if (record.status === 'active') {
        active = record;
      } else {
        history.push(record);
      }
    }
  }

  return jsonResponse({ ok: true, active: active, history: history });
}

// ---- RECORD PAYMENT ----
function handleRecordPayment(body) {
  var ss = SpreadsheetApp.openById(SHEET_ID);
  var sheet = ss.getSheetByName('Payments');
  if (!sheet) {
    sheet = ss.insertSheet('Payments');
    sheet.appendRow(['timestamp', 'email', 'name', 'phone', 'plan', 'amount', 'deposit', 'total', 'method', 'site', 'status']);
    sheet.getRange(1, 1, 1, 11).setFontWeight('bold');
  }

  var now = new Date().toISOString();
  sheet.appendRow([
    now,
    (body.email || '').toLowerCase().trim(),
    body.name || '',
    body.phone || '',
    body.plan || '',
    body.amount || 0,
    body.deposit || 0,
    body.total || 0,
    body.method || 'UPI',
    body.site || '',
    'pending_verification'
  ]);

  return jsonResponse({ ok: true, message: 'Payment recorded' });
}

// ---- FORGOT PASSWORD ----
function handleForgotPassword(body) {
  var sheet = getSheet('Members');
  if (!sheet) return jsonResponse({ ok: false, error: 'Members sheet not found' });

  var email = (body.email || '').toLowerCase().trim();
  var data = sheet.getDataRange().getValues();

  for (var i = 1; i < data.length; i++) {
    if (data[i][0].toLowerCase().trim() === email) {
      var tempPass = 'mb' + Math.random().toString(36).substring(2, 8);
      var hashed = hashPassword(tempPass);
      sheet.getRange(i + 1, 2).setValue(hashed);

      MailApp.sendEmail({
        to: email,
        subject: 'mybookmark - Your temporary password',
        htmlBody: '<div style="font-family:sans-serif; max-width:480px; margin:0 auto; padding:20px;">' +
          '<h2 style="color:#b85c38;">mybookmark</h2>' +
          '<p>Hi ' + data[i][2] + ',</p>' +
          '<p>Your temporary password is:</p>' +
          '<p style="font-size:1.4rem; font-weight:bold; background:#f5f0e6; padding:12px 20px; border-radius:8px; text-align:center; letter-spacing:2px;">' + tempPass + '</p>' +
          '<p>Use this to sign in at <a href="https://mybookmark.in">mybookmark.in</a>. We recommend changing it after logging in.</p>' +
          '<p style="color:#888; font-size:0.85rem;">If you didn\'t request this, you can ignore this email.</p>' +
          '<p>— mybookmark team</p>' +
          '</div>'
      });

      return jsonResponse({ ok: true, message: 'Temporary password sent to ' + email });
    }
  }

  return jsonResponse({ ok: false, error: 'No account found with this email' });
}

// ---- GOOGLE SIGN-IN ----
function handleGoogleSignin(body) {
  var sheet = getSheet('Members');
  if (!sheet) return jsonResponse({ ok: false, error: 'Members sheet not found. Visit ?action=setup first.' });

  var email = (body.email || '').toLowerCase().trim();
  var name = body.name || '';

  if (!email) return jsonResponse({ ok: false, error: 'Email is required' });

  var data = sheet.getDataRange().getValues();
  for (var i = 1; i < data.length; i++) {
    if (data[i][0].toLowerCase().trim() === email) {
      return jsonResponse({
        ok: true,
        member: {
          email: data[i][0],
          name: data[i][2],
          phone: data[i][3],
          idType: data[i][4],
          locality: data[i][5],
          plan: data[i][6],
          status: data[i][7],
          joinedAt: data[i][8]
        }
      });
    }
  }

  var now = new Date().toISOString();
  sheet.appendRow([email, 'google_oauth', name, '', '', '', '', 'active', now]);

  return jsonResponse({
    ok: true,
    member: { email: email, name: name, phone: '', idType: '', locality: '', plan: '', status: 'active', joinedAt: now }
  });
}

// ---- FORM SIGNUP (existing form - backward compatible) ----
function handleFormSignup(body) {
  var sheet = getSheet('Signups');
  if (!sheet) {
    var ss = SpreadsheetApp.openById(SHEET_ID);
    sheet = ss.getSheetByName('Sheet1') || ss.getSheets()[0];
  }

  var now = new Date().toISOString();
  sheet.appendRow([now, body.name, body.phone, body.readerType, body.idType, body.locality, body.notes]);

  return jsonResponse({ ok: true });
}

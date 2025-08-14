// This is a Vercel Serverless Function, which runs on Node.js.
// It uses the official Google Cloud APIs, not Apps Script services.

import { google } from 'googleapis';

// This function will be your main API endpoint.
export default async function handler(req, res) {
  // We only allow POST requests to this endpoint.
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Only POST requests are allowed' });
  }

  try {
    const formData = req.body;

    // --- IMPORTANT: AUTHENTICATION ---
    // You must set up a Google Cloud Service Account and store its
    // credentials as environment variables in Vercel.
    const auth = new google.auth.GoogleAuth({
      credentials: {
        client_email: process.env.GOOGLE_CLIENT_EMAIL,
        private_key: process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n'), // Vercel needs this replace
      },
      scopes: [
        'https://www.googleapis.com/auth/spreadsheets',
        'https://www.googleapis.com/auth/calendar',
        'https://www.googleapis.com/auth/tasks',
      ],
    });

    const authClient = await auth.getClient();

    // --- 1. Append to Google Sheet ---
    const sheets = google.sheets({ version: 'v4', auth: authClient });
    await appendToSheet(sheets, formData);

    // --- 2. Create Events and Tasks ---
    const calendar = google.calendar({ version: 'v3', auth: authClient });
    const tasks = google.tasks({ version: 'v1', auth: authClient });
    await createEventsAndTasks(calendar, tasks, formData);

    // Send a success response back to the React app.
    res.status(200).json({ success: true, message: 'Event logged successfully!' });

  } catch (error) {
    console.error('Error in API handler:', error);
    res.status(500).json({ success: false, message: `Server Error: ${error.message}` });
  }
}


// --- HELPER FUNCTIONS (rewritten for Google Cloud APIs) ---

async function appendToSheet(sheets, data) {
  const SPREADSHEET_ID = process.env.GOOGLE_SHEET_ID;
  const range = 'Sheet1!A1'; // Assumes you're writing to the first sheet.

  const rowData = [
    new Date().toISOString(),
    data.eventType,
    data.eventType === 'school' ? data.schoolEventType : data.personalEventType,
    data.eventName,
    data.longDescription || '',
    data.startDate,
    data.isMultiDay ? data.endDate : '',
    data.isAllDay,
    !data.isAllDay ? data.startTime : '',
    !data.isAllDay ? data.endTime : '',
    data.isSchoolOpen ? 'Yes' : 'No',
    data.isSchoolOpen ? data.schoolDayType : 'N/A',
    data.createTask ? 'Yes' : 'No',
    data.isMultiDay ? data.calendarDisplay : 'N/A'
  ];

  await sheets.spreadsheets.values.append({
    spreadsheetId: SPREADSHEET_ID,
    range: range,
    valueInputOption: 'USER_ENTERED',
    resource: {
      values: [rowData],
    },
  });
}

async function createEventsAndTasks(calendar, tasks, data) {
  if (!data.startDate) return;

  const eventType = data.eventType === 'school' ? data.schoolEventType : data.personalEventType;
  const userEventName = data.eventName || 'Untitled Event';
  const finalEventTitle = `${eventType} - ${userEventName}`;
  const finalTaskTitle = `Preparation for ${userEventName}`;
  
  const baseDescription = `Category: ${data.eventType}\nType: ${eventType}`;
  const fullDescription = data.longDescription ? `${baseDescription}\n\nDetails:\n${data.longDescription}` : baseDescription;

  // --- Calendar Event Logic ---
  if (data.isMultiDay) {
    // Logic for multi-day events...
    // This would involve creating one or more events using calendar.events.insert()
  } else {
    // Logic for single-day events...
    const event = {
      summary: finalEventTitle,
      description: fullDescription,
      start: {
        date: data.startDate, // For all-day events
        timeZone: 'Asia/Bangkok',
      },
      end: {
        date: data.startDate, // For all-day events
        timeZone: 'Asia/Bangkok',
      },
    };
    // Note: For specific times, you would use 'dateTime' instead of 'date'.
    await calendar.events.insert({
      calendarId: process.env.GOOGLE_CALENDAR_ID,
      resource: event,
    });
  }

  // --- Task Creation Logic ---
  if (data.createTask) {
    const taskDueDate = new Date(data.startDate);
    taskDueDate.setDate(taskDueDate.getDate() - parseInt(data.taskDays, 10));
    
    const task = {
      title: finalTaskTitle,
      notes: fullDescription,
      due: taskDueDate.toISOString(),
    };

    await tasks.tasks.insert({
      tasklist: '@default', // Uses the default task list
      resource: task,
    });
  }
}

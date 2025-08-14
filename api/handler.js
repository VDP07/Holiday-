import { google } from 'googleapis';

// This function is your main API endpoint.
export default async function handler(req, res) {
  // --- TEMPORARY DEBUGGING STEP ---
  // This will print all environment variables to the Vercel logs.
  console.log("Vercel Environment Variables:", process.env);
  // --- END DEBUGGING STEP ---

  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Only POST requests are allowed' });
  }

  try {
    const formData = req.body;

    const auth = new google.auth.GoogleAuth({
      credentials: {
        client_email: process.env.GOOGLE_CLIENT_EMAIL,
        private_key: process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n'),
      },
      scopes: [
        'https://www.googleapis.com/auth/spreadsheets',
        'https://www.googleapis.com/auth/calendar',
        'https://www.googleapis.com/auth/tasks',
      ],
    });

    const authClient = await auth.getClient();
    
    const sheets = google.sheets({ version: 'v4', auth: authClient });
    const calendar = google.calendar({ version: 'v3', auth: authClient });
    const tasks = google.tasks({ version: 'v1', auth: authClient });

    await appendToSheet(sheets, formData);
    await createEventsAndTasks(calendar, tasks, formData);

    res.status(200).json({ success: true, message: 'Event logged successfully!' });

  } catch (error) {
    console.error('Error in API handler:', error);
    res.status(500).json({ success: false, message: `Server Error: ${error.message}` });
  }
}

// --- HELPER FUNCTIONS ---

async function appendToSheet(sheets, data) {
  const SPREADSHEET_ID = process.env.GOOGLE_SHEET_ID;
  const range = 'Sheet1!A1';

  const rowData = [
    new Date().toISOString(), data.eventType,
    data.eventType === 'school' ? data.schoolEventType : data.personalEventType,
    data.eventName, data.longDescription || '', data.startDate,
    data.isMultiDay ? data.endDate : '', data.isAllDay,
    !data.isAllDay ? data.startTime : '', !data.isAllDay ? data.endTime : '',
    data.isSchoolOpen ? 'Yes' : 'No', data.isSchoolOpen ? data.schoolDayType : 'N/A',
    data.createTask ? 'Yes' : 'No', data.isMultiDay ? data.calendarDisplay : 'N/A'
  ];

  await sheets.spreadsheets.values.append({
    spreadsheetId: SPREADSHEET_ID, range, valueInputOption: 'USER_ENTERED',
    resource: { values: [rowData] },
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

  const createEvent = async (title, start, end) => {
    let eventResource = { summary: title, description: fullDescription };
    if (data.isAllDay) {
      const exclusiveEndDate = new Date(end);
      exclusiveEndDate.setDate(exclusiveEndDate.getDate() + 1);
      eventResource.start = { date: start.toISOString().slice(0, 10) };
      eventResource.end = { date: exclusiveEndDate.toISOString().slice(0, 10) };
    } else {
      eventResource.start = { dateTime: new Date(`${start.toISOString().slice(0,10)}T${data.startTime || '09:00'}`).toISOString() };
      eventResource.end = { dateTime: new Date(`${end.toISOString().slice(0,10)}T${data.endTime || '10:00'}`).toISOString() };
    }
    await calendar.events.insert({ calendarId: process.env.GOOGLE_CALENDAR_ID, resource: eventResource });
  };

  const startDate = new Date(data.startDate);
  if (data.isMultiDay) {
    const endDate = new Date(data.endDate);
    if (data.calendarDisplay === 'span') {
      await createEvent(finalEventTitle, startDate, endDate);
    } else {
      await createEvent(`${finalEventTitle} (Starts)`, startDate, startDate);
      await createEvent(`${finalEventTitle} (Ends)`, endDate, endDate);
    }
  } else {
    await createEvent(finalEventTitle, startDate, startDate);
  }

  if (data.createTask) {
    const taskDueDate = new Date(startDate);
    taskDueDate.setDate(taskDueDate.getDate() - parseInt(data.taskDays, 10));
    await tasks.tasks.insert({
      tasklist: '@default',
      resource: { title: finalTaskTitle, notes: fullDescription, due: taskDueDate.toISOString() },
    });
  }
}

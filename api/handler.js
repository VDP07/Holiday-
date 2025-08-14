import { google } from 'googleapis';

// This function is your main API endpoint.
export default async function handler(req, res) {
  // --- DETAILED ERROR CHECKING ---
  // First, check if all required environment variables are present.
  if (!process.env.GOOGLE_CREDENTIALS_JSON) {
    console.error("FATAL: GOOGLE_CREDENTIALS_JSON is not set in Vercel.");
    return res.status(500).json({ success: false, message: "Server configuration error: Missing credentials." });
  }
  if (!process.env.GOOGLE_SHEET_ID) {
    console.error("FATAL: GOOGLE_SHEET_ID is not set in Vercel.");
    return res.status(500).json({ success: false, message: "Server configuration error: Missing Sheet ID." });
  }
  if (!process.env.GOOGLE_CALENDAR_ID) {
    console.error("FATAL: GOOGLE_CALENDAR_ID is not set in Vercel.");
    return res.status(500).json({ success: false, message: "Server configuration error: Missing Calendar ID." });
  }
  // --- END ERROR CHECKING ---

  try {
    const formData = req.body;
    console.log("API Handler received form data:", formData);

    const credentials = JSON.parse(process.env.GOOGLE_CREDENTIALS_JSON);

    const auth = new google.auth.GoogleAuth({
      credentials,
      scopes: [
        'https://www.googleapis.com/auth/spreadsheets',
        'https://www.googleapis.com/auth/calendar',
        'https://www.googleapis.com/auth/tasks',
      ],
    });

    const authClient = await auth.getClient();
    console.log("Successfully authenticated with Google.");
    
    const sheets = google.sheets({ version: 'v4', auth: authClient });
    const calendar = google.calendar({ version: 'v3', auth: authClient });
    const tasks = google.tasks({ version: 'v1', auth: authClient });

    await appendToSheet(sheets, formData);
    await createEventsAndTasks(calendar, tasks, formData);

    console.log("Successfully completed all Google API operations.");
    res.status(200).json({ success: true, message: 'Event logged successfully!' });

  } catch (error) {
    // This will now catch any error from Google and send it back to the form.
    console.error('Error during Google API call:', error);
    res.status(500).json({ success: false, message: `Google API Error: ${error.message}` });
  }
}

// --- HELPER FUNCTIONS ---

async function appendToSheet(sheets, data) {
  console.log("Attempting to write to Google Sheet...");
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
  console.log("Successfully wrote to Google Sheet.");
}

async function createEventsAndTasks(calendar, tasks, data) {
  if (!data.startDate) return;
  console.log("Attempting to create events and/or tasks...");

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
    console.log(`Created event: "${title}"`);
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
    console.log("Attempting to create a task...");
    const taskDueDate = new Date(startDate);
    taskDueDate.setDate(taskDueDate.getDate() - parseInt(data.taskDays, 10));
    await tasks.tasks.insert({
      tasklist: '@default',
      resource: { title: finalTaskTitle, notes: fullDescription, due: taskDueDate.toISOString() },
    });
    console.log(`Created task: "${finalTaskTitle}"`);
  }
}

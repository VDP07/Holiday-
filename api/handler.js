// This is a temporary diagnostic script to test environment variables.
export default async function handler(req, res) {
  try {
    // We will check for each environment variable one by one.
    if (!process.env.GOOGLE_SHEET_ID) {
      throw new Error("DIAGNOSTIC TEST FAILED: The GOOGLE_SHEET_ID variable is missing.");
    }
    if (!process.env.GOOGLE_CALENDAR_ID) {
      throw new Error("DIAGNOSTIC TEST FAILED: The GOOGLE_CALENDAR_ID variable is missing.");
    }
    if (!process.env.GOOGLE_CLIENT_EMAIL) {
      throw new Error("DIAGNOSTIC TEST FAILED: The GOOGLE_CLIENT_EMAIL variable is missing.");
    }
    if (!process.env.GOOGLE_PRIVATE_KEY) {
      // Note: We are checking for the original key name for this test.
      throw new Error("DIAGNOSTIC TEST FAILED: The GOOGLE_PRIVATE_KEY variable is missing.");
    }

    // If all checks pass, we send a success message.
    res.status(200).json({ success: true, message: 'DIAGNOSTIC TEST PASSED: All environment variables were found!' });

  } catch (error) {
    // If any check fails, we send back the specific error message.
    console.error('DIAGNOSTIC ERROR:', error);
    res.status(500).json({ success: false, message: `Server Error: ${error.message}` });
  }
}

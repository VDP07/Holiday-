import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { BookUser, Building, Calendar, Clock, FileText, ListChecks, PlusCircle, User, Zap } from 'lucide-react';

export default function App() {
  // IMPORTANT: Replace this with the URL from your deployed Apps Script.
  const SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbyF4Pohrl8G6yZOcDiZ7ZyhvhzIFQrjmDeBDmIfLBJvBI5XxZyPPM99TEGLApeJGf95uQ/exec';

  // State for UI logic (what to show/hide)
  const [eventType, setEventType] = useState('school');
  const [isMultiDay, setIsMultiDay] = useState(false);
  const [isAllDay, setIsAllDay] = useState(true);
  const [createTask, setCreateTask] = useState(false);
  const [isSchoolOpen, setIsSchoolOpen] = useState(false);
  
  // State for submission status
  const [submissionStatus, setSubmissionStatus] = useState(null); // 'loading', 'success', 'error'

  const { register, handleSubmit, formState: { errors }, reset } = useForm({
    defaultValues: {
      schoolEventType: 'Holiday',
      personalEventType: 'Training',
      calendarDisplay: 'span',
      taskDays: 7,
    }
  });

  const onSubmit = async (data) => {
    setSubmissionStatus('loading');

    // Combine UI state with form data
    const payload = {
      ...data,
      eventType,
      isMultiDay,
      isAllDay,
      createTask,
      isSchoolOpen,
    };

    try {
      // Sending data to your Google Apps Script
      // 'no-cors' mode is used to prevent CORS errors with Apps Script,
      // but it means we can't read the response from the script.
      await fetch(SCRIPT_URL, {
        method: 'POST',
        mode: 'no-cors', 
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      // Since we can't read the response, we optimistically assume success.
      setSubmissionStatus('success');
      reset(); // Reset form fields
      // Reset UI state toggles
      setEventType('school');
      setIsMultiDay(false);
      setIsAllDay(true);
      setCreateTask(false);
      setIsSchoolOpen(false);

    } catch (error) {
      console.error('Submission failed:', error);
      setSubmissionStatus('error');
    }
  };

  return (
    <>
      <style>{`
        body { background-color: #f3f4f6; font-family: 'Inter', sans-serif; }
        .form-container { min-height: 100vh; display: flex; align-items: center; justify-content: center; padding: 1rem; }
        .card { background-color: #ffffff; padding: 2.5rem; border-radius: 1rem; box-shadow: 0 10px 15px -3px rgba(0,0,0,0.1), 0 4px 6px -2px rgba(0,0,0,0.05); width: 100%; max-width: 48rem; }
        .title { font-size: 2rem; font-weight: 700; text-align: center; color: #1f2937; margin-bottom: 2rem; }
        .form-group { margin-bottom: 1.5rem; }
        .form-label { color: #374151; font-weight: 500; display: flex; align-items: center; margin-bottom: 0.5rem; }
        .form-label svg { width: 1.125rem; height: 1.125rem; color: #6b7280; margin-right: 0.5rem; }
        .form-input, .form-select, .form-textarea { width: 100%; padding: 0.75rem; border: 1px solid #d1d5db; border-radius: 0.5rem; }
        .form-input:focus, .form-select:focus, .form-textarea:focus { border-color: #4f46e5; outline: 2px solid transparent; outline-offset: 2px; box-shadow: 0 0 0 2px rgba(79, 70, 229, 0.5); }
        .form-checkbox { height: 1.25rem; width: 1.25rem; border-radius: 0.25rem; border-color: #d1d5db; color: #4f46e5; }
        .error-message { color: #ef4444; font-size: 0.875rem; margin-top: 0.25rem; }
        .submit-button { width: 100%; background-color: #4f46e5; color: #ffffff; font-weight: 600; padding: 0.75rem; border-radius: 0.5rem; transition: background-color 0.2s; }
        .submit-button:hover { background-color: #4338ca; }
        .submit-button:disabled { background-color: #a5b4fc; cursor: not-allowed; }
        .message-box { margin-bottom: 1rem; padding: 1rem; text-align: center; font-weight: 500; border-radius: 0.5rem; }
        .message-box.success { background-color: #dcfce7; color: #166534; }
        .message-box.error { background-color: #fee2e2; color: #991b1b; }
      `}</style>
      <div className="form-container">
        <div className="card">
          <h1 className="title">Event & Holiday Logger</h1>
          
          {submissionStatus === 'success' && <div className="message-box success">✅ Event logged successfully!</div>}
          {submissionStatus === 'error' && <div className="message-box error">❌ Submission failed. Please try again.</div>}

          <form onSubmit={handleSubmit(onSubmit)}>
            {/* Event Category */}
            <div className="form-group">
              <label htmlFor="eventType" className="form-label"><ListChecks /> Event Category</label>
              <select id="eventType" value={eventType} onChange={(e) => setEventType(e.target.value)} className="form-select">
                <option value="school">School</option>
                <option value="personal">Personal</option>
              </select>
            </div>

            {/* Conditional Options */}
            {eventType === 'school' ? (
              <div className="form-group p-4 bg-gray-50 rounded-lg">
                <label htmlFor="schoolEventType" className="form-label"><Building /> School Event Type</label>
                <select id="schoolEventType" {...register('schoolEventType')} className="form-select mb-4">
                  <option>Holiday</option><option>PTC</option><option>In-Service Day</option><option>Activity</option><option>Other</option>
                </select>
                <div className="flex items-center">
                  <input id="isSchoolOpen" type="checkbox" checked={isSchoolOpen} onChange={(e) => setIsSchoolOpen(e.target.checked)} className="form-checkbox" />
                  <label htmlFor="isSchoolOpen" className="ml-2 text-sm">Is school open?</label>
                </div>
                {isSchoolOpen && (
                  <div className="mt-4">
                    <label htmlFor="schoolDayType" className="form-label">School Day Type</label>
                    <select id="schoolDayType" {...register('schoolDayType')} className="form-select">
                      <option>Half Day</option><option>Normal Class</option><option>No Class</option>
                    </select>
                  </div>
                )}
              </div>
            ) : (
              <div className="form-group p-4 bg-gray-50 rounded-lg">
                <label htmlFor="personalEventType" className="form-label"><User /> Personal Event Type</label>
                <select id="personalEventType" {...register('personalEventType')} className="form-select">
                  <option>Training</option><option>Vacation</option><option>Other</option>
                </select>
              </div>
            )}

            {/* Event Name & Description */}
            <div className="form-group">
              <label htmlFor="eventName" className="form-label"><Tag /> Event Name / Title</label>
              <input type="text" id="eventName" {...register('eventName', { required: 'Event name is required' })} className="form-input" placeholder="e.g., Christmas Break" />
              {errors.eventName && <p className="error-message">{errors.eventName.message}</p>}
            </div>
            <div className="form-group">
              <label htmlFor="longDescription" className="form-label"><FileText /> Detailed Description</label>
              <textarea id="longDescription" {...register('longDescription')} rows="4" className="form-textarea" placeholder="Add any specific details, links, or notes..."></textarea>
            </div>

            {/* Date Selection */}
            <div className="form-group">
                <div className="flex items-center mb-2">
                    <input id="isMultiDay" type="checkbox" checked={isMultiDay} onChange={(e) => setIsMultiDay(e.target.checked)} className="form-checkbox" />
                    <label htmlFor="isMultiDay" className="ml-2 text-sm">Multi-day event?</label>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label htmlFor="startDate" className="form-label"><Calendar /> {isMultiDay ? 'Start Date' : 'Date'}</label>
                        <input type="date" id="startDate" {...register('startDate', { required: 'Start date is required' })} className="form-input" />
                        {errors.startDate && <p className="error-message">{errors.startDate.message}</p>}
                    </div>
                    {isMultiDay && (
                        <div>
                            <label htmlFor="endDate" className="form-label"><Calendar /> End Date</label>
                            <input type="date" id="endDate" {...register('endDate')} className="form-input" />
                        </div>
                    )}
                </div>
            </div>

            {/* Time Selection */}
            <div className="form-group">
                <div className="flex items-center mb-2">
                    <input id="isAllDay" type="checkbox" checked={isAllDay} onChange={(e) => setIsAllDay(e.target.checked)} className="form-checkbox" />
                    <label htmlFor="isAllDay" className="ml-2 text-sm">All-day event?</label>
                </div>
                {!isAllDay && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label htmlFor="startTime" className="form-label"><Clock /> Start Time</label>
                            <input type="time" id="startTime" {...register('startTime')} className="form-input" />
                        </div>
                        <div>
                            <label htmlFor="endTime" className="form-label"><Clock /> End Time</label>
                            <input type="time" id="endTime" {...register('endTime')} className="form-input" />
                        </div>
                    </div>
                )}
            </div>

            {/* Multi-Day Display Options */}
            {isMultiDay && (
                <div className="form-group">
                    <label className="form-label"><Zap /> Calendar Display</label>
                    <div className="flex gap-4 mt-2">
                        <label className="flex items-center"><input type="radio" value="span" {...register('calendarDisplay')} className="form-checkbox mr-2" />Span across all days</label>
                        <label className="flex items-center"><input type="radio" value="start_end" {...register('calendarDisplay')} className="form-checkbox mr-2" />Show start & end only</label>
                    </div>
                </div>
            )}

            {/* Task Creation */}
            <div className="form-group">
                <div className="flex items-center mb-2">
                    <input id="createTask" type="checkbox" checked={createTask} onChange={(e) => setCreateTask(e.target.checked)} className="form-checkbox" />
                    <label htmlFor="createTask" className="ml-2 text-sm">Create a preparation task?</label>
                </div>
                {createTask && (
                    <div>
                        <label htmlFor="taskDays" className="form-label"><PlusCircle /> Days before to set task due date?</label>
                        <input type="number" id="taskDays" {...register('taskDays')} className="form-input" />
                    </div>
                )}
            </div>

            <button type="submit" className="submit-button" disabled={submissionStatus === 'loading'}>
                {submissionStatus === 'loading' ? 'Submitting...' : 'Log Event'}
            </button>
          </form>
        </div>
      </div>
    </>
  );
}


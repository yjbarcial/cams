// Format date to ISO string
export const formatDate = (date) => {
  if (!date) return null;
  return new Date(date).toISOString();
};

// Calculate days between two dates
export const daysBetween = (date1, date2) => {
  const oneDay = 24 * 60 * 60 * 1000;
  return Math.round(Math.abs((new Date(date1) - new Date(date2)) / oneDay));
};

// Check if date is past
export const isPastDate = (date) => {
  return new Date(date) < new Date();
};

// Format date for display
export const formatDisplayDate = (date) => {
  if (!date) return 'N/A';
  return new Date(date).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
};

// Get date range for filters
export const getDateRange = (range) => {
  const now = new Date();
  const ranges = {
    today: {
      start: new Date(now.setHours(0, 0, 0, 0)),
      end: new Date(now.setHours(23, 59, 59, 999))
    },
    week: {
      start: new Date(now.setDate(now.getDate() - 7)),
      end: new Date()
    },
    month: {
      start: new Date(now.setMonth(now.getMonth() - 1)),
      end: new Date()
    },
    year: {
      start: new Date(now.setFullYear(now.getFullYear() - 1)),
      end: new Date()
    }
  };
  return ranges[range] || null;
};

export default {
  formatDate,
  daysBetween,
  isPastDate,
  formatDisplayDate,
  getDateRange
};

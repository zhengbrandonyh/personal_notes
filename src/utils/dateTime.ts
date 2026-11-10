// Format current local time (YYYY-MM-DDTHH:mm)
export const getCurrentLocalDatetimeStr = (): string => {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const hours = String(d.getHours()).padStart(2, '0');
  const minutes = String(d.getMinutes()).padStart(2, '0');
  return `${year}-${month}-${day}T${hours}:${minutes}`;
};

// Format time N hours later
export const getHoursLaterLocalDatetimeStr = (hoursLater: number): string => {
  const d = new Date();
  d.setHours(d.getHours() + hoursLater);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const hours = String(d.getHours()).padStart(2, '0');
  const minutes = String(d.getMinutes()).padStart(2, '0');
  return `${year}-${month}-${day}T${hours}:${minutes}`;
};

// Convert ISO string or datetime string to local datetime-local value (YYYY-MM-DDTHH:mm)
export const toDatetimeLocalString = (isoStr?: string | null): string => {
  if (!isoStr) return '';
  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(isoStr)) {
    return isoStr;
  }
  try {
    const d = new Date(isoStr);
    if (isNaN(d.getTime())) {
      return isoStr.slice(0, 16);
    }
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const hours = String(d.getHours()).padStart(2, '0');
    const minutes = String(d.getMinutes()).padStart(2, '0');
    return `${year}-${month}-${day}T${hours}:${minutes}`;
  } catch {
    return isoStr.slice(0, 16);
  }
};

// Convert local datetime-local string (YYYY-MM-DDTHH:mm) to standard string
export const fromDatetimeLocalString = (val: string): string | null => {
  if (!val) return null;
  return val; // Keep clean local string YYYY-MM-DDTHH:mm to avoid UTC timezone shifts
};



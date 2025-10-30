import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Helper function to convert Firestore Timestamp to Date
export function toDate(timestamp: any): Date {
  if (!timestamp) {
    return new Date();
  }
  
  if (timestamp?.toDate && typeof timestamp.toDate === 'function') {
    return timestamp.toDate();
  }
  
  if (timestamp instanceof Date) {
    return timestamp;
  }
  
  // Handle Firestore Timestamp objects that might not have toDate method
  if (timestamp?.seconds && timestamp?.nanoseconds) {
    return new Date(timestamp.seconds * 1000 + timestamp.nanoseconds / 1000000);
  }
  
  // Handle ISO string or timestamp number
  const date = new Date(timestamp);
  if (isNaN(date.getTime())) {
    console.warn('Invalid timestamp provided to toDate:', timestamp);
    return new Date();
  }
  
  return date;
}

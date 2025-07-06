import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Jakarta timezone utilities
export const JAKARTA_TIMEZONE = 'Asia/Jakarta'

export function formatDateJakarta(dateString: string, options?: Intl.DateTimeFormatOptions) {
  const defaultOptions: Intl.DateTimeFormatOptions = {
    timeZone: JAKARTA_TIMEZONE,
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  }
  
  return new Date(dateString).toLocaleDateString('id-ID', {
    ...defaultOptions,
    ...options
  })
}

export function formatDateTimeJakarta(dateString: string) {
  return formatDateJakarta(dateString, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  })
}

export function formatDateOnlyJakarta(dateString: string) {
  return formatDateJakarta(dateString, {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  })
}

export function getCurrentJakartaTime() {
  return new Date().toLocaleString('sv-SE', { 
    timeZone: JAKARTA_TIMEZONE 
  }).replace(' ', 'T') + '+07:00'
}

import { format, formatDistance, formatRelative, parseISO } from 'date-fns'
import { tr } from 'date-fns/locale'

/**
 * Tarih formatlama fonksiyonları
 */

export function formatDate(date: string | Date, formatStr = 'dd MMMM yyyy'): string {
  const dateObj = typeof date === 'string' ? parseISO(date) : date
  return format(dateObj, formatStr, { locale: tr })
}

export function formatDateTime(date: string | Date): string {
  return formatDate(date, 'dd MMMM yyyy HH:mm')
}

export function formatTime(date: string | Date): string {
  return formatDate(date, 'HH:mm')
}

export function formatRelativeDate(date: string | Date): string {
  const dateObj = typeof date === 'string' ? parseISO(date) : date
  return formatRelative(dateObj, new Date(), { locale: tr })
}

export function formatDistanceToNow(date: string | Date): string {
  const dateObj = typeof date === 'string' ? parseISO(date) : date
  return formatDistance(dateObj, new Date(), { addSuffix: true, locale: tr })
}

/**
 * Sayı formatlama fonksiyonları
 */

export function formatNumber(num: number, decimals = 0): string {
  return new Intl.NumberFormat('tr-TR', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(num)
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('tr-TR', {
    style: 'currency',
    currency: 'TRY',
  }).format(amount)
}

export function formatPercentage(value: number, decimals = 0): string {
  return `%${formatNumber(value, decimals)}`
}

export function formatDistanceKm(km: number): string {
  if (km < 1) {
    return `${formatNumber(km * 1000)} m`
  }
  return `${formatNumber(km, 2)} km`
}

/**
 * Telefon numarası formatlama
 */

export function formatPhoneNumber(phone: string): string {
  // Türkiye telefon formatı: +90 (5XX) XXX XX XX
  const cleaned = phone.replace(/\D/g, '')
  
  if (cleaned.startsWith('90')) {
    const number = cleaned.slice(2)
    if (number.length === 10) {
      return `+90 (${number.slice(0, 3)}) ${number.slice(3, 6)} ${number.slice(6, 8)} ${number.slice(8)}`
    }
  } else if (cleaned.length === 10) {
    return `+90 (${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)} ${cleaned.slice(6, 8)} ${cleaned.slice(8)}`
  }
  
  return phone
}

/**
 * Metin kısaltma
 */

export function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text
  return text.slice(0, maxLength) + '...'
}

/**
 * İlk harfleri büyük yap
 */

export function capitalize(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1).toLowerCase()
}

export function capitalizeWords(text: string): string {
  return text
    .split(' ')
    .map(word => capitalize(word))
    .join(' ')
}

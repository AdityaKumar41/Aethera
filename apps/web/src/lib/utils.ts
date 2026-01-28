import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(value: number, currency = 'USD'): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(value);
}

export function formatPercentage(value: number): string {
  return `${value.toFixed(1)}%`;
}

export function formatNumber(value: number): string {
  return new Intl.NumberFormat('en-US').format(value);
}

export function truncateAddress(address: string, chars = 6): string {
  if (!address) return '';
  return `${address.slice(0, chars)}...${address.slice(-chars)}`;
}

export function formatDate(date: Date | string): string {
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  }).format(new Date(date));
}

export function formatDateTime(date: Date | string): string {
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(date));
}

export function getStatusColor(status: string): string {
  const colors: Record<string, string> = {
    PENDING: 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20',
    IN_REVIEW: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
    VERIFIED: 'bg-green-500/10 text-green-500 border-green-500/20',
    APPROVED: 'bg-green-500/10 text-green-500 border-green-500/20',
    REJECTED: 'bg-red-500/10 text-red-500 border-red-500/20',
    FUNDING: 'bg-stellar-500/10 text-stellar-500 border-stellar-500/20',
    FUNDED: 'bg-solar-500/10 text-solar-500 border-solar-500/20',
    ACTIVE: 'bg-green-500/10 text-green-500 border-green-500/20',
    COMPLETED: 'bg-gray-500/10 text-gray-500 border-gray-500/20',
    CONFIRMED: 'bg-green-500/10 text-green-500 border-green-500/20',
    FAILED: 'bg-red-500/10 text-red-500 border-red-500/20',
  };
  return colors[status] || 'bg-gray-500/10 text-gray-500 border-gray-500/20';
}

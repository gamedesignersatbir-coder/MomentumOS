// lib/timezones.ts — single source of truth for supported IANA timezones

export const TIMEZONES = [
  { value: 'Asia/Kolkata',        label: 'India (IST, UTC+5:30)' },
  { value: 'America/New_York',    label: 'New York (ET, UTC-5/-4)' },
  { value: 'America/Chicago',     label: 'Chicago (CT, UTC-6/-5)' },
  { value: 'America/Denver',      label: 'Denver (MT, UTC-7/-6)' },
  { value: 'America/Los_Angeles', label: 'Los Angeles (PT, UTC-8/-7)' },
  { value: 'America/Vancouver',   label: 'Vancouver (PT, UTC-8/-7)' },
  { value: 'America/Toronto',     label: 'Toronto (ET, UTC-5/-4)' },
  { value: 'America/Sao_Paulo',   label: 'São Paulo (BRT, UTC-3)' },
  { value: 'Europe/London',       label: 'London (GMT/BST, UTC+0/+1)' },
  { value: 'Europe/Paris',        label: 'Paris / Berlin (CET, UTC+1/+2)' },
  { value: 'Europe/Amsterdam',    label: 'Amsterdam / Brussels (CET, UTC+1/+2)' },
  { value: 'Europe/Moscow',       label: 'Moscow (MSK, UTC+3)' },
  { value: 'Asia/Dubai',          label: 'Dubai (GST, UTC+4)' },
  { value: 'Asia/Singapore',      label: 'Singapore (SGT, UTC+8)' },
  { value: 'Asia/Tokyo',          label: 'Tokyo (JST, UTC+9)' },
  { value: 'Asia/Seoul',          label: 'Seoul (KST, UTC+9)' },
  { value: 'Australia/Sydney',    label: 'Sydney (AEST, UTC+10/+11)' },
  { value: 'Pacific/Auckland',    label: 'Auckland (NZST, UTC+12/+13)' },
  { value: 'UTC',                 label: 'UTC' },
] as const;

export type TimezoneValue = (typeof TIMEZONES)[number]['value'];

/** Tuple of all valid timezone values — use with z.enum() */
export const TIMEZONE_VALUES = TIMEZONES.map((tz) => tz.value) as [TimezoneValue, ...TimezoneValue[]];

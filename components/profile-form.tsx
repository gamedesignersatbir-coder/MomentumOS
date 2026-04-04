'use client';

import { useState, useTransition } from 'react';
import { updateProfileAction } from '@/app/actions';
import { minutesToTime, DOMAINS } from '@/lib/curriculum-types';
import type { UserProfile } from '@/lib/types';

const TIMEZONES = [
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
  { value: 'Europe/Amsterdam',    label: 'Amsterdam (CET, UTC+1/+2)' },
  { value: 'Europe/Moscow',       label: 'Moscow (MSK, UTC+3)' },
  { value: 'Asia/Dubai',          label: 'Dubai (GST, UTC+4)' },
  { value: 'Asia/Singapore',      label: 'Singapore (SGT, UTC+8)' },
  { value: 'Asia/Tokyo',          label: 'Tokyo (JST, UTC+9)' },
  { value: 'Asia/Seoul',          label: 'Seoul (KST, UTC+9)' },
  { value: 'Australia/Sydney',    label: 'Sydney (AEST, UTC+10/+11)' },
  { value: 'Pacific/Auckland',    label: 'Auckland (NZST, UTC+12/+13)' },
  { value: 'UTC',                 label: 'UTC' },
];

interface Props {
  profile: UserProfile | null;
  currentDomains: string[];
}

export function ProfileForm({ profile, currentDomains }: Props) {
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState<{ text: string; ok: boolean } | null>(null);

  function handleSubmit(formData: FormData) {
    // Collect checked domains into JSON string
    const checkedDomains = DOMAINS.filter(
      (d) => formData.get(`domain_${d}`) === 'on'
    );
    formData.set('domains', JSON.stringify(checkedDomains));

    startTransition(async () => {
      const result = await updateProfileAction(formData);
      setMessage({ text: result.message, ok: result.ok });
    });
  }

  const p = profile;
  return (
    <form action={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
      <div>
        <label className="soft-close-label">Display name</label>
        <input
          name="display_name"
          defaultValue={p?.display_name ?? 'Satbir'}
          className="input"
        />
      </div>

      <div>
        <label className="soft-close-label">About me (fed into AI prompts)</label>
        <textarea
          name="about_me"
          defaultValue={p?.about_me ?? ''}
          className="textarea"
          rows={4}
          placeholder="Game designer. Meditator. Curious about AI and game design."
        />
      </div>

      <div>
        <label className="soft-close-label">Domains of focus</label>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-2)', marginTop: 'var(--space-2)' }}>
          {DOMAINS.map((d) => (
            <label
              key={d}
              style={{
                display: 'flex', alignItems: 'center', gap: 'var(--space-2)',
                cursor: 'pointer', fontSize: '0.875rem', color: 'var(--text-secondary)',
              }}
            >
              <input
                type="checkbox"
                name={`domain_${d}`}
                defaultChecked={currentDomains.includes(d)}
              />
              {d}
            </label>
          ))}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-4)' }}>
        <div>
          <label className="soft-close-label">Morning sadhana ends</label>
          <input type="time" name="sadhana_morning_end" defaultValue={minutesToTime(p?.sadhana_morning_end ?? 480)} className="input" />
        </div>
        <div>
          <label className="soft-close-label">Work day starts</label>
          <input type="time" name="work_start" defaultValue={minutesToTime(p?.work_start ?? 480)} className="input" />
        </div>
        <div>
          <label className="soft-close-label">Afternoon sadhana starts</label>
          <input type="time" name="sadhana_afternoon_start" defaultValue={minutesToTime(p?.sadhana_afternoon_start ?? 840)} className="input" />
        </div>
        <div>
          <label className="soft-close-label">Afternoon sadhana ends</label>
          <input type="time" name="sadhana_afternoon_end" defaultValue={minutesToTime(p?.sadhana_afternoon_end ?? 900)} className="input" />
        </div>
        <div>
          <label className="soft-close-label">Work day ends</label>
          <input type="time" name="work_end" defaultValue={minutesToTime(p?.work_end ?? 1110)} className="input" />
        </div>
      </div>

      <div>
        <label className="soft-close-label">Timezone</label>
        <select
          name="timezone"
          defaultValue={p?.timezone ?? 'Asia/Kolkata'}
          className="input"
          style={{ cursor: 'pointer' }}
        >
          {TIMEZONES.map((tz) => (
            <option key={tz.value} value={tz.value}>
              {tz.label}
            </option>
          ))}
        </select>
      </div>

      {message && (
        <p style={{ fontSize: '0.875rem', color: message.ok ? 'var(--success)' : 'var(--error)' }}>
          {message.text}
        </p>
      )}

      <button type="submit" className="btn-primary" disabled={isPending}>
        {isPending ? 'Saving…' : 'Save profile'}
      </button>
    </form>
  );
}

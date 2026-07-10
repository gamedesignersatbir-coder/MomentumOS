'use client';

import { useRef, useState, useTransition } from 'react';
import { addTask, toggleTask, carryTask, letGoTask } from '@/app/actions';
import type { Task } from '@/lib/types';

export function TodayTasks({ tasks, carryover }: { tasks: Task[]; carryover: Task[] }) {
  const [notice, setNotice] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const formRef = useRef<HTMLFormElement>(null);

  function handleAdd(formData: FormData) {
    startTransition(async () => {
      const result = await addTask(formData);
      if ('error' in result) {
        setNotice(result.error);
      } else {
        setNotice(result.landed === 'tomorrow' ? 'Today is full — saved for tomorrow.' : null);
        formRef.current?.reset();
      }
    });
  }

  return (
    <div className="mt-3">
      {carryover.length > 0 && (
        <div className="mb-4 space-y-1">
          <p className="text-xs text-muted">From before —</p>
          {carryover.map((task) => (
            <div key={task.id} className="flex items-center gap-3 py-1 text-sm">
              <span className="flex-1 text-muted">{task.title}</span>
              <button
                onClick={() => startTransition(() => carryTask(task.id))}
                className="text-accent hover:underline"
              >
                carry
              </button>
              <button
                onClick={() => startTransition(() => letGoTask(task.id))}
                className="text-faint hover:text-danger hover:underline"
              >
                let go
              </button>
            </div>
          ))}
        </div>
      )}

      <ul>
        {tasks.map((task) => (
          <li key={task.id} className="flex items-baseline gap-3 border-b border-line py-2.5 last:border-0">
            <button
              aria-label={task.status === 'done' ? 'Mark not done' : 'Mark done'}
              onClick={() => startTransition(() => toggleTask(task.id, task.status !== 'done'))}
              className={`relative top-0.5 h-4 w-4 flex-none rounded-full border-[1.5px] transition-colors ${
                task.status === 'done' ? 'border-accent bg-accent' : 'border-muted hover:border-accent'
              }`}
            />
            <span className={`flex-1 ${task.status === 'done' ? 'text-muted line-through' : ''}`}>
              {task.url ? (
                <a href={task.url} target="_blank" rel="noreferrer" className="text-inherit">
                  {task.title}
                </a>
              ) : (
                task.title
              )}
            </span>
          </li>
        ))}
      </ul>

      <form ref={formRef} action={handleAdd} className="mt-2">
        <input
          name="title"
          placeholder="+ anything — 2 seconds, no categories"
          maxLength={300}
          disabled={pending}
          className="w-full border-0 bg-transparent py-2 text-[15px] placeholder:text-faint focus:outline-none"
        />
      </form>
      {notice && <p className="mt-1 text-xs text-muted">{notice}</p>}
    </div>
  );
}

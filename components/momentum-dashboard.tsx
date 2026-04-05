"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import {
  BookOpen,
  BrainCircuit,
  CheckCircle2,
  ChevronRight,
  ClipboardList,
  Copy,
  Plus,
  RotateCcw,
  Search,
  Sparkles,
  Target,
  Timer,
  X
} from "lucide-react";
import { useRouter } from "next/navigation";

import {
  addFocusBlockAction,
  addLearningEntryAction,
  addPriorityAction,
  addQuickTaskAction,
  dismissResurfaceAction,
  generateMilestoneNarrativeAction,
  recordGreetingAction,
  restoreTaskAction,
  saveReflectionAction,
  toggleFocusBlockAction,
  togglePriorityAction,
  toggleQuickTaskAction
} from "@/app/actions";
import { SoftCloseModal } from './soft-close-modal';
import { useToast } from "@/components/toaster";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Field } from "@/components/ui/field";
import { Modal } from "@/components/ui/modal";
import { ProgressBar } from "@/components/ui/progress-bar";
import { format } from "date-fns";

import { cx } from "@/lib/utils";
import type { TimeMode } from "@/lib/time-mode";
import { isQuietMode } from "@/lib/time-mode";
import type { GreetingMessage } from "@/lib/greetings-library";
import type { DashboardData, UserProfile } from "@/lib/types";
import { getOneThing } from "@/lib/one-thing";
import type { Priority } from "@/lib/one-thing";
import { GreetingBar } from "./greeting-bar";
import { OneThingCard } from "./one-thing-card";
import { QuickCapture } from "./quick-capture";
import { QuietMode } from "./quiet-mode";
import { StuckOverlay } from "./stuck-overlay";
import { TriageModal } from "./triage-modal";

const completionTone = ["bg-rose-300/70", "bg-amber-300/70", "bg-cyan-300/70", "bg-emerald-300/70"];

async function copyToClipboard(value: string) {
  await navigator.clipboard.writeText(value);
}

interface Props {
  data: DashboardData;
  greeting: GreetingMessage;
  currentMode: TimeMode;
  userProfile: UserProfile | null;
  srDueCount: number;
}

export function MomentumDashboard({
  data,
  greeting,
  currentMode,
  userProfile: _userProfile,
  srDueCount,
}: Props) {
  const todayLabel = format(new Date(), "EEEE, MMM d");
  const router = useRouter();
  const { pushToast } = useToast();
  const [isReflectionOpen, setIsReflectionOpen] = useState(false);
  const [reflectionSuggestion, setReflectionSuggestion] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const searchRef = useRef<HTMLInputElement>(null);
  const [promptQuery, setPromptQuery] = useState("");
  const [dismissedUntil, setDismissedUntil] = useState<number | null>(null);
  const [triageOpen, setTriageOpen] = useState(false);
  const [softCloseOpen, setSoftCloseOpen] = useState(false);
  const [softCloseShownThisSession, setSoftCloseShownThisSession] = useState(false);
  const [showAllPriorities, setShowAllPriorities] = useState(false);
  const [deferredExpanded, setDeferredExpanded] = useState(false);
  const [resurfaceDismissed, setResurfaceDismissed] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [milestoneNarrative, setMilestoneNarrative] = useState<string | null>(
    data.milestone?.narrative ?? null
  );
  const oneThing = getOneThing(data.priorities as Priority[], currentMode);

  const displayPriorities = useMemo(
    () => data.priorities.filter((p) => p.status !== 'deferred'),
    [data.priorities]
  );
  const displayQuickTasks = useMemo(
    () => data.quickTasks.filter((t) => t.status !== 'deferred'),
    [data.quickTasks]
  );
  const deferredPriorities = useMemo(
    () => data.priorities.filter((p) => p.status === 'deferred'),
    [data.priorities]
  );
  const deferredTasks = useMemo(
    () => data.quickTasks.filter((t) => t.status === 'deferred'),
    [data.quickTasks]
  );
  const hasDeferredItems = deferredPriorities.length > 0 || deferredTasks.length > 0;

  const totalActive =
    data.priorities.filter((p) => p.status === 'active').length +
    data.quickTasks.filter((t) => t.status === 'active').length;
  const isOverloaded = totalActive > 8;

  const filteredPrompts = useMemo(() => {
    const query = promptQuery.toLowerCase();
    return data.prompts.filter((prompt) => {
      const haystack = `${prompt.title} ${prompt.content} ${prompt.tags.join(" ")}`.toLowerCase();
      return haystack.includes(query);
    });
  }, [data.prompts, promptQuery]);

  useEffect(() => {
    if (currentMode === 'reflection' && !softCloseShownThisSession) {
      const t = setTimeout(() => {
        setSoftCloseOpen(true);
        setSoftCloseShownThisSession(true);
      }, 2000);
      return () => clearTimeout(t);
    }
  }, [currentMode, softCloseShownThisSession]);

  function runAction<T>(work: () => Promise<T>, message?: string) {
    startTransition(async () => {
      try {
        const result = (await work()) as { message?: string; suggestion?: string };
        if (message || result.message) {
          pushToast({ title: message ?? result.message ?? "Saved" });
        }
        if (result.suggestion) {
          setReflectionSuggestion(result.suggestion);
        }
        router.refresh();
      } catch (error) {
        pushToast({
          title: error instanceof Error ? error.message : "Something went wrong.",
          tone: "error"
        });
      }
    });
  }

  if (isQuietMode(currentMode)) {
    return <QuietMode greeting={greeting} />;
  }

  return (
    <main className="page-wrapper">
      <GreetingBar initialGreeting={greeting} onShown={recordGreetingAction} />
      {currentMode === 'morning-brief' && srDueCount > 0 && (
        <div className="overload-prompt" style={{ marginBottom: 'var(--space-4)' }}>
          <span>
            {srDueCount} learning {srDueCount === 1 ? 'review' : 'reviews'} due today —
          </span>
          <a href="/learn#reviews" className="btn-link" style={{ marginLeft: 4 }}>
            review now
          </a>
        </div>
      )}
      {data.milestone && (
        <div className="rounded-[28px] border border-amber-400/20 bg-amber-500/[0.06] px-6 py-5 mb-4">
          <div className="flex items-center gap-3 mb-3">
            <span className="text-amber-400 font-semibold">Day {data.milestone.day}</span>
            <span className="text-xs text-amber-300/60 uppercase tracking-widest">Milestone</span>
          </div>
          {milestoneNarrative ? (
            <p className="text-sm text-slate-300 leading-relaxed">{milestoneNarrative}</p>
          ) : (
            <div className="flex items-center gap-4">
              <p className="text-sm text-slate-400">
                Your {data.milestone.day}-day story is ready to be written.
              </p>
              <button
                className="btn-primary shrink-0 text-sm px-4 py-2"
                disabled={isGenerating}
                onClick={async () => {
                  setIsGenerating(true);
                  try {
                    const result = await generateMilestoneNarrativeAction(data.milestone!.day as 30 | 100);
                    if (result.ok && result.narrative) {
                      setMilestoneNarrative(result.narrative);
                    } else if (!result.ok) {
                      pushToast({
                        title: result.message ?? "Couldn't generate narrative — check your connection and try again.",
                        tone: "error"
                      });
                    }
                  } finally {
                    setIsGenerating(false);
                  }
                }}
              >
                {isGenerating ? 'Writing…' : 'Generate my story'}
              </button>
            </div>
          )}
        </div>
      )}
      {data.resurfacedReflection && !resurfaceDismissed && (
        <div className="rounded-[28px] border border-amber-200/10 bg-amber-500/[0.04] px-5 py-4 mb-4 flex items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="text-xs uppercase tracking-[0.22em] text-amber-300/60 mb-1">
              {data.resurfacedReflection.days_ago} days ago
            </p>
            <p className="text-sm text-slate-300 line-clamp-2">
              {data.resurfacedReflection.energy_win}
            </p>
          </div>
          <button
            className="shrink-0 text-slate-500 hover:text-slate-300 transition"
            onClick={() => {
              setResurfaceDismissed(true);
              runAction(() => dismissResurfaceAction(data.resurfacedReflection!.id));
            }}
            aria-label="Dismiss"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}
      <OneThingCard
        priority={oneThing}
        onComplete={(id) => {
          runAction(() => togglePriorityAction(id));
        }}
        onDismiss={() => setDismissedUntil(Date.now() + 60 * 60 * 1000)}
        dismissedUntil={dismissedUntil}
      />
      {isOverloaded && !triageOpen && (
        <div className="overload-prompt">
          <span>Things are getting full —</span>
          <button className="btn-link" onClick={() => setTriageOpen(true)}>
            quick triage?
          </button>
        </div>
      )}
      {triageOpen && (
        <TriageModal
          priorities={data.priorities as Priority[]}
          quickTasks={data.quickTasks}
          onClose={() => setTriageOpen(false)}
        />
      )}
      <section className="glass animate-rise rounded-[32px] p-5 sm:p-8">
        <div className="grid gap-5 lg:grid-cols-[minmax(0,1.35fr)_minmax(300px,0.95fr)] lg:items-center">
          <div className="min-w-0 space-y-4">
            <Badge className="hero-chip">Momentum OS</Badge>
            <div className="max-w-4xl">
              <p className="text-sm uppercase tracking-[0.28em] text-cyan-100/70">Momentum OS</p>
              <h1 className="mt-2 max-w-[12ch] font-serif text-5xl leading-[0.98] sm:max-w-[13ch] sm:text-6xl xl:text-7xl">
                Where focused days take form.
              </h1>
              <p className="mt-4 max-w-2xl text-sm leading-7 text-slate-200/75 sm:text-base">
                A refined workspace for priorities, learning, and a schedule that doesn&apos;t collapse by evening.
              </p>
            </div>
            <div className="flex flex-wrap gap-3 text-sm text-slate-200/80">
              <span className="rounded-full border border-white/10 px-3 py-1">Today {todayLabel}</span>
              <span className="rounded-full border border-white/10 px-3 py-1">
                {data.summary.completedPriorities}/{displayPriorities.length || 1} priorities complete
              </span>
              <span className="rounded-full border border-white/10 px-3 py-1">
                {data.summary.learningMinutesWeek} learning minutes this week
              </span>
            </div>
          </div>
          <div className="grid gap-3 xl:grid-cols-2">
            <Card className="rounded-3xl p-4">
              <p className="text-xs uppercase tracking-[0.24em] text-dim">Daily momentum</p>
              <p className="mt-2 text-3xl font-semibold">{data.summary.momentumScore}%</p>
              <ProgressBar value={data.summary.momentumScore} className="mt-4" />
            </Card>
            <Card className="rounded-3xl p-4">
              <p className="text-xs uppercase tracking-[0.24em] text-dim">Next review prompt</p>
              <p className="mt-2 text-sm text-slate-100/90">{data.summary.nextReviewCue}</p>
              <Button className="mt-4 w-full" onClick={() => setIsReflectionOpen(true)}>
                Open Nightly Reflection
              </Button>
            </Card>
          </div>
        </div>
      </section>

      <div className="grid gap-6 xl:grid-cols-[1.35fr_0.95fr]">
        <section className="section-grid">
          <div id="priorities-section">
          <Card className="rounded-[28px] p-5 sm:p-6">
            <div className="mb-5 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <Target className="h-5 w-5 text-cyan-200" />
                  <h2 className="text-2xl font-semibold">Daily Plan Board</h2>
                </div>
                <p className="mt-1 text-sm text-dim">
                  Keep the top three sharp, protect focus blocks, and clear small tasks without context switching.
                </p>
              </div>
              <p className="text-sm text-cyan-100/80">Keyboard tip: press <kbd className="rounded bg-white/10 px-2 py-1">Shift</kbd> + <kbd className="rounded bg-white/10 px-2 py-1">R</kbd> for reflection.</p>
            </div>

            <div className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
              <div className="space-y-4">
                <form
                  className="subtle-panel grid gap-3 rounded-3xl p-4"
                  action={(formData) => runAction(() => addPriorityAction(formData))}
                >
                  <div className="flex items-center gap-2 text-sm font-medium text-slate-100">
                    <Plus className="h-4 w-4" />
                    Add top priority
                  </div>
                  <Field name="title" placeholder="Ship combat prototype tweak" />
                  <Field name="detail" placeholder="Define outcome or obstacle to remove" />
                  <Button type="submit" disabled={isPending}>
                    Save priority
                  </Button>
                </form>

                <div className="grid gap-3">
                  {displayPriorities.length ? (
                    <>
                      {(showAllPriorities ? displayPriorities : displayPriorities.slice(0, 3)).map((priority) => (
                        <button
                          key={priority.id}
                          type="button"
                          onClick={() => runAction(() => togglePriorityAction(priority.id))}
                          className={cx(
                            "text-left rounded-3xl border p-4 transition hover:border-cyan-200/40",
                            priority.status === "done"
                              ? "border-emerald-300/30 bg-emerald-300/10"
                              : "border-white/10 bg-white/[0.03]"
                          )}
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <p className="text-xs uppercase tracking-[0.22em] text-dim">Priority {priority.rank}</p>
                              <h3 className="mt-1 text-lg font-semibold">{priority.title}</h3>
                              <p className="mt-2 text-sm text-slate-300/80">{priority.detail}</p>
                            </div>
                            <CheckCircle2
                              className={cx(
                                "mt-1 h-5 w-5",
                                priority.status === "done" ? "text-emerald-300" : "text-slate-500"
                              )}
                            />
                          </div>
                        </button>
                      ))}
                      {!showAllPriorities && displayPriorities.length > 3 && (
                        <button
                          type="button"
                          className="btn-ghost btn-small"
                          onClick={() => setShowAllPriorities(true)}
                        >
                          and {displayPriorities.length - 3} more...
                        </button>
                      )}
                    </>
                  ) : (
                    <EmptyState title="No priorities yet" description="Add up to three priority outcomes for the day." />
                  )}
                </div>
              </div>

              <div className="space-y-4">
                <form
                  className="subtle-panel grid gap-3 rounded-3xl p-4"
                  action={(formData) => runAction(() => addFocusBlockAction(formData))}
                >
                  <div className="flex items-center gap-2 text-sm font-medium text-slate-100">
                    <Timer className="h-4 w-4" />
                    Schedule focus block
                  </div>
                  <Field name="label" placeholder="AI prototyping study" />
                  <div className="grid gap-3 sm:grid-cols-2">
                    <Field name="startTime" type="time" />
                    <Field name="endTime" type="time" />
                  </div>
                  <select
                    name="intensity"
                    defaultValue="Deep"
                    className="h-11 rounded-2xl border border-white/10 bg-slate-950/60 px-4"
                  >
                    <option>Deep</option>
                    <option>Steady</option>
                    <option>Light</option>
                  </select>
                  <Button type="submit" variant="secondary" disabled={isPending}>
                    Save block
                  </Button>
                </form>

                <div className="grid gap-3">
                  {data.focusBlocks.length ? (
                    data.focusBlocks.map((block) => (
                      <button
                        key={block.id}
                        type="button"
                        onClick={() => runAction(() => toggleFocusBlockAction(block.id))}
                        className={cx(
                          "rounded-3xl border p-4 text-left transition",
                          block.status === "done"
                            ? "border-cyan-200/30 bg-cyan-300/10"
                            : "border-white/10 bg-white/[0.03]"
                        )}
                      >
                        <div className="flex items-center justify-between gap-3">
                          <div>
                            <p className="text-sm font-medium">{block.label}</p>
                            <p className="mt-1 text-sm text-dim">
                              {block.startTime} to {block.endTime} · {block.intensity}
                            </p>
                          </div>
                          <Badge>{block.status === "done" ? "Closed" : "Live"}</Badge>
                        </div>
                      </button>
                    ))
                  ) : (
                    <EmptyState title="No focus blocks yet" description="Protect your highest-quality hours here." />
                  )}
                </div>

                <div className="subtle-panel rounded-3xl p-4">
                  <div className="mb-3 flex items-center gap-2">
                    <ClipboardList className="h-4 w-4 text-cyan-200" />
                    <p className="text-sm font-medium">Quick tasks</p>
                  </div>
                  <form
                    className="mb-3 flex gap-2"
                    action={(formData) => runAction(() => addQuickTaskAction(formData))}
                  >
                    <Field name="title" placeholder="Reply to audio vendor" className="flex-1" />
                    <Button type="submit" size="icon" disabled={isPending} aria-label="Add quick task">
                      <Plus className="h-4 w-4" />
                    </Button>
                  </form>
                  <div className="space-y-2">
                    {displayQuickTasks.length ? (
                      displayQuickTasks.map((task) => (
                        <label
                          key={task.id}
                          className="flex cursor-pointer items-center gap-3 rounded-2xl border border-white/8 px-3 py-2"
                        >
                          <input
                            type="checkbox"
                            checked={task.status === "done"}
                            onChange={() => runAction(() => toggleQuickTaskAction(task.id))}
                            className="h-4 w-4 accent-cyan-300"
                          />
                          <span
                            className={cx(
                              "text-sm",
                              task.status === "done" ? "text-slate-400 line-through" : "text-slate-100"
                            )}
                          >
                            {task.title}
                          </span>
                        </label>
                      ))
                    ) : (
                      <EmptyState title="Inbox clear" description="Quick tasks you capture here stay out of your head." />
                    )}
                  </div>
                </div>
              </div>
            </div>
          </Card>
          </div>

          <Card className="rounded-[28px] p-5 sm:p-6">
            <div className="mb-5 flex items-center gap-2">
              <BrainCircuit className="h-5 w-5 text-cyan-200" />
              <div>
                <h2 className="text-2xl font-semibold">Learning Sprint Tracker</h2>
                <p className="text-sm text-dim">Capture fast loops: what you studied, confidence, and the next concrete move.</p>
              </div>
            </div>
            <div className="grid gap-4 lg:grid-cols-[0.95fr_1.05fr]">
              <form
                className="subtle-panel grid gap-3 rounded-3xl p-4"
                action={(formData) => runAction(() => addLearningEntryAction(formData))}
              >
                <Field name="topic" placeholder="Procedural encounter pacing" />
                <div className="grid gap-3 sm:grid-cols-2">
                  <Field name="minutes" type="number" min={5} max={240} placeholder="45" />
                  <select
                    name="confidence"
                    defaultValue="3"
                    className="h-11 rounded-2xl border border-white/10 bg-slate-950/60 px-4"
                  >
                    {[1, 2, 3, 4, 5].map((value) => (
                      <option key={value} value={value}>
                        Confidence {value}/5
                      </option>
                    ))}
                  </select>
                </div>
                <Field as="textarea" name="notes" placeholder="What clicked? What still feels fuzzy?" rows={4} />
                <Field name="nextAction" placeholder="Next action" />
                <Button type="submit" disabled={isPending}>
                  Save sprint
                </Button>
              </form>

              <div className="grid gap-3">
                {data.learningEntries.length ? (
                  data.learningEntries.map((entry) => (
                    <div key={entry.id} className="rounded-3xl border border-white/10 bg-white/[0.03] p-4">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <p className="text-xs uppercase tracking-[0.2em] text-dim">{entry.minutes} min sprint</p>
                          <h3 className="mt-1 text-lg font-semibold">{entry.topic}</h3>
                        </div>
                        <Badge>{entry.confidence}/5 confidence</Badge>
                      </div>
                      <p className="mt-3 text-sm text-slate-300/85">{entry.notes}</p>
                      <div className="mt-4 flex items-center gap-2 text-sm text-cyan-100/85">
                        <ChevronRight className="h-4 w-4" />
                        {entry.nextAction}
                      </div>
                    </div>
                  ))
                ) : (
                  <EmptyState title="No learning sprints logged" description="Use this to turn study into visible momentum." />
                )}
              </div>
            </div>
          </Card>
        </section>

        <section className="section-grid">
          <Card className="rounded-[28px] p-5 sm:p-6">
            <div className="mb-5 flex items-center gap-2">
              <BookOpen className="h-5 w-5 text-cyan-200" />
              <div>
                <h2 className="text-2xl font-semibold">Weekly Review</h2>
                <p className="text-sm text-dim">A compact dashboard for consistency, volume, and trendline quality.</p>
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              <Card className="rounded-3xl p-4">
                <p className="text-xs uppercase tracking-[0.2em] text-dim">Streak</p>
                <p className="mt-2 text-3xl font-semibold">{data.summary.streakDays} days</p>
              </Card>
              <Card className="rounded-3xl p-4">
                <p className="text-xs uppercase tracking-[0.2em] text-dim">Learning time</p>
                <p className="mt-2 text-3xl font-semibold">{data.summary.learningMinutesWeek} min</p>
              </Card>
              <Card className="rounded-3xl p-4">
                <p className="text-xs uppercase tracking-[0.2em] text-dim">Completed today</p>
                <p className="mt-2 text-3xl font-semibold">{data.summary.completedToday}</p>
              </Card>
            </div>
            <div className="mt-5 rounded-3xl border border-white/10 p-4">
              <div className="mb-4 flex items-center justify-between">
                <p className="text-sm font-medium">Completion trend</p>
                <p className="text-xs uppercase tracking-[0.2em] text-dim">Last 7 days</p>
              </div>
              <div className="grid grid-cols-7 gap-2">
                {data.weeklyTrend.map((day, index) => (
                  <div key={day.date} className="flex flex-col items-center gap-2">
                    <div className="flex h-32 w-full items-end rounded-2xl bg-white/[0.03] p-2">
                      <div
                        className={cx(
                          "w-full rounded-xl transition-all",
                          completionTone[Math.min(index, completionTone.length - 1)]
                        )}
                        style={{ height: `${Math.max(day.completionRate, 8)}%` }}
                      />
                    </div>
                    <div className="text-center">
                      <p className="text-xs text-slate-100">{day.label}</p>
                      <p className="text-[11px] text-dim">{day.completionRate}%</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </Card>

          <Card className="rounded-[28px] p-5 sm:p-6">
            <div className="mb-5 flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-cyan-200" />
              <div>
                <h2 className="text-2xl font-semibold">Smart Prompt Library</h2>
                <p className="text-sm text-dim">Searchable prompts for design thinking, AI study, and family planning. Press / to focus search.</p>
              </div>
            </div>
            <div className="relative mb-4">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                ref={searchRef}
                value={promptQuery}
                onChange={(event) => setPromptQuery(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Escape") {
                    setPromptQuery("");
                  }
                }}
                placeholder="Search prompts or tags"
                className="h-11 w-full rounded-2xl border border-white/10 bg-slate-950/60 pl-10 pr-4"
              />
            </div>
            <div className="mb-4 flex flex-wrap gap-2">
              {data.tags.map((tag) => (
                <button
                  key={tag}
                  type="button"
                  className="rounded-full border border-white/10 px-3 py-1 text-sm text-slate-200/85 transition hover:border-cyan-200/30"
                  onClick={() => setPromptQuery(tag)}
                >
                  #{tag}
                </button>
              ))}
            </div>
            <div className="grid gap-3">
              {filteredPrompts.length ? (
                filteredPrompts.map((prompt) => (
                  <div key={prompt.id} className="rounded-3xl border border-white/10 bg-white/[0.03] p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h3 className="text-lg font-semibold">{prompt.title}</h3>
                        <div className="mt-2 flex flex-wrap gap-2">
                          {prompt.tags.map((tag) => (
                            <Badge key={tag}>{tag}</Badge>
                          ))}
                        </div>
                      </div>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={async () => {
                          await copyToClipboard(prompt.content);
                          pushToast({ title: "Prompt copied." });
                        }}
                        aria-label={`Copy ${prompt.title}`}
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                    </div>
                    <p className="mt-3 text-sm text-slate-300/85">{prompt.content}</p>
                  </div>
                ))
              ) : (
                <EmptyState title="No prompts match" description="Try a different tag, or clear the search with Escape." />
              )}
            </div>
          </Card>
        </section>
      </div>

      {hasDeferredItems && (
        <section className="mt-6">
          <button
            type="button"
            className="flex w-full items-center justify-between rounded-[28px] border border-white/10 bg-white/[0.03] px-5 py-4 text-left transition hover:border-cyan-200/20"
            onClick={() => setDeferredExpanded((prev) => !prev)}
            aria-expanded={deferredExpanded}
          >
            <div className="flex items-center gap-3">
              <RotateCcw className="h-4 w-4 text-slate-400" />
              <span className="text-sm font-medium text-slate-300">Deferred items</span>
              <span className="rounded-full border border-white/10 bg-white/[0.06] px-2 py-0.5 text-xs text-slate-400">
                {deferredPriorities.length + deferredTasks.length}
              </span>
            </div>
            <ChevronRight
              className={cx(
                "h-4 w-4 text-slate-500 transition-transform",
                deferredExpanded && "rotate-90"
              )}
            />
          </button>

          {deferredExpanded && (
            <Card className="mt-2 rounded-[28px] p-5 sm:p-6">
              <div className="space-y-3">
                {deferredPriorities.length > 0 && (
                  <>
                    <p className="text-xs uppercase tracking-[0.22em] text-dim">Deferred priorities</p>
                    {deferredPriorities.map((priority) => (
                      <div
                        key={`dp-${priority.id}`}
                        className="flex items-start justify-between gap-4 rounded-3xl border border-white/10 bg-white/[0.03] p-4"
                      >
                        <div className="min-w-0">
                          <h3 className="text-sm font-medium text-slate-300">{priority.title}</h3>
                          {priority.detail && (
                            <p className="mt-1 text-sm text-dim">{priority.detail}</p>
                          )}
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          disabled={isPending}
                          onClick={() => runAction(() => restoreTaskAction(priority.id, 'priority'))}
                          aria-label={`Restore: ${priority.title}`}
                        >
                          <RotateCcw className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </>
                )}
                {deferredTasks.length > 0 && (
                  <>
                    <p className="mt-4 text-xs uppercase tracking-[0.22em] text-dim">Deferred quick tasks</p>
                    {deferredTasks.map((task) => (
                      <div
                        key={`dt-${task.id}`}
                        className="flex items-center justify-between gap-4 rounded-3xl border border-white/10 bg-white/[0.03] px-4 py-3"
                      >
                        <span className="text-sm text-slate-300">{task.title}</span>
                        <Button
                          variant="ghost"
                          size="icon"
                          disabled={isPending}
                          onClick={() => runAction(() => restoreTaskAction(task.id, 'quick_task'))}
                          aria-label={`Restore: ${task.title}`}
                        >
                          <RotateCcw className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </>
                )}
              </div>
            </Card>
          )}
        </section>
      )}

      <Modal
        open={isReflectionOpen}
        onOpenChange={(nextOpen) => {
          setIsReflectionOpen(nextOpen);
          if (!nextOpen) {
            setReflectionSuggestion(null);
          }
        }}
        title="Nightly Reflection"
        description="Three prompts to close the day cleanly and set up tomorrow with less drag."
      >
        <form
          className="grid gap-3"
          action={(formData) =>
            runAction(async () => {
              const result = await saveReflectionAction(formData);
              setIsReflectionOpen(true);
              return result;
            })
          }
        >
          <Field as="textarea" name="energyWin" rows={3} label="What created energy today?" />
          <Field as="textarea" name="learningEdge" rows={3} label="What still needs one more pass?" />
          <Field as="textarea" name="familyNote" rows={3} label="What mattered most at home?" />
          <Button type="submit" disabled={isPending}>
            Save reflection
          </Button>
        </form>
        {reflectionSuggestion ? (
          <div className="mt-4 rounded-3xl border border-cyan-200/20 bg-cyan-300/10 p-4">
            <p className="text-xs uppercase tracking-[0.2em] text-cyan-100/80">Next-day suggestion</p>
            <p className="mt-2 text-sm text-slate-100">{reflectionSuggestion}</p>
          </div>
        ) : null}
      </Modal>

      <KeyboardShortcuts
        onOpenReflection={() => setIsReflectionOpen(true)}
        onFocusSearch={() => searchRef.current?.focus()}
      />
      {(currentMode === 'reflection' || currentMode === 'evening') && (
        <button
          className="btn-ghost soft-close-trigger"
          onClick={() => setSoftCloseOpen(true)}
        >
          Close the day
        </button>
      )}
      {softCloseOpen && (
        <SoftCloseModal
          priorities={data.priorities as Priority[]}
          onClose={() => setSoftCloseOpen(false)}
        />
      )}
      <QuickCapture />
      {!isQuietMode(currentMode) && currentMode !== 'reflection' && (
        <StuckOverlay
          oneThing={oneThing}
          onStart={(id) => {
            setDismissedUntil(null);
          }}
          onShowAll={() => {
            document
              .getElementById('priorities-section')
              ?.scrollIntoView({ behavior: 'smooth' });
          }}
        />
      )}
    </main>
  );
}

function KeyboardShortcuts({
  onOpenReflection,
  onFocusSearch
}: {
  onOpenReflection: () => void;
  onFocusSearch: () => void;
}) {
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const isTypingTarget =
        target?.tagName === "INPUT" || target?.tagName === "TEXTAREA" || target?.tagName === "SELECT";

      if (event.key === "/" && !isTypingTarget) {
        event.preventDefault();
        onFocusSearch();
      }

      if (event.key.toLowerCase() === "r" && event.shiftKey && !isTypingTarget) {
        event.preventDefault();
        onOpenReflection();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onFocusSearch, onOpenReflection]);

  return null;
}

export default MomentumDashboard;

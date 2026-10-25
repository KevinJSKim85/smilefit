import { useEffect, useRef } from 'react';
import { useAppContext } from '../context/AppContext';
import { AppScreen } from '../types/app';
import { useCamera } from '../hooks/useCamera';
import { useSharedLandmarker } from '../context/DetectionContext';
import { useFaceDetection } from '../hooks/useFaceDetection';
import { ACCENT_TEAL, ACCENT_BALLOON, ACCENT_TETRIS } from '../constants/theme';
import { WINK_HOLD_MS, DOUBLE_WINK_HOLD_MS, DOUBLE_BLINK_CLOSED_THRESHOLD, SMILE_THRESHOLD } from '../constants/detection';
import { getBlinkThresholds } from '../detection/winkCalculator';

interface LogEntry {
  type: string;
  time: number;
}

const STICKY_DURATION = 2000;
const INPUT_BADGE_STICKY_MS = 1500;
const MAX_LOG = 15;

export function DebugScreen() {
  const { calibrationData, setScreen } = useAppContext();
  const { videoRef, isReady, error: camError, start, stop } = useCamera();
  const { landmarker, isLoading, error: modelError } = useSharedLandmarker();

  const { faceDetected, smileState, winkState, currentInput } = useFaceDetection({
    videoRef,
    landmarker,
    calibration: calibrationData,
    enabled: isReady && !!landmarker,
  });

  useEffect(() => {
    start();
    return () => stop();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loading = isLoading || !isReady;
  const leftBlinkThresholds = getBlinkThresholds(calibrationData?.wink?.leftBlinkBaseline);
  const rightBlinkThresholds = getBlinkThresholds(calibrationData?.wink?.rightBlinkBaseline);

  // ─── Sticky input badge (holds last non-idle input for 1.5s) ───
  const stickyInputRef = useRef({ label: 'idle', timestamp: 0 });
  if (currentInput !== 'none') {
    stickyInputRef.current = { label: currentInput, timestamp: performance.now() };
  }

  // ─── Sticky event tracking ───
  const stickyRef = useRef({ leftWink: 0, rightWink: 0, doubleWink: 0, smileEvent: 0 });
  const logRef = useRef<LogEntry[]>([]);
  const now = performance.now();

  if (winkState.leftWink) {
    stickyRef.current.leftWink = now;
    logRef.current = [...logRef.current.slice(-(MAX_LOG - 1)), { type: 'Left Wink', time: Date.now() }];
  }
  if (winkState.rightWink) {
    stickyRef.current.rightWink = now;
    logRef.current = [...logRef.current.slice(-(MAX_LOG - 1)), { type: 'Right Wink', time: Date.now() }];
  }
  if (winkState.doubleWink) {
    stickyRef.current.doubleWink = now;
    logRef.current = [...logRef.current.slice(-(MAX_LOG - 1)), { type: 'Double Wink', time: Date.now() }];
  }
  if (smileState.smileEvent) {
    stickyRef.current.smileEvent = now;
    logRef.current = [...logRef.current.slice(-(MAX_LOG - 1)), { type: 'Smile Event', time: Date.now() }];
  }
  if (smileState.smileSuppressed) {
    logRef.current = [...logRef.current.slice(-(MAX_LOG - 1)), { type: 'Smile (suppressed by wink)', time: Date.now() }];
  }

  const sticky = stickyRef.current;
  const leftWinkActive = now - sticky.leftWink < STICKY_DURATION;
  const rightWinkActive = now - sticky.rightWink < STICKY_DURATION;
  const doubleWinkActive = now - sticky.doubleWink < STICKY_DURATION;
  const smileEventActive = now - sticky.smileEvent < STICKY_DURATION;

  // Hold progress
  const singleHoldPct = Math.min((winkState.holdMs / WINK_HOLD_MS) * 100, 100);
  const doubleHoldPct = Math.min((winkState.doubleHoldMs / DOUBLE_WINK_HOLD_MS) * 100, 100);

  // Hold side label (subject perspective — no swap needed)
  const holdLabel = winkState.holdSide === 'left'
    ? 'Left Wink'
    : winkState.holdSide === 'right'
      ? 'Right Wink'
      : 'Single Wink';

  return (
    <div className="min-h-screen bg-[var(--bg)] text-[var(--text-primary)] p-4">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-lg font-bold font-mono">Detection Debug</h1>
        <button
          onClick={() => { stop(); setScreen(AppScreen.GameSelect); }}
          className="px-3 py-1.5 bg-[var(--surface-card)] border border-[var(--border)] rounded-lg text-xs hover:bg-[var(--surface-card-hover)]"
        >
          Back
        </button>
      </div>

      <div className="flex gap-4">
        {/* Left: Camera + Event Log */}
        <div className="shrink-0 w-[400px]">
          <div className="relative w-full aspect-[4/3] bg-[var(--surface-panel)] border border-[var(--border)] rounded-xl overflow-hidden mb-3">
            <video
              ref={videoRef}
              className="w-full h-full object-cover scale-x-[-1]"
              playsInline
              muted
            />
            {loading && (
              <div className="absolute inset-0 flex items-center justify-center bg-white/70 text-[var(--text-muted)] text-sm">
                Loading...
              </div>
            )}
            {(camError || modelError) && (
              <div className="absolute inset-0 flex items-center justify-center bg-white/70 text-[var(--danger)] text-xs">
                {camError || modelError}
              </div>
            )}
            <div className="absolute top-2 right-2">
              <div className={`w-2.5 h-2.5 rounded-full ${faceDetected ? 'bg-[var(--success)]' : 'bg-[var(--danger)]'}`} />
            </div>
            <div className="absolute bottom-2 left-2">
              {(() => {
                const si = stickyInputRef.current;
                const badgeActive = currentInput !== 'none' || (now - si.timestamp < INPUT_BADGE_STICKY_MS);
                const badgeLabel = currentInput !== 'none' ? currentInput : badgeActive ? si.label : 'idle';
                return (
                  <div
                    className="px-2.5 py-1 rounded text-xs font-mono font-bold text-white"
                    style={{ backgroundColor: badgeActive ? 'var(--success)' : 'rgba(0,0,0,0.4)' }}
                  >
                    {badgeLabel}
                  </div>
                );
              })()}
            </div>
          </div>

          <Section title="Event Log">
            <div className="max-h-[180px] overflow-y-auto font-mono text-xs space-y-0.5">
              {logRef.current.length === 0 && (
                <div className="text-[var(--text-muted)]">No events yet</div>
              )}
              {[...logRef.current].reverse().map((entry, i) => {
                const isSuppressed = entry.type.includes('suppressed');
                return (
                  <div key={`${entry.time}-${i}`} className="flex justify-between">
                    <span className="text-[var(--text-muted)]">
                      {new Date(entry.time).toLocaleTimeString('en', { hour12: false })}
                    </span>
                    <span className={`font-medium ${isSuppressed ? 'text-[var(--danger)]' : 'text-[var(--text-primary)]'}`}>{entry.type}</span>
                  </div>
                );
              })}
            </div>
          </Section>
        </div>

        {/* Right: Debug data */}
        <div className="flex-1 space-y-3 min-w-0">
          {/* Hold Progress */}
          <Section title="Hold Progress">
            <HoldBar label={holdLabel} pct={singleHoldPct} color={ACCENT_TETRIS} ms={winkState.holdMs} target={WINK_HOLD_MS} />
            <HoldBar label="Both Eyes" pct={doubleHoldPct} color={ACCENT_BALLOON} ms={winkState.doubleHoldMs} target={DOUBLE_WINK_HOLD_MS} />
          </Section>

          {/* Events (sticky 2s) */}
          <Section title="Events">
            <div className="grid grid-cols-2 gap-1.5">
              <EventDot label="Left Wink" active={leftWinkActive} lastMs={sticky.leftWink ? now - sticky.leftWink : -1} />
              <EventDot label="Right Wink" active={rightWinkActive} lastMs={sticky.rightWink ? now - sticky.rightWink : -1} />
              <EventDot label="Double Wink" active={doubleWinkActive} lastMs={sticky.doubleWink ? now - sticky.doubleWink : -1} />
              <EventDot label="Smile" active={smileEventActive} lastMs={sticky.smileEvent ? now - sticky.smileEvent : -1} />
            </div>
          </Section>

          {/* Eyes (blendshape scores 0–1) */}
          <Section title="Eyes (Blendshapes)">
            <BlinkBar label="L Blink" value={winkState.leftBlinkScore} closedThreshold={leftBlinkThresholds.closed} openThreshold={leftBlinkThresholds.open} doubleThreshold={DOUBLE_BLINK_CLOSED_THRESHOLD} />
            <BlinkBar label="R Blink" value={winkState.rightBlinkScore} closedThreshold={rightBlinkThresholds.closed} openThreshold={rightBlinkThresholds.open} doubleThreshold={DOUBLE_BLINK_CLOSED_THRESHOLD} />
          </Section>

          {/* Smile */}
          <Section title={`Smile (threshold ${SMILE_THRESHOLD})`}>
            <Row label="Raw" value={smileState.rawScore.toFixed(4)} />
            <Row label="EMA" value={smileState.emaScore.toFixed(3)} color={smileState.isSmiling ? 'green' : smileState.smileSuppressed ? 'red' : undefined} />
            {smileState.smileSuppressed && <Row label="Status" value="SUPPRESSED BY WINK" color="red" />}
            <SmileBar value={smileState.emaScore} threshold={SMILE_THRESHOLD / 0.3} color={ACCENT_TEAL} />
            <Row label="Note" value="Balloon = intensity only, Tetris = threshold" color="gray" />
          </Section>

          {/* Baselines */}
          {calibrationData && (
            <Section title="Baselines">
              <Row label="Mouth W / H" value={`${calibrationData.smile?.baseWidth?.toFixed(3) ?? '—'} / ${calibrationData.smile?.baseHeight?.toFixed(3) ?? '—'}`} />
              <Row label="L Blink / R Blink" value={`${calibrationData.wink?.leftBlinkBaseline?.toFixed(3) ?? '—'} / ${calibrationData.wink?.rightBlinkBaseline?.toFixed(3) ?? '—'}`} />
            </Section>
          )}
        </div>
      </div>
    </div>
  );
}

/* ── Sub-components ─────────────────────────── */

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-[var(--surface-card)] border border-[var(--border)] rounded-lg p-3">
      <h3 className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider mb-2">{title}</h3>
      <div className="space-y-1.5">{children}</div>
    </div>
  );
}

function Row({ label, value, color }: { label: string; value: string; color?: string }) {
  const colorClass =
    color === 'green' ? 'text-[var(--success)]' :
    color === 'red' ? 'text-[var(--danger)]' :
    color === 'gray' ? 'text-[var(--text-muted)]' :
    'text-[var(--text-primary)]';
  return (
    <div className="flex justify-between text-xs">
      <span className="text-[var(--text-muted)]">{label}</span>
      <span className={`font-mono ${colorClass}`}>{value}</span>
    </div>
  );
}

function SmileBar({ value, threshold, color }: { value: number; threshold: number; color: string }) {
  const pct = Math.min(Math.max(value * 100, 0), 100);
  const thresholdPct = Math.min(threshold * 100, 100);
  const above = value >= threshold;
  return (
    <div className="mt-1">
      <div className="flex justify-between text-[10px] text-[var(--text-muted)] mb-0.5">
        <span>Intensity {above ? '(above threshold)' : ''}</span>
        <span>{pct.toFixed(0)}%</span>
      </div>
      <div className="relative w-full h-2.5 bg-[var(--surface-card-hover)] rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-75"
          style={{ width: `${pct}%`, backgroundColor: above ? color : 'var(--text-muted)' }}
        />
        <div className="absolute top-0 bottom-0 w-0.5 bg-[var(--danger)]" style={{ left: `${thresholdPct}%` }} />
      </div>
      <div className="relative w-full h-3 mt-0.5">
        <span className="absolute text-[8px] font-mono text-[var(--danger)] -translate-x-1/2" style={{ left: `${thresholdPct}%` }}>{threshold}</span>
      </div>
    </div>
  );
}

function HoldBar({ label, pct, color, ms, target }: { label: string; pct: number; color: string; ms: number; target: number }) {
  const filled = pct >= 100;
  return (
    <div>
      <div className="flex justify-between text-xs mb-0.5">
        <span className={filled ? 'font-bold text-[var(--success)]' : 'text-[var(--text-muted)]'}>{label}</span>
        <span className="font-mono text-[10px] text-[var(--text-muted)]">
          {ms > 0 ? `${(ms / 1000).toFixed(1)}s / ${(target / 1000).toFixed(1)}s` : '-'}
        </span>
      </div>
      <div className="w-full h-3 bg-[var(--surface-card-hover)] rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-75"
          style={{ width: `${pct}%`, backgroundColor: filled ? 'var(--success)' : color }}
        />
      </div>
    </div>
  );
}

function BlinkBar({ label, value, closedThreshold, openThreshold, doubleThreshold }: { label: string; value: number; closedThreshold: number; openThreshold: number; doubleThreshold: number }) {
  const pct = Math.min(value * 100, 100);
  const closed = value > closedThreshold;
  const open = value < openThreshold;

  return (
    <div>
      <div className="flex justify-between text-xs mb-0.5">
        <span className={closed ? 'font-bold text-[var(--danger)]' : open ? 'text-[var(--success)]' : 'text-[var(--text-muted)]'}>
          {label} {closed ? '(CLOSED)' : open ? '(OPEN)' : ''}
        </span>
        <span className="font-mono text-[10px] text-[var(--text-muted)]">{value.toFixed(3)}</span>
      </div>
      <div className="relative w-full h-2.5 bg-[var(--surface-card-hover)] rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-75"
          style={{ width: `${pct}%`, backgroundColor: closed ? 'var(--danger)' : ACCENT_TEAL }}
        />
        <div className="absolute top-0 bottom-0 w-0.5 bg-[var(--success)]" style={{ left: `${openThreshold * 100}%` }} title="Open threshold" />
        <div className="absolute top-0 bottom-0 w-0.5 bg-[var(--danger)]" style={{ left: `${closedThreshold * 100}%` }} title="Closed threshold" />
        <div className="absolute top-0 bottom-0 w-0.5" style={{ left: `${doubleThreshold * 100}%`, backgroundColor: ACCENT_TETRIS }} title="Double wink threshold" />
      </div>
      <div className="relative w-full h-3 mt-0.5">
        <span className="absolute text-[8px] font-mono text-[var(--success)] -translate-x-1/2" style={{ left: `${openThreshold * 100}%` }}>{openThreshold}</span>
        <span className="absolute text-[8px] font-mono text-[var(--danger)] -translate-x-1/2" style={{ left: `${closedThreshold * 100}%` }}>{closedThreshold}</span>
        <span className="absolute text-[8px] font-mono -translate-x-1/2" style={{ left: `${doubleThreshold * 100}%`, color: ACCENT_TETRIS }}>{doubleThreshold}</span>
      </div>
    </div>
  );
}

function EventDot({ label, active, lastMs }: { label: string; active: boolean; lastMs: number }) {
  const timeStr = lastMs >= 0 && lastMs < STICKY_DURATION ? `${(lastMs / 1000).toFixed(1)}s` : '-';
  return (
    <div className={`flex items-center gap-1.5 px-2 py-1 rounded text-xs transition-colors duration-200 ${active ? 'bg-[var(--success)]/15' : ''}`}>
      <div className={`w-2 h-2 rounded-full transition-colors duration-200 ${active ? 'bg-[var(--success)]' : 'bg-[var(--border)]'}`} />
      <span className={active ? 'font-bold text-[var(--success)]' : 'text-[var(--text-muted)]'}>{label}</span>
      <span className="ml-auto text-[10px] text-[var(--text-muted)] font-mono">{timeStr}</span>
    </div>
  );
}

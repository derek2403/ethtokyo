import { promises as fs } from 'fs';
import path from 'path';

const LOG_DIR = path.join(process.cwd(), 'logs');
const LOG_FILE = path.join(LOG_DIR, 'consultations.txt');
const SIMPLE_LOG_FILE = path.join(LOG_DIR, 'consultations_simple.txt');

// In-memory state to improve formatting of the simple log per session
// Key: sessionId -> { printedHeader: boolean, printedFeelingToday: boolean, printedUserInput: boolean, printedRounds: Set<string>, roundCounts: Map<string, number> }
const SIMPLE_STATE = new Map();

function getSimpleState(sessionId) {
  let s = SIMPLE_STATE.get(sessionId || '');
  if (!s) {
    s = { printedHeader: false, printedFeelingToday: false, printedUserInput: false, printedRounds: new Set(), roundCounts: new Map() };
    SIMPLE_STATE.set(sessionId || '', s);
  }
  return s;
}

export async function appendLog(entry) {
  try {
    await fs.mkdir(LOG_DIR, { recursive: true });
    const enriched = { ...entry, ts: new Date().toISOString() };
    await fs.appendFile(LOG_FILE, JSON.stringify(enriched) + '\n', 'utf8');

    // Mirror into simple log in real-time
    try {
      const simpleBlock = formatSimpleBlock(enriched);
      if (simpleBlock) {
        await fs.appendFile(SIMPLE_LOG_FILE, simpleBlock + '\n', 'utf8');
      }
    } catch (e) {
      console.error('Failed to append simple mirror:', e);
    }
  } catch (err) {
    console.error('Failed to append log:', err);
  }
}

function collapseWhitespace(text) {
  return String(text ?? '')
    .replace(/\s+/g, ' ')
    .trim();
}

function localTime(tsIso) {
  try {
    const d = tsIso ? new Date(tsIso) : new Date();
    return d.toLocaleString();
  } catch {
    return new Date().toLocaleString();
  }
}

function formatSimpleBlock(enriched) {
  const sessionId = enriched.sessionId || '';
  const state = getSimpleState(sessionId);

  const ts = localTime(enriched.ts);
  const type = enriched.type;

  if (type === 'event') {
    const ev = enriched.event;
    const data = enriched.data || {};
    if (ev === 'initial_feeling') {
      // Print header once per session
      if (!state.printedHeader) {
        state.printedHeader = true;
        return `date/time: ${ts}\n----------`;
      }
      // Also show feeling today line if provided before session_start
      if (data?.rating != null && !state.printedFeelingToday) {
        state.printedFeelingToday = true;
        return `feeling today: ${data.rating}\n----------`;
      }
      return '';
    }
    if (ev === 'session_start') {
      const parts = [];
      // Always ensure header is printed exactly once
      if (!state.printedHeader) {
        parts.push(`date/time: ${ts}`);
        parts.push('----------');
        state.printedHeader = true;
      }
      if (data?.feelingTodayRating != null && !state.printedFeelingToday) {
        parts.push(`feeling today: ${data.feelingTodayRating}`);
        parts.push('----------');
        state.printedFeelingToday = true;
      }
      if (!state.printedUserInput && data?.question) {
        parts.push(`user input: ${collapseWhitespace(data.question)}`);
        parts.push('----------');
        state.printedUserInput = true;
      }
      return parts.join('\n');
    }
    if (ev === 'post_consult_feeling') {
      // Do not add a trailing divider; user requested no extra repeat at the end
      return `feeling better: ${data.rating ?? ''}`;
    }
    // Generic fallback for other events
    return `date/time: ${ts}\nevent: ${ev}`;
  }

  if (type === 'ai_output') {
    const round = enriched.round ? collapseWhitespace(enriched.round) : '';
    const ai = enriched.ai || '';
    const out = collapseWhitespace(enriched.output);

    const roundIdx = round.replace('round', '');
    const stateKey = `${sessionId}|r${roundIdx}`;
    const count = state.roundCounts.get(roundIdx) || 0;
    if (!state.printedRounds.has(stateKey)) {
      state.printedRounds.add(stateKey);
      state.roundCounts.set(roundIdx, count + 1);
      return `round ${roundIdx}\n${ai}: ${out}`;
    }
    // After the first AI in the round, just append the AI line
    state.roundCounts.set(roundIdx, count + 1);
    let line = `${ai}: ${out}`;
    // After all three AIs (ai1, ai2, ai3) have written for this round, add a divider
    if (state.roundCounts.get(roundIdx) >= 3) {
      line += `\n----------`;
    }
    return line;
  }

  if (type === 'judge_output') {
    const jt = collapseWhitespace(enriched.judgeText);
    return `judge: ${jt}`;
  }

  // Unknown type
  return `${ts}  ${type || 'log'}`;
}

// Append a pre-formatted single-line summary
export async function appendSimpleLog(line) {
  try {
    await fs.mkdir(LOG_DIR, { recursive: true });
    await fs.appendFile(SIMPLE_LOG_FILE, `${line}\n`, 'utf8');
  } catch (err) {
    console.error('Failed to append simple log:', err);
  }
}

export const LOG_PATHS = { LOG_DIR, LOG_FILE, SIMPLE_LOG_FILE };

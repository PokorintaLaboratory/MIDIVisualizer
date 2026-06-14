import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import * as midiPackage from "@tonejs/midi";
import { DrumMachine, Soundfont } from "smplr";
import {
  AlertCircle,
  Drum,
  FileAudio,
  FolderOpen,
  Info,
  Loader2,
  MoveHorizontal,
  Music2,
  Pause,
  Play,
  Square,
  UploadCloud,
  ZoomIn,
  ZoomOut
} from "lucide-react";

const MIN_ZOOM = 45;
const MAX_ZOOM = 1200;
const DEFAULT_ZOOM = 150;
const NOTE_HEIGHT = 12;
const MIN_NOTE_WIDTH = 2;
const PITCH_LABEL_WIDTH = 46;
const DRUM_LABEL_WIDTH = 148;
const TIME_RULER_HEIGHT = 28;
const PLAYBACK_START_DELAY = 0.08;
const PLAYBACK_LOOKAHEAD = 1.75;
const PLAYBACK_SCHEDULE_INTERVAL = 120;
const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
const Midi = midiPackage.Midi ?? midiPackage.default?.Midi;

const GM_DRUM_MAP = {
  35: "Acoustic Bass Drum",
  36: "Bass Drum 1",
  37: "Side Stick",
  38: "Acoustic Snare",
  39: "Hand Clap",
  40: "Electric Snare",
  41: "Low Floor Tom",
  42: "Closed Hi-Hat",
  43: "High Floor Tom",
  44: "Pedal Hi-Hat",
  45: "Low Tom",
  46: "Open Hi-Hat",
  47: "Low-Mid Tom",
  48: "Hi-Mid Tom",
  49: "Crash Cymbal 1",
  50: "High Tom",
  51: "Ride Cymbal 1",
  52: "Chinese Cymbal",
  53: "Ride Bell",
  54: "Tambourine",
  55: "Splash Cymbal",
  56: "Cowbell",
  57: "Crash Cymbal 2",
  58: "Vibraslap",
  59: "Ride Cymbal 2",
  60: "Hi Bongo",
  61: "Low Bongo",
  62: "Mute Hi Conga",
  63: "Open Hi Conga",
  64: "Low Conga",
  65: "High Timbale",
  66: "Low Timbale",
  67: "High Agogo",
  68: "Low Agogo",
  69: "Cabasa",
  70: "Maracas",
  71: "Short Whistle",
  72: "Long Whistle",
  73: "Short Guiro",
  74: "Long Guiro",
  75: "Claves",
  76: "Hi Wood Block",
  77: "Low Wood Block",
  78: "Mute Cuica",
  79: "Open Cuica",
  80: "Mute Triangle",
  81: "Open Triangle"
};

const GM_TO_TR808_DRUM = {
  35: "kick",
  36: "kick",
  37: "rimshot",
  38: "snare",
  39: "clap",
  40: "snare",
  41: "tom-low",
  42: "hihat-close",
  43: "tom-low",
  44: "hihat-close",
  45: "tom-low",
  46: "hihat-open",
  47: "mid-tom",
  48: "mid-tom",
  49: "cymbal",
  50: "tom-hi",
  51: "cymbal",
  52: "cymbal",
  53: "cymbal",
  54: "clap",
  55: "cymbal",
  56: "cowbell",
  57: "cymbal",
  58: "clap",
  59: "cymbal",
  60: "conga-hi",
  61: "conga-low",
  62: "conga-hi",
  63: "conga-hi",
  64: "conga-low",
  65: "tom-hi",
  66: "tom-low",
  67: "cowbell",
  68: "cowbell",
  69: "maraca",
  70: "maraca",
  71: "clave",
  72: "clave",
  73: "clave",
  74: "clave",
  75: "clave",
  76: "clave",
  77: "clave",
  78: "clap",
  79: "clap",
  80: "cowbell",
  81: "cowbell"
};

const GM_PROGRAM_TO_SOUNDFONT = [
  "acoustic_grand_piano",
  "bright_acoustic_piano",
  "electric_grand_piano",
  "honkytonk_piano",
  "electric_piano_1",
  "electric_piano_2",
  "harpsichord",
  "clavinet",
  "celesta",
  "glockenspiel",
  "music_box",
  "vibraphone",
  "marimba",
  "xylophone",
  "tubular_bells",
  "dulcimer",
  "drawbar_organ",
  "percussive_organ",
  "rock_organ",
  "church_organ",
  "reed_organ",
  "accordion",
  "harmonica",
  "tango_accordion",
  "acoustic_guitar_nylon",
  "acoustic_guitar_steel",
  "electric_guitar_jazz",
  "electric_guitar_clean",
  "electric_guitar_muted",
  "overdriven_guitar",
  "distortion_guitar",
  "guitar_harmonics",
  "acoustic_bass",
  "electric_bass_finger",
  "electric_bass_pick",
  "fretless_bass",
  "slap_bass_1",
  "slap_bass_2",
  "synth_bass_1",
  "synth_bass_2",
  "violin",
  "viola",
  "cello",
  "contrabass",
  "tremolo_strings",
  "pizzicato_strings",
  "orchestral_harp",
  "timpani",
  "string_ensemble_1",
  "string_ensemble_2",
  "synth_strings_1",
  "synth_strings_2",
  "choir_aahs",
  "voice_oohs",
  "synth_choir",
  "orchestra_hit",
  "trumpet",
  "trombone",
  "tuba",
  "muted_trumpet",
  "french_horn",
  "brass_section",
  "synth_brass_1",
  "synth_brass_2",
  "soprano_sax",
  "alto_sax",
  "tenor_sax",
  "baritone_sax",
  "oboe",
  "english_horn",
  "bassoon",
  "clarinet",
  "piccolo",
  "flute",
  "recorder",
  "pan_flute",
  "blown_bottle",
  "shakuhachi",
  "whistle",
  "ocarina",
  "lead_1_square",
  "lead_2_sawtooth",
  "lead_3_calliope",
  "lead_4_chiff",
  "lead_5_charang",
  "lead_6_voice",
  "lead_7_fifths",
  "lead_8_bass__lead",
  "pad_1_new_age",
  "pad_2_warm",
  "pad_3_polysynth",
  "pad_4_choir",
  "pad_5_bowed",
  "pad_6_metallic",
  "pad_7_halo",
  "pad_8_sweep",
  "fx_1_rain",
  "fx_2_soundtrack",
  "fx_3_crystal",
  "fx_4_atmosphere",
  "fx_5_brightness",
  null,
  "fx_7_echoes",
  "fx_8_scifi",
  "sitar",
  "banjo",
  "shamisen",
  "koto",
  "kalimba",
  "bagpipe",
  "fiddle",
  "shanai",
  "tinkle_bell",
  "agogo",
  "steel_drums",
  "woodblock",
  "taiko_drum",
  "melodic_tom",
  "synth_drum",
  "reverse_cymbal",
  "guitar_fret_noise",
  "breath_noise",
  "seashore",
  "bird_tweet",
  "telephone_ring",
  "helicopter",
  "applause",
  "gunshot"
];

function formatDuration(seconds) {
  if (!Number.isFinite(seconds)) return "0:00";
  const minutes = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60)
    .toString()
    .padStart(2, "0");
  return `${minutes}:${secs}`;
}

function validateMidiFile(file) {
  return /\.(mid|midi)$/i.test(file.name);
}

function getTrackInstrument(track) {
  const instrument = track.instrument;
  if (instrument?.name && instrument.name !== "custom") return instrument.name;
  if (instrument?.family) return instrument.family;
  return track.channel === 9 ? "drums" : "unknown";
}

function getSoundfontInstrumentName(programNumber) {
  if (!Number.isInteger(programNumber)) return "acoustic_grand_piano";
  return GM_PROGRAM_TO_SOUNDFONT[programNumber] ?? "acoustic_grand_piano";
}

function toTrackSummaries(midi) {
  return midi.tracks
    .map((track, index) => ({
      id: `${index}-${track.channel ?? "meta"}`,
      index,
      name: track.name || `Track ${index + 1}`,
      channel: typeof track.channel === "number" ? track.channel + 1 : null,
      instrument: getTrackInstrument(track),
      programNumber: track.instrument?.number ?? 0,
      soundfontInstrument: getSoundfontInstrumentName(track.instrument?.number ?? 0),
      isDrum: track.channel === 9,
      notes: track.notes.map((note) => ({
        midi: note.midi,
        name: note.name,
        time: note.time,
        duration: note.duration,
        velocity: note.velocity
      })),
      noteCount: track.notes.length
    }))
    .filter((track) => track.noteCount > 0);
}

function getPitchRange(notes) {
  if (!notes.length) return { min: 48, max: 84 };
  let min = Infinity;
  let max = -Infinity;
  for (const note of notes) {
    min = Math.min(min, note.midi);
    max = Math.max(max, note.midi);
  }
  return {
    min: clamp(min - 2, 0, 127),
    max: clamp(max + 2, 0, 127)
  };
}

function getLabelWidth(track) {
  return track?.isDrum ? DRUM_LABEL_WIDTH : PITCH_LABEL_WIDTH;
}

function getDrumName(midi) {
  return GM_DRUM_MAP[midi] ?? `Percussion ${midi}`;
}

function getNoteLabel(note, isDrum) {
  return isDrum ? getDrumName(note.midi) : note.name;
}

function formatSeconds(seconds) {
  if (!Number.isFinite(seconds)) return "0.000s";
  return `${seconds.toFixed(3)}s`;
}

function midiToFrequency(midi) {
  return 440 * 2 ** ((midi - 69) / 12);
}

function getDrumSampleName(midi) {
  return GM_TO_TR808_DRUM[midi] ?? "snare";
}

function getLastNoteEnd(tracks) {
  return tracks.reduce(
    (maxTrackTime, track) =>
      track.notes.reduce((maxNoteTime, note) => Math.max(maxNoteTime, note.time + note.duration), maxTrackTime),
    0
  );
}

function createTrackPositions(tracks, fromTime) {
  const positions = new Map();
  for (const track of tracks) {
    let index = 0;
    while (index < track.notes.length && track.notes[index].time + track.notes[index].duration < fromTime) {
      index += 1;
    }
    positions.set(track.id, index);
  }
  return positions;
}

function stopScheduledEvents(events) {
  for (const event of events) {
    try {
      event.stop();
    } catch {
      // Already stopped or not yet started.
    }
  }
}

function pruneScheduledEvents(audioState) {
  const audioContext = audioState.context;
  if (!audioContext) return;
  audioState.events = audioState.events.filter((event) => event.cleanupAt > audioContext.currentTime);
}

function createTrackGain(audioContext, track, gainScale) {
  const gain = audioContext.createGain();
  gain.gain.value = (track.isDrum ? 0.78 : 0.48) * gainScale;
  gain.connect(audioContext.destination);
  return gain;
}

function schedulePitchedNote(audioContext, destination, note, startAt, duration) {
  const oscillator = audioContext.createOscillator();
  const gain = audioContext.createGain();
  const velocity = clamp(note.velocity || 0.5, 0.05, 1);
  const safeDuration = Math.max(0.035, duration);
  const releaseStart = Math.max(startAt + 0.01, startAt + safeDuration - 0.04);

  oscillator.type = "triangle";
  oscillator.frequency.setValueAtTime(midiToFrequency(note.midi), startAt);
  gain.gain.setValueAtTime(0, startAt);
  gain.gain.linearRampToValueAtTime(0.11 * velocity, startAt + 0.012);
  gain.gain.setValueAtTime(0.095 * velocity, releaseStart);
  gain.gain.linearRampToValueAtTime(0.0001, startAt + safeDuration);

  oscillator.connect(gain);
  gain.connect(destination);
  oscillator.start(startAt);
  oscillator.stop(startAt + safeDuration + 0.02);
  return {
    cleanupAt: startAt + safeDuration + 0.25,
    stop: () => {
      try {
        oscillator.stop();
      } catch {
        // Already stopped.
      }
      oscillator.disconnect();
      gain.disconnect();
    }
  };
}

function scheduleSampledDrum(drumMachine, note, startAt, gainScale) {
  const velocity = clamp(Math.round((note.velocity || 0.5) * 127 * gainScale), 18, 112);
  const stop = drumMachine.start({
    note: getDrumSampleName(note.midi),
    time: startAt,
    velocity
  });
  return {
    cleanupAt: startAt + 2,
    stop: () => stop?.()
  };
}

function scheduleSoundfontNote(soundfont, note, startAt, duration, gainScale) {
  const velocity = clamp(Math.round((note.velocity || 0.5) * 127 * gainScale), 12, 118);
  const safeDuration = Math.max(0.04, duration);
  const stop = soundfont.start({
    note: note.midi,
    time: startAt,
    duration: safeDuration,
    velocity
  });
  return {
    cleanupAt: startAt + safeDuration + 0.5,
    stop: () => stop?.()
  };
}

function getRollRows(track) {
  if (!track?.notes?.length) return [];
  if (track.isDrum) {
    const used = [...new Set(track.notes.map((note) => note.midi))].sort((a, b) => b - a);
    return used.map((midi) => ({ midi, label: getDrumName(midi), isBlackKey: false }));
  }

  const { min, max } = getPitchRange(track.notes);
  const rows = [];
  for (let pitch = max; pitch >= min; pitch -= 1) {
    rows.push({
      midi: pitch,
      label: pitch % 12 === 0 || pitch === min || pitch === max ? `C${Math.floor(pitch / 12) - 1}` : "",
      isBlackKey: [1, 3, 6, 8, 10].includes(pitch % 12)
    });
  }
  return rows;
}

function getDrumUsage(track) {
  if (!track?.isDrum) return [];
  const usage = new Map();
  for (const note of track.notes) {
    usage.set(note.midi, (usage.get(note.midi) ?? 0) + 1);
  }
  return [...usage.entries()]
    .sort(([midiA], [midiB]) => midiA - midiB)
    .map(([midi, count]) => ({
      midi,
      name: getDrumName(midi),
      count
    }));
}

function findNoteAtPoint(canvas, track, zoomX, offsetX, clientX, clientY) {
  if (!track?.notes?.length) return null;
  const rect = canvas.getBoundingClientRect();
  const width = Math.max(1, rect.width);
  const height = Math.max(1, rect.height);
  const labelWidth = getLabelWidth(track);
  const x = clientX - rect.left;
  const y = clientY - rect.top;
  if (x < labelWidth || y < TIME_RULER_HEIGHT || x > width || y > height) return null;

  const rows = getRollRows(track);
  const rowByMidi = new Map(rows.map((row, index) => [row.midi, index]));
  for (let index = track.notes.length - 1; index >= 0; index -= 1) {
    const note = track.notes[index];
    const rowIndex = rowByMidi.get(note.midi);
    if (typeof rowIndex !== "number") continue;
    const noteX = labelWidth + note.time * zoomX - offsetX;
    const noteY = TIME_RULER_HEIGHT + rowIndex * NOTE_HEIGHT + 2;
    const noteW = Math.max(MIN_NOTE_WIDTH, note.duration * zoomX);
    const noteH = NOTE_HEIGHT - 4;
    if (x >= noteX && x <= noteX + noteW && y >= noteY && y <= noteY + noteH) {
      return { note, x: clientX - rect.left + 14, y: clientY - rect.top + 14 };
    }
  }
  return null;
}

function drawPianoRoll(canvas, track, zoomX, offsetX, isDragging, hoveredNote, playbackTime) {
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  const rect = canvas.getBoundingClientRect();
  const dpr = window.devicePixelRatio || 1;
  const width = Math.max(1, Math.floor(rect.width));
  const height = Math.max(1, Math.floor(rect.height));
  if (canvas.width !== width * dpr || canvas.height !== height * dpr) {
    canvas.width = width * dpr;
    canvas.height = height * dpr;
  }
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, width, height);

  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, width, height);

  if (!track?.notes?.length) {
    ctx.fillStyle = "#64748b";
    ctx.font = "14px ui-sans-serif, system-ui";
    ctx.fillText("MIDIファイルを読み込むとピアノロールを表示します", 24, 44);
    return;
  }

  const notes = track.notes;
  const rows = getRollRows(track);
  const rowByMidi = new Map(rows.map((row, index) => [row.midi, index]));
  const labelWidth = getLabelWidth(track);
  const contentHeight = rows.length * NOTE_HEIGHT;
  const chartHeight = Math.max(height - TIME_RULER_HEIGHT, contentHeight);
  const visibleStart = offsetX / zoomX;
  const visibleEnd = (offsetX + width - labelWidth) / zoomX;

  ctx.fillStyle = "#f8fafc";
  ctx.fillRect(0, 0, width, TIME_RULER_HEIGHT);
  ctx.fillRect(0, TIME_RULER_HEIGHT, labelWidth, height - TIME_RULER_HEIGHT);

  const timeStep = zoomX > 500 ? 0.25 : zoomX > 230 ? 0.5 : zoomX > 100 ? 1 : 2;
  const firstTick = Math.floor(visibleStart / timeStep) * timeStep;
  ctx.strokeStyle = "#e2e8f0";
  ctx.lineWidth = 1;
  ctx.fillStyle = "#475569";
  ctx.font = "11px ui-sans-serif, system-ui";
  for (let time = firstTick; time < visibleEnd + timeStep; time += timeStep) {
    const x = labelWidth + time * zoomX - offsetX;
    if (x < labelWidth) continue;
    ctx.beginPath();
    ctx.moveTo(x, TIME_RULER_HEIGHT);
    ctx.lineTo(x, height);
    ctx.stroke();
    if (Math.abs(time - Math.round(time)) < 0.001 || timeStep >= 1) {
      ctx.fillText(`${time.toFixed(timeStep < 1 ? 1 : 0)}s`, x + 4, 18);
    }
  }

  for (let index = 0; index < rows.length; index += 1) {
    const row = rows[index];
    const y = TIME_RULER_HEIGHT + index * NOTE_HEIGHT;
    ctx.fillStyle = row.isBlackKey ? "#f1f5f9" : "#ffffff";
    ctx.fillRect(labelWidth, y, width - labelWidth, NOTE_HEIGHT);
    ctx.strokeStyle = "#e5e7eb";
    ctx.beginPath();
    ctx.moveTo(labelWidth, y + NOTE_HEIGHT);
    ctx.lineTo(width, y + NOTE_HEIGHT);
    ctx.stroke();

    if (row.label) {
      ctx.fillStyle = "#475569";
      ctx.fillText(track.isDrum ? `${row.midi} ${row.label}` : row.label, 10, y + 10);
    }
  }

  const noteFill = track.isDrum ? "#ef4444" : "#2563eb";
  const noteStroke = track.isDrum ? "#b91c1c" : "#1d4ed8";
  for (const note of notes) {
    if (note.time + note.duration < visibleStart || note.time > visibleEnd) continue;
    const rowIndex = rowByMidi.get(note.midi);
    if (typeof rowIndex !== "number") continue;
    const x = labelWidth + note.time * zoomX - offsetX;
    const y = TIME_RULER_HEIGHT + rowIndex * NOTE_HEIGHT + 2;
    const w = Math.max(MIN_NOTE_WIDTH, note.duration * zoomX);
    const h = NOTE_HEIGHT - 4;
    ctx.globalAlpha = 0.45 + note.velocity * 0.55;
    ctx.fillStyle = noteFill;
    ctx.fillRect(x, y, w, h);
    ctx.globalAlpha = 1;
    ctx.strokeStyle = hoveredNote === note ? "#0f172a" : noteStroke;
    ctx.lineWidth = hoveredNote === note ? 2 : 1;
    ctx.strokeRect(x + 0.5, y + 0.5, w, h);
    ctx.lineWidth = 1;
  }

  if (Number.isFinite(playbackTime)) {
    const cursorX = labelWidth + playbackTime * zoomX - offsetX;
    if (cursorX >= labelWidth && cursorX <= width) {
      ctx.strokeStyle = "#f97316";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(cursorX, TIME_RULER_HEIGHT);
      ctx.lineTo(cursorX, height);
      ctx.stroke();
      ctx.fillStyle = "#f97316";
      ctx.beginPath();
      ctx.moveTo(cursorX - 5, TIME_RULER_HEIGHT);
      ctx.lineTo(cursorX + 5, TIME_RULER_HEIGHT);
      ctx.lineTo(cursorX, TIME_RULER_HEIGHT + 8);
      ctx.closePath();
      ctx.fill();
      ctx.lineWidth = 1;
    }
  }

  ctx.strokeStyle = "#cbd5e1";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(labelWidth, 0);
  ctx.lineTo(labelWidth, height);
  ctx.moveTo(0, TIME_RULER_HEIGHT);
  ctx.lineTo(width, TIME_RULER_HEIGHT);
  ctx.stroke();

  if (isDragging) {
    ctx.fillStyle = "rgba(15, 23, 42, 0.05)";
    ctx.fillRect(labelWidth, TIME_RULER_HEIGHT, width - labelWidth, height - TIME_RULER_HEIGHT);
  }
}

function App() {
  const [midiName, setMidiName] = useState("");
  const [duration, setDuration] = useState(0);
  const [tracks, setTracks] = useState([]);
  const [selectedTrackId, setSelectedTrackId] = useState(null);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const [zoomX, setZoomX] = useState(DEFAULT_ZOOM);
  const [offsetX, setOffsetX] = useState(0);
  const [isPanning, setIsPanning] = useState(false);
  const [hoveredNote, setHoveredNote] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackTime, setPlaybackTime] = useState(0);
  const [playbackMode, setPlaybackMode] = useState("selected");
  const [audioStatus, setAudioStatus] = useState("idle");
  const canvasRef = useRef(null);
  const panStartRef = useRef({ x: 0, offsetX: 0 });
  const audioRef = useRef({
    context: null,
    events: [],
    trackGains: [],
    trackPositions: new Map(),
    drumMachine: null,
    drumReady: null,
    soundfonts: new Map(),
    soundfontReady: new Map(),
    failedSoundfonts: new Set(),
    frameId: 0,
    schedulerTimerId: 0,
    startedAt: 0,
    fromTime: 0,
    endTime: 0
  });

  const selectedTrack = useMemo(
    () => tracks.find((track) => track.id === selectedTrackId) ?? null,
    [tracks, selectedTrackId]
  );

  const totalNotes = useMemo(
    () => tracks.reduce((sum, track) => sum + track.noteCount, 0),
    [tracks]
  );

  const drumUsage = useMemo(() => getDrumUsage(selectedTrack), [selectedTrack]);

  const playbackTracks = useMemo(() => {
    if (playbackMode === "all") return tracks;
    return selectedTrack ? [selectedTrack] : [];
  }, [playbackMode, selectedTrack, tracks]);

  const audioStatusText = useMemo(() => {
    if (audioStatus === "loading") return "音源読み込み中";
    if (audioStatus === "playing") return "再生中";
    if (audioStatus === "error") return "音源読み込みに失敗しました";
    return "";
  }, [audioStatus]);

  const ensureDrumMachine = useCallback(async (audioContext) => {
    const audioState = audioRef.current;
    if (audioState.drumMachine && audioState.context === audioContext) return audioState.drumMachine;
    if (!audioState.drumReady || audioState.context !== audioContext) {
      const drumMachine = DrumMachine(audioContext, {
        instrument: "TR-808",
        volume: 104
      });
      audioRef.current.drumMachine = drumMachine;
      audioRef.current.drumReady = drumMachine.ready.then(() => drumMachine);
    }
    return audioRef.current.drumReady;
  }, []);

  const ensureSoundfont = useCallback(async (audioContext, instrumentName) => {
    const audioState = audioRef.current;
    if (!instrumentName || audioState.failedSoundfonts.has(instrumentName)) return null;
    if (audioState.context !== audioContext) {
      audioState.soundfonts = new Map();
      audioState.soundfontReady = new Map();
      audioState.failedSoundfonts = new Set();
    }
    if (audioState.soundfonts.has(instrumentName)) return audioState.soundfonts.get(instrumentName);
    if (!audioState.soundfontReady.has(instrumentName)) {
      const soundfont = Soundfont(audioContext, {
        instrument: instrumentName,
        kit: "FluidR3_GM",
        volume: 92
      });
      const ready = soundfont.ready
        .then(() => {
          audioRef.current.soundfonts.set(instrumentName, soundfont);
          return soundfont;
        })
        .catch(() => {
          audioRef.current.failedSoundfonts.add(instrumentName);
          audioRef.current.soundfontReady.delete(instrumentName);
          return null;
        });
      audioState.soundfontReady.set(instrumentName, ready);
    }
    return audioState.soundfontReady.get(instrumentName);
  }, []);

  const haltPlayback = useCallback((resetTime = false) => {
    const audioState = audioRef.current;
    if (audioState.frameId) cancelAnimationFrame(audioState.frameId);
    if (audioState.schedulerTimerId) window.clearInterval(audioState.schedulerTimerId);
    stopScheduledEvents(audioState.events);
    for (const gain of audioState.trackGains) {
      try {
        gain.disconnect();
      } catch {
        // Already disconnected.
      }
    }
    audioState.drumMachine?.stop?.();
    for (const soundfont of audioState.soundfonts.values()) {
      soundfont?.stop?.();
    }
    audioRef.current = {
      ...audioState,
      events: [],
      trackGains: [],
      trackPositions: new Map(),
      frameId: 0,
      schedulerTimerId: 0,
      startedAt: 0,
      fromTime: 0,
      endTime: 0
    };
    setIsPlaying(false);
    setAudioStatus(resetTime ? "idle" : "ready");
    if (resetTime) setPlaybackTime(0);
  }, []);

  const startPlayback = useCallback(async () => {
    if (!playbackTracks.length) return;
    haltPlayback(false);

    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) {
      setError("このブラウザでは音声再生に対応していません。");
      return;
    }

    const audioContext = audioRef.current.context ?? new AudioContextClass();
    audioRef.current.context = audioContext;
    if (audioContext.state === "suspended") {
      await audioContext.resume();
    }

    const hasDrums = playbackTracks.some((track) => track.isDrum);
    const pitchInstrumentNames = [
      ...new Set(playbackTracks.filter((track) => !track.isDrum).map((track) => track.soundfontInstrument))
    ].filter(Boolean);
    if (hasDrums || pitchInstrumentNames.length) {
      setAudioStatus("loading");
    }
    if (hasDrums) {
      try {
        await ensureDrumMachine(audioContext);
      } catch {
        audioRef.current.drumMachine = null;
        audioRef.current.drumReady = null;
        setAudioStatus("error");
        setError("ドラム音源の読み込みに失敗しました。ネットワーク接続を確認してから再試行してください。");
        return;
      }
    }
    if (pitchInstrumentNames.length) {
      await Promise.all(pitchInstrumentNames.map((instrumentName) => ensureSoundfont(audioContext, instrumentName)));
    }

    const firstTime = 0;
    const lastTime = getLastNoteEnd(playbackTracks);
    const fromTime = playbackTime >= lastTime ? firstTime : clamp(playbackTime, firstTime, lastTime);
    const startedAt = audioContext.currentTime + PLAYBACK_START_DELAY;
    const trackPositions = createTrackPositions(playbackTracks, fromTime);
    const gainScale = playbackTracks.length > 1 ? clamp(1 / Math.sqrt(playbackTracks.length), 0.22, 0.7) : 1;
    const trackGains = playbackTracks.map((track) => ({
      trackId: track.id,
      gain: createTrackGain(audioContext, track, gainScale)
    }));
    const trackGainById = new Map(trackGains.map((item) => [item.trackId, item.gain]));

    audioRef.current = {
      ...audioRef.current,
      events: [],
      trackGains: trackGains.map((item) => item.gain),
      trackPositions,
      startedAt,
      fromTime,
      endTime: lastTime,
      frameId: 0,
      schedulerTimerId: 0
    };
    setPlaybackTime(fromTime);
    setIsPlaying(true);
    setAudioStatus("playing");

    const scheduleNextNotes = () => {
      const audioState = audioRef.current;
      const nowPlayback = audioState.fromTime + Math.max(0, audioContext.currentTime - audioState.startedAt);
      const horizon = nowPlayback + PLAYBACK_LOOKAHEAD;
      const drumMachine = audioState.drumMachine;
      pruneScheduledEvents(audioState);

      for (const track of playbackTracks) {
        let index = audioState.trackPositions.get(track.id) ?? 0;
        const trackGain = trackGainById.get(track.id);
        const soundfont = track.isDrum ? null : audioState.soundfonts.get(track.soundfontInstrument);
        while (index < track.notes.length) {
          const note = track.notes[index];
          const noteEnd = note.time + note.duration;
          if (note.time > horizon) break;
          if (noteEnd >= nowPlayback && noteEnd >= fromTime) {
            const startAt =
              note.time <= nowPlayback
                ? audioContext.currentTime + 0.02
                : audioState.startedAt + note.time - audioState.fromTime;
            const remainingDuration = note.time <= nowPlayback ? noteEnd - nowPlayback : note.duration;
            if (remainingDuration > 0) {
              const scheduledEvent =
                track.isDrum && drumMachine
                  ? scheduleSampledDrum(drumMachine, note, startAt, gainScale)
                  : soundfont
                    ? scheduleSoundfontNote(soundfont, note, startAt, remainingDuration, gainScale)
                  : schedulePitchedNote(audioContext, trackGain, note, startAt, remainingDuration);
              audioState.events.push(scheduledEvent);
            }
          }
          index += 1;
        }
        audioState.trackPositions.set(track.id, index);
      }
    };

    scheduleNextNotes();
    audioRef.current.schedulerTimerId = window.setInterval(scheduleNextNotes, PLAYBACK_SCHEDULE_INTERVAL);

    const tick = () => {
      const state = audioRef.current;
      const nextTime = state.fromTime + Math.max(0, audioContext.currentTime - state.startedAt);
      if (nextTime >= state.endTime) {
        setPlaybackTime(state.endTime);
        haltPlayback(false);
        return;
      }
      setPlaybackTime(nextTime);
      audioRef.current.frameId = requestAnimationFrame(tick);
    };

    audioRef.current.frameId = requestAnimationFrame(tick);
  }, [ensureDrumMachine, ensureSoundfont, haltPlayback, playbackTime, playbackTracks]);

  const parseFile = useCallback(async (file) => {
    setError("");
    if (!validateMidiFile(file)) {
      setError(".mid または .midi ファイルを選択してください。");
      return;
    }

    setIsLoading(true);
    try {
      const buffer = await file.arrayBuffer();
      const midi = new Midi(buffer);
      const summaries = toTrackSummaries(midi);
      if (!summaries.length) {
        throw new Error("ノートを含むトラックが見つかりませんでした。");
      }
      setMidiName(file.name);
      setDuration(midi.duration);
      setTracks(summaries);
      setSelectedTrackId(summaries[0].id);
      setZoomX(DEFAULT_ZOOM);
      setOffsetX(0);
      setHoveredNote(null);
      setPlaybackTime(0);
      haltPlayback(false);
      setAudioStatus("idle");
    } catch (err) {
      setError(err instanceof Error ? err.message : "MIDIファイルの解析に失敗しました。");
      setMidiName("");
      setDuration(0);
      setTracks([]);
      setSelectedTrackId(null);
      setHoveredNote(null);
      setPlaybackTime(0);
      haltPlayback(false);
      setAudioStatus("idle");
    } finally {
      setIsLoading(false);
    }
  }, [haltPlayback]);

  const handleInputChange = useCallback(
    (event) => {
      const file = event.target.files?.[0];
      if (file) parseFile(file);
      event.target.value = "";
    },
    [parseFile]
  );

  const handleDrop = useCallback(
    (event) => {
      event.preventDefault();
      setIsDragOver(false);
      const file = event.dataTransfer.files?.[0];
      if (file) parseFile(file);
    },
    [parseFile]
  );

  const maxOffset = useCallback(
    (nextZoom = zoomX) => {
      const canvas = canvasRef.current;
      const width = canvas?.getBoundingClientRect().width ?? 0;
      const labelWidth = getLabelWidth(selectedTrack);
      return Math.max(0, duration * nextZoom - Math.max(0, width - labelWidth));
    },
    [duration, selectedTrack, zoomX]
  );

  const changeZoom = useCallback(
    (direction) => {
      const canvas = canvasRef.current;
      const width = canvas?.getBoundingClientRect().width ?? 0;
      const labelWidth = getLabelWidth(selectedTrack);
      const focusX = Math.max(0, width / 2 - labelWidth);
      setZoomX((currentZoom) => {
        const nextZoom = clamp(currentZoom * (direction > 0 ? 1.25 : 0.8), MIN_ZOOM, MAX_ZOOM);
        setOffsetX((currentOffset) => {
          const focusTime = (currentOffset + focusX) / currentZoom;
          return clamp(focusTime * nextZoom - focusX, 0, Math.max(0, duration * nextZoom - width + labelWidth));
        });
        return nextZoom;
      });
    },
    [duration, selectedTrack]
  );

  const handleWheel = useCallback(
    (event) => {
      if (!selectedTrack) return;
      event.preventDefault();
      const rect = event.currentTarget.getBoundingClientRect();
      const labelWidth = getLabelWidth(selectedTrack);
      const pointerX = clamp(event.clientX - rect.left - labelWidth, 0, rect.width);
      setZoomX((currentZoom) => {
        const nextZoom = clamp(currentZoom * (event.deltaY < 0 ? 1.12 : 0.88), MIN_ZOOM, MAX_ZOOM);
        setOffsetX((currentOffset) => {
          const focusTime = (currentOffset + pointerX) / currentZoom;
          const nextOffset = focusTime * nextZoom - pointerX;
          return clamp(nextOffset, 0, Math.max(0, duration * nextZoom - rect.width + labelWidth));
        });
        return nextZoom;
      });
    },
    [duration, selectedTrack]
  );

  const startPan = useCallback((event) => {
    if (!selectedTrack) return;
    event.currentTarget.setPointerCapture?.(event.pointerId);
    setIsPanning(true);
    setHoveredNote(null);
    panStartRef.current = { x: event.clientX, offsetX };
  }, [offsetX, selectedTrack]);

  const movePan = useCallback(
    (event) => {
      if (!selectedTrack) return;
      if (!isPanning) {
        const nextHover = findNoteAtPoint(event.currentTarget, selectedTrack, zoomX, offsetX, event.clientX, event.clientY);
        setHoveredNote(nextHover);
        return;
      }
      const delta = event.clientX - panStartRef.current.x;
      setOffsetX(clamp(panStartRef.current.offsetX - delta, 0, maxOffset()));
    },
    [isPanning, maxOffset, offsetX, selectedTrack, zoomX]
  );

  const stopPan = useCallback((event) => {
    event.currentTarget.releasePointerCapture?.(event.pointerId);
    setIsPanning(false);
  }, []);

  const clearHover = useCallback(() => {
    setHoveredNote(null);
    setIsPanning(false);
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return undefined;
    let animationId = requestAnimationFrame(() => {
      drawPianoRoll(canvas, selectedTrack, zoomX, offsetX, isPanning, hoveredNote?.note ?? null, playbackTime);
    });
    const resizeObserver = new ResizeObserver(() => {
      cancelAnimationFrame(animationId);
      animationId = requestAnimationFrame(() => {
        drawPianoRoll(canvas, selectedTrack, zoomX, offsetX, isPanning, hoveredNote?.note ?? null, playbackTime);
      });
    });
    resizeObserver.observe(canvas);
    return () => {
      cancelAnimationFrame(animationId);
      resizeObserver.disconnect();
    };
  }, [selectedTrack, zoomX, offsetX, isPanning, hoveredNote, playbackTime]);

  useEffect(() => {
    setOffsetX((current) => clamp(current, 0, maxOffset()));
  }, [maxOffset, selectedTrackId, zoomX]);

  useEffect(() => {
    setHoveredNote(null);
    setPlaybackTime(0);
    haltPlayback(false);
  }, [haltPlayback, selectedTrackId]);

  useEffect(() => () => haltPlayback(false), [haltPlayback]);

  useEffect(() => {
    if (!isPlaying || !selectedTrack) return;
    const canvas = canvasRef.current;
    const width = canvas?.getBoundingClientRect().width ?? 0;
    const labelWidth = getLabelWidth(selectedTrack);
    const visibleWidth = Math.max(1, width - labelWidth);
    const cursorX = playbackTime * zoomX - offsetX;
    if (cursorX > visibleWidth * 0.82) {
      setOffsetX(clamp(playbackTime * zoomX - visibleWidth * 0.35, 0, maxOffset()));
    } else if (cursorX < visibleWidth * 0.08 && offsetX > 0) {
      setOffsetX(clamp(playbackTime * zoomX - visibleWidth * 0.25, 0, maxOffset()));
    }
  }, [isPlaying, maxOffset, offsetX, playbackTime, selectedTrack, zoomX]);

  return (
    <main className="min-h-screen bg-[#f6f7f9] text-slate-950">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-4 sm:px-6">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded bg-blue-600 text-white">
              <Music2 size={22} aria-hidden="true" />
            </div>
            <div>
              <h1 className="text-xl font-semibold leading-tight">MIDI Visualizer</h1>
              <p className="text-sm text-slate-600">MIDIはブラウザ内で処理します</p>
            </div>
          </div>
          <div className="hidden items-center gap-2 rounded border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800 sm:flex">
            <FileAudio size={16} aria-hidden="true" />
            音源サンプルのみ外部取得
          </div>
        </div>
      </header>

      <section className="mx-auto grid max-w-7xl gap-4 px-4 py-4 sm:px-6 lg:grid-cols-[320px_minmax(0,1fr)]">
        <aside className="space-y-4">
          <div
            className={[
              "rounded border border-dashed bg-white p-4 transition",
              isDragOver ? "border-blue-500 bg-blue-50" : "border-slate-300"
            ].join(" ")}
            onDragOver={(event) => {
              event.preventDefault();
              setIsDragOver(true);
            }}
            onDragLeave={() => setIsDragOver(false)}
            onDrop={handleDrop}
          >
            <label className="flex cursor-pointer flex-col items-center gap-3 text-center">
              <input className="sr-only" type="file" accept=".mid,.midi" onChange={handleInputChange} />
              <UploadCloud className="text-blue-600" size={32} aria-hidden="true" />
              <span className="text-sm font-medium text-slate-900">MIDIファイルを選択またはドロップ</span>
              <span className="text-xs text-slate-500">対応形式: .mid / .midi</span>
              <span className="inline-flex items-center gap-2 rounded bg-blue-600 px-3 py-2 text-sm font-medium text-white">
                <FolderOpen size={16} aria-hidden="true" />
                ファイルを開く
              </span>
            </label>
          </div>

          {error ? (
            <div className="flex gap-2 rounded border border-red-200 bg-red-50 p-3 text-sm text-red-700">
              <AlertCircle size={18} aria-hidden="true" />
              <p>{error}</p>
            </div>
          ) : null}

          <div className="rounded border border-slate-200 bg-white">
            <div className="border-b border-slate-200 p-4">
              <h2 className="text-sm font-semibold text-slate-900">トラック一覧</h2>
              <p className="mt-1 text-xs text-slate-500">
                {midiName ? `${midiName} / ${formatDuration(duration)} / ${totalNotes} notes` : "未読み込み"}
              </p>
            </div>
            <div className="max-h-[420px] overflow-auto p-2">
              {isLoading ? (
                <div className="flex items-center gap-2 p-3 text-sm text-slate-600">
                  <Loader2 className="animate-spin" size={16} aria-hidden="true" />
                  解析中
                </div>
              ) : tracks.length ? (
                tracks.map((track) => (
                  <button
                    key={track.id}
                    type="button"
                    onClick={() => {
                      setSelectedTrackId(track.id);
                      setOffsetX(0);
                    }}
                    className={[
                      "mb-2 w-full rounded border p-3 text-left transition",
                      selectedTrackId === track.id
                        ? "border-blue-500 bg-blue-50"
                        : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50"
                    ].join(" ")}
                  >
                    <span className="flex items-center justify-between gap-3">
                      <span className="min-w-0 truncate text-sm font-semibold text-slate-900">{track.name}</span>
                      <span className="flex shrink-0 items-center gap-1">
                        {track.isDrum ? (
                          <span className="inline-flex items-center rounded bg-red-50 px-2 py-1 text-xs text-red-700">
                            Drum
                          </span>
                        ) : null}
                        <span className="rounded bg-slate-100 px-2 py-1 text-xs text-slate-600">
                          Ch {track.channel ?? "-"}
                        </span>
                      </span>
                    </span>
                    <span className="mt-2 block text-xs text-slate-600">
                      {track.instrument} / {track.noteCount} notes
                    </span>
                  </button>
                ))
              ) : (
                <p className="p-3 text-sm text-slate-500">読み込み後にトラックを表示します。</p>
              )}
            </div>
          </div>
        </aside>

        <section className="min-w-0 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3 rounded border border-slate-200 bg-white p-3">
            <div className="min-w-0">
              <h2 className="truncate text-sm font-semibold text-slate-900">
                {selectedTrack ? selectedTrack.name : "ピアノロール"}
              </h2>
              <p className="text-xs text-slate-500">
                {selectedTrack
                  ? `${selectedTrack.instrument} / Ch ${selectedTrack.channel ?? "-"} / ${selectedTrack.noteCount} notes${
                      selectedTrack.isDrum ? ` / ${drumUsage.length} percussion sounds` : ""
                    }`
                  : "トラックを選択してください"}
              </p>
            </div>
            <div className="flex flex-wrap items-center justify-end gap-2">
              <div className="inline-flex rounded border border-slate-300 bg-white p-0.5" aria-label="再生対象">
                <button
                  type="button"
                  onClick={() => {
                    haltPlayback(false);
                    setPlaybackMode("selected");
                  }}
                  className={[
                    "h-8 rounded px-3 text-xs font-medium transition",
                    playbackMode === "selected" ? "bg-slate-900 text-white" : "text-slate-600 hover:bg-slate-50"
                  ].join(" ")}
                  disabled={!selectedTrack}
                  title="選択チャネルのみ再生"
                >
                  選択
                </button>
                <button
                  type="button"
                  onClick={() => {
                    haltPlayback(false);
                    setPlaybackMode("all");
                  }}
                  className={[
                    "h-8 rounded px-3 text-xs font-medium transition",
                    playbackMode === "all" ? "bg-slate-900 text-white" : "text-slate-600 hover:bg-slate-50"
                  ].join(" ")}
                  disabled={!tracks.length}
                  title="すべてのチャネルを再生"
                >
                  全体
                </button>
              </div>
              <button
                type="button"
                onClick={() => {
                  if (isPlaying) {
                    haltPlayback(false);
                  } else {
                    startPlayback();
                  }
                }}
                className="inline-flex h-9 w-9 items-center justify-center rounded border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                disabled={!playbackTracks.length}
                title={isPlaying ? "一時停止" : "再生"}
              >
                {isPlaying ? <Pause size={18} aria-hidden="true" /> : <Play size={18} aria-hidden="true" />}
              </button>
              <button
                type="button"
                onClick={() => haltPlayback(true)}
                className="inline-flex h-9 w-9 items-center justify-center rounded border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                disabled={!playbackTracks.length && playbackTime === 0}
                title="停止"
              >
                <Square size={16} aria-hidden="true" />
              </button>
              <div className="flex min-w-[190px] items-center gap-2">
                <input
                  type="range"
                  min="0"
                  max={Math.max(0.001, duration)}
                  step="0.01"
                  value={clamp(playbackTime, 0, Math.max(0.001, duration))}
                  onChange={(event) => {
                    haltPlayback(false);
                    setPlaybackTime(Number(event.target.value));
                  }}
                  className="h-2 w-32 accent-orange-500"
                  disabled={!playbackTracks.length}
                  aria-label="再生位置"
                />
                <span className="w-20 text-right text-xs text-slate-600">
                  {formatDuration(playbackTime)} / {formatDuration(duration)}
                </span>
              </div>
              {audioStatusText ? (
                <div
                  className={[
                    "rounded border px-2 py-1 text-xs",
                    audioStatus === "error"
                      ? "border-red-200 bg-red-50 text-red-700"
                      : "border-orange-200 bg-orange-50 text-orange-700"
                  ].join(" ")}
                >
                  {audioStatusText}
                </div>
              ) : null}
              <button
                type="button"
                onClick={() => changeZoom(-1)}
                className="inline-flex h-9 w-9 items-center justify-center rounded border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                disabled={!selectedTrack}
                title="ズームアウト"
              >
                <ZoomOut size={18} aria-hidden="true" />
              </button>
              <div className="w-20 text-center text-xs text-slate-600">{Math.round(zoomX)} px/s</div>
              <button
                type="button"
                onClick={() => changeZoom(1)}
                className="inline-flex h-9 w-9 items-center justify-center rounded border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                disabled={!selectedTrack}
                title="ズームイン"
              >
                <ZoomIn size={18} aria-hidden="true" />
              </button>
              <div className="hidden items-center gap-2 text-xs text-slate-500 sm:flex">
                <MoveHorizontal size={16} aria-hidden="true" />
                ドラッグで移動
              </div>
            </div>
          </div>

          {selectedTrack?.isDrum && drumUsage.length ? (
            <div className="rounded border border-slate-200 bg-white p-3">
              <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-900">
                <Drum size={17} aria-hidden="true" />
                使用打楽器
              </div>
              <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
                {drumUsage.map((item) => (
                  <div
                    key={item.midi}
                    className="flex min-w-0 items-center justify-between gap-3 rounded border border-slate-200 px-3 py-2"
                  >
                    <span className="min-w-0 truncate text-sm text-slate-800">
                      {item.midi} {item.name}
                    </span>
                    <span className="shrink-0 rounded bg-slate-100 px-2 py-1 text-xs text-slate-600">
                      {item.count}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ) : null}

          <div className="relative overflow-hidden rounded border border-slate-200 bg-white">
            <canvas
              ref={canvasRef}
              className="block h-[62vh] min-h-[360px] w-full cursor-grab touch-none active:cursor-grabbing"
              onWheel={handleWheel}
              onPointerDown={startPan}
              onPointerMove={movePan}
              onPointerUp={stopPan}
              onPointerCancel={stopPan}
              onPointerLeave={clearHover}
            />
            {hoveredNote?.note ? (
              <div
                className="pointer-events-none absolute z-10 min-w-48 rounded border border-slate-200 bg-white px-3 py-2 text-xs text-slate-700 shadow-lg"
                style={{
                  left: `${hoveredNote.x}px`,
                  top: `${hoveredNote.y}px`
                }}
              >
                <div className="mb-1 flex items-center gap-1 font-semibold text-slate-950">
                  <Info size={13} aria-hidden="true" />
                  {getNoteLabel(hoveredNote.note, selectedTrack?.isDrum)}
                </div>
                <div>MIDI Note: {hoveredNote.note.midi}</div>
                <div>Velocity: {Math.round(hoveredNote.note.velocity * 127)} / 127</div>
                <div>Start: {formatSeconds(hoveredNote.note.time)}</div>
                <div>Duration: {formatSeconds(hoveredNote.note.duration)}</div>
              </div>
            ) : null}
          </div>
        </section>
      </section>
    </main>
  );
}

export default App;

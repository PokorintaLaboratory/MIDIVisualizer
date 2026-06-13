import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import * as midiPackage from "@tonejs/midi";
import {
  AlertCircle,
  FileAudio,
  FolderOpen,
  Loader2,
  MoveHorizontal,
  Music2,
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
const TIME_RULER_HEIGHT = 28;
const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
const Midi = midiPackage.Midi ?? midiPackage.default?.Midi;

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

function toTrackSummaries(midi) {
  return midi.tracks
    .map((track, index) => ({
      id: `${index}-${track.channel ?? "meta"}`,
      index,
      name: track.name || `Track ${index + 1}`,
      channel: typeof track.channel === "number" ? track.channel + 1 : null,
      instrument: getTrackInstrument(track),
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

function drawPianoRoll(canvas, track, zoomX, offsetX, isDragging) {
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
  const { min, max } = getPitchRange(notes);
  const pitchCount = max - min + 1;
  const contentHeight = pitchCount * NOTE_HEIGHT;
  const chartHeight = Math.max(height - TIME_RULER_HEIGHT, contentHeight);
  const visibleStart = offsetX / zoomX;
  const visibleEnd = (offsetX + width - PITCH_LABEL_WIDTH) / zoomX;

  ctx.fillStyle = "#f8fafc";
  ctx.fillRect(0, 0, width, TIME_RULER_HEIGHT);
  ctx.fillRect(0, TIME_RULER_HEIGHT, PITCH_LABEL_WIDTH, height - TIME_RULER_HEIGHT);

  const timeStep = zoomX > 500 ? 0.25 : zoomX > 230 ? 0.5 : zoomX > 100 ? 1 : 2;
  const firstTick = Math.floor(visibleStart / timeStep) * timeStep;
  ctx.strokeStyle = "#e2e8f0";
  ctx.lineWidth = 1;
  ctx.fillStyle = "#475569";
  ctx.font = "11px ui-sans-serif, system-ui";
  for (let time = firstTick; time < visibleEnd + timeStep; time += timeStep) {
    const x = PITCH_LABEL_WIDTH + time * zoomX - offsetX;
    if (x < PITCH_LABEL_WIDTH) continue;
    ctx.beginPath();
    ctx.moveTo(x, TIME_RULER_HEIGHT);
    ctx.lineTo(x, height);
    ctx.stroke();
    if (Math.abs(time - Math.round(time)) < 0.001 || timeStep >= 1) {
      ctx.fillText(`${time.toFixed(timeStep < 1 ? 1 : 0)}s`, x + 4, 18);
    }
  }

  for (let pitch = min; pitch <= max; pitch += 1) {
    const y = TIME_RULER_HEIGHT + (max - pitch) * NOTE_HEIGHT;
    const isBlackKey = [1, 3, 6, 8, 10].includes(pitch % 12);
    ctx.fillStyle = isBlackKey ? "#f1f5f9" : "#ffffff";
    ctx.fillRect(PITCH_LABEL_WIDTH, y, width - PITCH_LABEL_WIDTH, NOTE_HEIGHT);
    ctx.strokeStyle = "#e5e7eb";
    ctx.beginPath();
    ctx.moveTo(PITCH_LABEL_WIDTH, y + NOTE_HEIGHT);
    ctx.lineTo(width, y + NOTE_HEIGHT);
    ctx.stroke();

    if (pitch % 12 === 0 || pitch === min || pitch === max) {
      ctx.fillStyle = "#475569";
      ctx.fillText(`C${Math.floor(pitch / 12) - 1}`, 10, y + 10);
    }
  }

  const noteFill = track.isDrum ? "#ef4444" : "#2563eb";
  const noteStroke = track.isDrum ? "#b91c1c" : "#1d4ed8";
  for (const note of notes) {
    if (note.time + note.duration < visibleStart || note.time > visibleEnd) continue;
    const x = PITCH_LABEL_WIDTH + note.time * zoomX - offsetX;
    const y = TIME_RULER_HEIGHT + (max - note.midi) * NOTE_HEIGHT + 2;
    const w = Math.max(MIN_NOTE_WIDTH, note.duration * zoomX);
    const h = NOTE_HEIGHT - 4;
    ctx.globalAlpha = 0.45 + note.velocity * 0.55;
    ctx.fillStyle = noteFill;
    ctx.fillRect(x, y, w, h);
    ctx.globalAlpha = 1;
    ctx.strokeStyle = noteStroke;
    ctx.strokeRect(x + 0.5, y + 0.5, w, h);
  }

  ctx.strokeStyle = "#cbd5e1";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(PITCH_LABEL_WIDTH, 0);
  ctx.lineTo(PITCH_LABEL_WIDTH, height);
  ctx.moveTo(0, TIME_RULER_HEIGHT);
  ctx.lineTo(width, TIME_RULER_HEIGHT);
  ctx.stroke();

  if (isDragging) {
    ctx.fillStyle = "rgba(15, 23, 42, 0.05)";
    ctx.fillRect(PITCH_LABEL_WIDTH, TIME_RULER_HEIGHT, width - PITCH_LABEL_WIDTH, height - TIME_RULER_HEIGHT);
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
  const canvasRef = useRef(null);
  const panStartRef = useRef({ x: 0, offsetX: 0 });

  const selectedTrack = useMemo(
    () => tracks.find((track) => track.id === selectedTrackId) ?? null,
    [tracks, selectedTrackId]
  );

  const totalNotes = useMemo(
    () => tracks.reduce((sum, track) => sum + track.noteCount, 0),
    [tracks]
  );

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
    } catch (err) {
      setError(err instanceof Error ? err.message : "MIDIファイルの解析に失敗しました。");
      setMidiName("");
      setDuration(0);
      setTracks([]);
      setSelectedTrackId(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

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
      return Math.max(0, duration * nextZoom - Math.max(0, width - PITCH_LABEL_WIDTH));
    },
    [duration, zoomX]
  );

  const changeZoom = useCallback(
    (direction) => {
      const canvas = canvasRef.current;
      const width = canvas?.getBoundingClientRect().width ?? 0;
      const focusX = Math.max(0, width / 2 - PITCH_LABEL_WIDTH);
      setZoomX((currentZoom) => {
        const nextZoom = clamp(currentZoom * (direction > 0 ? 1.25 : 0.8), MIN_ZOOM, MAX_ZOOM);
        setOffsetX((currentOffset) => {
          const focusTime = (currentOffset + focusX) / currentZoom;
          return clamp(focusTime * nextZoom - focusX, 0, Math.max(0, duration * nextZoom - width));
        });
        return nextZoom;
      });
    },
    [duration]
  );

  const handleWheel = useCallback(
    (event) => {
      if (!selectedTrack) return;
      event.preventDefault();
      const rect = event.currentTarget.getBoundingClientRect();
      const pointerX = clamp(event.clientX - rect.left - PITCH_LABEL_WIDTH, 0, rect.width);
      setZoomX((currentZoom) => {
        const nextZoom = clamp(currentZoom * (event.deltaY < 0 ? 1.12 : 0.88), MIN_ZOOM, MAX_ZOOM);
        setOffsetX((currentOffset) => {
          const focusTime = (currentOffset + pointerX) / currentZoom;
          const nextOffset = focusTime * nextZoom - pointerX;
          return clamp(nextOffset, 0, Math.max(0, duration * nextZoom - rect.width + PITCH_LABEL_WIDTH));
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
    panStartRef.current = { x: event.clientX, offsetX };
  }, [offsetX, selectedTrack]);

  const movePan = useCallback(
    (event) => {
      if (!isPanning) return;
      const delta = event.clientX - panStartRef.current.x;
      setOffsetX(clamp(panStartRef.current.offsetX - delta, 0, maxOffset()));
    },
    [isPanning, maxOffset]
  );

  const stopPan = useCallback((event) => {
    event.currentTarget.releasePointerCapture?.(event.pointerId);
    setIsPanning(false);
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return undefined;
    let animationId = requestAnimationFrame(() => {
      drawPianoRoll(canvas, selectedTrack, zoomX, offsetX, isPanning);
    });
    const resizeObserver = new ResizeObserver(() => {
      cancelAnimationFrame(animationId);
      animationId = requestAnimationFrame(() => {
        drawPianoRoll(canvas, selectedTrack, zoomX, offsetX, isPanning);
      });
    });
    resizeObserver.observe(canvas);
    return () => {
      cancelAnimationFrame(animationId);
      resizeObserver.disconnect();
    };
  }, [selectedTrack, zoomX, offsetX, isPanning]);

  useEffect(() => {
    setOffsetX((current) => clamp(current, 0, maxOffset()));
  }, [maxOffset, selectedTrackId, zoomX]);

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
              <p className="text-sm text-slate-600">ブラウザ内だけでMIDIを解析します</p>
            </div>
          </div>
          <div className="hidden items-center gap-2 rounded border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800 sm:flex">
            <FileAudio size={16} aria-hidden="true" />
            サーバー送信なし
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
                      <span className="rounded bg-slate-100 px-2 py-1 text-xs text-slate-600">
                        Ch {track.channel ?? "-"}
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
                  ? `${selectedTrack.instrument} / Ch ${selectedTrack.channel ?? "-"} / ${selectedTrack.noteCount} notes`
                  : "トラックを選択してください"}
              </p>
            </div>
            <div className="flex items-center gap-2">
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

          <div className="overflow-hidden rounded border border-slate-200 bg-white">
            <canvas
              ref={canvasRef}
              className="block h-[62vh] min-h-[360px] w-full cursor-grab touch-none active:cursor-grabbing"
              onWheel={handleWheel}
              onPointerDown={startPan}
              onPointerMove={movePan}
              onPointerUp={stopPan}
              onPointerCancel={stopPan}
              onPointerLeave={stopPan}
            />
          </div>
        </section>
      </section>
    </main>
  );
}

export default App;

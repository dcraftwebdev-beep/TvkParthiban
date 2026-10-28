// Records a voice message in the browser. The audio file itself is sent to the ward office (no speech to text).
// no limit is shown to citizens; recording only stops itself at 10 minutes, which keeps the upload within the 4.5 MB request size of the host
const HARD_STOP_SECS = 600;
export const canRecord = () => typeof navigator !== "undefined" && !!navigator.mediaDevices?.getUserMedia && typeof MediaRecorder !== "undefined";

const pickMime = () => {
  for (const m of ["audio/webm;codecs=opus", "audio/webm", "audio/mp4", "audio/ogg;codecs=opus"]) {
    try { if (MediaRecorder.isTypeSupported(m)) return m; } catch { /* try the next one */ }
  }
  return "";
};

/** Starts recording. Resolves with { stop, done }, where done resolves with { blob, secs, type } after stop(). */
export async function startRecording(onTick) {
  const stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } });
  const mime = pickMime();
  const rec = new MediaRecorder(stream, { ...(mime ? { mimeType: mime } : {}), audioBitsPerSecond: 24000 });
  const chunks = [];
  const t0 = Date.now();
  rec.ondataavailable = e => { if (e.data && e.data.size) chunks.push(e.data); };

  let timer = null;
  const stop = () => { if (rec.state !== "inactive") rec.stop(); };
  const done = new Promise(resolve => {
    rec.onstop = () => {
      clearInterval(timer);
      stream.getTracks().forEach(t => t.stop());
      const type = (rec.mimeType || mime || "audio/webm").split(";")[0];
      resolve({ blob: new Blob(chunks, { type }), secs: Math.max(1, Math.round((Date.now() - t0) / 1000)), type });
    };
  });
  timer = setInterval(() => {
    const s = Math.floor((Date.now() - t0) / 1000);
    onTick?.(s);
    if (s >= HARD_STOP_SECS) stop();
  }, 250);
  rec.start(500);
  return { stop, done };
}

export const blobToBase64 = blob => new Promise((resolve, reject) => {
  const r = new FileReader();
  r.onload = () => resolve(String(r.result).split(",")[1] || "");
  r.onerror = reject;
  r.readAsDataURL(blob);
});

export const clock = s => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;

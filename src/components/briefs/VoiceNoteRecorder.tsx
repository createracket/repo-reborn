import { useEffect, useRef, useState } from "react";
import { Mic, Square, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

const MAX_SECONDS = 120; // 2 min cap

interface Props {
  /** Called with transcribed text — component leaves it up to the parent to append/replace. */
  onTranscribed: (text: string) => void;
}

export function VoiceNoteRecorder({ onTranscribed }: Props) {
  const [recording, setRecording] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [transcribing, setTranscribing] = useState(false);

  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    return () => {
      stopStream();
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  function stopStream() {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  }

  async function start() {
    if (typeof window === "undefined" || !navigator.mediaDevices?.getUserMedia) {
      toast.error("Voice recording isn't supported in this browser.");
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const mime = MediaRecorder.isTypeSupported("audio/webm")
        ? "audio/webm"
        : MediaRecorder.isTypeSupported("audio/mp4")
          ? "audio/mp4"
          : "";
      const rec = mime ? new MediaRecorder(stream, { mimeType: mime }) : new MediaRecorder(stream);
      chunksRef.current = [];
      rec.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      rec.onstop = () => {
        stopStream();
        const blob = new Blob(chunksRef.current, { type: rec.mimeType || "audio/webm" });
        chunksRef.current = [];
        void upload(blob);
      };
      rec.start();
      recorderRef.current = rec;
      setRecording(true);
      setElapsed(0);
      timerRef.current = setInterval(() => {
        setElapsed((s) => {
          const next = s + 1;
          if (next >= MAX_SECONDS) {
            stop();
          }
          return next;
        });
      }, 1000);
    } catch (err) {
      console.error("mic access failed", err);
      toast.error("Couldn't access your microphone. Check permissions and try again.");
      stopStream();
    }
  }

  function stop() {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    const rec = recorderRef.current;
    if (rec && rec.state !== "inactive") {
      rec.stop();
    }
    recorderRef.current = null;
    setRecording(false);
  }

  async function upload(blob: Blob) {
    if (blob.size < 1024) {
      toast.error("That recording was too short — try again.");
      return;
    }
    setTranscribing(true);
    try {
      const fd = new FormData();
      const ext = (blob.type.split("/")[1] || "webm").split(";")[0];
      fd.append("file", blob, `voice-note.${ext}`);
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;
      if (!token) {
        toast.error("Sign in to use voice notes.");
        return;
      }
      const res = await fetch("/api/public/transcribe-voice-note", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: fd,
      });
      const data = (await res.json().catch(() => ({}))) as { text?: string; error?: string };
      if (!res.ok) {
        throw new Error(data.error || `Transcription failed (${res.status})`);
      }
      const text = (data.text || "").trim();
      if (!text) {
        toast.error("Couldn't hear anything in that recording.");
        return;
      }
      onTranscribed(text);
      toast.success("Voice note added.");
    } catch (err) {
      console.error(err);
      toast.error(err instanceof Error ? err.message : "Transcription failed");
    } finally {
      setTranscribing(false);
    }
  }

  const mm = String(Math.floor(elapsed / 60)).padStart(1, "0");
  const ss = String(elapsed % 60).padStart(2, "0");
  const remaining = MAX_SECONDS - elapsed;

  return (
    <div className="flex flex-wrap items-center gap-3 rounded-md border border-border/60 bg-muted/30 p-3">
      {!recording && !transcribing && (
        <Button type="button" size="sm" variant="secondary" onClick={start}>
          <Mic className="mr-2 size-4" /> Record voice note
        </Button>
      )}
      {recording && (
        <>
          <Button type="button" size="sm" variant="destructive" onClick={stop}>
            <Square className="mr-2 size-4" /> Stop
          </Button>
          <span className="text-sm tabular-nums text-muted-foreground">
            <span className="mr-2 inline-block size-2 animate-pulse rounded-full bg-red-500 align-middle" />
            {mm}:{ss} <span className="opacity-60">/ 2:00</span>
            {remaining <= 15 && <span className="ml-2 text-destructive">{remaining}s left</span>}
          </span>
        </>
      )}
      {transcribing && (
        <span className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin" /> Transcribing…
        </span>
      )}
      {!recording && !transcribing && (
        <span className="text-xs text-muted-foreground">
          Speak for up to 2 minutes — we'll transcribe it into the box below.
        </span>
      )}
    </div>
  );
}

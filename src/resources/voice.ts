import type { HttpClient } from '../client.js';
import type { VoiceTtsRequest } from '../types.js';

export interface TranscribeResult {
  ok: true;
  text: string;
  [k: string]: unknown;
}

export class VoiceResource {
  constructor(private readonly http: HttpClient) {}

  /**
   * Transcribe an audio blob (server expects raw audio bytes). Pass either a
   * `Blob`/`File` or a `Uint8Array`/`ArrayBuffer` along with the original
   * MIME type. Returns the recognized transcript.
   */
  transcribe(
    audio: Blob | ArrayBuffer | Uint8Array,
    opts: { contentType?: string; signal?: AbortSignal } = {},
  ): Promise<TranscribeResult> {
    let body: BodyInit;
    let contentType = opts.contentType;
    if (audio instanceof Blob) {
      body = audio;
      contentType = contentType ?? audio.type ?? 'application/octet-stream';
    } else if (audio instanceof Uint8Array) {
      body = audio as unknown as BodyInit;
      contentType = contentType ?? 'application/octet-stream';
    } else {
      body = new Uint8Array(audio) as unknown as BodyInit;
      contentType = contentType ?? 'application/octet-stream';
    }
    return this.http.request<TranscribeResult>('/voice/transcribe', {
      method: 'POST',
      body,
      headers: { 'content-type': contentType },
      requireAuth: true,
      signal: opts.signal,
    });
  }

  /** Synthesize speech, returns an audio Blob (`audio/mpeg`). */
  tts(input: VoiceTtsRequest, opts: { signal?: AbortSignal } = {}): Promise<Blob> {
    return this.http.request<Blob>('/voice/tts', {
      method: 'POST',
      body: input,
      parse: 'blob',
      headers: { accept: 'audio/mpeg' },
      requireAuth: true,
      signal: opts.signal,
    });
  }
}

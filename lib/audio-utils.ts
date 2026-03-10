/**
 * Audio utilities for Gemini TTS output conversion.
 * Gemini returns raw PCM audio; we wrap it in a proper WAV container
 * so browsers can decode it natively via <audio> or AudioContext.
 */

interface WavOptions {
  numChannels: number;
  sampleRate: number;
  bitsPerSample: number;
}

/** Parse sample rate and bit depth from a Gemini audio MIME type.
 *  E.g. "audio/L16;rate=24000" → { numChannels:1, sampleRate:24000, bitsPerSample:16 }
 */
export function parseAudioMimeType(mimeType: string): WavOptions {
  const [fileType, ...params] = mimeType.split(";").map((s) => s.trim());
  const [, format] = fileType.split("/");

  const options: Partial<WavOptions> = { numChannels: 1 };

  if (format && format.startsWith("L")) {
    const bits = parseInt(format.slice(1), 10);
    if (!isNaN(bits)) options.bitsPerSample = bits;
  }

  for (const param of params) {
    const [key, value] = param.split("=").map((s) => s.trim());
    if (key === "rate") options.sampleRate = parseInt(value, 10);
  }

  // Safe defaults matching Gemini TTS output
  return {
    numChannels: options.numChannels ?? 1,
    sampleRate: options.sampleRate ?? 24000,
    bitsPerSample: options.bitsPerSample ?? 16,
  };
}

/** Build a standard 44-byte RIFF/PCM WAV header. */
export function createWavHeader(dataLength: number, opts: WavOptions): Buffer {
  const { numChannels, sampleRate, bitsPerSample } = opts;
  const byteRate = (sampleRate * numChannels * bitsPerSample) / 8;
  const blockAlign = (numChannels * bitsPerSample) / 8;
  const buf = Buffer.alloc(44);

  buf.write("RIFF", 0);
  buf.writeUInt32LE(36 + dataLength, 4);
  buf.write("WAVE", 8);
  buf.write("fmt ", 12);
  buf.writeUInt32LE(16, 16);           // Subchunk1Size (PCM)
  buf.writeUInt16LE(1, 20);            // AudioFormat = PCM
  buf.writeUInt16LE(numChannels, 22);
  buf.writeUInt32LE(sampleRate, 24);
  buf.writeUInt32LE(byteRate, 28);
  buf.writeUInt16LE(blockAlign, 32);
  buf.writeUInt16LE(bitsPerSample, 34);
  buf.write("data", 36);
  buf.writeUInt32LE(dataLength, 40);

  return buf;
}

/** Wrap raw base64-encoded PCM data in a WAV container. */
export function convertToWav(base64Data: string, mimeType: string): Buffer {
  const opts = parseAudioMimeType(mimeType);
  const pcm = Buffer.from(base64Data, "base64");
  const header = createWavHeader(pcm.length, opts);
  return Buffer.concat([header, pcm]);
}

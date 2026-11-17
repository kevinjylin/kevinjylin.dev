import { readFile } from "node:fs/promises";
import path from "node:path";
import { cache } from "react";

export type ImageSize = { width: number; height: number };

const publicDirectory = path.join(process.cwd(), "public");

function pngSize(file: Buffer): ImageSize | undefined {
  if (file.length < 24 || file.readUInt32BE(0) !== 0x89504e47) {
    return undefined;
  }

  return { width: file.readUInt32BE(16), height: file.readUInt32BE(20) };
}

function gifSize(file: Buffer): ImageSize | undefined {
  if (file.length < 10 || file.toString("latin1", 0, 3) !== "GIF") {
    return undefined;
  }

  return { width: file.readUInt16LE(6), height: file.readUInt16LE(8) };
}

function webpSize(file: Buffer): ImageSize | undefined {
  if (file.length < 30 || file.toString("latin1", 0, 4) !== "RIFF") {
    return undefined;
  }

  const format = file.toString("latin1", 12, 16);

  if (format === "VP8 ") {
    return { width: file.readUInt16LE(26) & 0x3fff, height: file.readUInt16LE(28) & 0x3fff };
  }

  if (format === "VP8L") {
    const bits = file.readUInt32LE(21);
    return { width: (bits & 0x3fff) + 1, height: ((bits >>> 14) & 0x3fff) + 1 };
  }

  if (format === "VP8X") {
    return { width: file.readUIntLE(24, 3) + 1, height: file.readUIntLE(27, 3) + 1 };
  }

  return undefined;
}

// A phone photo is often stored on its side with a note saying how to turn it; browsers follow
// the note, so the size has to as well. Returns true when the note says a quarter turn.
function jpegIsTurned(file: Buffer, start: number, length: number): boolean {
  if (file.toString("latin1", start, start + 4) !== "Exif") {
    return false;
  }

  const tiff = start + 6;
  const little = file.toString("latin1", tiff, tiff + 2) === "II";
  const read16 = (at: number) => (little ? file.readUInt16LE(at) : file.readUInt16BE(at));
  const read32 = (at: number) => (little ? file.readUInt32LE(at) : file.readUInt32BE(at));
  const directory = tiff + read32(tiff + 4);
  const end = start + length;

  if (directory + 2 > end) {
    return false;
  }

  for (let entry = 0; entry < read16(directory); entry += 1) {
    const at = directory + 2 + entry * 12;

    if (at + 12 > end) {
      break;
    }

    if (read16(at) === 0x0112) {
      return read16(at + 8) >= 5;
    }
  }

  return false;
}

function jpegSize(file: Buffer): ImageSize | undefined {
  if (file.length < 4 || file.readUInt16BE(0) !== 0xffd8) {
    return undefined;
  }

  let turned = false;
  let at = 2;

  while (at + 9 < file.length && file[at] === 0xff) {
    const marker = file[at + 1];
    const length = file.readUInt16BE(at + 2);

    if (marker === 0xe1) {
      turned = jpegIsTurned(file, at + 4, length - 2);
    }

    // The frame header, in any of its encodings, carries the size
    if (marker >= 0xc0 && marker <= 0xcf && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc) {
      const height = file.readUInt16BE(at + 5);
      const width = file.readUInt16BE(at + 7);

      return turned ? { width: height, height: width } : { width, height };
    }

    at += 2 + length;
  }

  return undefined;
}

// The size of a picture kept under public/, given the path a page would use for it, such as
// "/projects/yardsale/cover.png". Undefined for anything it can't find or doesn't know how to
// read, including pictures hosted elsewhere.
export const getImageSize = cache(async (src: string): Promise<ImageSize | undefined> => {
  if (!src.startsWith("/") || src.startsWith("//")) {
    return undefined;
  }

  const filePath = path.join(publicDirectory, decodeURIComponent(src.split(/[?#]/)[0]));

  // Nothing outside public/
  if (!filePath.startsWith(publicDirectory + path.sep)) {
    return undefined;
  }

  try {
    const file = await readFile(filePath);
    const size = pngSize(file) ?? jpegSize(file) ?? webpSize(file) ?? gifSize(file);

    return size && size.width > 0 && size.height > 0 ? size : undefined;
  } catch {
    return undefined;
  }
});

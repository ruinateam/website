import { readdir, readFile } from "node:fs/promises";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const animationsDirectory = join(root, "public", "animations");
const allowedBones = new Set([
  "Head",
  "Body",
  "LeftArm",
  "RightArm",
  "LeftLeg",
  "RightLeg",
  "Torso",
  "All",
  "Cape",
]);
const channels = ["rotation", "position"] as const;

type JsonRecord = Record<string, unknown>;

const isRecord = (value: unknown): value is JsonRecord =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const isVector = (value: unknown): value is number[] =>
  Array.isArray(value) &&
  value.length === 3 &&
  value.every((item) => typeof item === "number" && Number.isFinite(item));

const isKeyframe = (value: unknown) => {
  if (isVector(value)) return true;
  if (!isRecord(value)) return false;
  return (
    (value.pre === undefined || isVector(value.pre)) &&
    (value.post === undefined || isVector(value.post))
  );
};

const findAnimationFiles = async (directory: string): Promise<string[]> => {
  const entries = await readdir(directory, { withFileTypes: true });
  const nested = await Promise.all(
    entries.map(async (entry) => {
      const path = join(directory, entry.name);
      if (entry.isDirectory()) return findAnimationFiles(path);
      return entry.name.endsWith(".animation.json") ? [path] : [];
    }),
  );
  return nested.flat();
};

const validateChannel = (frames: unknown, length: number, label: string, errors: string[]) => {
  if (!isRecord(frames)) {
    errors.push(`${label}: keyframes must be an object`);
    return;
  }

  const entries = Object.entries(frames).map(([timestamp, keyframe]) => ({
    timestamp: Number(timestamp),
    keyframe,
  }));
  if (entries.length < 2) {
    errors.push(`${label}: at least two keyframes are required`);
    return;
  }

  if (
    entries.some(
      ({ timestamp, keyframe }) =>
        !Number.isFinite(timestamp) || timestamp < 0 || timestamp > length || !isKeyframe(keyframe),
    )
  ) {
    errors.push(
      `${label}: timestamps must be within 0..${length} and keyframes must be three-number vectors`,
    );
    return;
  }

  entries.sort((left, right) => left.timestamp - right.timestamp);
  if (entries[0]!.timestamp !== 0 || entries.at(-1)!.timestamp !== length) {
    errors.push(`${label}: keyframes must begin at 0 and end at animation_length (${length})`);
  }
};

const validateFile = async (path: string) => {
  const errors: string[] = [];
  let document: unknown;

  try {
    document = JSON.parse(await readFile(path, "utf8"));
  } catch {
    return [`${relative(root, path)}: invalid JSON`];
  }

  if (
    !isRecord(document) ||
    document.format_version !== "1.8.0" ||
    !isRecord(document.animations)
  ) {
    return [`${relative(root, path)}: expected format_version "1.8.0" and an animations object`];
  }

  for (const [name, animation] of Object.entries(document.animations)) {
    const label = `${relative(root, path)} > ${name}`;
    if (
      !isRecord(animation) ||
      typeof animation.animation_length !== "number" ||
      !Number.isFinite(animation.animation_length) ||
      animation.animation_length <= 0 ||
      !isRecord(animation.bones)
    ) {
      errors.push(`${label}: expected positive animation_length and bones object`);
      continue;
    }

    if (animation.loop !== undefined && typeof animation.loop !== "boolean") {
      errors.push(`${label}: loop must be boolean when present`);
    }

    for (const [bone, motion] of Object.entries(animation.bones)) {
      if (!allowedBones.has(bone)) {
        errors.push(`${label}: unsupported bone ${bone}`);
        continue;
      }
      if (!isRecord(motion)) {
        errors.push(`${label} > ${bone}: motion must be an object`);
        continue;
      }

      const animatedChannels = channels.filter((channel) => motion[channel] !== undefined);
      if (!animatedChannels.length) {
        errors.push(`${label} > ${bone}: rotation or position is required`);
      }
      for (const channel of animatedChannels) {
        validateChannel(
          motion[channel],
          animation.animation_length,
          `${label} > ${bone} > ${channel}`,
          errors,
        );
      }
    }
  }

  return errors;
};

const files = await findAnimationFiles(animationsDirectory);
const errors = (await Promise.all(files.map(validateFile))).flat();

if (errors.length) {
  console.error(errors.join("\n"));
  process.exit(1);
}

console.log(`Validated ${files.length} Blockbench animation file(s).`);

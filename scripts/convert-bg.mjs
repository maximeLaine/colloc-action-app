import sharp from 'sharp';
import { existsSync } from 'fs';

const input = 'public/background.png';
const output = 'public/background.webp';

if (!existsSync(input)) {
	console.warn(`[convert-bg] ${input} not found, skipping.`);
	process.exit(0);
}

await sharp(input).webp({ quality: 80 }).toFile(output);

const { size: inSize } = (await import('fs')).statSync(input);
const { size: outSize } = (await import('fs')).statSync(output);
console.log(
	`[convert-bg] ${input} → ${output}  (${(inSize / 1024 / 1024).toFixed(1)} MB → ${(outSize / 1024).toFixed(0)} KB)`
);

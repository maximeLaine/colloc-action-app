// Unicode Fraktur/Gothic mapping for "magic text" (||texte||)
const FRAKTUR_UPPER = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';
const FRAKTUR_MAP: Record<string, string> = {};

// Fraktur uppercase (with special Unicode exceptions)
const upperFraktur = '𝔄𝔅ℭ𝔇𝔈𝔉𝔊ℌℑ𝔍𝔎𝔏𝔐𝔑𝔒𝔓𝔔ℜ𝔖𝔗𝔘𝔙𝔚𝔛𝔜ℨ';
const lowerFraktur = '𝔞𝔟𝔠𝔡𝔢𝔣𝔤𝔥𝔦𝔧𝔨𝔩𝔪𝔫𝔬𝔭𝔮𝔯𝔰𝔱𝔲𝔳𝔴𝔵𝔶𝔷';

// Build character-by-character map (each Fraktur char may be multi-byte)
const upperChars = [...upperFraktur];
const lowerChars = [...lowerFraktur];
for (let i = 0; i < 26; i++) {
	FRAKTUR_MAP[String.fromCharCode(65 + i)] = upperChars[i];
	FRAKTUR_MAP[String.fromCharCode(97 + i)] = lowerChars[i];
}

function toFraktur(text: string): string {
	return [...text].map(c => FRAKTUR_MAP[c] ?? c).join('');
}

function escapeHtml(str: string): string {
	return str
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
		.replace(/"/g, '&quot;')
		.replace(/'/g, '&#039;');
}

/**
 * Render basic markdown-like formatting to safe HTML.
 * - **texte** → <strong>
 * - __texte__ → <em>
 * - ||texte|| → unicode Fraktur "magic text"
 * - \n → <br>
 */
export function formatText(text: string | null | undefined): string {
	if (!text) return '';
	let s = escapeHtml(text);

	// Bold: **text**
	s = s.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
	// Italic: __text__
	s = s.replace(/__(.+?)__/g, '<em>$1</em>');
	// Magic Fraktur: ||text||
	s = s.replace(/\|\|(.+?)\|\|/g, (_, t) => `<span class="magic-text">${toFraktur(t)}</span>`);
	// Newlines
	s = s.replace(/\n/g, '<br>');

	return s;
}

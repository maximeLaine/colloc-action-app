import { describe, it, expect } from 'vitest';
import { formatText } from './format';

describe('formatText', () => {
	it('retourne une chaîne vide pour null', () => {
		expect(formatText(null)).toBe('');
	});

	it('retourne une chaîne vide pour undefined', () => {
		expect(formatText(undefined)).toBe('');
	});

	it('retourne une chaîne vide pour une chaîne vide', () => {
		expect(formatText('')).toBe('');
	});

	it('convertit **texte** en <strong>', () => {
		expect(formatText('**gras**')).toBe('<strong>gras</strong>');
	});

	it('convertit __texte__ en <em>', () => {
		expect(formatText('__italique__')).toBe('<em>italique</em>');
	});

	it('convertit ||texte|| en span magic-text avec Fraktur', () => {
		const result = formatText('||AB||');
		expect(result).toContain('class="magic-text"');
		expect(result).toContain('𝔄𝔅'); // Fraktur A et B
	});

	it('convertit les sauts de ligne en <br>', () => {
		expect(formatText('ligne1\nligne2')).toBe('ligne1<br>ligne2');
	});

	it('échappe les balises HTML (protection XSS)', () => {
		expect(formatText('<script>alert(1)</script>')).toBe(
			'&lt;script&gt;alert(1)&lt;/script&gt;'
		);
	});

	it('échappe les guillemets doubles', () => {
		expect(formatText('"texte"')).toBe('&quot;texte&quot;');
	});

	it('échappe les apostrophes', () => {
		expect(formatText("l'épée")).toBe('l&#039;épée');
	});

	it('échappe les esperluettes', () => {
		expect(formatText('D&D')).toBe('D&amp;D');
	});

	it('applique plusieurs formatages sur le même texte', () => {
		const result = formatText('**gras** et __italique__');
		expect(result).toContain('<strong>gras</strong>');
		expect(result).toContain('<em>italique</em>');
	});

	it('laisse le texte plain inchangé (hors escape)', () => {
		expect(formatText('texte normal')).toBe('texte normal');
	});
});

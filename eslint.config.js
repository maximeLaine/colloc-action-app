import js from '@eslint/js';
import ts from 'typescript-eslint';
import svelte from 'eslint-plugin-svelte';
import globals from 'globals';

export default [
	js.configs.recommended,
	...ts.configs.recommended,
	...svelte.configs['flat/recommended'],
	{
		languageOptions: {
			globals: { ...globals.browser, ...globals.node }
		}
	},
	{
		files: ['**/*.svelte'],
		languageOptions: {
			parserOptions: { parser: ts.parser }
		}
	},
	{
		rules: {
			// {@html} est utilisé intentionnellement pour le rendu markdown (formatText escapeHtml)
			'svelte/no-at-html-tags': 'off',
			// SvelteKit gère la navigation, resolve() n'est pas obligatoire
			'svelte/no-navigation-without-resolve': 'off',
			// new Date() est utilisé partout pour le formatage, SvelteDate n'est pas requis ici
			'svelte/prefer-svelte-reactivity': 'off',

			// Règles avec violations dans le code existant → warn (à corriger progressivement)
			'svelte/require-each-key': 'warn',
			'@typescript-eslint/no-explicit-any': 'warn',
			'@typescript-eslint/no-unused-vars': [
				'warn',
				{ argsIgnorePattern: '^_', varsIgnorePattern: '^_' }
			],
			'@typescript-eslint/no-this-alias': 'warn',
			'@typescript-eslint/ban-ts-comment': 'warn',
			'@typescript-eslint/no-unused-expressions': 'warn',
			'no-sparse-arrays': 'warn',
			'no-useless-escape': 'warn',
			'no-unused-private-class-members': 'warn',
			'no-useless-assignment': 'warn',
			'no-empty': 'warn',
			'no-control-regex': 'warn'
		}
	},
	{
		// MarkdownEditor utilise {@html content} comme nœud enfant — bug connu du parser svelte-eslint-parser
		ignores: [
			'.svelte-kit/',
			'.netlify/',
			'build/',
			'node_modules/',
			'src/lib/components/MarkdownEditor.svelte'
		]
	}
];

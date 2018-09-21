import {Translator} from "./index";
const Vinyl = require('vinyl');

function createVinyl(content) {
	return new Vinyl({
		cwd: '/',
		base: '/',
		path: '/test.html',
		contents: new Buffer(wrapHtml(content))
	});
}

function wrapHtml(content) {
	return '<html><head></head><body>' + content + '</body></html>'
}

const translator = new Translator("./test.po", ["placeholder", "data-title", "alt", "data-tooltip", "title"], ["p", "h1", "h2", "h3", "h4", "li"], true, true);


test('normalizeText', () => {
	const t = new Translator(null, [], true, true);
	const result = t.normalizeText("hello\n\t    world<br/>");
	expect(result).toBe("hello world<br>");
});


test('simpleString', () => {
	const result = translator.translateHtml(createVinyl('<div i18n>ahoj světe!</div>'));
	expect(result).toBe(wrapHtml('<div>hello world!</div>'));
});


test('missingPoFile', () => {
	const translator = new Translator(null, ["placeholder", "data-title", "alt", "data-tooltip", "title"], ["p", "h1", "h2", "h3", "h4", "li"], true, true);
	const result = translator.translateHtml(createVinyl('<div i18n>ahoj světe!</div><div no-i18n>ahoj světe!</div><div some-attribute="nějaký titulek" i18n-some-attribute i18n>ahoj světe!</div>'));
	expect(result).toBe(wrapHtml('<div>ahoj světe!</div><div>ahoj světe!</div><div some-attribute="nějaký titulek">ahoj světe!</div>'));
});


test('comments', () => {
	const result = translator.translateHtml(createVinyl('<div i18n="komentář pro překladatele">ahoj světe!</div>'));
	expect(result).toBe(wrapHtml('<div>hello world!</div>'));
});


test('nestedTags', () => {
	const result = translator.translateHtml(createVinyl('<div i18n>ahoj <strong>krásný</strong> světe!</div>'));
	expect(result).toBe(wrapHtml('<div>hello <strong>beautiful</strong> world!</div>'));
});


test('utf8Encoding', () => {
	const result = translator.translateHtml(createVinyl('<div i18n>Příliš žluťoučký kůň úpěl ďábelské ódy.</div>'));
	expect(result).toBe(wrapHtml('<div>Really hard to translate sentence.</div>'));
});

test('attribute', () => {
	const result = translator.translateHtml(createVinyl('<div some-attribute="nějaký titulek" i18n-some-attribute i18n>ahoj světe!</div>'));
	expect(result).toBe(wrapHtml('<div some-attribute="some title">hello world!</div>'));
});


test('doNotExtractAttribute', () => {
	const result = translator.translateHtml(createVinyl('<div title="nějaký titulek" no-i18n-title>ahoj světe!</div>'));
	expect(result).toBe(wrapHtml('<div>ahoj světe!</div>'));
});


test('autoExtractTag', () => {
	const result = translator.translateHtml(createVinyl('<h2>Nadpis 2</h2><h3>Nadpis 3</h3><p>ahoj světe!</p><p i18n="komentář pro překladatele">ahoj světe!</p>'));
	expect(result).toBe(wrapHtml('<h2>Heading 2</h2><h3>Heading 3</h3><p>hello world!</p><p>hello world!</p>'));
});


test('doNotExtractTag', () => {
	const result = translator.translateHtml(createVinyl('<h2>Nadpis 2</h2><h3 no-i18n="komentář">Nadpis 3</h3><p>ahoj světe!</p><p i18n="komentář pro překladatele">ahoj světe!</p>'));
	expect(result).toBe(wrapHtml('<h2>Heading 2</h2><h3>Nadpis 3</h3><p>hello world!</p><p>hello world!</p>'));
});


test('doNotExtractEntireDivBlock', () => {
	const result = translator.translateHtml(createVinyl('<div no-i18n><h2>Nadpis 2</h2><h3 title="nějaký titulek">Nadpis 3</h3><p>ahoj světe!</p></div><p>ahoj světe!</p>'));
	expect(result).toBe(wrapHtml('<div><h2>Nadpis 2</h2><h3 title="nějaký titulek">Nadpis 3</h3><p>ahoj světe!</p></div><p>hello world!</p>'));
});

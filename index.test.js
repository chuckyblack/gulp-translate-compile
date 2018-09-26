import {Translator} from "./index";
const Vinyl = require('vinyl');

function createVinyl(content, wrap=true) {
	if (wrap) {
		content = wrapHtml(content);
	}
	return new Vinyl({
		cwd: '/',
		base: '/',
		path: '/test.html',
		contents: new Buffer(content)
	});
}

function wrapHtml(content) {
	return '<html><head></head><body>' + content + '</body></html>'
}

const translator = new Translator(
	"./test.po",
	"en",
	["placeholder", "data-title", "alt", "data-tooltip", "title"],
	true
);


test('normalizeText', () => {
	const t = new Translator(null, [], true, true);
	const result = t.normalizeHtml("hello\n\t    world<br/>");
	expect(result).toBe("hello world<br>");
});


test('simpleString', () => {
	const result = translator.translateHtml(createVinyl('<div i18n>ahoj světe!</div>'));
	expect(result).toBe(wrapHtml('<div>hello world!</div>'));
});


test('preserveOriginal', () => {
	const translator = new Translator(null, ["placeholder", "data-title", "alt", "data-tooltip", "title"], ["p", "h1", "h2", "h3", "h4", "li"], true, true);
	const result = translator.translateHtml(createVinyl('<div i18n>ahoj světe!</div><div>ahoj světe!</div><div some-attribute="nějaký titulek" i18n-some-attribute i18n>ahoj světe!</div>'));
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

test('attributeWithNewline', () => {
	const result = translator.translateHtml(createVinyl('<div title="nějaký&#xa;titulek" i18n>ahoj světe!</div>'));
	expect(result).toBe(wrapHtml('<div title="some&#xa;title">hello world!</div>'));
});

test('autoTranslateDataAttribute', () => {
	const result = translator.translateHtml(createVinyl('<div data-tooltip="nějaký titulek" i18n>ahoj světe!</div>'));
	expect(result).toBe(wrapHtml('<div data-tooltip="some title">hello world!</div>'));
});

test('doNotTranslateAttribute', () => {
	const result = translator.translateHtml(createVinyl('<div title="nějaký titulek" no-i18n-title i18n>ahoj světe!</div>'));
	expect(result).toBe(wrapHtml('<div title="nějaký titulek">hello world!</div>'));
});

test('htmlWithNbsp', () => {
	const result = translator.translateHtml(createVinyl('<div i18n>ahoj&nbsp;světe!</div>'));
	expect(result).toBe(wrapHtml('<div>hello&nbsp;world!</div>'));
});

test('htmlLangReplace', () => {
	const result = translator.translateHtml(createVinyl('<img src="/__LANG__/test.jpg">'));
	expect(result).toBe(wrapHtml('<img src="/en/test.jpg">'));
});

test('jsLangReplace', () => {
	const result = translator.translateJs(createVinyl("var lang = '__LANG__';", false));
	expect(result).toBe("var lang = 'en';");
});

test('jsStringWithNbsp', () => {
	const result = translator.translateJs(createVinyl("_('Objednávka č. {{ vm.order.id }}')", false));
	expect(result).toBe("'Order #{{ vm.order.id }}'");
});

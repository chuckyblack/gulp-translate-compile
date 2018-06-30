const through = require('through2');
const fs = require('fs');
const pofile = require('pofile');
const cheerio = require('cheerio');

function hasAttr(element, attrName) {
	const attr = element.attr(attrName);
	return typeof attr !== typeof undefined && attr !== false
}

function normalizeText(text) {
	return text
		.replace("\n", " ")
		.replace("\t", " ")
		.replace(/\s+/g, ' ')
		.replace("/>", ">")
		.trim();
}

function translateAttr(element, attrName, msgstrByMsgid) {
	const newText = msgstrByMsgid[element.attr(attrName)];
	element.attr(attrName, newText);
}

module.exports = function(options) {
	options = Object.assign({
		attributes: [],
		throwOnMissingTranslation: true,
		throwOnEmptyTranslation: true
	}, options);
	const data = fs.readFileSync(options.pofile, 'utf-8');
	const po = pofile.parse(data);
	let msgstrById = {};

	po.items.forEach(function(item){
		if (item.msgstr[0] === ""){
			return;
		}
		msgstrById[item.msgid] = item.msgstr[0];
	});

	return through.obj(function (file, enc, cb) {
		const fileContents = file.contents.toString();
		const $ = cheerio.load(fileContents, {
			decodeEntities: false
		});
		$("*").each(function() {
			const element = $(this);
			if (hasAttr(element, "i18n")) {
				const elementText = normalizeText(element.html());
				if (elementText === "") {
					// valid state - element has no content, eg. <input>
					return;
				}
				const translatedText = msgstrById[elementText];
				if (options.throwOnMissingTranslation && translatedText === undefined) {
					throw (
						"Source string is missing in " + options.pofile + "!\n" +
						"translated file " + file.path + "\n" +
						"elementText = '" + elementText + "'\n" +
						"translatedText = '" + translatedText + "'"
					);
				}
				if (options.throwOnEmptyTranslation && translatedText === "") {
					throw (
						"The text has empty translation in " + options.pofile + "!\n" +
						"translated file " + file.path + "\n" +
						"elementText = '" + elementText + "'\n" +
						"translatedText = '" + translatedText + "'"
					);
				}
				element.text(translatedText);
				element.removeAttr("i18n");
			}

			options.attributes.forEach(function (attrName){
				if (hasAttr(element, attrName)) {
					translateAttr(element, attrName, msgstrById);
				}
			});
		});
		file.contents = Buffer.from($.html());
		this.push(file);
		cb();
	}, function (cb) {
		cb();
	});
};

const through = require('through2');
const fs = require('fs');
const pofile = require('pofile');
const cheerio = require('cheerio');

class Translator {
	constructor(path, attributes, throwOnMissingTranslation, throwOnEmptyTranslation) {
		this.path = path;
		this.attributes = attributes;
		this.throwOnMissingTranslation = throwOnMissingTranslation;
		this.throwOnEmptyTranslation = throwOnEmptyTranslation;
		this.msgStrById = {};
		if (path) {
			this.loadPoFile(path);
		}
	}

	loadPoFile(path) {
		const data = fs.readFileSync(path, 'utf-8');
		const po = pofile.parse(data);
		po.items.forEach(item => {
			if (item.msgstr[0] === "") {
				return;
			}
			// TODO: map file path too
			this.msgStrById[item.msgid] = item.msgstr[0];
		});
	}

	translate(file) {
		const content = file.contents.toString();
		const $ = cheerio.load(content, {
			decodeEntities: false
		});
		$("*").each((index, element) => {
			element = $(element);
			if (!this.path) {
				// no translation file, remove marking attribut only
				if (this.hasAttr(element, "i18n")) {
					element.removeAttr("i18n");
				}
				return;
			}
			if (this.hasAttr(element, "i18n")) {
				const elementText = this.normalizeText(element.html());
				if (elementText === "") {
					// valid state - element has no content, eg. <input>
					return;
				}
				const translatedText = this.getTranslatedText(file, elementText);
				element.text(translatedText);
				element.removeAttr("i18n");
			}

			this.attributes.forEach(attrName => {
				if (this.hasAttr(element, attrName)) {
					this.translateAttr(file, element, attrName);
				}
			});
		});
		return $.html();
	}

	getTranslatedText(file, original) {
		const translatedText = this.msgStrById[original];
		if (this.throwOnMissingTranslation && translatedText === undefined) {
			throw this.getErrorMessage("Source string is missing", file, original, translatedText);
		}
		if (this.throwOnEmptyTranslation && translatedText === "") {
			throw this.getErrorMessage("The text has empty translation", file, original, translatedText);
		}
		return translatedText;
	}

	getErrorMessage(message, file, originalText, translatedText) {
		return (
			message +
			" in " + this.path + "!\n" +
			"translated file " + file.path + "\n" +
			"originalText = '" + originalText + "'\n" +
			"translatedText = '" + translatedText + "'"
		);
	}

	normalizeText(text) {
		return text
			.replace("\n", " ")
			.replace("\t", " ")
			.replace(/\s+/g, ' ')
			.replace("/>", ">")
			.trim();
	}

	hasAttr(element, attrName) {
		const attr = element.attr(attrName);
		return typeof attr !== typeof undefined && attr !== false;
	}

	translateAttr(file, element, attrName) {
		const attrText = element.attr(attrName);
		const translatedText = this.getTranslatedText(file, attrText);
		element.attr(attrName, translatedText);
	}
}

function getDefault(value, defaultValue) {
	return value !== undefined ? value : defaultValue;
}

module.exports = function(options) {
	const translator = new Translator(
		options.pofile,
		options.attributes || [],
		getDefault(options.throwOnMissingTranslation, true),
		getDefault(options.throwOnEmptyTranslation, true)
	);

	return through.obj(function(file, enc, callback) {
		const translated = translator.translate(file);
		file.contents = Buffer.from(translated);
		this.push(file);
		callback();
	}, function(callback) {
		callback();
	});
};

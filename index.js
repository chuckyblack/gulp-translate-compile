const through = require('through2');
const fs = require('fs');
const pofile = require('pofile');
const cheerio = require('cheerio');

class Translator {
	constructor(path, attributes, extractTags, throwOnMissingTranslation, throwOnEmptyTranslation) {
		this.path = path;
		this.attributes = attributes;
		this.extractTags = extractTags;
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
		const ext = file.relative.split('.').pop();
		switch (ext) {
			case "html":
				return this.translateHtml(file);
			case "js":
				return this.translateJs(file);
		}
		// unknown file type, do nothing
		return file.contents.toString();
	}

	translateHtml(file) {
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
			if (this.hasParentWithNoi18n(element)) {
				return;
			}
			if ((this.hasAttr(element, "i18n") || this.extractTags.includes(element[0].name)) && !this.hasAttr(element, "no-i18n")) {
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

			const attrs = element[0].attribs;
			for (let attr in attrs) {
				const value = attrs[attr];
				if (attr.startsWith("i18n-")) {
					const rest = attr.replace("i18n-", "");
					if (this.hasAttr(element, rest)) {
						this.translateAttr(file, element, rest);
					}
					element.removeAttr(attr);
				}
				if (attr.startsWith("no-i18n-")) {
					const rest = attr.replace("no-i18n-", "");
					if (this.hasAttr(element, rest)) {
						element.removeAttr(rest);
					}
					element.removeAttr(attr);
				}
			}

		});
		$("*[no-i18n]").each((index, element) => {
			element = $(element);
			element.removeAttr("no-i18n");
		});

		return $.html();
	}

	translateJs(file) {
		let content = file.contents.toString();
		["'", '"', "`"].forEach((char) => {
			content = content.replace(new RegExp("_\\(\\s*" + char + "([^" + char + "\\\\]*(?:\\\\.[^" + char + "\\\\]*)*)" + char + "\\s*\\)", "g"), (match, text) => {
				if (this.path) {
					text = this.getTranslatedText(file, this.normalizeText(text))
				}
				return char + text + char;
			});
		});
		return content;
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

	parentHasAttr(parent, attrName) {
		if (Object.keys(parent.attribs).length === 0) {
			return false;
		}
		for (let attr in parent.attribs) {
			if (attr == attrName) {
				return true;
			}
		}
		return false;
	}

	translateAttr(file, element, attrName) {
		const attrText = element.attr(attrName);
		let translatedText = this.getTranslatedText(file, attrText);
		translatedText = translatedText.replace("<br>", "&#xa;");
		element.attr(attrName, translatedText);
	}

	hasParentWithNoi18n(element) {
		const parents = element.parents();
		if (parents.length == 0) {
			return false;
		}
		let result = false;
		parents.each((index, parent) => {
			if (this.parentHasAttr(parent, "no-i18n")) {
				result = true;
			}
		});
		return result;
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

module.exports.Translator = Translator;

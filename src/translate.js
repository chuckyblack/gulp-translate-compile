export function translate(options) {
	var through = require('through2');
	var pofileLib = require('pofile');
	var cheerio = require('cheerio');
	var fs = require('fs');

	var data = fs.readFileSync('../api/locales/en/LC_MESSAGES/messages.po', 'utf-8')
	var pofile = pofileLib.parse(data);
	var msgstrByMsgid = {};
		pofile.items.forEach(function(item){
			if (item.msgstr[0] == ""){
				return;
			}
			msgstrByMsgid[item.msgid] = item.msgstr[0];
		});

	return through.obj(function (file, enc, cb) {
		var fileContents = file.contents.toString();
		var $ = cheerio.load(fileContents, { decodeEntities: false });
		var ATTRIBUTES_TO_TRANSLATE = ["placeholder", "data-title", "alt", "data-tooltip", "title"]

		$("*").each(function(){
			var element = $(this);
			if (hasAttr(element, "i18n")){
				var elementText = normalizeText(element.html());
				if (elementText === ""){
					//validni stav - element nema obsah, napr. <input>
					return;
				}
				var translatedText = msgstrByMsgid[elementText];
				if (translatedText === undefined){
					throw "Chybi zdrojove stringy v .po souboru nebo je chyba ve parsovani whitespacu!\n" +
						"elementText = '" + elementText + "'\ntranslatedText = '" + translatedText + "'";
				}
				if (translatedText === ""){
					throw "Text oznaceny k prelozeni nebyl v .po souboru prelozen!\n" +
						"elementText = '" + elementText + "'\ntranslatedText = '" + translatedText + "'";
				}
				element.text(translatedText);
				element.removeAttr("i18n");
			}

			ATTRIBUTES_TO_TRANSLATE.forEach(function (attrName){
				if (hasAttr(element, attrName)) {
					translateAttr(element, attrName, msgstrByMsgid);
				}
			});

			function hasAttr(element, attrName){
				var attr = element.attr(attrName);
				return typeof attr !== typeof undefined && attr !== false
			}

			function normalizeText(text){
				text = text.replace("\n", " ").replace("\t", " ");
				text = text.replace(/\s+/g, ' ').trim();
				text = text.replace("/>", ">");
				return text;
			}

			function translateAttr(element, attrName, msgstrByMsgid){
				var newText = msgstrByMsgid[element.attr(attrName)];
				element.attr(attrName, newText);
			}
		});
		var resultHtml = $.html();
		file.contents = new Buffer(resultHtml);
		this.push(file);
		cb();
	}, function (cb) {
		cb();
	});
};

# gulp-i18n-po-translate

[![Build Status](https://travis-ci.org/chuckyblack/gulp-i18n-po-translate.svg?branch=master)](https://travis-ci.org/chuckyblack/gulp-i18n-po-translate.svg?branch=master)


Compiles html templates using po translation file.

```js
const gulp = require('gulp');
const translate = require('gulp-i18n-po-translate');

gulp.task("translate", function() {
	return gulp.src("**/*.html")
		.pipe(translate({
			pofile: 'locales/en/LC_MESSAGES/messages.po',
			attributes: ["placeholder", "alt", "title"]
		}))
		.pipe(gulp.dest("dist"))
	}
);
```

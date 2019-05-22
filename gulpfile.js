/*
 * dashboard a11y
 * https://github.com/okeul/dashboard-a11y
 *
 * gulpfile.js
 * - w3c validator task
 * - axe-core validator task
 * - css (Compile Sass to CSS and concat + minify CSS)
 * - js (Concat + minify JS)
 * - json data json task
 * - dashboard task
 *
 * Copyright (c) 2019 Olivier Keul
 * Licensed under the MIT license.
 */

'use strict';

// gulp plugins
const assert = require('assert'),
			autoprefixer = require('gulp-autoprefixer'),
			colors = require('colors'),
			concat = require('gulp-concat'),
			cssmin = require('gulp-cssnano'),
			express = require('express'),
			fs = require('fs'),
			gulp = require('gulp'),
	    glob = require('glob-fs')(),
	    help = require('gulp-help-four')(gulp),
			moment = require('moment'),
			path = require('path'),
			puppeteer = require('puppeteer'),
			sass = require('gulp-sass'),
	    uglify = require('gulp-uglify-es').default,
			w3c = require('html-validator'),
			{ AxePuppeteer } = require('axe-puppeteer'),
	  	{ parse: parseURL } = require('url');


// Remove accents + lowercase + remove spaces
function cleanStr(str) {
  var accents    = 'ÀÁÂÃÄÅàáâãäåÒÓÔÕÕÖØòóôõöøÈÉÊËèéêëðÇçÐÌÍÎÏìíîïÙÚÛÜùúûüÑñŠšŸÿýŽž';
  var accentsOut = "AAAAAAaaaaaaOOOOOOOooooooEEEEeeeeeCcDIIIIiiiiUUUUuuuuNnSsYyyZz";
  str = str.split('');
  var strLen = str.length;
  var i, x;
  for (i = 0; i < strLen; i++) {
    if ((x = accents.indexOf(str[i])) != -1) {
      str[i] = accentsOut[x];
    }
  }
  return str.join('').toLowerCase().replace(/\s-\s/g, '-').replace(/\s/g, '-');
}


// variables
const folderSrc = 'src',
			folderReport = 'report',
			name = 'data',
			jsonFileOrigin = fs.readFileSync(folderSrc + '/' + name + '.json'),
			jsonDataOrigin = JSON.parse(jsonFileOrigin),
			time = moment().format("YYYY-MM-DD"),
			folderTime = folderReport + '/' + time


// create time folder
if (!fs.existsSync(folderTime)) {
	fs.mkdirSync(folderTime);
} 

// duplicate original data json
if (!fs.existsSync(folderTime + '/' + name + '.json')) {
	let data = JSON.stringify(jsonDataOrigin, null, 2);
	fs.writeFileSync(folderTime + '/' + name + '.json', data);
} 

// parse duplicated data json
let jsonFile = fs.readFileSync(folderTime + '/' + name + '.json'),
		jsonData = JSON.parse(jsonFile);


// build CSS
gulp.task('css', 'Compile Sass to CSS and concat + minify CSS', function() {
  return gulp.src(folderSrc +'/**/*.scss')
    .pipe(sass().on('error', sass.logError)) 
    .pipe(autoprefixer())
    .pipe(cssmin())
    .pipe(concat('main.css'))
    .pipe(gulp.dest(folderReport + '/assets'));
})


// build JS
gulp.task('js', 'Concat + minify JS', function() {
  return gulp.src([
	  folderSrc + '/js/lib/mustache.js',
	  folderSrc + '/js/lib/highcharts.js',
	  folderSrc + '/js/lib/data.js',
	  folderSrc + '/js/lib/exporting.js',
	  folderSrc + '/js/lib/export-data.js',
	  folderSrc + '/js/main.js'
		])
  	.pipe(uglify())
    .pipe(concat('main.js'))
    .pipe(gulp.dest(folderReport + '/assets'));
});


// w3c validator
gulp.task('w3c', 'Running w3c validator', function (done) {

	for(let i in jsonData) {

		// create site folder in results folder
		const folderResultsSite = folderTime + '/' + cleanStr(jsonData[i].site);
		if (!fs.existsSync(folderResultsSite)) {
			fs.mkdirSync(folderResultsSite);
		}

		for (let j = 0; j < jsonData[i].data.length; j++) {

			const urlExtract = jsonData[i].data[j].url,
						nameExtract = jsonData[i].data[j].name;

			const options = {
			 url: urlExtract
			}

			// create w3c folder in site folder
			const folderResultsW3c = folderResultsSite + '/' + 'w3c'; 
			if (!fs.existsSync(folderResultsW3c)) {
				fs.mkdirSync(folderResultsW3c);
			}

			w3c(options).then(result => {

				console.log(colors.cyan('Running w3c validator: ') + urlExtract);

				const jsonResult = JSON.parse(result);
				let results = JSON.stringify(jsonResult, null, 2);
				fs.writeFileSync(folderResultsW3c + '/' + cleanStr(nameExtract) + '.json', results);

			  const totals = {errors: 0},
							errTypes = {ERROR: 'error'};

			  jsonResult.messages.forEach(item => {
				  if (item.type === errTypes.ERROR) {
			    	totals.errors++
			    }
		    });

		    jsonData[i].data[j]['results'] = { 'w3c' : totals.errors};
				let data = JSON.stringify(jsonData, null, 2);
				fs.writeFileSync(folderTime + '/' + name + '.json', data);

			}).catch(err => {
				console.error(colors.red('Error running w3c validator: ', urlExtract, '', err.message));
			});

		}

	}

	done();

});


// axe-core validator
gulp.task('axe', 'Running axe-core validator', function(done) {

	;(async () => {

		const browser = await puppeteer.launch({
	        	args: [
			        '--no-sandbox',
			        '--headless',
			        '--disable-gpu',
			        '--window-size=1920x1080'
			    	]
			  	}),
					page = await browser.newPage(),
					isValidURL = input => {
						const u = parseURL(input);
						return u.protocol && u.host;
					};

		await page.setBypassCSP(true);

		for(let i in jsonData) {

			// create site folder in results folder
			const folderResultsSite = folderTime + '/' + jsonData[i].site;
			if (!fs.existsSync(folderResultsSite)) {
				fs.mkdirSync(folderResultsSite);
			}

			// create aXe folder in site folder
			const folderResultsAxe = folderResultsSite + '/' + 'axe'; 
			if (!fs.existsSync(folderResultsAxe)) {
				fs.mkdirSync(folderResultsAxe);
			}	

			for (let j = 0; j < jsonData[i].data.length; j++) {

				const url = jsonData[i].data[j].url,
							nameExtract = jsonData[i].data[j].name;

				assert(isValidURL(url), 'Invalid URL');

				await page.goto(url, {
      		timeout : 300000 // 5 minutes 
				});

		    const res = await new AxePuppeteer(page)
		    	.disableRules('frame-tested')
				  .analyze()
				  .then(function(res) {
				  	console.log(colors.cyan('Running axe validator: ') + url);

				    // Extract data from url
						let arr = [];
						let results = JSON.stringify(res, null, 2);
						fs.writeFileSync(folderResultsAxe + '/' + cleanStr(nameExtract) + '.json', results);
						
						for(let i in res.violations) {
			      	arr.push(res.violations[i].nodes.length);
			      }
		      	
		      	const count = arr.reduce(function(acc, val) { return acc + val; }, 0);
						jsonData[i].data[j].results['axe'] = count;
						
						let data = JSON.stringify(jsonData, null, 2);
						fs.writeFileSync(folderTime + '/' + name + '.json', data);
				  })
				  .catch(err => {
				  	console.error(colors.red('Error running aXe validator: ', url, '', err.message));
				  })
			}
		}

		await page.close()
    await browser.close()

	})();

	done();

});


// build of the final json file
gulp.task('json', 'Generate JSON file', function(done) {
	
	let nameBuild = 'dataBuild';

	if (!fs.existsSync(folderReport + '/assets/' + name + '.json')) {
		
		for(let i in jsonDataOrigin) {
			for (let j in jsonDataOrigin[i].data) {
				jsonDataOrigin[i].data[j].results = [];
			}
		}

		let data = JSON.stringify(jsonDataOrigin, null, 2);
		fs.writeFileSync(folderReport + '/assets/' + nameBuild + '.json', data);
	}

	glob.readdirSync(folderReport + '/**/' + name + '.json').forEach(function (file) {

	  let folderTime = path.basename(path.dirname(file));
	  		jsonFile =  fs.readFileSync(file),
	  		jsonData = JSON.parse(jsonFile);

		console.log(colors.cyan('Extract data from: ') + file);

	  for(let i in jsonData) {

			for (let j in jsonData[i].data) {

				jsonData[i].data[j].results['date'] = folderTime;
				jsonDataOrigin[i].data[j].results.push(jsonData[i].data[j].results);

				let data = JSON.stringify(jsonDataOrigin, null, 2);
				fs.writeFileSync(folderReport + '/assets/' + nameBuild + '.json', data);
			}
		}
	});

	console.log('Build: ' + colors.cyan(folderReport + '/assets/' + nameBuild + '.json'))

	done();

});


// dashboard launch with sexy tables and sexy charts
gulp.task('localhost', 'Running localhost', function(done) {
	const app = express();
	app.use(express.static(__dirname));
	app.listen(3000);
	console.log(colors.cyan('Running: ') + 'http://localhost:3000/');
	done();
});


// Build
gulp.task('build', 'Build assets CSS, JS and JSON', gulp.series([
  'css',
  'js',
  'json'
]));


// Tools
gulp.task('tools', 'Running tools', gulp.series([
  'w3c',
  'axe'
]));


// Dashboard
gulp.task('dashboard', 'Running dashboard', gulp.series([
  'css',
  'js',
  'json',
  'localhost'
]));


// Default task
gulp.task('default', 'Default task', gulp.series([
  'w3c',
  'axe',
  'css',
  'js',
  'json',
  'localhost'
]));

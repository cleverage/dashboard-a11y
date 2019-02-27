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
			axecore = require('axe-core'),
			colors = require('colors'),
			concat = require('gulp-concat'),
			cssmin = require('gulp-cssnano'),
			express = require('express'),
			fs = require('fs'),
	    gulp = require('gulp-help')(require('gulp')),
	    glob = require('glob-fs')(),
			moment = require('moment'),
			path = require('path'),
			puppeteer = require('puppeteer'),
			runSequence = require('run-sequence'),
			sass = require('gulp-sass'),
	    uglify = require('gulp-uglify-es').default,
			w3c = require('html-validator'),
	  	{ parse: parseURL } = require('url');


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
gulp.task('w3c', 'Running w3c validator', function () {

	for(let i in jsonData) {

		// create site folder in results folder
		const folderResultsSite = folderTime + '/' + jsonData[i].site;
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

				console.log('Running' + colors.cyan(' w3c ') + 'validator: ' + urlExtract);

				const jsonResult = JSON.parse(result);
				let results = JSON.stringify(jsonResult, null, 2);
				fs.writeFileSync(folderResultsW3c + '/' + nameExtract + '.json', results);

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

});


// axe-core validator
gulp.task('axe', 'Running axe-core validator', function() {

	for(let i in jsonData) {

		// create site folder in results folder
		const folderResultsSite = folderTime + '/' + jsonData[i].site;
		if (!fs.existsSync(folderResultsSite)) {
			fs.mkdirSync(folderResultsSite);
		}

		for (let j = 0; j < jsonData[i].data.length; j++) {

			process.setMaxListeners(Infinity);

			// Cheap URL validation
			const isValidURL = input => {
				const u = parseURL(input);
				return u.protocol && u.host;
			};

			const url = jsonData[i].data[j].url,
						nameExtract = jsonData[i].data[j].name;
			assert(isValidURL(url), 'Invalid URL');

			const main = async url => {
				let browser;
				let results;
				try {
					// Setup Puppeteer
					browser = await puppeteer.launch();

					// Get new page
					const page = await browser.newPage();
					await page.goto(url, {
	          timeout: 1800000 // 30 minutes
	        });

	        await page.waitFor(60000); // 1 minute

					// Inject and run axe-core
					const handle = await page.evaluateHandle(`
						// Inject axe source code
						${axecore.source}
						// Run axe
						axe.run()
					`);

					// Get the results from `axe.run()`.
					results = await handle.jsonValue();
					// Destroy the handle & return axe results.
					await handle.dispose();
				} catch (err) {
					// Ensure we close the puppeteer connection when possible
					if (browser) {
						await browser.close();
					}

					// Re-throw
					throw err;
				}

				await browser.close();
				return results;
			};

			// create aXe folder in site folder
			const folderResultsAxe = folderResultsSite + '/' + 'axe'; 
			if (!fs.existsSync(folderResultsAxe)) {
				fs.mkdirSync(folderResultsAxe);
			}

			main(url)
				.then(result => {

					console.log('Running' + colors.cyan(' axe ') + 'validator: ' + url);					

					let arr = [];
					let results = JSON.stringify(result, null, 2);
					fs.writeFileSync(folderResultsAxe + '/' + nameExtract + '.json', results);

					for(let i in result.violations) {
		      	arr.push(result.violations[i].nodes.length);
		      }

	      	const count = arr.reduce(function(acc, val) { return acc + val; }, 0);

					jsonData[i].data[j].results['axe'] = count;
					let data = JSON.stringify(jsonData, null, 2);
					fs.writeFileSync(folderTime + '/' + name + '.json', data);

				})
				.catch(err => {
					console.error(colors.red('Error running aXe validator: ', url, '', err.message));
				});
			
		}
	}

});


// build of the final json file
gulp.task('json', 'Generate JSON file', function() {
	
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

		console.log('Extract data from ' + colors.cyan(file))

	  for(let i in jsonData) {

			for (let j in jsonData[i].data) {

				jsonData[i].data[j].results['date'] = folderTime;
				jsonDataOrigin[i].data[j].results.push(jsonData[i].data[j].results);

				let data = JSON.stringify(jsonDataOrigin, null, 2);
				fs.writeFileSync(folderReport + '/assets/' + nameBuild + '.json', data);
			}
		}
	});

	console.log('Build ' + colors.cyan(folderReport + '/assets/' + nameBuild + '.json'))

});


// dashboard launch with sexy tables and sexy charts
gulp.task('localhost', 'Running localhost', function() {
	const app = express();
	app.use(express.static(__dirname));
	app.listen(3000);
	console.log('Running' + colors.cyan(' http://localhost:3000/'));
});


// Build
gulp.task('build', 'Build assets CSS, JS and JSON', function() {
  runSequence('css', 'js', 'json');
});


// Tools
gulp.task('tools', 'Running tools', function() {
  runSequence('w3c', 'axe');
});


// Dashboard
gulp.task('dashboard', 'Running dashboard', function() {
  runSequence('css', 'js', 'json', 'localhost');
});


// Default task
gulp.task('default', 'Default task', function() {
  runSequence('w3c', 'axe', 'css', 'js', 'json', 'localhost');
});


# Accessibility dashboard

Launch the W3C and aXe tools on a list of URLs contained in a JSON file.

What's aXe and W3C ?
* aXe : automated tool that can find some accessibility defects of Web documents. 
* w3c : automated tool that checks the mark-up (HTML) validation of Web documents.

Warning: even the best automated accessibility testing tools will only test at the most one-third of all possible accessibility issues. In other words, theses tools are not magic. They are useful but they have to be completed by a human evaluation.

**Demo:** [http://cleverage.github.io/dashboard-a11y](http://cleverage.github.io/dashboard-a11y)

## How it works ?

1. Get all the URLs from the source file json (src/data.json)
2. Launch the W3C and aXe tools on these URLs
3. Create a result folder by day, by site and by tool (report/)
5. Store all this information in a unique JSON file (report/assets/dataBuild.json)
6. From this JSON file create sexy data tables
7. From this data tables create sexy charts

## Tasks

* tools : running W3C and aXe tools
* css : compile Sass to CSS, concatenation and minify CSS
* js : concatenation and minify JS
* json : build data json
* dashboard : running dashboard with sexy data tables and sexy charts

<hr />

Dashboard made with ❤ by by the accessibility team.<br />
[accorhotels.webaccessibility@accor.com](accorhotels.webaccessibility@accor.com)


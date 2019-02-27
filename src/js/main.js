/*
 * dashboard Opquast
 * https://github.com/okeul/dashboard-opquast
 *
 * main.js
 * - load build data json
 * - generate sexy tables
 * - generate sexy charts
 * - generate dashboard
 *
 * Copyright (c) 2019 Olivier Keul
 * Licensed under the MIT license.
 */


'use strict';


// load data json
let json = 'report/assets/dataBuild.json';
fetch(json)
  .then(res => res.json())
  .then((raw) => {

    let index = 0;

    for (let i in raw) {

      index++;

      raw[i].clean = function () {
        return function (text, render) {
           return render(text).replace(/\s/g, '').toLowerCase();
        }
      };

      raw[i].index = function () {
        return index;
      };

      // insert option
      let optionSite = '<option value="res'+index+'-'+ name + '">' + raw[i].site + '</option>';
      document.getElementById('optionSite').insertAdjacentHTML('beforeend', optionSite);

      for (let j = 0; j < raw[i].data.length; j++) {

        const name = raw[i].data[j].name.replace(/\s/g, '').toLowerCase();

        // insert option
        let optionPage = '<option value="res'+index+'-'+ name + '">' + raw[i].data[j].name + '</option>';
        document.getElementById('optionPage').insertAdjacentHTML('beforeend', optionPage);

        // convert data json into a sexy HTML table
        let template = document.getElementById('template').innerHTML,
            info = Mustache.to_html(template, raw[i]);
        document.getElementById('main').insertAdjacentHTML('beforeend', info);

        // convert sexy HTML table into a sexy HTML chart
        Highcharts.chart('chart'+index+'-' + name, {
          data: {
            table: 'table'+index+'-' + name
          },
          chart: {
            type: 'line'
          },
          title: {
            text: ''
          }
        });

      }
    }
  })
  .catch(err => { throw err });



document.addEventListener('DOMContentLoaded', function() {

  /*****************/
  /* validate form */
  /*****************/

  let labelSite = 'Select your website',
      labelPage = 'Select your page',
      optionAllSite = 'See every websites',
      optionAllPage = 'See every pages',
      submitPage = 'Submit your page',
      submitWebsite = 'Submit your website';

  // insert form
  let formMarkup = `
    <form id="form">
      <div class="field">
        <label for="optionSite" class="label">`+labelSite+`</label>
        <select id="optionSite" class="select">
          <option value="">-</option>
          <option value="all">`+optionAllSite+`</option>
        </select>
      </div>
      <button class="btn btn--primary" type="submit">`+submitWebsite+`</button>
      <div class="field hide">
        <label for="optionPage" class="label">`+labelPage+`</label>
        <select id="optionPage" class="select">
          <option value="">-</option>
          <option value="all">`+optionAllPage+`</option>
        </select>
      </div>
      <button class="btn btn--primary hide" type="submit">`+submitPage+`</button>
    </form>`,
    bSubmit = false,
    main = document.getElementById('main');
  
  main.insertAdjacentHTML('beforeend', formMarkup);

  let form = document.getElementById('form');

  // submit handler
  form.addEventListener('submit', function(e) {

    e.preventDefault(); //stop form from submitting

    let optionPage = document.getElementById('optionPage'),
        optionSite = document.getElementById('optionSite'),
        optionPageVal = optionPage.options[optionPage.selectedIndex].value,
        optionSiteVal = optionSite.options[optionSite.selectedIndex].value,
        results = main.getElementsByClassName('results'),
        field = form.querySelectorAll('.field'),
        button = form.querySelectorAll('.btn'),
        optionDefault = optionPage.querySelectorAll('option'),
        optionSelected = document.querySelectorAll("option[value^='"+ optionSiteVal +"']");

    Array.prototype.forEach.call(field, function(e) {
      if (e.classList.contains('hide')) {
        e.classList.remove('hide');
      }
    });

    Array.prototype.forEach.call(button, function(e) {
      if (e.classList.contains('hide')) {
        e.classList.remove('hide');
      }
    });

    Array.prototype.forEach.call(results, function(e) {
      if (!e.classList.contains('hide')) {
        e.classList.add('hide');
      }
    });

    Array.prototype.forEach.call(optionDefault, function(e) {
      if (!e.classList.contains('hide')) {
        e.classList.add('hide');
      }
    });

    Array.prototype.forEach.call(optionSelected, function(e) {
      e.classList.remove('hide');
    });

    if (optionPageVal === 'all') {
      Array.prototype.forEach.call(results, function(e) {
        e.classList.remove('hide');
      });
    } else if (optionPageVal) {
      document.getElementById(optionPageVal).classList.remove('hide');
    }

    /****************/
    /* toggle table */
    /****************/

    if (bSubmit == false) {
      var btn = document.querySelectorAll('.toggle');

      function onClick() {
        'use strict';

        let btn = this,
          content = document.getElementById(btn.getAttribute('aria-controls')),
          attrExpanded = 'aria-expanded',
          attrHidden = 'aria-hidden',
          labelMore = btn.getAttribute('data-label--more'),
          labelLess = btn.getAttribute('data-label--less'),
          bExpand = btn.getAttribute(attrExpanded);

        if (bExpand == 'false') {
          content.setAttribute(attrHidden, 'false');
          btn.innerHTML = labelLess;
          btn.setAttribute(attrExpanded, 'true');
        } else if (bExpand == 'true') {
          content.setAttribute(attrHidden, 'true');
          btn.innerHTML = labelMore;
          btn.setAttribute(attrExpanded, 'false');
        }
      }

      Array.from(btn).forEach(e => {
        e.addEventListener('click', onClick);
      });

      bSubmit = true;
    }

  });

});
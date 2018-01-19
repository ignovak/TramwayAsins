addEventListener('hashchange', _ => location.reload());

const dataStoragesOld = [
    'retail-prod',
    'retail-devo',
    '3p-devo',
    '3p-prod'
];

const dataStorages = [
    'asins-prod',
    'asins-devo',
    'features-prod',
    'features-devo'
];

let dataStorage = location.hash.slice(1);
if (dataStoragesOld.includes(dataStorage)) {
    location.hash = '#' + dataStorages[dataStorage.includes('prod') ? 0 : 1];
}

const selectedColumns = new Set(
    JSON.parse(
        localStorage.columns || '["asin","contribution/glType","item/brandName","item/productType","title"]'
    )
);

let asins;

if (!dataStorages.includes(dataStorage)) {
    dataStorage = dataStorages[0];
}
[].slice.call(document.body.querySelectorAll('.nav-link'))
    .forEach(_ => {
        if (_.href == location.href) {
            document.body.querySelector('.nav-link.active').classList.toggle('active');
            _.classList.toggle('active');
        }
    });

const isDevo = location.hash.includes('devo');
const retailMerchantId = isDevo ? 4105074442 : 14311485635;

(function() {

if (!dataStorage.includes('asins')) {
  return;
}

document.querySelector('#asins-app').removeAttribute('hidden');

const app = new Vue({
  el: '#asins-app',
  data: {
      columns: [],
      host: isDevo ? 'https://tr-development.amazon.com/dp/' : 'https://tr-pre-prod.amazon.com/dp/',
      selectedColumns: [],
      asins: [],
      gls: [],
      ptds: [],
      filters: {
        is3p: true,
        isRetail: true,
        gl: '',
        ptd: '',
        text: ''
      }
  },
  watch: {
    selectedColumns: function () {
      localStorage.columns = JSON.stringify(this.selectedColumns);
    }
  },
  methods: {
    update: function() {
      this.asins = asins.filter(_ => {
        if (

          (_['merchantId'] == retailMerchantId ? !this.filters.isRetail : !this.filters.is3p)

          ||

          this.filters.gl && _['contribution/glType'] != this.filters.gl

          ||

          this.filters.ptd && _['item/productType'] != this.filters.ptd

          ||

          this.filters.text
              && !(_['title'] || '').toLowerCase().includes(this.filters.text)
              && !(_['item/brandName'] || '').toLowerCase().includes(this.filters.text)

          ) {
          return false;
        }
        return true;
      });
    }
  }
});

const prodGLs = [
  'gl_camera',
  'gl_electronics',
  'gl_pc',
  'gl_wireless',
  'gl_home',
  'gl_home_improvement',
  'gl_kitchen',
  'gl_sports',
  'gl_office_product',
  'gl_toy',
  'gl_baby_product',
  'gl_personal_care_appliances',
  'gl_book',
  'gl_videogames',
  'gl_home_entertainment'
];

new Promise(function(resolve, reject) {
    const xhr = new XMLHttpRequest();
    xhr.open('GET', 'features.json', true);
    xhr.open('GET', dataStorage + '.json', true);
    xhr.onreadystatechange = function() {
      if (xhr.readyState == 4)
        resolve(JSON.parse(xhr.responseText));
    }
    xhr.send();
  })
    .then(_ => {
        asins = _
          .filter(_ => prodGLs.includes(_.contribution.glType)) // TODO: move to data generation step
          .map(_ => flatten(_));

        app.gls = [...new Set(asins.map(_ => _['contribution/glType']))].sort();
        app.ptds = [...new Set(asins.map(_ => _['item/productType']))].sort();

        app.columns = [...new Set([].concat(...asins.map(_ => Object.keys(_))))].sort();
        app.selectedColumns = app.columns.filter(_ => selectedColumns.has(_));

        app.update();
    });

function flatten(node, prefix) {
  const result = {};
  Object.entries(node).forEach(([key, value]) => {
    if (prefix) {
      key = prefix + '/' + key;
    }
    if (typeof value == 'object') {
      Object.assign(result, flatten(value, key));
    } else {
      if (key == 'contribution/creationDate') {
        value = (new Date(value * 1000)).toString().slice(0, 25);
      }
      result[key] = value;
    }
  });
  return result;
}

})();

(function() {

if (!dataStorage.includes('features')) {
  return;
}

document.querySelector('#features-app').removeAttribute('hidden');

let asins;

const app = new Vue({
  el: '#features-app',
  data: {
      columns: [],
      host: location.hash.includes('devo') ? 'https://tr-development.amazon.com/dp/' : 'https://tr-pre-prod.amazon.com/dp/',
      asins: [],
      filters: [],
      gls: [],
      gl: ''
  },
  methods: {
    update: function() {
      this.asins = asins
        .filter(_ => this.filters.every(feature => _.features.has(feature)))
        .filter(_ => this.gl == '' || _.gl == this.gl);
    }
  }
});

new Promise(function(resolve, reject) {
    const xhr = new XMLHttpRequest();
    xhr.open('GET', 'features.json', true);
    xhr.open('GET', dataStorage + '.json', true);
    xhr.onreadystatechange = function() {
      if (xhr.readyState == 4)
        resolve(JSON.parse(xhr.responseText));
    }
    xhr.send();
  })
    .then(data => {
        data.forEach(_ => {
          _.features = new Set(
              _.features.map(
                _ => _
                    .replace('_feature_div', '')
                    .replace(/.*product-description/, 'productDescription')
              )
            );
        });
        const columns = new Set([].concat(...data.map(_ => [..._.features])));
        columns.delete('hero-quick-promo-grid');
        columns.delete('product-alert-grid');
        columns.delete('qpe-title-tag');
        app.columns = [...columns];

        app.gls = [...new Set(data.map(_ => _.gl))]

        asins = data
            .map(_ => {
                _.title = _.url.match(/\w+$/)[0];
                return _;
            });
        app.update();
    });

})();

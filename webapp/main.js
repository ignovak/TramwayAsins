addEventListener('hashchange', _ => location.reload());

const selectedColumns = new Set(
    JSON.parse(
        localStorage.columns || '["asin","glType","brandName","productType","title"]'
    ).map(_ => _.replace(/.*\//, ''))
);

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
if (dataStorage == 'redundant-devo') {
    dataStorage = 'asins-devo';
}
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

const prodGLs = [
  'gl_baby_product',
  'gl_book',
  'gl_camera',
  'gl_electronics',
  'gl_home',
  'gl_home_entertainment',
  'gl_home_improvement',
  'gl_kitchen',
  'gl_office_product',
  'gl_pc',
  'gl_personal_care_appliances',
  'gl_sports',
  'gl_toy',
  'gl_video_games',
  'gl_wireless'
];

(function() {

let asins;

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

          (_.merchantId == retailMerchantId ? !this.filters.isRetail : !this.filters.is3p)

          ||

          this.filters.gl && _.glType != this.filters.gl

          ||

          this.filters.ptd && _.productType != this.filters.ptd

          ||

          this.filters.text
              && !_.title.toLowerCase().includes(this.filters.text)
              && !_.brandName.toLowerCase().includes(this.filters.text)

          ) {
          return false;
        }
        return true;
      });
    }
  }
});

new Promise(function(resolve, reject) {
    const xhr = new XMLHttpRequest();
    xhr.open('GET', dataStorage + '.json', true);
    xhr.onreadystatechange = function() {
      if (xhr.readyState == 4)
        resolve(JSON.parse(xhr.responseText));
    }
    xhr.send();
  })
    .then(_ => {
        asins = _
          .filter(_ => location.hash.match(/redundant/) ? !prodGLs.includes(_.glType) : prodGLs.includes(_.glType));

        app.gls = [...new Set(asins.map(_ => _.glType))].sort();
        app.ptds = [...new Set(asins.map(_ => _.productType))].sort();

        app.columns = [...new Set([].concat(...asins.map(_ => Object.keys(_))))].sort();
        app.selectedColumns = app.columns.filter(_ => selectedColumns.has(_));

        app.update();
    });

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
      gl: '',
      wdgs: []
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
    xhr.open('GET', dataStorage + '.json', true);
    xhr.onreadystatechange = function() {
      if (xhr.readyState == 4)
        resolve(JSON.parse(xhr.responseText));
    }
    xhr.send();
  })
    .then(_ => {
        const data = _.filter(_ => prodGLs.includes(_.gl)) // TODO: move to data generation step
        data.forEach(_ => {
          _.features = new Set(
              _.features.map(
                _ => _
                    .replace('_feature_div', '')
                    .replace(/.*product-description/, 'productDescription')
                    .replace(/detail-bullets/, 'detail_bullets')
              )
            );
        });
        const columns = new Set([].concat(...data.map(_ => [..._.features])));
        columns.delete('hero-quick-promo-grid');
        columns.delete('product-alert-grid');
        columns.delete('qpe-title-tag');
        app.columns = [...columns].sort();

        app.gls = [...new Set(data.map(_ => _.gl))];
        app.wdgs = [...new Set(data.map(_ => _.wdg))];

        asins = data
            .map(_ => {
                _.title = _.url.match(/\w+$/)[0];
                return _;
            });
        app.update();
    });

})();

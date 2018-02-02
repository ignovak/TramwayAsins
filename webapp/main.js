addEventListener('hashchange', _ => location.reload());

document.body.addEventListener('mouseover', _ => {
  if (_.target.nodeName == 'TD' && _.target.className) {
    _.target.setAttribute('title', {
      'bg-success': 'Feature is present on the page and displays the content',
      'bg-warning': 'Feature is either not present on the page or doesn\'t have any content'
    }[_.target.className]);
  }
});

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
    'features-devo',
    'asins-devo-old',
    'features-devo-old'
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
const retailMerchantId = isDevo ? /4105074442/ : /14311485635/;

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

let asins;

const appData = {
  columns: [],
  host: isDevo ? 'https://tr-development.amazon.com/dp/' : 'https://tr-pre-prod.amazon.com/dp/',
  selectedColumns: [],
  asins: [],
  gls: [],
  ptds: [],
  wdgs: [],
  filters: {
    features: [],
    gl: '',
    is3p: true,
    isRetail: true,
    ptd: '',
    wdg: '',
    text: ''
  }
};

const fetch = _ => {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('GET', dataStorage + '.json', true);
    xhr.onreadystatechange = function() {
      if (xhr.readyState == 4) {
        document.querySelector('.progress-card').setAttribute('hidden', true);
        resolve(JSON.parse(xhr.responseText));
      }
    }
    xhr.send();
  })
};

Vue.component('asin-filter', {
  props: ['name', 'data', 'value', 'title'],
  data: function () {
    return { id: 'my-filter-' + (Math.random() * 1000 | 0) };
  },
  methods: {
    update: function (value) {
      this.$emit('update', this.name, value);
    }
  },
  template: `
    <div class="form-group row">
        <label v-bind:for="id" class="col-3 col-form-label">{{ title }}</label>
        <div class="col-9">
            <select class="custom-select" v-bind:id="id" v-bind:value="value" v-on:change="update($event.target.value)">
                <option selected></option>
                <option v-for="item in data" v-bind:value="item">{{ item }}</option>
            </select>
        </div>
    </div>
  `
});

(function() {

if (!dataStorage.includes('asins')) {
  return;
}

document.querySelector('#asins-app').removeAttribute('hidden');

const app = new Vue({
  el: '#asins-app',
  data: appData,
  methods: {
    update: function() {
      this.asins = asins.filter(_ => (
        (
          this.filters.isRetail && retailMerchantId.test(_.merchantId)
          ||
          this.filters.is3p && !retailMerchantId.test(_.merchantId)
        )
        &&
        (!this.filters.gl || _.glType == this.filters.gl)
        &&
        (!this.filters.ptd || _.productType == this.filters.ptd)
        &&
        (!this.filters.wdg || _.wdg == this.filters.wdg)
        &&
        (
          !this.filters.text
          ||
          _.title.toLowerCase().includes(this.filters.text)
          ||
          (_.brandName || '').toLowerCase().includes(this.filters.text)
        )
      ));
    },
    updateFilter: function (filter, value) {
      this.filters[filter] = value;
    }
  },
  watch: {
    filters: {
      handler: 'update',
      deep: true
    },
    selectedColumns: function () {
      localStorage.columns = JSON.stringify(this.selectedColumns);
    }
  }
});

fetch(dataStorage + '.json')
    .then(_ => {
        asins = _
          .filter(_ => location.hash.match(/redundant/) ? !prodGLs.includes(_.glType) : prodGLs.includes(_.glType));

        app.gls = [...new Set(asins.map(_ => _.glType))].sort();
        app.ptds = [...new Set(asins.map(_ => _.productType))].sort();
        app.wdgs = [...new Set(asins.map(_ => _.wdg))].filter(Boolean).sort();

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
  data: appData,
  methods: {
    update: function() {
      this.asins = asins.filter(_ => (
        // (
        //   this.filters.isRetail && _.merchants.match(retailMerchantId)
        //   ||
        //   this.filters.is3p && _.merchants.replace(retailMerchantId, '')
        // )
        // &&
        (!this.filters.gl || _.gl == this.filters.gl)
        &&
        (!this.filters.wdg || _.wdg == this.filters.wdg)
        &&
        this.filters.features.every(feature => _.features.has(feature))
      ));
    },
    updateFilter: function (filter, value) {
      this.filters[filter] = value;
    }
  },
  watch: {
    filters: {
      handler: 'update',
      deep: true
    }
  }
});

fetch(dataStorage + '.json')
    .then(_ => {
        const data = _.filter(_ => prodGLs.includes(_.gl)) // TODO: move to data generation step
        data.forEach(_ => {
          _.features = new Set(
              _.features.map(
                _ => _
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

        app.gls = [...new Set(data.map(_ => _.gl))].sort();
        app.wdgs = [...new Set(data.map(_ => _.wdg))].filter(Boolean).sort();

        asins = data;
        app.update();
    });

})();

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

switch (location.hash) { // Legacy routes
  case '#asins-devo': location.hash = '#/asins/devo'; break;
  case '#asins-prod': location.hash = '#/asins/prod'; break;
  case '#features-devo': location.hash = '#/features/devo'; break;
  case '#features-prod': location.hash = '#/features/prod'; break;
}

const controller = {
  _handlers: {
    init: [],
    loading: [],
    update: []
  },

  _onLocationChange: function () {
    const { type, stage, gl } = this._parseRoute(location.hash);
    const dataSource = gl ? [stage, gl].join('/') : [type, stage].join('-');
    this._fetch(dataSource + '.json')
      .then(_ => this._trigger('update', {
        data: _,
        gl: gl,
        isDevo: stage == 'devo',
        isFeaturesApp: type == 'features'
      }));

    [].slice.call(document.body.querySelectorAll('.nav-link'))
        .forEach(_ => {
            if (location.href.startsWith(_.href)) {
              const activeLink = document.body.querySelector('.nav-link.active')
              activeLink && activeLink.classList.toggle('active');
              _.classList.toggle('active');
            }
        });
  },

  _parseRoute: function (route) {
    const match = location.hash.match(/^#\/(\w+)\/(\w+)(?:\/(\w+))?/);
    let _, type, stage, gl;
    if (match) {
      [_, type, stage, gl] = match;
    } else {
      [type, stage, gl] = ['asins', 'prod', ''];
    }
    return { type, stage, gl };
  },

  _buildRoute: function (type, stage, gl) {
    return `#/${ type }/${ stage }/${ gl }`;
  },

  _trigger: function (event, data) {
    this._handlers[event].forEach(_ => _(data));
  },

  _fetch: function (url) {
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open('GET', url, true);
      xhr.addEventListener('progress', _ => this._trigger('loading', _.loaded * 100 / (_.total || this.urls && this.urls[url])));
      xhr.addEventListener('load', _ => resolve(JSON.parse(xhr.responseText)));
      xhr.send();
    });
  },

  init: function () {
    addEventListener('hashchange', this._onLocationChange.bind(this));
    const { type, stage } = this._parseRoute(location.hash);
    this._fetch('metadata.json')
      .then(_ => {
        this._trigger('init', _);
        this.urls = _.urls;
        this._onLocationChange();
      });
  },
  setGL: function (newGL) {
    const { type, stage, gl } = this._parseRoute(location.hash);
    if (newGL != gl) {
      location.hash = this._buildRoute(type, stage, newGL);
    }
  },
  on: function (event, handler) {
    this._handlers[event].push(handler);
  }
};

Vue.component('asin-filter', {
  model: {
    event: 'change'
  },
  props: ['data', 'value', 'title'],
  data: function () {
    return { id: 'my-filter-' + (Math.random() * 1000 | 0) };
  },
  template: `
    <div class="form-group row">
      <label v-bind:for="id" class="col-3 col-form-label">{{ title }}</label>
      <div class="col-9">
        <select class="custom-select" :id="id" :value="value" @change="$emit('change', $event.target.value)">
          <option selected></option>
          <option v-for="item in data" v-bind:value="item">{{ item }}</option>
        </select>
      </div>
    </div>
  `
});

Vue.component('is-debug', {
  model: {
    prop: 'checked',
    event: 'change'
  },
  props: ['checked'],
  methods: {
    update: function (isChecked) {
      this.$emit('change', isChecked);
      setTimeout(_ => localStorage.isDebug = isChecked ? 'debug' : '');
    }
  },
  template: `
    <div class="form-group row">
      <div class="col-12">
        <div class="form-check form-check-inline">
          <label class="form-check-label">
            <input class="form-check-input" type="checkbox" :checked="checked" @change="update($event.target.checked)">
            Add <code>?isDebug=1&amp;twisterCacDebug=1</code> to the links
          </label>
        </div>
      </div>
    </div>
  `
});

Vue.component('last-modified', (resolve, reject) => {
  new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open('GET', 'update_date', true);
      xhr.onreadystatechange = function() {
        if (xhr.readyState == 4) {
          if (xhr.status == 200) {
            resolve(xhr.responseText);
          } else {
            reject(xhr.statusText);
          }
        }
      }
      xhr.send();
    })
    .then(_ => {
      if (localStorage.updateDate != _) {
        localStorage.updateDate = _;
      }
      resolve({
        template: `
          <div class="nav-link">
            Data is updated: <em>${ _ }</em>
          </div>
        `
      })
    })
    .catch(_ => console.log(_));
});

let asins;

const app = new Vue({
  el: '#app',
  data: {
    columns: [],
    features: [],
    selectedColumns: [],
    asins: [],
    gl: '',
    gls: [],
    isDebug: !!localStorage.isDebug,
    isDevo: false,
    isFeaturesApp: false,
    loadingProgress: 0,
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
  },
  methods: {
    buildUrl: function (item) {
      return [
        this.isDevo ? 'https://tr-development.amazon.com/dp/' : 'https://www.amazon.com.tr/dp/',
        item.asin,
        this.isDebug ? '?isDebug=1&twisterCacDebug=1' : ''
      ].join('');
    },
    update: function() {
      if (this.isFeaturesApp) {
        this.asins = asins.filter(_ => (
          (!this.filters.gl || _.gl == this.filters.gl)
          &&
          (!this.filters.wdg || _.wdg == this.filters.wdg)
          &&
          this.filters.features.every(feature => _.features.has(feature))
        ));
        return;
      }

      this.asins = asins.filter(_ => (
        (
          !this.isDevo
          ||
          this.filters.isRetail && /4105074442/.test(_.merchantId)
          ||
          this.filters.is3p && !/4105074442/.test(_.merchantId)
        )
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
    }
  },
  watch: {
    filters: {
      handler: 'update',
      deep: true
    },
    gl: function (gl) {
      controller.setGL(gl);
    },
    selectedColumns: function () {
      localStorage.columns = JSON.stringify(this.selectedColumns);
    }
  }
});

controller.on('init', _ => {
  app.columns = _.columns;
  app.features = _.features;
  app.gls = _.gls;
  app.ptds = _.ptds;
  app.wdgs = _.wdgs;
  app.selectedColumns = app.columns.filter(_ => selectedColumns.has(_));
});

controller.on('loading', _ => {
  app.loadingProgress = _;
});

controller.on('update', _ => {
  let data = _.data;
  if (_.isFeaturesApp) {
    data = data.filter(_ => app.gls.includes(_.gl)) // TODO: move to data generation step
    data.forEach(_ => {
      _.features = new Set(
        _.features.map(
          _ => _
            .replace(/.*product-description/, 'productDescription')
            .replace(/detail-bullets/, 'detail_bullets')
        )
      );
    });
  }

  asins = data;
  app.gl = _.gl;
  app.isDevo = _.isDevo;
  app.isFeaturesApp = _.isFeaturesApp;
  app.loadingProgress = 0;
  app.update();
});

controller.init();

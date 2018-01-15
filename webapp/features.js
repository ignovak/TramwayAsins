let asins;

const app = new Vue({
  el: '#app',
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
        xhr.onreadystatechange = function() {
            if (xhr.readyState == 4)
                resolve(xhr.responseText);
        }
        xhr.send();
    })
    .then(_ => {
        const data = JSON.parse(_);
        data.forEach(_ => {
          _.features = new Set(_.features.map(_ => _.replace('_feature_div', '')));
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

addEventListener('hashchange', _ => location.reload());

const dataStoragesOld = [
    'retail-prod',
    'retail-devo',
    '3p-devo',
    '3p-prod'
];

const dataStorages = [
    'asins-prod',
    'asins-devo'
];

let dataStorage = location.hash.slice(1);
if (dataStoragesOld.includes(dataStorage)) {
    location.hash = '#' + dataStorages[dataStorage.includes('prod') ? 0 : 1];
}

const selectedColumns = new Set(
    JSON.parse(
        localStorage.columns || '["asin","contribution/creationDate","contribution/glType","item/binding","item/brandName","item/productType", "listing/availability/quantity", "listing/price/amount","title"]'
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

const app = new Vue({
  el: '#app',
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

new Promise(function(resolve, reject) {
        const xhr = new XMLHttpRequest();
        xhr.open('GET', dataStorage + '.json', true);
        xhr.onreadystatechange = function() {
            if (xhr.readyState == 4)
                resolve(xhr.responseText);
        }
        xhr.send();
    })
    .then(_ => {
        asins = JSON.parse(_).map(_ => flatten(_));

        app.gls = [...new Set(asins.map(_ => _['contribution/glType']))];
        app.ptds = [...new Set(asins.map(_ => _['item/productType']))];

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

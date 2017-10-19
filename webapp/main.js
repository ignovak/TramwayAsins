const selectedColumns = new Set(
    JSON.parse(
        localStorage.columns || '["asin","contribution/creationDate","contribution/glType","item/binding","item/brandName","item/productType", "listing/availability/quantity", "listing/price/amount","title"]'
    )
);

const dataStorages = [
    'retail-prod',
    'retail-devo',
    '3p-devo',
    '3p-prod'
];

let asins;

let dataStorage = location.hash.slice(1);
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

addEventListener('hashchange', _ => location.reload());

const app = new Vue({
  el: '#app',
  data: {
      columns: [],
      host: location.hash.includes('devo') ? 'https://tr-development.amazon.com/dp/' : 'https://tr-pre-prod.amazon.com/dp/',
      selectedColumns: [],
      asins: [],
      filter: ''
  },
  watch: {
    selectedColumns: function () {
      localStorage.columns = JSON.stringify(this.selectedColumns);
    }
  },
  methods: {
    oninput: function () {
      this.asins = asins.filter(_ => _['title'].toLowerCase().includes(this.filter))
    },
    update: function() {
        this.asins = asins;
    }
  }
});

new Promise(function(resolve, reject) {
        const xhr = new XMLHttpRequest();
        xhr.open('GET', dataStorage + '.csv', true);
        xhr.onreadystatechange = function() {
            if (xhr.readyState == 4)
                resolve(xhr.responseText);
        }
        xhr.send();
    })
    .then(_ => {
        const data = _.split('\n')
            .filter(Boolean)
            .map(_ => _.split(','))
        app.columns = data.shift()
        app.selectedColumns = app.columns.filter(_ => selectedColumns.has(_))
        asins = data
            .map(_ => {
                const item = app.columns.reduce((el, column, i) => (el[column] = _[i], el), {})
                item['contribution/creationDate'] = (new Date(item['contribution/creationDate'] * 1000)).toString().slice(0, 25);
                return item;
            });
        app.update();
    });

// TODO
// * Add multiple sources
// * Add bootstrap
// * Add new entries & export asins.csv

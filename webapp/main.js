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
      this.asins = asins.filter(_ => {
        return (_['title'] || '').toLowerCase().includes(this.filter)
            || (_['contribution/glType'] || '').toLowerCase().includes(this.filter)
      })
    },
    update: function() {
        this.asins = asins;
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
        const data = JSON.parse(_);

        const columns = new Set();
        data.forEach(_ => getKeys(_).forEach(_ => columns.add(_)));
        app.columns = [...columns].sort();

        app.selectedColumns = app.columns.filter(_ => selectedColumns.has(_))

        asins = data.map(_ => flatten(_));
        app.update();
    });

function getKeys(node) {
  const keys = [];
  Object.entries(node).forEach(([key, value]) => {
    if (typeof value == 'object') {
      keys.push(...getKeys(value).map(_ => key + '/' + _));
    } else {
      keys.push(key);
    }
  });
  return keys;
}

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

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
        const data = CSVToArray(_.trim());
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

// ref: http://stackoverflow.com/a/1293163/2343
// This will parse a delimited string into an array of
// arrays. The default delimiter is the comma, but this
// can be overriden in the second argument.
function CSVToArray( strData, strDelimiter ){
    // Check to see if the delimiter is defined. If not,
    // then default to comma.
    strDelimiter = (strDelimiter || ",");

    // Create a regular expression to parse the CSV values.
    var objPattern = new RegExp(
        (
            // Delimiters.
            "(\\" + strDelimiter + "|\\r?\\n|\\r|^)" +

            // Quoted fields.
            "(?:\"([^\"]*(?:\"\"[^\"]*)*)\"|" +

            // Standard fields.
            "([^\"\\" + strDelimiter + "\\r\\n]*))"
        ),
        "gi"
        );


    // Create an array to hold our data. Give the array
    // a default empty first row.
    var arrData = [[]];

    // Create an array to hold our individual pattern
    // matching groups.
    var arrMatches = null;


    // Keep looping over the regular expression matches
    // until we can no longer find a match.
    while (arrMatches = objPattern.exec( strData )){

        // Get the delimiter that was found.
        var strMatchedDelimiter = arrMatches[ 1 ];

        // Check to see if the given delimiter has a length
        // (is not the start of string) and if it matches
        // field delimiter. If id does not, then we know
        // that this delimiter is a row delimiter.
        if (
            strMatchedDelimiter.length &&
            strMatchedDelimiter !== strDelimiter
            ){

            // Since we have reached a new row of data,
            // add an empty row to our data array.
            arrData.push( [] );

        }

        var strMatchedValue;

        // Now that we have our delimiter out of the way,
        // let's check to see which kind of value we
        // captured (quoted or unquoted).
        if (arrMatches[ 2 ]){

            // We found a quoted value. When we capture
            // this value, unescape any double quotes.
            strMatchedValue = arrMatches[ 2 ].replace(
                new RegExp( "\"\"", "g" ),
                "\""
                );

        } else {

            // We found a non-quoted value.
            strMatchedValue = arrMatches[ 3 ];

        }


        // Now that we have our value string, let's add
        // it to the data array.
        arrData[ arrData.length - 1 ].push( strMatchedValue );
    }

    // Return the parsed data.
    return( arrData );
}

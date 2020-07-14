var fs = require('fs');
console.log(JSON.parse(fs.readFileSync('dist/system.json', 'utf8')).version);

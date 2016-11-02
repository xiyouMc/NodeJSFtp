var server = require('./server.js');
var cp = require('child_process');
var rootpath = 'root';
var sv = server.create({
    port: '8888',
    host: '127.0.0.1',
    root: rootpath
});
cp.exec('explorer http://127.0.0.1:8888', function () {
});

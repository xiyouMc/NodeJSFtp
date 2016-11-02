var server = require('./server.js');
var cp = require('child_process');
var rootpath = 'root';
var sv = server.create({
    port: '8888',
    host: '192.168.2.40',
    root: rootpath
});
cp.exec('explorer http://192.168.2.40:8888', function () {
});

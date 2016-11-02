var http = require('http');
var path = require('path');
var fs = require('fs');
var url = require("url");
var mime = require('./mime.js');
 
function getPromise(cbk) {
    return (new Promise(cbk));
}
exports.create = function (opts) {
    var root = opts.root;
    var sv = http.createServer();
 
    function request(request, response) {
        var pathname = decodeURIComponent(url.parse(request.url).pathname);
        var realPath = path.resolve(path.join(root, pathname));//请求的实际路径
        console.log(realPath);
        getPromise(function (resolve, reject) {
            fs.exists(realPath, function (isExists) {//判断路径是否存在
                isExists ? resolve() : reject();
            });
        }).catch(function () {
            resWrite(response, '404', 'html', '<h1>404</h1>file or dir : <h3>' + pathname + '</h3>not found');
        }).then(function () {
            return getPromise(function (resolve, reject) {
                fs.stat(realPath, function (err, stat) {//判断路径是文件还是文件夹
                    if (err) {
                        reject(err);
                    } else {
                        resolve(stat);
                    }
                })
            }).then(function (stat) {
                if (stat.isFile()) {//路径对应的是一个文件
                    resFile(response, realPath);
                } else if (stat.isDirectory()) {//路径对应的是一个文件夹
                    var defaultIndexPath = path.resolve(realPath, 'index.html');
                    return getPromise(function (resolve, reject) {
                        fs.exists(defaultIndexPath, function (isExists) {
                            if (isExists) {//如果该文件夹内有index.html
                                resolve(true);
                            } else {//该文件夹内没有index.html 则 显示该文件夹的内容列表
                                resolve(false);
                            }
                        })
                    }).then(function (isExistsIndex) {
                        if (isExistsIndex) {
                            resFile(response, defaultIndexPath);
                        } else {
                            return getPromise(function (resolve, reject) {
                                fs.readdir(realPath, function (err, list) {
                                    if (err) {
                                        reject(err);
                                    } else {
                                        resolve(list);
                                    }
                                })
                            }).then(function (list) {
                                var pmlist = list.map(function (item) {
                                    return (new Promise(function (resolve, reject) {
                                        fs.stat(path.resolve(realPath, item), function (err, stat) {
                                            if (err) {
                                                console.error(err);
                                                resolve('');
                                            } else if (stat.isFile()) {
                                                resolve(`<li class="file"><a href="${item}">${item}</a></li>`);
                                            } else if (stat.isDirectory()) {
                                                resolve(`<li class="dir"><a href="${item}/">${item}</a></li>`);
                                            } else {
                                                resolve('');
                                            }
                                        })
                                    }));
                                });
                                Promise.all(pmlist).then(function (linkList) {
                                    var links = '<ul>';
                                    links += '<li class="dir"><a href="../">../</a></li>';
                                    links += linkList.join('');
                                    links += '</ul>';
                                    var dirPage = `
<!doctype html>
<html>
<head>
<meta charset="utf-8"/>
    <style>
        a{color:blue;text-decoration: none;}
        .dir a{color:orange}
    </style>
</head>
<body>
    ${links}
</body>
</html>
`;
                                    resWrite(response, '200', 'html', dirPage);
                                });
                            }).catch(function (err) {
                                resWrite(response, '500', 'default', err.toString());
                            })
                        }
                    })
                } else {//既不是文件也不是文件夹
                    resWrite(response, '404', 'html', '<h1>404</h1>file or dir : <h3>' + pathname + '</h3>not found');
                }
            }).catch(function (err) {
                resWrite(response, '500', 'default', err.toString());
            })
        })
    }
 
 
    sv.on('request', request);
    sv.listen(opts.port, opts.host);
    return sv;
};
 
function resFile(response, realPath) {//输出一个文件
    fs.readFile(realPath, function (err, data) {
        if (err) {
            resWrite(response, '500', 'default', err.toString());
        } else {
            var ext = path.extname(realPath).toLocaleLowerCase();
            ext = (ext ? ext.slice(1) : 'unknown');
            resWrite(response, '200', ext, data);
        }
    });
}
 
function resWrite(response, statusCode, mimeKey, data) {
    response.writeHead(statusCode, {'Content-Type': mime(mimeKey)});
    response.end(data);
}
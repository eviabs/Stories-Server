/**
 * Server
 */


var express = require('express');
var server = require('./server.js');
var app = express();

app.set('port', (process.env.PORT || 80));

app.set('views', __dirname + '/views');
app.engine('html', require('ejs').renderFile);
app.use(express.static('public'));

// =====================================================================
// =====================      Valid commands      ======================
// =====================================================================

// Download a file
app.get('/get_file', function (req, res) {
    server.get_file(req, res);
});

// Upload a file
app.use(fileUpload()).post('/upload_file', function(req, res) {
    server.upload_file(req, res);
});

app.use(fileUpload()).get('/upload_file', function(req, res) {
    server.upload_file(req, res);
});

// Get data
app.get('/get_data', function (req, res) {
    server.get_data(req, res);
});

// Set data
app.get('/set_data', function (req, res) {
    server.set_data(req, res);
});

// Test
app.get('/test', function (req, res, next) {
    server.test(req, res);
});

// Home
app.get('/', function (req, res, next) {
    res.render('index.html');
});

// Home - Stroy
app.get('/story/:id', function (req, res, next) {
    // TODO: show story on site
    res.render('index.html');
});
// =====================================================================
// =====================================================================
// =====================================================================

// Any other command results 404
app.get('/*', function (req, res, next) {
    res.status(404);
    res.end(JSON.stringify("file does not exist", null, 4));
});

// Get IPs
get_ips = function () {
    var os = require('os');

    var interfaces = os.networkInterfaces();
    var addresses = [];
    for (var k in interfaces) {
        for (var k2 in interfaces[k]) {
            var address = interfaces[k][k2];
            if (address.family === 'IPv4' && !address.internal) {
                addresses.push(address.address);
            }
        }
    }

    return addresses;
};

// Run server
app.listen(app.get('port'), function() {
    var ips = get_ips();
    console.log('Node app is running... \nPort:', app.get('port'));
    console.log("IPs:", ips);
    console.log("==========");
    for (var i = 0; i < ips.length; i++) {
        console.log("http://" + ips[i] + ":" + app.get('port'));
    }
});



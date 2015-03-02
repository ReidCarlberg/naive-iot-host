/*
	Naive IoT Host
	@ReidCarlberg
	2015-03-02
*/

var express = require('express'),
	ipfilter = require('ipfilter'),
	env = process.env.NODE_ENV || 'development',
	bodyParser = require('body-parser'),
	Sequelize = require('sequelize');

var dbUrl = process.env.HEROKU_POSTGRESQL_AQUA_URL || 'postgres://reid.carlberg@127.0.0.1:5432/ormtest1';

console.log("Selected DB: " + dbUrl);

var app = express();

var sequelize = new Sequelize(dbUrl);

var permitted = ["73.208.78.180", "127.0.0.1", "192.168.1.250", "192.168.1.23", "192.168.1.92"]

//http://stackoverflow.com/questions/7185074/heroku-nodejs-http-to-https-ssl-forced-redirect/23894573#23894573
var forceSsl = function (req, res, next) {
    if (req.headers['x-forwarded-proto'] !== 'https') {
        return res.redirect(['https://', req.get('Host'), req.url].join(''));
    }
    return next();
 };

//model
var Reading = sequelize.define('Reading', {
	deviceName: Sequelize.STRING,
	rangeStartDate: Sequelize.DATE,
	rangeEndDate: Sequelize.DATE,
	maxBrightness: Sequelize.INTEGER,
	minBrightness: Sequelize.INTEGER,
	maxTemperature: Sequelize.DECIMAL(4,2),
	minTemperature: Sequelize.DECIMAL(4,2)
});


app.set('port', (process.env.PORT || 5000));
app.use(express.static(__dirname + '/public'));
app.use(ipfilter(permitted, {mode: 'allow'}));

if (env === 'production') {
    app.use(forceSsl);
}

app.use(bodyParser.json()); // for parsing application/json

app.get('/', function(request, response) {
  response.send('Hello World!');
});

app.post('/report', function(request, response) {

	var responseStatus = null;

	var newReadings = request.body;

	sequelize.sync().then(function() {
		var myKeys = Object.keys(newReadings);
		for (i = 0; i < myKeys.length; i++) {
			var currentReading = newReadings[myKeys[i]];
			Reading.create(currentReading);
		}
	}).then(function(data) {
		console.log("done");
	});

	//send response
	response.sendStatus(responseStatus);
})
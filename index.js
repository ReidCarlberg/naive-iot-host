/*
	Simplest IoT Host that Might Possibly Work
	@ReidCarlberg
	2015-03-03
*/

var express = require('express'),
	ipfilter = require('ipfilter'),
	env = process.env.NODE_ENV || 'development',
	bodyParser = require('body-parser'),
	Sequelize = require('sequelize'),
	Forecast = require('forecast');

var dbUrl = process.env.HEROKU_POSTGRESQL_AQUA_URL || process.env.LOCAL_DB_URL;

console.log("Selected DB: " + dbUrl);

var app = express();

var sequelize = new Sequelize(dbUrl);

console.log("sequelize");

var permitted = process.env.IP_WHITELIST.split(",");
console.log(permitted);
//http://stackoverflow.com/questions/7185074/heroku-nodejs-http-to-https-ssl-forced-redirect/23894573#23894573
var forceSsl = function (req, res, next) {
    if (req.headers['x-forwarded-proto'] !== 'https') {
        return res.redirect(['https://', req.get('Host'), req.url].join(''));
    }
    return next();
 };

//model - sequelize will create this table (it doesn't do table mods tho)
var Reading = sequelize.define('Reading', {
	deviceName: Sequelize.STRING,
	rangeStartDate: Sequelize.DATE,
	rangeEndDate: Sequelize.DATE,
	maxBrightness: Sequelize.INTEGER,
	minBrightness: Sequelize.INTEGER,
	maxTemperature: Sequelize.DECIMAL(4,2),
	minTemperature: Sequelize.DECIMAL(4,2),
	weatherSummary : Sequelize.STRING,
	weatherTemperature: Sequelize.DECIMAL(4,2),
	weatherWindSpeed: Sequelize.DECIMAL(4,2),
	weatherWindBearing: Sequelize.INTEGER
});

//weather -- because of course we want that.
var forecast = new Forecast({
  service: 'forecast.io',
  key: process.env.FORECAST_IO_APIKEY,
  units: 'celcius', // Only the first letter is parsed 
  cache: true,      // Cache API requests? 
  ttl: {            // How long to cache requests. Uses syntax from moment.js: http://momentjs.com/docs/#/durations/creating/ 
    minutes: 5,
    seconds: 0
    }
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

app.get('/view', function(request, response) {
	response.redirect('https://dataclips.heroku.com/klmjbiygozuozcfifmnokmozlmex-Example-Sensor-Data');
})

app.post('/report', function(request, response) {

	console.log('reporting');
	
	var responseStatus = null;

	var newReadings = request.body;

	forecast.get([41.8050309, -87.8743054], function(err, weather) {
		if(err) return console.dir(err);

		sequelize.sync().then(function() {
			var myKeys = Object.keys(newReadings);
			for (i = 0; i < myKeys.length; i++) {
				var currentReading = newReadings[myKeys[i]];
				currentReading.weatherSummary = weather.currently.summary;
				currentReading.weatherTemperature = weather.currently.temperature;
				currentReading.weatherWindSpeed = weather.currently.windSpeed;
				currentReading.weatherWindBearing = weather.currently.windBearing;
				Reading.create(currentReading);
			}
		}).then(function(data) {
			console.log("done");
		});

	});



	//send response
	response.sendStatus(200);
});

if (!module.parent) {
	app.listen(app.get('port'), function() {
	  console.log("Node app is running at localhost:" + app.get('port'));
	});
}

module.exports = app;
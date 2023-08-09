const express = require('express');
const app = express();
const port = 3000;
const bodyParser = require('body-parser');

const { Origin, Horoscope } = require('circular-natal-horoscope-js');

const ephemeris = require('ephemeris');
const geolib = require('geolib');
const cities = require('all-the-cities');

app.use(express.urlencoded({ extended: true }));

app.use(express.json());
app.use(express.static('public'));

app.post('/astro', async (req, res) => {
  try {
      const moment = require('moment');
      
      let birthDateTime = req.body.birthDate + 'T' + req.body.birthTime + 'Z';
      birthDateTime = moment(birthDateTime).isValid() ? new Date(birthDateTime) : new Date("1986-04-23T06:21:00Z");
      
      let birthLocation = req.body.birthLocation;
      const matchedCities = cities.filter(city => city.name.match(new RegExp(birthLocation, 'i')));
      
      if (matchedCities.length === 0) {
        throw new Error(`No cities found matching ${birthLocation}`);
      }
      
      const closestCity = geolib.findNearest({latitude: req.body.latitude, longitude: req.body.longitude}, matchedCities);
      birthLocation = closestCity.name;
      const response = await fetch(`https://nominatim.openstreetmap.org/search?state=${birthLocation}&format=json`);
      if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
      } else if (!response.headers.get('content-type').startsWith('application/json')) {
          throw new Error(`Invalid content type! Expected application/json but received ${response.headers.get('content-type')}`);
      }
      const data = await response.json();
      const latitude = parseFloat(data[0].lat);
      const longitude = parseFloat(data[0].lon);

      const ephemerisData = await ephemeris.getAllPlanets(birthDateTime, longitude, latitude, 0);

      const origin = new Origin({
          year: birthDateTime.getUTCFullYear(),
          month: birthDateTime.getUTCMonth(),
          date: birthDateTime.getUTCDate(),
          hour: birthDateTime.getUTCHours(),
          minute: birthDateTime.getUTCMinutes(),
          latitude,
          longitude,
      });

      const horoscope = new Horoscope({
          origin,
          houseSystem: "whole-sign",
          zodiac: "tropical",
          aspectPoints: ['bodies', 'points', 'angles'],
          aspectWithPoints: ['bodies', 'points', 'angles'],
          aspectTypes: ["major", "minor"],
          customOrbs: {},
          language: 'en'
      });

      const zodiacSigns = ['Aries', 'Taurus', 'Gemini', 'Cancer', 'Leo', 'Virgo', 'Libra', 'Scorpio', 'Sagittarius', 'Capricorn', 'Aquarius', 'Pisces'];
      const sunSign = zodiacSigns[Math.floor(ephemerisData.observed.sun.apparentLongitudeDd / 30)];
      const moonSign = zodiacSigns[Math.floor(ephemerisData.observed.moon.apparentLongitudeDd / 30)];
      const ascendantSign = horoscope._ascendant.Sign.label;
      const midheavenSign = horoscope._midheaven.Sign.label;

      const result = { sunSign, moonSign, ascendantSign, midheavenSign };
      const chartData = { horoscope };
      res.json({ result });
  } catch (error) {
      console.error(error);
      res.status(500).send('An error occurred while calculating astrological data.');
  }
});

app.listen(port, () => {
  console.log(`Server listening at http://localhost:${port}`);
});


import express from 'express';
import { urlencoded, json, static as expressStatic} from 'express';
import cors from 'cors';
import pkg from 'circular-natal-horoscope-js';
import ephemeris from 'ephemeris';
import moment from 'moment';

const app = express();
const port = 3000;

app.use(cors({ origin: 'http://localhost:3000' }));
app.use(urlencoded({ extended: true }));
app.use(json());
app.use(expressStatic('public'));

app.post('/astro', async (req, res) => {
  try {
      let birthDateTime = req.body.birthDate + 'T' + req.body.birthTime + 'Z';
      birthDateTime = moment(birthDateTime).isValid() ? new Date(birthDateTime) : new Date("1986-04-23T06:21:00Z");

      let birthLocation = req.body.birthLocation;
      const url = `https://nominatim.openstreetmap.org/search?format=json&q=${birthLocation}`;
      const response = await fetch(url);

      if (!response.ok) {
        console.error(`HTTP error! status: ${response.status}`);
        return res.status(400).send('Invalid input.');
      } else if (!response.headers.get('content-type').startsWith('application/json')) {
        console.error(`Invalid content type! Expected application/json but received ${response.headers.get('content-type')}`);
        return res.status(400).send('Invalid input.');
      }

      const data = await response.json();
      if (data.length === 0) {
        console.error(`No location found matching '${birthLocation}'`);
        return res.status(400).send('Invalid location.');
      }

      const latitude = parseFloat(data[0].lat);
      const longitude = parseFloat(data[0].lon);

      const ephemerisData = await ephemeris.getAllPlanets(birthDateTime, longitude, latitude, 0);

      const origin = new pkg.Origin({
          year: birthDateTime.getUTCFullYear(),
          month: birthDateTime.getUTCMonth(),
          date: birthDateTime.getUTCDate(),
          hour: birthDateTime.getUTCHours(),
          minute: birthDateTime.getUTCMinutes(),
          latitude,
          longitude,
      });

      const horoscope = new pkg.Horoscope({
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
      res.status(400).send('An error occurred. Please check your input and try again.');
  }
});

app.listen(port, () => {
  console.log(`Server listening at http://localhost:${port}`);
});

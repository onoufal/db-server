'use strict';

require('dotenv').config();

const PORT = process.env.PORT || 3000;
const GEOCODE_API_KEY = process.env.GEOCODE_API_KEY;
const DATABASE_URL = process.env.DATABASE_URL;

const express = require('express');

const cors = require('cors');

const superagent = require('superagent');

const pg = require('pg');
const client = new pg.Client(DATABASE_URL);
client.on('error', err => { throw err });

const app = express();

app.use(cors());

app.get('/location', handle);


client.connect().then(() => {
  app.listen(PORT, () => {
    console.log(`Listening to port ${PORT}`);
  });

});

function handle(req, res) {
  const city = req.query.city;
  const select = 'SELECT * FROM locations WHERE city = $1';

  client.query(select, [city]).then((data) => {
    if (data.rowCount === 0) {
      const url = `https://eu1.locationiq.com/v1/search.php?key=${GEOCODE_API_KEY}&q=${city}&format=json`
      superagent.get(url).then(data => {
        const locationData = data.body[0];
        const newLocation = new Location(city, locationData.display_name);
        const sql = 'INSERT INTO locations (city, display_name) VALUES ($1, $2) RETURNING *';
        const cleanValues = [newLocation.city, newLocation.display_name];
        client.query(sql, cleanValues).then((data) => {
          console.log(data.rows[0]);
          res.json(data.rows[0]);
        });
      });
    } else {
      res.json(data.rows[0]);
    }
  });
}

function Location(city, display_name) {
  this.city = city;
  this.display_name = display_name;
}

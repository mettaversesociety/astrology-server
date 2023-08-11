
import dotenv from 'dotenv';
import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import passport from 'passport';
import session from 'express-session';
import './middleware/discord-auth.js';
import cors from 'cors';

import { connectToDatabase, ObjectId } from './db.js';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config();

const app = express();
const server = http.createServer(app);
const io = new Server(server);
const discordPlayerData = {};

app.use(cors());

// Set up session and passport middleware
app.use(session({
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false
}));

app.use(passport.initialize());
app.use(passport.session());
app.use(express.json());

// Connect to the MongoDB database
connectToDatabase()
  .then((db) => {
    if (!db) {
      console.error('Failed to connect to database.');
      process.exit(1);
    }

    console.log('Connected to MongoDB!');
    const playerCollection = db.collection('playerRecords');

    // Middleware to add player data to requests
    app.use(async (req, res, next) => {
      if (req.path === '/auth/discord' || req.path === '/auth/discord/callback') {
        next();
      } else if (!req.isAuthenticated()) {
        console.log("NOT AUTHENTICATED!")
        return res.redirect('/auth/discord');
      } else if (req.isAuthenticated()) {
        console.log("AUTHENTICATED!", req.isAuthenticated());
        const discordUserId = req.user.id;

        console.log("REQ USER ", discordPlayerData)

        let player = await playerCollection.findOne({ discordUserId });

        if (!player) {
          try {
            player = await playerCollection.insertOne({
              _id: new ObjectId,
              discordUserId: discordUserId,
              currency: parseInt(0),
              createdAt: new Date()
            });
          } catch (error) {
            if (error instanceof MongoError && error.message.includes('Document failed validation')) {
              console.log('Validation failed:', error.message);
            } else {
              console.log('Error inserting document:', error);
            }
          }
        }

        req.player = player;
        discordPlayerData.id = player.discordUserId;
        discordPlayerData.username = req.user.username
        discordPlayerData.currency = player.currency;

        // Pass db and playerCollection to io object
        io.db = db;
        io.playerCollection = playerCollection;

        next();
      }
    });

    // Serve static files from the public directory
    // app.use(express.static(__dirname + '/public/'));

    // Set up authentication routes
    app.get('/auth/discord', passport.authenticate('discord', { scope: ['identify'] }));
    app.get('/auth/discord/callback', passport.authenticate('discord', { failureRedirect: '/' }), (req, res) => {
      req.session.discordUserId = req.user.id;
      res.redirect('/home');
    });

    // Set up main route
    app.get('/', (req, res) => {
      res.sendFile(__dirname + '/public/index.html');
    });

    // Set up home route
    app.get('/home', (req, res) => {
      if (req.isAuthenticated()) {
        res.sendFile(__dirname + '/public/home.html');
        console.log("AUTHENTICATED!")
      }
      else {
        res.redirect('/');
      }

    });

    // Set up logout route
    app.get('/logout', (req, res) => {
      req.logout();
      res.redirect('/');
    });

    // Set up game route
    app.get('/game/blackjack', (req, res) => {
      if (req.isAuthenticated()) {
        res.sendFile(__dirname + '/public/game/index.html');
        console.log("AUTHENTICATED!")
      }
      else {
        res.redirect('/');
      }

    });

    app.get('/api/player', async (req, res) => {
      const player = req.player;
      // const player = await playerCollection.findOne({ discordUserId: discordPlayerData.id });
      console.log("STILL SERVER ", player)
      res.json({ player });
    });

    app.get('/api/player-record', async (req, res) => {
      const discordUserId = req.session.discordUserId;
      const player = await playerCollection.findOne({ discordUserId });
      res.json({ player });
    });

  // API endpoint to update player record
  app.patch('/update-player-record', async (req, res) => {
    try {
      // Get data from request body
      const { discordUserId, birthDate, birthTime, birthLocation, astroData } = req.body;
  
      // Check if the player record exists
      const player = await playerCollection.findOne({ discordUserId });
  
      if (!player) {
        console.log('Player record not found');
        return res.status(404).json({ message: 'Player record not found' });
      }
  
      // Update the player record in MongoDB
      await playerCollection.updateOne(
        { discordUserId },
        { $set: {
          birthDate,
          birthTime,
          birthLocation,
          sunSign: astroData.sunSign,
          moonSign: astroData.moonSign,
          ascendantSign: astroData.ascendantSign,
          midheavenSign: astroData.midheavenSign
        }}
      );
  
      // Send a success response
      res.json({ message: 'Player record updated successfully!' });
    } catch (error) {
      // Log the error and send an error response
      console.error(error);
      res.status(500).json({ message: 'An error occurred' });
      }
    });

    app.get('/get-discord-user-id', (req, res) => {
      if (req.session.discordUserId) {
        console.log('ID IS ', req.session.discordUserId)
        res.json({ discordUserId: req.session.discordUserId });
      } else {
        res.status(404).json({ error: 'Not found' });
      }
    });

    // Start server
    server.listen(process.env.PORT || 4000, () => {
      console.log(`Server started on port ${process.env.PORT || 4000}!`);
    });
  })
  .catch((err) => {
    console.error('Failed to connect to MongoDB:', err);
    process.exit(1);
  });
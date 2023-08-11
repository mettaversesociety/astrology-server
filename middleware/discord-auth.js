
import passport from 'passport';
import { Strategy as DiscordStrategy } from 'passport-discord';
import dotenv from 'dotenv';

dotenv.config();

passport.use(new DiscordStrategy({
  clientID: process.env.DISCORD_CLIENT_ID,
  clientSecret: process.env.DISCORD_CLIENT_SECRET,
  callbackURL: process.env.DISCORD_CALLBACK_URL,
  scope: ['identify']
}, (accessToken, refreshToken, profile, done) => {
  // Handle the user profile data returned by Discord
  console.log("accessToken ", accessToken);
  console.log("refreshToken ", refreshToken);
  console.log("profile ", profile);

  // Save user profile data in session
  const user = {
    id: profile.id,
    username: profile.username
  };
  done(null, user);
}));

passport.serializeUser((user, done) => {
  console.log("SERIALIZED USER ", user)
  done(null, user);
});

passport.deserializeUser((obj, done) => {
  console.log("DESERIALIZED ", obj)
  done(null, obj);
});

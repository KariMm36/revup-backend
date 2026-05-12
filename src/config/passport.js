'use strict';

const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const GitHubStrategy = require('passport-github2').Strategy;
const { User } = require('../models');

// ─── Google Strategy ─────────────────────────────────────────────────────────
if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
  passport.use(
    new GoogleStrategy(
      {
        clientID: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        callbackURL: process.env.GOOGLE_CALLBACK_URL,
      },
      async (accessToken, refreshToken, profile, done) => {
        try {
          const email    = profile.emails?.[0]?.value;
          const name     = profile.displayName || profile.username || 'Google User';
          const googleId = profile.id;

          // 1. Already linked via google_id
          let user = await User.findOne({ where: { google_id: googleId } });
          if (user) return done(null, user);

          // 2. Email exists — link google_id to existing account
          if (email) {
            user = await User.findOne({ where: { email } });
            if (user) {
              await user.update({ google_id: googleId });
              return done(null, user);
            }
          }

          // 3. Brand-new user — create without a role yet (role chosen on frontend)
          user = await User.create({
            name,
            email: email || `google_${googleId}@oauth.placeholder`,
            password: null,
            google_id: googleId,
            profile_pic: profile.photos?.[0]?.value || null,
            role: 'pending',
            status: 'active',
          });

          return done(null, user);
        } catch (err) {
          return done(err, null);
        }
      }
    )
  );
} else {
  console.warn('[passport] Google OAuth is disabled — GOOGLE_CLIENT_ID/SECRET not set in .env');
}

// ─── GitHub Strategy ─────────────────────────────────────────────────────────
if (process.env.GITHUB_CLIENT_ID && process.env.GITHUB_CLIENT_SECRET) {
  passport.use(
    new GitHubStrategy(
      {
        clientID: process.env.GITHUB_CLIENT_ID,
        clientSecret: process.env.GITHUB_CLIENT_SECRET,
        callbackURL: process.env.GITHUB_CALLBACK_URL,
        scope: ['user:email'],
      },
      async (accessToken, refreshToken, profile, done) => {
        try {
          const email    = profile.emails?.[0]?.value;
          const name     = profile.displayName || profile.username || 'GitHub User';
          const githubId = profile.id.toString();

          // 1. Already linked via github_id
          let user = await User.findOne({ where: { github_id: githubId } });
          if (user) return done(null, user);

          // 2. Email exists — link github_id to existing account
          if (email) {
            user = await User.findOne({ where: { email } });
            if (user) {
              await user.update({ github_id: githubId });
              return done(null, user);
            }
          }

          // 3. Brand-new user — create without a role yet
          user = await User.create({
            name,
            email: email || `github_${githubId}@oauth.placeholder`,
            password: null,
            github_id: githubId,
            profile_pic: profile.photos?.[0]?.value || null,
            role: 'pending',
            status: 'active',
          });

          return done(null, user);
        } catch (err) {
          return done(err, null);
        }
      }
    )
  );
} else {
  console.warn('[passport] GitHub OAuth is disabled — GITHUB_CLIENT_ID/SECRET not set in .env');
}

module.exports = passport;

'use strict';

const Router = require('express').Router;
const authTest = require('./util/auth');

const router = new Router();

router.route('/login')
.get((req, res) => {
  res.render('login', { failed: false });
})
.post((req, res) => {
  let { username, password } = req.body;
  let isValid = authTest(username, password);
  if (isValid) {
    req.session.authorized = true;
    res.redirect('/');
  } else {
    res.status(401);
    res.render('login', { failed: true });
  }
});

router.use((req, res, next) => {
  // Deny access to the rest of service if unauthorized.
  if (req.session.authorized) return next();
  res.status(401);
  if (req.accepts('html')) {
    res.render('login', { failed: true });
  } else {
    res.send('401 Unauthorized');
  }
});

router.get('/logout', (req, res) => {
  // Ignore errors, since logout fail is just weird
  req.session.destroy((err) => {
    if (err) console.error(err);
    res.redirect('/');
  });
})

module.exports = router;

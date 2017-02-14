'use strict';

const Router = require('express').Router;
const authTest = require('./util/auth');

const router = new Router();

router.route('/login')
.get((req, res) => {
  res.render('login', { callback: '' });
})
.post((req, res) => {
  let { username, password } = req.body;
  authTest(username, password)
  .then(isValid => {
    if (isValid) {
      req.session.authorized = true;
      res.redirect(req.query.callback || '/');
    } else {
      res.status(401);
      res.render('login', { callback: encodeURIComponent(req.query.callback) ||
         '', failed: true });
    }
  });
});

router.use((req, res, next) => {
  // Deny access to the rest of service if unauthorized.
  if (req.session.authorized) return next();
  res.status(401);
  if (req.accepts('html')) {
    res.render('login', { callback: encodeURIComponent(req.path) || '' });
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

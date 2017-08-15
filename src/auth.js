'use strict';

const Router = require('express').Router;
const authTest = require('./util/auth');

const parseurl = require('parseurl');

const router = new Router();

const PATH_FILTER = /(?:^|[\\\/])\.\.(?:[\\\/]|$)/;

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
  // But if the resource is shared, allow access regardless of the login state.
  // To detect them, use a config file. Since most of the video URLs never
  // overlap, we can just check for entry in passwd file.
  let pathVal = decode(parseurl(req).pathname);
  if (PATH_FILTER.test(pathVal)) return res.status(400).send('Path invalid');
  if (pathVal.indexOf('\0') !== -1) return res.status(400).send('Path invalid');
  req.hasAccess = (path) => {
    if (req.session.authorized) return true;
    if (authTest.fileCheck(path)) return true;
    return false;
  }
  if (req.hasAccess(pathVal)) return next();
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

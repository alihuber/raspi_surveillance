process.on(`uncaughtException`, console.error);

const express = require('express');
const http    = require('http');
const path    = require('path');
const favicon = require('serve-favicon');
const logger  = require('morgan');
const basic   = require('express-authentication-basic');

const cameraController = require('./controllers/camera');
const watcher          = require('./watcher');

const app   = express();
const login = basic(function(challenge, callback){
  if(challenge.username === process.env.USER  &&
      challenge.password === process.env.PW) {
    callback(null, true, {user: process.env.USER});
  } else {
    callback(null, false, {error: 'INVALID_PASSWORD'});
  }
});

app.set('view engine', 'pug');
app.set('port', process.env.PORT || 4567);
app.set('views', path.join(__dirname, 'views'));
app.use(logger('dev'));
app.use(login);

app.post('/activate',   cameraController.activate);
app.post('/deactivate', cameraController.deactivate);


app.get('/', function(req, res) {
  if(req.authenticated) {
    res.render('index', {camera_url: process.env.CAMERA_URL});
  } else {
    res.status(401).send();
  }
});

app.use((req, res, next) => {
  let err = new Error('Not Found');
  err.status = 404;
  next(err);
});

// error handlers

// Catch unauthorised errors
app.use((err, req, res, next) => {
  if(err.name === 'UnauthorizedError') {
    res.status(401);
    res.json({"message" : err.name + ": " + err.message});
  }
});

// development error handler
// will print stacktrace
if (app.get('env') === 'development') {
  app.use((err, req, res, next) => {
    res.status(err.status || 500);
    res.render('error', {
        message: err.message,
        error: err
    });
  });
}

// production error handler
// no stacktraces leaked to user
app.use((err, req, res, next) => {
  res.status(err.status || 500);
  res.render('error', {
      message: err.message,
      error: {}
  });
});

http.createServer(app).listen(app.get('port'), () => {
  console.log('Express Server listening on port ' + app.get('port'));
});

watcher.watch();
module.exports = app;

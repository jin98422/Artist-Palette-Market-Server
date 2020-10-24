const express = require('express');
const app = express();
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const cors = require('cors');
const path = require('path');

const port = parseInt(process.env.PORT, 10) || 8000;
const dbconfig = require('./database/dbconfig');
const user = require('./routes/user');
const artwork = require('./routes/artwork');



//Database-MongoDB
mongoose.Promise = global.Promise;
mongoose.connect(dbconfig.DB, {useNewUrlParser: true, useCreateIndex: true}).then(
    () => {console.log(`Database is connected - ${dbconfig.DB}`)},
    err => {console.log(`Can't connect to the database - ${err}`)}
);

app.use(bodyParser.json());
app.use(cors());
// app.use(cors)
app.use(function(req, res, next) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, GET');
    res.setHeader('Access-Control-Allow-Headers', 'X-Requested-With, content-type, authorization');
    res.setHeader('Access-Control-Allow-Credentials', true);
    next();
})

var publicDir = path.join(__dirname,'/public');
app.use(express.static(publicDir));

app.get('/api/', (req, res) => {
  res.send('Hello!')
});

app.use('/api/user', user);
app.use('/api/artwork', artwork);

app.listen(port, () => {
  console.log(`App listening on port ${port}!`);
});
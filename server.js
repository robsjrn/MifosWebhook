var express = require('express');
var bodyparser = require('body-parser');
var app = express();
app.use(bodyparser.json());
app.use(bodyparser.urlencoded({ extended: true })); 
var router=require('./server/router')(app);






app.listen(3000);
console.log('Example app listening at 3000');



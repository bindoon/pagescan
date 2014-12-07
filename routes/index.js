'use strict';

var url = require('url');
var http = require('http');

var scan = require('./scan');
/*
 * GET home page.
 */
var scan =(new scan());
scan.run();
exports.index = function(req, res){
    res.render('index', { title: scan.requestQue.length })

};
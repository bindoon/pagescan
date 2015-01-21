'use strict';

var url = require('url');
var http = require('http');

var scan = require('./scan');
/*
 * GET home page.
 */
var scan =(new scan({
    url:'http://v.qq.com',
    singlepage:false
}));
scan.run();

exports.index = function(req, res){
    var obj = {
        title: 'result',
        url:scan._options.url,
        urllist:scan.urllist,
        link404:scan.queue404,
        scanlist:scan.requestQue.length,
        singlepage: scan._options.singlepage,
        costTime : scan.getCostTime()
    }
    res.render('index', obj);

};
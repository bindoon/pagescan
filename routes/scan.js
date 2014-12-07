'use strict';

var http = require('http'),
    urlparse = require('url').parse,
    hash = require('./hash');

var log = console.log;
var common = {
   /**
     * 快排
     * @param seq
     */
    quicksort : function(seq) {
        if (seq.length > 1) {
            var k = seq[0];
            var x = [];
            var y = [];
            for ( var i = 1, len = seq.length; i < len; i++) {
                if (seq[i].total <= k.total) {
                    x.push(seq[i]);
                } else {
                    y.push(seq[i]);
                }
            }
            x = this.quicksort(x);
            y = this.quicksort(y);
            return x.concat(k, y);
        } else {
            return seq;
        }
    },
    closeWin : function(id) {
        var obj = document.getElementById(id);
        obj.parentNode.removeChild(obj);
    },
    getCurTime : function(startTime, endTime) {
        var dt3;
        if (endTime == null) {
            dt3 = new Date() - startTime;
        } else {
            dt3 = endTime - startTime;
        }

        var h = Math.floor(dt3 / 3600000);
        var m = Math.floor((dt3 - h * 3600000) / 60000);
        var s = Math.floor((dt3 - h * 3600000 - m * 60000) / 1000);

        return h + "\u65f6" + m + "\u5206" + s + "\u79d2";
    },
    sort : function(hash){
        var item = [];
        var count = 0;
        for(var p in hash){
            item[count] = hash[p];
            count++;
        }
        item = common.quicksort(item);
        return item;
    },
    checklink : function(link, value) {
        if (link.indexOf(value) >= 0) {
            return true;
        } else {
            return false;
        }
    },
    getFatherDir : function(url) {
        console.log(url);
        var num = url.lastIndexOf("/");
        if (num == -1) {
            return "";
        }
        if (num > 1 && (url.charAt(num - 2) == ":")) {
            return url;
        } else {
            return url.substring(0, num);
        }// already the top dir
    },
    restHTML: function(str){
        if (!common.__utilDiv) {
            common.__utilDiv = document.createElement("div");

        }
        var t = common.__utilDiv;
        t.innerHTML = (str + "");
        if (typeof(t.innerText) != 'undefined') {
            return t.innerText;
        } else if (typeof(t.textContent) != 'undefined') {
            return t.textContent;
        } else if (typeof(t.text) != 'undefined') {
            return t.text;
        } else {
            return '';
        }
    },
    extend : function(first, second){
        for (var prop in second){
            first[prop] = second[prop];
        }
    },
    trim : function(str){
        return str.replace(/^\s+|\s+$/g, '');
    }
};
function scan(o){
    this.sessions= 0;
    this.requestQue= [];
    this.queue404= [];
    this.urllist = new hash(); // 已经检测的链接hash
    this.host='';

    this._options={
        maxrequest:6,
        siglepage:true,
        ridestr : /javascript:|mailto:|https:\/\//ig, // 不检测正则表达式模式
        url:'http://tw.taobao.com',
    }
    common.extend(this._options,o);
    var uparse = urlparse(this._options.url);
    this.host = uparse.host;
    this.hostname = uparse.hostname;
    this.port = uparse.port;

    if (this._options.siglepage) {
        this.searchhtml=this.singlesearch;
    }else{
        this.searchhtml=this.deepsearch;
    }
}

scan.prototype={
    searchhtml:function(){

    },
    singlesearch: function(url,fatherurl){
        if (fatherurl!=this._options.url) {
            return;
        };
        this._getAllLinkFromHtml(url,fatherurl);
    },
    deepsearch: function(){
        this._getAllLinkFromHtml(url,fatherurl);
    },
    linkcheck : function(url,title,fatherurl){
        if (!url||url.match(this._options.ridestr)){
            return;
        }

        url = common.trim(url);
        if (url.length>2&&url[0]=='/'&&url[1]=='/') {
            url='http:'+url;
        };
        var pobj= urlparse(url);
        
        //跨域的,临时过滤掉
        if (pobj.host!=this.host) {
            return;
        };

        var fullurl = null;
        if (pobj.host==null||(pobj.host == this.host&&pobj.port==this.port)) {//同域名相对路径
            fullurl = 'http://'+this.hostname+pobj.path;

        }else{//cross domain
            fullurl = pobj.protocol+'//'+pobj.hostname+pobj.path;
        }
        if (fullurl) {
            if (!this.urllist.isKeyExists(fullurl)) {
                this.urllist.add(fullurl,fatherurl);
                var opt = {
                    host:this.host,
                    port:this.port,
                    path:this.path,
                    title:title,
                    fullurl:fullurl
                };
                if (this.sessions<this._options.maxrequest) {
                    this.sendRequest(opt);
                }else{
                    this.requestQue.push(opt);
                }
            }
        };
    },
    checkQueue: function(){
        if (this.requestQue.length > 0) {
            var opt = this.requestQue.shift();
            this.sendRequest(opt);
        }
        if (this.requestQue.length==0&&this.sessions==0) {
            console.log('scan finished',this.urllist.getCount());
        };
    },
    //get all href from html
    _getAllLinkFromHtml : function(str, fatherurl) {
        var a = str.match(/<a .*?href\s*=.*?<\/a>/igm);
        if (a != null) {
            var re=/<a.*href\s*=[\s\"\']?([^"]*)['"].*?[\s\"\']?[^>]*>(.*?)<\/a>/i;       
            log('total link:%d',a.length);     
            for ( var i = 0; i < a.length; i++) {
                var tmp = re.exec(a[i]);
                if (tmp.length>2) {
                    this.linkcheck(tmp[1],tmp[2],fatherurl);
                }else{
                    continue;
                }
            }
        }
    },
    sendRequest : function(opt){
        this.sessions++;
        if (opt.host==this.host) {
            this.samedomaincheck(opt);
        }else{
            this.crossdomain404Check(opt);
        }
    },
    samedomaincheck: function(opt){
        var self = this;
        var req = http.request(opt,function(res) {
            if (res.statusCode==200) {
                var body = '';
                res.on('data',function(d){
                    body += d;
                }).on('end', function(){
                    self.searchhtml(body,opt.fullurl);
                });            
            }else {
                if(res.statusCode==404){
                    self.queue404.push({url:opt.fullurl,title:opt.title});
                }
            }
            self.sessions--;
            self.checkQueue(); //执行完成后检查队列
        }).on('error', function(e) {
            self.sessions--;
            self.checkQueue(); //执行完成后检查队列
        });
        req.end();
    },
    crossdomain404Check:function(opt){
        var self = this;
        var req = http.request(opt,function(res) {
            if (res.statusCode=200) {        
            }else{
                if(res.statusCode==404){
                    self.queue404.push({url:opt.fullurl,title:opt.title});
                }
            };
            self.sessions--;
            self.checkQueue(); //执行完成后检查队列
        }).on('error', function(e) {
            self.sessions--;
            self.checkQueue(); //执行完成后检查队列
        });
        req.end();
    },
    run: function(){
        this.sendRequest({
            host:this.host,
            port:this.port,
            path:this.path,
            fullurl:this._options.url
        })
    }
};

module.exports=scan;


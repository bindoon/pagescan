
// ajax并发连接
function Ajax(max_session) {
    this.max_session = max_session; // 最大并发数
    this.sessions = 0;          //当前运行ajax线程数
    this.requestQue = new Array(); // 请求数组
    this.hashchecked = new Hash(); // 已经检测的链接hash
    this.queue404 = new Array(); // 404链接数据存放数组
    this.index404   = new Hash();   //404父链接索引用于打印报告排序排序
    
    this.checkednum = 0;
    this.normalnum = 0;
    this.crossnum = 0;
    this.host = "http://" + location.host;
}
Ajax.prototype.createRequest = function(method, url, linkObj) {
    var request = new Object();
    request.ajax = false;
    try {
        request.ajax = new XMLHttpRequest();
    } catch (trymicrosoft) {
        try {
            request.ajax = new ActiveXObject("Msxml2.XMLHTTP");
        } catch (othermicrosoft) {
            try {
                request.ajax = new ActiveXObject("Microsoft.XMLHTTP");
            } catch (failed) {
                request.ajax = false;
            }
        }
    }
    if (!request.ajax) {
        return;
    }
    if (request.ajax) {
        request.url = url;
        request.method = method;
        request.linkObj = linkObj;
        if (this.sessions < this.max_session) {
            this.sessions += 1;
            this.sendRequest(request);
            return;
        } else {
            this.requestQue.push(request);
        }
    }
};
Ajax.prototype.sendRequest = function(request) {
    request.ajax.open(request.method, request.url, true);   //randNum防止缓存页面
    request.ajax.onreadystatechange = this.processRequest(request);
    request.ajax.setRequestHeader("If-Modified-Since","0");//防止页面缓存
    request.ajax.send(null);
};
Ajax.prototype.preworkBeforeRequest = function() {
    // Do something before sending request about object
};
Ajax.prototype.checkQue = function() {
    if (this.requestQue.length > 0) {
        var request = this.requestQue.shift();
        if (request) {
            // Do something before sending request about object
            // preworkBeforeRequest();alert(requestQue.length);
            this.sendRequest(request);
        } else if (this.sessions > 0) {
            this.sessions--;
        }
    } else if (this.sessions > 0) {
        this.sessions--;
    }
};
Ajax.prototype.processRequest = function(request) {
    var url = request.url;
    var linkObj = request.linkObj;
    return function() {
        if (this.readyState != 4) {
            return;
        }
        common.ajax.checkednum++;
        /**
         * 这里如果服务器发现缓存页面没有过期返回304 Not Modified，chrome读取本地数据并返回200
         */
        if (this.status == 200) {
            // Handle the response text or XML
            
            common.ajax.normalnum++;
            if (common.ajax.exCheck.check404(this.responseText)){
                common.ajax.index404.addMap(linkObj.father,common.ajax.queue404.length);
                var obj404 = new Link404(url,linkObj.title);
                common.ajax.queue404.push(obj404);
            }
            else{
                common.ajax.processEcho(this.responseText, url);
            }
            
        } else {
            if (this.status == 0) {
                common.ajax.crossnum++;
            } else if (this.status == 404 ) { //302错误跳转
                common.ajax.index404.addMap(linkObj.father,common.ajax.queue404.length);
                var obj404 = new Link404(url,linkObj.title);
                common.ajax.queue404.push(obj404);
            }
        }

        common.ajax.checkQue(); //执行完成后检查队列

        request.ajax.onreadystatechange = null;
        delete request.linkObj;
        delete request.ajax;
        request.ajax = null;
        delete request;
        request = null;
    };
};


// suburl: path:
// return: http://ip/sub.html


/**
 * 路径构造
 * @param suburl:"./sub.html"
 * @param path: http://ip (from http://ip/index.html)
 */
Ajax.prototype.getFullPath = function(suburl, path) {
    var ftchar = suburl.charAt(0);
    if (ftchar == "/") {
        return this.host + suburl;
    } else if (ftchar != ".") {
        return path + "/" + suburl;
    } else if (suburl.substring(0, 2) == "./") {
        return path + suburl.substring(1, suburl.length);
    } else if (suburl.substring(0, 3) == "../") {
        return common.getFatherDir(path) + suburl.substring(2, suburl.length);
    }
    return path + "/" + suburl;
};

/**
 * 去除?后面数据
 * @param url 页面地址
 * @returns
 */
Ajax.prototype.getRealURL = function(url){
    if (!url){
        return "";
    }
    var len = url.indexOf("?");
    if(len >= 0) {
        url = url.substring(0,len);
    }
    else if((len=url.indexOf("#")) >= 0){
        url = url.substring(0,len);
    }
    return url;
};

/**
 * 从网页源码中提取链接
 * @param str 源码
 * @param url 源码网页URL
 */
Ajax.prototype.checkLinkFromPage = function(str, url) {
    
    var a = str.match(/<a .*?href\s*=.*?<\/a>/igm);
    if (a != null) {
        var path = common.getFatherDir(url);// 到父目录
        /*
         * //记录该URL包含的链接数 if (this.hashchecked.isKeyExists(url)) {
         * this.hashchecked.alter(url, a.length); }
         */
        for ( var i = 0; i < a.length; i++) {
            var tmp = a[i].replace(/<a .*href\s*=[\s\"\']?/ig, "");
            var childurl = tmp.replace(/[\s>\"\']+.*/ig,"");
            if(!childurl){
                continue;
            }
            var inhtml = tmp.match(/>.*</g)[0].replace(/^>|<$/g,"");
            var linkObj = new LinkInfo(url,inhtml);
            this.filterLink(childurl, path, linkObj);
        }
    }
};

Ajax.prototype.processEcho = function(strHtml, url) {
//  echoXML = ajax.responseXml;

    this.checkLinkFromPage(strHtml, url);
    // Do something related with echo Text
    // Do something related with echo XML
};

/**
 * 条件去除需要过滤的链接
 * @param strLink
 * @param path 父目录
 * @param father 当前URL(相对扫出来的链接，自己是父链接)
 */
Ajax.prototype.filterLink = function(strLink, path, linkObj){
    if (!strLink ){
        return;
    }
    else {
        if(this.exCheck.checkDecode(strLink)){//需要对链接解码
            strLink = common.restHTML(strLink);
        }
        strLink = strLink.replace(/^\s+|\s+$/g, "");
        strLink = this.getRealURL(strLink);//只取网页地址，去掉后面的参数
        if (!strLink || this.exCheck.checkUrl(strLink)){
            delete linkObj;
            return;
        }
    }
    //过滤特殊链接
    if (strLink.match(common.ridestr)) {
        delete linkObj;
        return;
    } else {
        if (strLink.charAt(4) != ":"){  //判断http: 第4位是“：”
            strLink = this.getFullPath(strLink, path);
        }
        if (!this.hashchecked.isKeyExists(strLink)) {
            this.createRequest("GET", strLink, linkObj);
            this.hashchecked.add(strLink, linkObj.father);
        }
    }
};

/***
 * 从当前页面取得链接分析
 * @param a 
 */
Ajax.prototype.setlink = function(a) {
    this.hashchecked.add(location.href, null);

    var path = common.getFatherDir(location.href);
    for (i = 0; i < a.length; i++) {
        var attrihref = a[i].getAttribute("href");
        if (attrihref == null || attrihref == "" || common.checklink(attrihref, "#")) {
            continue;
        }
        var tmp = a.item(i).href;
        if(!tmp){
            continue;
        }
        var linkObj = new LinkInfo(location.href,a[i].innerHTML);
        this.filterLink(tmp, path, linkObj);
    }
};

/**
 * 页面检测标准
 */
Ajax.prototype.exCheck = {
    /**
     * 404链接检测标准
     * @param strHtml 网页内容
     * @returns {Boolean} false-检测失败 true-检测成功
     */
    check404 :  function(strHtml){
        return false;
    },
    /**
     * //默认需要对链接解码 很多网页对链接escHTML
     * @param url
     * @returns {Boolean}
     */
    checkDecode : function(url){
        if(url.match(/&#[0-9]{2,3};/)){
            return true;
        }
        return false;
    },
    /**
     * 特殊字符过滤标准
     * @param url 链接地址
     * @returns {Boolean}
     */
    checkUrl : function(url){
        return false;
    }
};
common.exCheckArray = [
    {
        host : "v.qq.com",
        check404 : function(strHtml){
            if(common.checklink(strHtml,"http://imgcache.qq.com/mediastyle/tenvideo/css/404.css")){
                return true;
            }
            return false;
        },
        checkDecode : function(url){//腾讯视频不需解码，没有这种链接
            return false;
        },
        checkUrl : function(url){
            if(url.match(/\$|{|http:\/\/v.qq.com\/boke\/play\//)){//过滤模版内容
                return true;
            }
            return false;
        }
    },
    {
        host : "film.qq.com",
        check404 : function(strHtml){//404页面特征
            if(common.checklink(strHtml,"<meta http-equiv=\"refresh\" content=\"0;url=http://v.qq.com\">")){
                return true;
            }
            return false;
        },
        checkDecode : function(url){//腾讯视频不需解码，没有这种链接
            return false;
        },
        checkUrl : function(url){
            if(url.match(/\$|{|http:\/\/v.qq.com\/boke\/play\//)){//过滤模版内容
                return true;
            }
            return false;
        }
    },
    {
        host : "live.qq.com",
        checkUrl : function(url){
            if(url.match(/\$|{/)){//过滤模版内容
                return true;
            }
            return false;
        }
    },
    {
        host : "music.qq.com",
        checkUrl : function(url){
            if(url.match(/%sortUrl%$|%\(|\<%=/)){//过滤模版内容
                return true;
            }
            return false;
        }
    }
];


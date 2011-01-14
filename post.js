var http = require('http');
var oauth = require('oauth');
var urlModule = require('url');
var fs = require('fs');
var util = require('util');
var config = require('./config');

if(process.argv.length != 3) {
	console.log("Usage node post.js <activity_file>");
	process.exit(1);
}

var activityFile = process.argv[2];
var postUrl = config.jiveUri + config.streamPath + config.jiveId + '/' + config.appId + '/' + config.userId;

doPost();

function signHMAC()
{
	var oauthobj = new oauth.OAuth(undefined, undefined, config.key, config.secret, "1.0", undefined, 'HMAC-SHA1', undefined);
	return oauthobj.signUrl(postUrl, undefined, undefined, 'POST');
}

function doPost()
{
	var postData = fs.readFileSync(activityFile);
	var signedUrl = signHMAC();
	console.log("Signed URL: ", signedUrl);
	new RemoteFetcher("POST", signedUrl, { "Content-Type": "application/json", "X-Jive-App-Id": config.appId }, postData);
}

function RemoteFetcher(method, url, headers, postData)
{
    var out = urlModule.parse(url);
	console.log(util.inspect(out));
	var host = out.hostname;
	var port = out.port || 80;
    var client = http.createClient(port, host);

	console.log("sending request to : %s", url);
    var dest_req = client.request(method, url, headers);

    dest_req.on('response', proxy(responseHandler, this));
    dest_req.on('error', proxy(onRequestError, this));

	if(postData) dest_req.write(postData);
	dest_req.end();

    function responseHandler(remote_response)
    {
		console.log(remote_response.statusCode, remote_response.headers);

        remote_response.on('data', proxy(moreResponseData, this));
		remote_response.on('end', proxy(moreResponseData, this));
    }

    function moreResponseData(chunk)
    {
        if(chunk) console.log(chunk);
        else delete this;
    }

    function onRequestError(error)
    {
        console.log(error);
        delete this;
    }
}

function proxy(fn, thisObject)
{
	var proxy = function() { return fn.apply(thisObject, arguments); }
	return proxy;
}

process.on('uncaughtException', function (err) {
  console.log('Caught exception: ' + err);
});


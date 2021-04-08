var AWS = require('aws-sdk');
AWS.config.update({region: 'us-east-1'});
var lexRuntime = new AWS.LexRuntime();
const https = require('https')

var host = 'search-photos1-qt6drdhhpna5jdwct6mp5u6jfu.us-east-1.es.amazonaws.com'
var path = '/photos1/_search'

console.log("test");
exports.handler = (event, context, callback) => {
    console.log("EVENT", event);
    const q = event.queryStringParameters.q
    var params = {
      botAlias: '$LATEST',
      botName: 'PhotoBot',
      inputText: q,
      userId: 'USER',
    };

    lexRuntime.postText(params, function(err, data) {
        if (err) {
            console.log("HERRE");
            console.log(err, err.stack);
            callback(err, null);
        } else {
            var first = data.slots.FirstQuery
            var second = data.slots.SecondQuery
            var queries = []
            if (first) {
                queries.push({ "match": { "labels": first } })
            }
            if (second) {
                queries.push({ "match": { "labels": second } })
            }

            console.log(first, second);
            var query = {
              "query": {
                "bool": {
                  "should": queries
                }
              }
            }
            var json = JSON.stringify(query);

            var options = {
              host: host,
              path: path,
              port: '443',
              method: 'GET',
              headers: {
                'content-length': Buffer.byteLength(json),
                'Content-Type': 'application/json',
                'Authorization': 'Basic ' + new Buffer('user' + ':' + 'Password123.').toString('base64'),
              }
            };

            var req = https.request(options, (response) => {
                var str = '';
                response.on('data', function (chunk) {
                    str += chunk;
                });
                response.on('end', function () {
                    let hits = JSON.parse(str);
                    console.log(hits.hits.hits);
                    let results = []
                    for (const hit of hits.hits.hits) {
                        results.push({
                            url: encodeURI('https://' + hit._source.bucket + '.s3.amazonaws.com/' + hit._source.objectKey),
                            labels: hit._source.labels
                        })
                    }
                    const callbackResponse = {
                        "isBase64Encoded": false,
                        "statusCode": 200,
                        'headers': {
                            "Access-Control-Allow-Headers" : "Content-Type",
                            "Access-Control-Allow-Origin": "*",
                            "Access-Control-Allow-Methods": "OPTIONS,POST,GET"
                        },
                        "body": JSON.stringify({results: results})
                    };
                    console.log("RESPONSE ", callbackResponse);
                    callback(null, callbackResponse);
                });
            });
            req.write(json);
            req.end();
        }
    });
};

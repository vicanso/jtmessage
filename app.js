var cluster = require('cluster');
var jtMessage = require('./index');
var clusterHandler = function(workerTotal){
  for (var i = 0; i < workerTotal; i++) {
    cluster.fork();
  }
};


var workerHandler = function(){
  jtMessage.on('msg', function(data){
    console.dir(process.pid + ' get message:' + JSON.stringify(data));
  });
  var http = require('http');
  http.createServer(function(req, res) {
    if(req.url === '/'){
      var data = {
        msg : 'message',
        pid : process.pid
      };
      console.dir(process.pid + ' send message:' + JSON.stringify(data));
      jtMessage.send('msg', data);
    }
    res.end('abc');
  }).listen(8000);
};


if (cluster.isMaster) {
  clusterHandler(4);
} else {
  workerHandler();
}
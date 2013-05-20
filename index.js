(function() {
  var JTMessage, cluster, isFunction;

  cluster = require('cluster');

  isFunction = function(obj) {
    return Object.prototype.toString.call(obj) === '[object Function]';
  };

  /**
   *@description JTMessage实现了node的进程间的通信，它是基本process.send实现的，
   * 因此如果使用了JTMessage，请不要再使用process.send
  */


  JTMessage = (function() {
    /**
     * constructor 构造函数
     * @return {[type]} [description]
    */

    function JTMessage() {
      this.handlers = {};
      if (cluster.isMaster) {
        this._masterHandle();
      } else {
        this._workerHandle();
      }
    }

    /**
     * send 发送消息
     * @param  {String} type 消息类型
     * @param  {String, Object} msg 发送的消息
     * @param  {String} to 发送的对象，默认为'all'（未添加其它的发送方式）
     * @return {[type]}      [description]
    */


    JTMessage.prototype.send = function(type, msg, to) {
      if (to == null) {
        to = 'all';
      }
      to = to.toLowerCase();
      process.send({
        type: type,
        msg: msg,
        to: to,
        from: process.pid
      });
      return this;
    };

    /**
     * on 消息绑定
     * @param  {String} type 需要捕捉的消息类型
     * @param  {Function} cbf 消息到来时的回调函数
     * @return {[type]}      [description]
    */


    JTMessage.prototype.on = function(type, cbf) {
      var handlers, _ref;
      handlers = this.handlers;
      if (type && isFunction(cbf)) {
        if ((_ref = handlers[type]) == null) {
          handlers[type] = [];
        }
        handlers[type].push(cbf);
      }
      return this;
    };

    /**
     * off 取消绑定
     * @param  {String} type 绑定类型
     * @param  {Function} {optional} cbf 取消的绑定函数，该参数可选，若为空则取消该类型的所有绑定函数
     * @return {[type]}      [description]
    */


    JTMessage.prototype.off = function(type, cbf) {
      var cbfs, handlers, index;
      handlers = this.handlers;
      if (type) {
        cbfs = handlers[type];
        if (cbfs) {
          if (cbf) {
            index = cbfs.indexOf(cbf);
            if (~index) {
              cbfs.splice(index, 1);
            }
          } else {
            handlers[type] = [];
          }
        }
      }
      return this;
    };

    /**
     * _masterHandle master的处理
     * @return {[type]} [description]
    */


    JTMessage.prototype._masterHandle = function() {
      var self;
      self = this;
      cluster.on('online', function(worker) {
        return worker.on('message', function(msgObj) {
          if (msgObj.to === 'all' && msgObj.from === worker.process.pid) {
            return self._sendToWorkers(msgObj, worker.process.pid);
          }
        });
      });
      return this;
    };

    /**
     * _workerHandle worker的处理
     * @return {[type]} [description]
    */


    JTMessage.prototype._workerHandle = function() {
      var handlers;
      handlers = this.handlers;
      process.on('message', function(msgObj) {
        var cbfs, msg, type;
        type = msgObj.type;
        msg = msgObj.msg;
        cbfs = handlers[type];
        if (cbfs) {
          return cbfs.forEach(function(cbf) {
            return cbf(msg);
          });
        }
      });
      return this;
    };

    /**
     * _sendToWorkers 消息发送给其它的worker（master的处理）
     * @param  {Object} msgObj 消息对象
     * @param  {Number} srcWorkerId 消息来源id
     * @return {[type]}             [description]
    */


    JTMessage.prototype._sendToWorkers = function(msgObj, srcWorkerId) {
      Object.keys(cluster.workers).forEach(function(id) {
        var worker;
        worker = cluster.workers[id];
        if (worker.process.pid !== srcWorkerId) {
          return cluster.workers[id].send(msgObj);
        }
      });
      return this;
    };

    return JTMessage;

  })();

  module.exports = new JTMessage;

}).call(this);

cluster = require 'cluster'

isFunction = (obj) ->
  Object.prototype.toString.call(obj) == '[object Function]'
###*
 *@description JTMessage实现了node的进程间的通信，它是基本process.send实现的，
 * 因此如果使用了JTMessage，请不要再使用process.send
###
class JTMessage
  ###*
   * constructor 构造函数
   * @return {[type]} [description]
  ###
  constructor : () ->
    @handlers = {} 
    if cluster.isMaster
      @_masterHandle()
    else
      @_workerHandle()
  ###*
   * send 发送消息
   * @param  {String} type 消息类型
   * @param  {String, Object} msg 发送的消息
   * @param  {String} to 发送的对象，默认为'all'（未添加其它的发送方式）
   * @return {[type]}      [description]
  ###
  send : (type, msg, to = 'all') ->
    to = to.toLowerCase()
    process.send {
      type : type
      msg : msg
      to : to
      from : process.pid
    }
    @
  ###*
   * on 消息绑定
   * @param  {String} type 需要捕捉的消息类型
   * @param  {Function} cbf 消息到来时的回调函数
   * @return {[type]}      [description]
  ###
  on : (type, cbf) ->
    handlers = @handlers
    if type && isFunction cbf
      handlers[type] ?= []
      handlers[type].push cbf
    @
  ###*
   * off 取消绑定
   * @param  {String} type 绑定类型
   * @param  {Function} {optional} cbf 取消的绑定函数，该参数可选，若为空则取消该类型的所有绑定函数
   * @return {[type]}      [description]
  ###
  off : (type, cbf) ->
    handlers = @handlers
    if type
      cbfs = handlers[type]
      if cbfs
        if cbf
          index = cbfs.indexOf cbf
          if ~index
            cbfs.splice index, 1
        else
          handlers[type] = []
    @
  ###*
   * _masterHandle master的处理
   * @return {[type]} [description]
  ###
  _masterHandle : () ->
    self = @
    cluster.on 'online', (worker) ->
      worker.on 'message', (msgObj) ->
        if msgObj.to == 'all' && msgObj.from == worker.process.pid
          self._sendToWorkers msgObj, worker.process.pid
    @
  ###*
   * _workerHandle worker的处理
   * @return {[type]} [description]
  ###
  _workerHandle : () ->
    handlers = @handlers
    process.on 'message', (msgObj) ->
      type = msgObj.type
      msg = msgObj.msg
      cbfs = handlers[type]
      if cbfs
        cbfs.forEach (cbf) ->
          cbf msg
    @
  ###*
   * _sendToWorkers 消息发送给其它的worker（master的处理）
   * @param  {Object} msgObj 消息对象
   * @param  {Number} srcWorkerId 消息来源id
   * @return {[type]}             [description]
  ###
  _sendToWorkers : (msgObj, srcWorkerId) ->
    Object.keys(cluster.workers).forEach (id) ->
      worker = cluster.workers[id]
      if worker.process.pid != srcWorkerId
        cluster.workers[id].send msgObj
    @


module.exports = new JTMessage

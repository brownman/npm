
module.exports = get

var GET = require("./request").GET
  , fs = require("../graceful-fs")
  , npm = require("../../../npm")
  , path = require("path")
  , log = require("../log")

// timeout = number of seconds that cached file can be stale
// before a re-check is required.
function get (project, version, timeout, cb) {
  if (!cb) cb = timeout, timeout = -1
  if (!cb) cb = version, version = null
  if (!cb) cb = project, project = null
  if (!cb) throw new Error("No callback provided to registry.get")
  var uri = []
  uri.push(project || "")
  if (version) uri.push(version)
  uri = uri.join("/")
  var cache = path.join(npm.cache, uri, ".cache.json")
  fs.stat(cache, function (er, stat) {
    if (!er) fs.readFile(cache, function (er, data) {
      try { data = JSON.parse(data) }
      catch (ex) { data = null }
      get_(uri, timeout, cache, stat, data, cb)
    })
    else get_(uri, timeout, cache, null, null, cb)
  })
}
function get_ (uri, timeout, cache, stat, data, cb) {
  var etag
  if (data && data._etag) etag = data._etag
  if (timeout && timeout > 0 && stat && data) {
    if ((Date.now() - stat.mtime.getTime())/1000 < timeout) {
      log.verbose("not expired, no request", "registry.get " +uri)
      return cb(null, data, JSON.stringify(data), {statusCode:304})
    }
  }
  GET(uri, etag, function (er, remoteData, raw, response) {
    if (response) {
      log.verbose([response.statusCode, response.headers], "get cb")
      if (response.statusCode === 304 && etag) {
        remoteData = data
        log.verbose("from cache", "etag")
      }
    }
    data = remoteData
    if (er) return cb(er, data)
    // just give the write the old college try.  if it fails, whatever.
    fs.writeFile(cache, JSON.stringify(data), function () {})
    delete data._etag
    cb(er, data, raw, response)
  })
}

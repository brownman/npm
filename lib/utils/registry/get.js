
module.exports = get

var GET = require("./request").GET
  , fs = require("../graceful-fs")
  , npm = require("../../../npm")
  , path = require("path")
  , log = require("../log")

function get (project, version, nofollow, cb) {
  if (typeof cb !== "function") cb = nofollow, nofollow = false
  if (typeof cb !== "function") cb = version, version = null
  if (typeof cb !== "function") cb = project, project = null
  if (typeof cb !== "function") {
    throw new Error("No callback provided to registry.get")
  }
  var uri = []
  uri.push(project || "")
  if (version) uri.push(version)
  uri = uri.join("/")
  var cache = path.join(npm.cache, uri, ".cache.json")
    , etag = null
  fs.readFile(cache, function (er, data) {
    try { data = JSON.parse(data) }
    catch (ex) {}
    if (data && data._etag) {
      etag = data._etag
    }
    GET(uri, etag, nofollow, function (er, remoteData, raw, response) {
      if (response) {
        log.verbose([response.statusCode, response.headers], "get cb")
        if (response.statusCode === 304 && etag) {
          remoteData = data
          log.verbose("from cache", "etag")
        }
      }
      data = remoteData
      if (er) return cb(er, data)
      fs.writeFile(cache, JSON.stringify(data), function (_) {
        delete data._etag
        cb(er, data, raw, response)
      })
    })
  })
}

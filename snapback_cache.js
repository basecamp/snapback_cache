// Example Usage:
//   var pageCache = SnapbackCache({
//     bodySelector: "#recordings",
//   })
//  
//   pageCache.markDirty("comment/1")
//
// Required options:
//   * bodySelector: Element to be cached and position saved
// Optional options:
//   * finish            Pass function to get things on your page to "finish" that you don't want to cache in an inbetween state. 
//                       By default we finish jQuery Animations.
//   * refreshItems      You may mark items dirty in your DOM as things are edited but might still be in the
//                       page cache, this is a callback for refreshing those dirty items. Using above example
//                       refreshItems function would be passed arguement ["comment/1"]
//   * removeAutofocus   Pass function to remove items that cause your page to autofocusing. Autofocus behavior can screw with 
//                       setting your scroll position. 
//
// Events:
//   * snapback-cache:cached  Triggered when a cache has been set. The cachedPage object is returned with
//                        the event (triggered on bodySelector)
//   * snapback-cache:loaded  Triggered when a cache has been loaded. The cachedPage object is returned with
//                        the event (triggered on bodySelector)
var SnapbackCache = (function(options) {
  var options = options || {}

  var SessionStorageHash = (function() {
    var set = function(namespace, key, item){
      var storageHash = sessionStorage.getItem(namespace);
      if (!storageHash) {
        storageHash = {}
      } else {
        storageHash = JSON.parse(storageHash)
      }

      if (item) {
        storageHash[key] = JSON.stringify(item)
      } else {
        delete storageHash[key]
      }

      sessionStorage.setItem(namespace, JSON.stringify(storageHash))
    }

    var get = function(namespace, key, item){
      var storageHash = sessionStorage.getItem(namespace)

      if(storageHash){
        storageHash = JSON.parse(storageHash)
        if(storageHash[key]){
          return JSON.parse(storageHash[key])
        }
      }

      return null
    }

    return {
      set: set,
      get: get
    }
  })()

  var enabled = true

  var disable = function() {
    enabled = false
  }

  var enable = function () {
    enabled = true
  }

  var supported = function(){
    return !!(sessionStorage && history && enabled)
  }

  var setItem = function(url, value){
    if(value){
      // only keep 10 things cached
      trimStorage()
    }
    SessionStorageHash.set("pageCache", url, value)
  }

  var getItem = function(url){
    return SessionStorageHash.get("pageCache", url)
  }

  var removeItem = function(url){
    setItem(url, null)
  }

  var disableAutofocusIfReplacingCachedPage = function(){
    if(typeof options.removeAutofocus === "function"){
      if(willUseCacheOnThisPage()){
        options.removeAutofocus()
      }
    }
  }

  var cachePage = function(filterOut, callbackFunction){
    if (typeof filterOut === 'function') {
      callbackFunction = filterOut
      filterOut = null
    }

    if (!supported()){
      if(callbackFunction){
        callbackFunction()
      }
      return;
    }

    // get jQuery animations to finish
    jQuery(document).finish()
    if (typeof options.wait === "function")
      options.finish()

    // Give transitions/animations a chance to finish
    setTimeout(function(){
      if (typeof options.removeAutofocus === "function")
        options.removeAutofocus()

      var $cachedBody = jQuery(options.bodySelector)
      if (filterOut) {
        $cachedBody = $cachedBody.clone().find(filterOut).replaceWith("").end()
      }

      var cachedPage = {
        body: $cachedBody.html(),
        title: document.title,
        positionY: window.pageYOffset,
        positionX: window.pageXOffset,
        cachedAt: new Date().getTime()
      }

      // help to setup the next page of infinite scrolling
      if (typeof options.nextPageOffset === "function")
        console.log("storing offset"); 
        cachedPage.nextPageOffset = options.nextPageOffset()

      setItem(document.location.href, cachedPage)

      jQuery(options.bodySelector).trigger("snapback-cache:cached", cachedPage)

      if(callbackFunction){
        callbackFunction()
      }
    }, 500)
  }

  var loadFromCache = function(noCacheCallback){
    // Check if there is a cache and if its less than 15 minutes old
    if(willUseCacheOnThisPage()){
      var cachedPage = getItem(document.location.href)

      // replace the content and scroll
      jQuery(options.bodySelector).html(cachedPage.body)

      // try to make sure autofocus events don't run. 
      if (typeof options.removeAutofocus === "function")
        options.removeAutofocus()

      // IE 10+ needs a delay to stop the autofocus during dom load
      setTimeout(function(){
        window.scrollTo(cachedPage.positionX, cachedPage.positionY)
      }, 1);

      // pop the cache
      removeItem(document.location.href)

      jQuery(options.bodySelector).trigger("snapback-cache:loaded", cachedPage)

      // refresh any obsolete recordings in the activity feed
      var dirties = getDirties()
      if(dirties){
        if (typeof options.refreshItems === "function")
          options.refreshItems(dirties)

        clearDirty()
      }

      return false;
    }
    else{
      if(noCacheCallback){
        noCacheCallback()
      }
      else{
        return
      }
    }
  }

  var clearDirty = function() {
    sessionStorage.removeItem("pageCache-dirty")
  }

  var getDirties = function() {
    var raw = sessionStorage.getItem("pageCache-dirty")
    if (raw) {
      var json = JSON.parse(raw)
      return jQuery.map(json, function(value, key){
        return key
      })
    } else {
      return null
    }
  }

  var markDirty = function(item) {
    SessionStorageHash.set("pageCache-dirty", item, true)
  }

  var trimStorage = function(){
    var storageHash = sessionStorage.getItem("pageCache");
    if(storageHash){
      storageHash = JSON.parse(storageHash);

      var tuples = [];

      for (var key in storageHash) {
        tuples.push([key, storageHash[key]])
      }
      // if storage is bigger than size, sort them, and remove oldest
      if(tuples.length >= 10){
        tuples.sort(function(a, b) {
            a = a[1].cachedAt;
            b = b[1].cachedAt;
            return b < a ? -1 : (b > a ? 1 : 0);
        });

        for (var i = 0; i < (tuples.length + 1 - 10); i++) {
          var key = tuples[i][0];
          delete storageHash[key];
        }

        sessionStorage.setItem(namespace, JSON.stringify(storageHash));
      }
    }
  }

  var willUseCacheOnThisPage = function(){
    if (!supported()){
      return false;
    }

    var cachedPage = getItem(document.location.href)

    // Check if there is a cache and if its less than 15 minutes old
    if(cachedPage && cachedPage.cachedAt > (new Date().getTime()-900000)){
      return true; 
    }
    else{
      return false;
    }
  }

  jQuery(document).ready(function(){
    disableAutofocusIfReplacingCachedPage()
  });

  jQuery(window).load(function(){
    loadFromCache()
  });

  return {
    enable: enable,
    disable: disable,
    remove: removeItem,
    loadFromCache: loadFromCache,
    cachePage: cachePage,
    markDirty: markDirty, 
    willUseCacheOnThisPage: willUseCacheOnThisPage
  }
});
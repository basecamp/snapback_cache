Snapback Cache
===========

<blockquote class="twitter-tweet" data-lang="en"><p lang="en" dir="ltr"><a href="https://twitter.com/highrise">**@highrise**</a> Nice new feature with snapback. I&#39;m becoming a big fan of Highrise.</p>&mdash; Echo Design Group (@EchoDesignGrp) <a href="https://twitter.com/EchoDesignGrp/status/580408329530376192">March 24, 2015</a></blockquote>


Many apps today have some concept of an infinite scrolling feed: Facebook, Twitter, LinkedIn and many more. Almost all of them suffer from the same problem. If you click on something in the feed that brings you to a new page, when you hit the back button or try to return to that original feed, your place is lost. All the scrolling is gone. 

At [**Highrise**](http://highrisehq.com) we had that same problem. So this is the library we use to fix that. We call it our Snapback Cache, and it's made a big improvement to how people can use infinite scroll in our app and still get a lot of work done without losing their place. 

Another great thing about this is it operates on the URL, so you can have multiple infinite scrolling feeds to cache. At Highrise we have a "main activity" and then activities for a Contact, etc. They each get their separate cache. To keep a manageable memory footprint for your browser, we keep 10 caches as a maximum. 

<hr/>

## The basics of how it works

Using this small javascript library, you hook it up to the click events on things in your infinite scrolling feed. For example: 

```
var snapbackCache = SnapbackCache({
     bodySelector: "#recordings"
 })

jQuery(document).on("click", "body.recordings a",                     
    function(event){
      snapbackCache.cachePage();
    })
```

Now when people click the links inside our "recordings" container, the stuff inside the current recordings container is cached locally using the browser's session storage. 

Then the javascript library watches the load event of any pages being browsed. If the library sees that that browser's URL is a url we've already cached, and it's not "too old" (15 minutes), we replace the contents of our container (#recorindgs in our example) with the cached version, and scroll the browser to the place where it had been cached. 

This sounds easy, but there are certain things we bumped into that the library also helps with. Things like disabling autofocus events that mess up scrolling and making sure things in the cache can actually be more granularly ignored or even refreshed. 


## Syntax and how to use it

```
var snapbackCache = SnapbackCache({
  options
})
```

Here are some example options: 

```
var snapbackCache = SnapbackCache({
  bodySelector: "mandatory selector of your infinite feed",
  finish: function() {
    optional method of something that needs to finish on your page before caching the page
  },
  removeAutofocus: function(){
    optional method to kill autofocusing which screws with scrolling the page 
  },
  refreshItems: function(dirtyThings) {
    optional method to fetch fresh bits from your server you want to replace in the cache
  },  
  nextPageOffset: function(){
   optional method to fetch the current page your scrolled to. this is so you can track what page you should scroll next. see the page-cache:loaded event. 
  }
```

**bodySelector** is mandatory. It tells us what on the page you want to cache. 

**finish** is a function of things that you'd like to happen before the page is cached to get the page to get cleaned up. For example, we already try to get jQuery animations to finish, but if there's anything else on the page that might be animated or dynamically changing when someone is trying to navigate your site, you probably don't want those "transitional" things cached.  In our case we have a search bar that we want cleared up before things are cached.

**removeAutofocus** is a function that removes any auto focus behavior from your page. autoFocus events can mess with the browsers ability to scroll to the right place. So we want to nip that in this function. In our case we have multiple autofocus things going on, so we clear all that up. 

**refreshItems** is a function to help refresh anything that might have gone stale from the cache. You can use that in conjunction with a method available on snpachbackCache called markDirty. 

So in our case, we cache a note or comment or email in our feed. But if someone at some point edits/deletes one of those notes, comments or emails, we have javascript call 

```
snapbackCache.markDirty(id_of_dirty_thing); 
```

Then when the snapbackCache replaces the cached contents it's saving for us, it makes sure to call the refreshItems function you specify along with an array of "dirty items" you can do something with. In our case, we take all those dirty ids, and issue an ajax call that does all the work to refresh bits of the cached page. 

**nextPageOffset** is a function that the Snapback cache can use to figure out what "page" your user is on. We take that page and store it along the cached contents of the page. That way when the cached page is restored you have the page number the user was on and get pick up infinite paging at the appropriate place. See the page-cache:loaded event below to do that.


## Events

There are a couple of events we send out that are useful. 

**snapback-cache:cached** is an event emitted as soon as the contents of the page have been cached into session storage

**snapback-cache:loaded** is an event emitted as soon as the contents of the page have been replaced. We use this at Highrise to set the appropriate offset for our infinite scrolling: 

```
jQuery("#recordings").on("snapback-cache:loaded", function(event, cachedPage) {
  // sets the pager to page from the appropriate place
  EndlessPage.offset = cachedPage.nextPageOffset
})
```

nextPageOffset was calculated because we had setup a "nextPageOffset" function on the page cache. 



Installation
------------

1) Add the snapback_cache.js to your javascript stack.
 
2) Add a cache variable with the options set: 

```
var snapbackCache = SnapbackCache({
     bodySelector: "#recordings",
   })
```

3) Call pageCsnapbackche.cacheCurrentPage() whenever you need to, and magically when people return to that url, the cache will do the rest. 


Feedback
--------
[Source code available on Github](https://github.com/highrisehq/snapback_cache). Feedback and pull requests are greatly appreciated.  Let me know how we can improve this.

Credit
--------
A ton of thanks to everyone at Highrise for helping get this into our stack. Especially [Jon Phenow](https://github.com/jphenow) and [Grant Blakeman](https://github.com/gblakeman) for the edits and help getting it open sourced. 


P.S.
---------------
You should [**follow us on Twitter: here**](http://twitter.com/highrise), or see how we can help you with contact management using [**Highrise**](http://highrisehq.com)  —  a handy tool to help you remove anxiety around tracking who to follow up with and what to do next.

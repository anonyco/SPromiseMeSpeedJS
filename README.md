# PromiseMeSpeed
PromiseMeSpeed is currently the fastest [ES6 Promise](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise) javascript library and polyfill, *promising* a speedy implementation that are ~1-59x faster than Chrome's native promises and ~2-548x faster than Bluebird's promises (five hundread and fourty eight is not a typo). The purpose of PromiseMeSpeed is to provide a speedy alternative to ES6 promises until browsers implement faster native promises. If all you need is a way to defer the stack level so you don't get the dreaded "Maximum Stack Call Exceeded" error, then consider using my other library, [DeferStackJS](https://github.com/anonyco/DeferStackJS/), for slightly better performance and page load speed.

# Quick Start

To use, simply drop the following snippet of HTML code into your `<head>` before all of the scripts that use PromiseMeSpeed.
```HTML
<script src="https://dl.dropboxusercontent.com/s/llt6sv7y2yurn2v/SPromiseMeSpeedDEBUG.min.js?dl=0"></script>
```
Or, alternatively if you want faster page loading, add a defer to every script to let the browser know that you don't call evil `document.write` inside your script.<br /><br />
*Before:*
```HTML
<!doctype HTML>
<html><head>
<script src="https://dl.dropboxusercontent.com/s/llt6sv7y2yurn2v/SPromiseMeSpeedDEBUG.min.js?dl=0"></script>
<script src="/path/to/my/script.js"></script>
</head><body>
    ...
</body></html>
```
*After*
```HTML
<!doctype HTML>
<html><head>
<script src="https://dl.dropboxusercontent.com/s/llt6sv7y2yurn2v/SPromiseMeSpeedDEBUG.min.js?dl=0" defer=""></script>
<script src="/path/to/my/script.js" defer=""></script>
</head><body>
    ...
</body></html>
```

# API
PromiseMeSpeed gives you one and only one new global on the window object: `window.SPromise`. `window.SPromise` is the exact same as the native `window.Promise` as documented by MDN EXCEPT:

1. It is called without the `new` operator.
1. It has a `window.SPromise.isPromise` method you can use to determine if something is a promise.
1. It is a lot faster than native Chromium promises, even with (suprise, suprise!) `await`.
1. It skims and cuts corners to boost performance by reusing the same reference pased to callbacks as the source.
1. All callbacks are invoked immediately after the promise is resolved without waiting until the next tick.

Example code snippets:
```HTML
<!DOCTYPE HTML>
<html><head>
<title>SPromise Test Example</title>
<script src="https://dl.dropboxusercontent.com/s/llt6sv7y2yurn2v/SPromiseMeSpeedDEBUG.min.js?dl=0" defer=""></script>
</head><body>
<script>
addEventListener("load", function(){
  "use strict";
  var SPromise = window.SPromise;
  SPromise.race([
    SPromise(function(accept){
       setTimeout(function(){
         accept("SPromise wins this mockup that doesn't actually have any benchmarking practicality");
       }, 250);
    }),
    new Promise(function(accept){ // you can even intermingle native promises with SPromise
      setTimeout(function(accept){
        accept("Native Promise wins this mockup that doesn't actually have any benchmarking practicality")
      }, 250)
    })
  ]).then(function(winner){
    document.body.insertAdjacentHTML("beforeend", "<div>Winner:" + winner + "</div>");
  });
  (async function(){
    document.body.insertAdjacentHTML("beforeend", "<div>" + await SPromise(function(accept, reject){
      // Don't ask me why synthetic promises are allowed to work with await. I myself am still
      // confused, but hey: it works and SPromise even somehow shockingly makes them faster!
      setTimeout(function(){
        accept("Hello from await!")
      }, 750);
    }) + "</div>");
  })();
})();
</script>
</body></html>
```


# PromiseMeSpeed.min.js VS PromiseMeSpeedDEBUG.min.js
The main difference between the two versions is that PromiseMeSpeedDEBUG is intended for development. It adds many extra type checks and notifies you when the wrong type of object is passed to the SPromise API. For some of the errors, it even gives a suggestion on how to fix them. However, these checks come at a cost: performance. If you have already written your code well enough to not need these checks, then use PromiseMeSpeed.min.js for even better performance. PromiseMeSpeed.js will run blind untill it gets done running or it hits a wall and crashes. For example, if you pass something that is not a function to `window.SPromise` from PromiseMeSpeedDEBUG.min.js, then it will print a pretty error message saying you passed a wrong type to the function. But with PromiseMeSpeed.min.js, the console will say something along the lines of 'cannot call null or undefined' or 'null or undefined is not a function.' To use PromiseMeSpeed without the DEBUG, insert the following alternative code into your `<head>`:

```HTML
<script src="https://dl.dropboxusercontent.com/s/i8om2fcz5izdeoj/PromiseMeSpeed.min.js?dl=0"></script>
```

# Benchmarks
If you are a sensible guy like me, then you shouldn't take my word for the speed of SPromiseMeSpeed. Rather, take the word of these benchmarks:

### Casual Promising
Benchmark Code (executed in the console at https://cdnjs.cloudflare.com/ajax/libs/bluebird/2.11.0/bluebird.min.js)
```Javascript
(async function(requestIdleCallback, console, performance){
	"use strict";
	var resStr = "";
	var nativePromise = window.Promise, idleOptions = {timeout: 11};
	function test(str, f){
		return new nativePromise(function(acc){
            var tests=[], tmp=0, SPromise = window.SPromise;
            var cycleCount=5, intV=requestIdleCallback(function theeFunc(){
                "use strict";
                if (--cycleCount < 0) {
                    var res = tests.reduce((a, b) => a + b) / tests.length;
                    resStr += "\n" + str + res + "ms";
					acc();
                    return;
                }
                var k = performance.now(), i = 0, Len = 6;
                (function test(v){
                    f(function(k){
                        k(v+(((v<<2)%11)|0)|0);
                    }).then(function(v){
						i = i + 1|0;
                        if (i < Len) {
                            test(((v|0)%7)|0);
                        } else {
                            tmp = tmp + (v|0)|0;
                            tests.push((performance.now() - k)/Len);
                        }
                    });
                })(Math.random()*40|0);
                requestIdleCallback(theeFunc, idleOptions);
            }, idleOptions);
        });
    }

	await test("NativeR1:   ", function(x){return new nativePromise(x)});
	await test("NativeR2:   ", function(x){return new nativePromise(x)});
	await test("NativeR3:   ", function(x){return new nativePromise(x)});
	await test("NativeR4:   ", function(x){return new nativePromise(x)});
	await (new nativePromise(_=>requestIdleCallback(_))); // to allow the CPU to take a break
	(new Function(document.body.innerText))();
	var bbPromise = window.Promise;
	await test("BluebirdR1: ", function(x){return new bbPromise(x)});
	await test("BluebirdR2: ", function(x){return new bbPromise(x)});
	await test("BluebirdR3: ", function(x){return new bbPromise(x)});
	await test("BluebirdR4: ", function(x){return new bbPromise(x)});
	await (new nativePromise(_=>requestIdleCallback(_))); // to allow the CPU to take a break
	window.Promise = nativePromise;
	var SPromise = window.SPromise;
	await test("SPromiseR1: ", function(x){return SPromise(x)});
	await test("SPromiseR2: ", function(x){return SPromise(x)});
	await test("SPromiseR3: ", function(x){return SPromise(x)});
	await test("SPromiseR4: ", function(x){return SPromise(x)});
	console.log(resStr);
})(requestIdleCallback, console, performance);
```
Console output (lower numbers = lower promise delay = better):
```
NativeR1:   0.04416666730927924ms
NativeR2:   0.018666667165234685ms
NativeR3:   0.026166668006529413ms
NativeR4:   0.024499996410061918ms
BluebirdR1: 0.27599999836335576ms
BluebirdR2: 0.22883333343391615ms
BluebirdR3: 0.22850000144292912ms
BluebirdR4: 0.2271666657179594ms
SPromiseR1: 0.006999998974303404ms
SPromiseR2: 0.006166667056580384ms
SPromiseR3: 0.005999997180576125ms
SPromiseR4: 0.006833329098299146ms
```

### Synchronous Hellhole of Death Promising
Benchmark code (executed in the console at https://cdnjs.cloudflare.com/ajax/libs/bluebird/2.11.0/bluebird.min.js):
```Javascirpt
(async function(requestIdleCallback, console, performance){
	"use strict";
	var resStr = "";
	var nativePromise = window.Promise, idleOptions = {timeout: 11};
	function test(str, f){
		return new nativePromise(function(acc){
            var tests=[], tmp=0, SPromise = window.SPromise;
            var cycleCount=5, intV=requestIdleCallback(function theeFunc(){
                "use strict";
                if (--cycleCount < 0) {
                    var res = tests.reduce((a, b) => a + b) / tests.length;
                    resStr += "\n" + str + res + "ms";
					acc();
                    return;
                }
                var i = 0, k = performance.now();
                (function test(v){
                    f(function(k){
                        k(v+(((v<<5)%11)|0)|0);
                    }).then(function(v){
						i = i + 1|0;
                        if (i < 131072) {
                            test(v%7|0);
                        } else {
							tests.push((performance.now() - k)/131072);
                            tmp = tmp + v|0;
							clearInterval(intervalID);
							requestIdleCallback(theeFunc);
                        }
                    });
                })(Math.random()*40|0);
                var last = 0;
                var intervalID = setInterval(function(){
					if (last !== i) {last = i; return}
					i = 131072;
					clearInterval(intervalID);
					tests.push((performance.now() - k)/i);
					requestIdleCallback(theeFunc);
                }, 10);
            }, idleOptions);
        });
    }

	await test("NativeR1:   ", function(x){return new nativePromise(x)});
	await test("NativeR2:   ", function(x){return new nativePromise(x)});
	await test("NativeR3:   ", function(x){return new nativePromise(x)});
	await test("NativeR4:   ", function(x){return new nativePromise(x)});
	await (new nativePromise(_=>requestIdleCallback(_))); // to allow the CPU to take a break
	(new Function(document.body.innerText))();
	var bbPromise = window.Promise;
	await test("BluebirdR1: ", function(x){return new bbPromise(x)});
	await test("BluebirdR2: ", function(x){return new bbPromise(x)});
	await test("BluebirdR3: ", function(x){return new bbPromise(x)});
	await test("BluebirdR4: ", function(x){return new bbPromise(x)});
	await (new nativePromise(_=>requestIdleCallback(_))); // to allow the CPU to take a break
	window.Promise = nativePromise;
	var SPromise = window.SPromise;
	await test("SPromiseR1: ", function(x){return SPromise(x)});
	await test("SPromiseR2: ", function(x){return SPromise(x)});
	await test("SPromiseR3: ", function(x){return SPromise(x)});
	await test("SPromiseR4: ", function(x){return SPromise(x)});
	console.log(resStr);
})(requestIdleCallback, console, performance);
```
Console output (lower numbers = lower promise delay = better):
```
NativeR1:   0.005961311340207942ms
NativeR2:   0.005754425048820622ms
NativeR3:   0.005737731933574963ms
NativeR4:   0.005725685119539747ms
BluebirdR1: 0.0004817428588488326ms
BluebirdR2: 0.0003913345338446561ms
BluebirdR3: 0.0003724441526742339ms
BluebirdR4: 0.00038145446783488524ms
SPromiseR1: 0.0002370834351062001ms
SPromiseR2: 0.00017644500722724388ms
SPromiseR3: 0.00017766571041022416ms
SPromiseR4: 0.00017798614484476616ms
```

### Await Promising
Benchmark Code (executed in the console at https://cdnjs.cloudflare.com/ajax/libs/bluebird/2.11.0/bluebird.min.js):
```Javascript
(async function(performance, console){
	"use strict";
	var resStr="";
	var nativePromise = window.Promise, idleOptions = {timeout: 10};
	function acceptor(acc){acc();}
	function test(str, f){
		return new nativePromise(function(acc){
            var tests=[], SPromise = window.SPromise;
            var cycleCount=6, intV=requestIdleCallback(function theeFunc(){
                "use strict";
                if (--cycleCount < 0) {
                    var res = tests.reduce((a, b) => a + b) / tests.length;
                    resStr += "\n" + str + res + "ms";
					acc();
                    return;
                }
                var k = performance.now(), i = 0;
                (async function test(){
                    await f(acceptor);
                    if (i < 384) {
						i = i+1|0;
                        test();
                    } else {
                        tests.push((performance.now() - k)/384);
                		requestIdleCallback(theeFunc, idleOptions);
                    }
                })(Math.random()*40|0);
            }, idleOptions);
        });
    }

	await test("NativeR1:   ", function(x){return new nativePromise(x)});
	await test("NativeR2:   ", function(x){return new nativePromise(x)});
	await test("NativeR3:   ", function(x){return new nativePromise(x)});
	await (new nativePromise(_=>requestIdleCallback(_))); // to allow the CPU to take a break
	(new Function(document.body.innerText))();
	var bbPromise = window.Promise;
	await test("BluebirdR1: ", function(x){return new bbPromise(x)});
	await test("BluebirdR2: ", function(x){return new bbPromise(x)});
	await test("BluebirdR3: ", function(x){return new bbPromise(x)});
	await (new nativePromise(_=>requestIdleCallback(_))); // to allow the CPU to take a break
	window.Promise = nativePromise;
	var SPromise = window.SPromise;
	await test("SPromiseR1: ", function(x){return SPromise(x)});
	await test("SPromiseR2: ", function(x){return SPromise(x)});
	await test("SPromiseR3: ", function(x){return SPromise(x)});
	console.log(resStr);
})(performance, console);
```
Console output (lower numbers = lower promise delay = better):
```
NativeR1:   0.008009982618912342ms
NativeR2:   0.010225694394547543ms
NativeR3:   0.01835503472749325ms
BluebirdR1: 4.231184895818134ms
BluebirdR2: 4.206684027773615ms
BluebirdR3: 4.192039930558167ms
SPromiseR1: 0.016039496535490295ms
SPromiseR2: 0.010410156290971728ms
SPromiseR3: 0.010818142375986403ms
```
[Caution: please don't read the follow paragraph if you are easily disturbed by vivid images of emesis. Also note that this paragraph has been a bit less applicable since Chrome's `await` recieved internal optimizations.] The signifigance of the above tests is that trying to force a native method like `await` into using a user-created function like `SPromise` is comparable to trying to swallow someone else's barf. If you are going to swallow barf (as in `await`), you would likely want to swallow your own *native* barf instead of trying to swallow the barf of someone else (like Bluebird or SPromise). Yet in spite of this, SPromise makes the barf tastey (fast and performant) enough for Chrome to swallow it with greater efficiency.



<!--# PromiseMeSpeedAdvancedEnumerations.js

For a separate project I am using PromiseMeSpeed in, the default ECMAScript specification for promises is just simply too slow for my purposes. Thus, I have revised the whole thing to use lickety-fast enumerations. However, for this script, do not ever do `<script src="PromiseMeSpeedAdvancedEnumerations.js"></script>` as that will make your code really slow. Also do not use distribute this script unminified or without the `DEBUGMODE` variable not set to `true` as that will make your code really slow too. The way to use this script is to insert it into the scope of your actual script and minify it along with the rest of your script to increase performance to the limit. An example usage of this script is as follows.

```Javascript
SPromise_all(
    SPromise(function(accept, reject){
        setTimeout(accept, 1000);
    }),
    SPromise(function(accept, reject){
		setTimeout(accept, 500);
    })
)[ENUM_SPROMISE_THEN](function(){
	console.log("success!")
})[ENUM_SPROMISE_FINALLY](function(){
	console.log("finally!")
});
```-->

<!--# PromiseRejectionEvent
The current spec for Promises wants there to be a PromiseRejectionEvent. SPromise will asynchronously (via setTimeout) fire a PromiseRejectionEvent on the window object when there is a Promise that fails and has nothing to handle the failure. However, SPromise slightly deviates from this specification for the purposes of performance in so much that SPromise treats internal triggers from `Promise.all` and `Promise.race` same as ordinary handles. Thus, when a promise is rejected, but you called race/all on the promise, the promise wrongly never fires a PromiseRejectionEvent event. This is a known bug, but it will never be fixed because of the overhead involved in adding extra checks that verify whether a catch handler is internal or external. Further, any fix for this bug would only apply apply to SPromises: there would be no (reasonable/sane) way to patch calling native Promise.all on an array of SPromises that are about to be rejected. Observe.

```Javascript
// This demonstrates one of the many minor ways that SPromise deviates from the specification
var rejectThePromise;
var promiseToBeRejected = SPromise(function(accept, reject){rejectThePromise = reject});

SPromise.all(promiseToBeRejected)
    .catch(function(){}); // ensure that the rejection of SPromise.all is caught here

rejectThePromise(); // should cause a PromiseRejectionEvent to be emitted, but no PromiseRejectionEvent ever happens
```-->

# Think Before You Pull!
The purpose of PromiseMeSpeed is to be a transitional speed-polyfill to bridge the gap between current browser promise performance and native browser promise performance. The purpose of PromiseMeSpeed is **not** to be a full featured Golliath standing over 100+kb in size. Do not open up any pull requests or commits suggesting new features or promise utilities. Even if they may be good ideas, I will never integrate them into this library. Rather, you should fork this library and then put all of your changes into that fork instead. Or, alternatively, you can just use BlueBird instead. In any event, it would be pointless for the creator of this library to be working on any extra promise utilies since he is currently creating something that will make every library in every language obsolete.

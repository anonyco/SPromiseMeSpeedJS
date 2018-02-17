# PromiseMeSpeed
PromiseMeSpeed is currently the fastest javascript library, *promising* speedy ES6 promises that are ~9-12x faster than Chrome's native promises and ~2-9x faster than Bluebird's promises. The purpose of PromiseMeSpeed is to provide a speedy alternative to ES6 promises until browsers implement faster native promises. If all you need is a way to defer the stack level so you don't get the dreaded "Maximum Stack Call Exceeded" error, then condider using my other library, [DeferStackJS](https://github.com/anonyco/DeferStackJS/), for slightly better performance and page load speed.

# Quick Start

To use, simply drop the following snippet of HTML code into your `<head>` before all of the scripts that use PromiseMeSpeed.
```HTML
<script src="https://dl.dropboxusercontent.com/s/llt6sv7y2yurn2v/promiseMeSpeedDEBUG.min.js?dl=0"></script>
```
Or, alternatively if you want faster page loading, add a defer to every script to let the browser know that you don't call evil `document.write` inside your script.<br /><br />
*Before:*
```HTML
<!doctype HTML>
<html><head>
<script src="https://dl.dropboxusercontent.com/s/llt6sv7y2yurn2v/promiseMeSpeedDEBUG.min.js?dl=0"></script>
<script src="/path/to/my/script.js"></script>
</head><body>
    ...
</body></html>
```
*After*
```HTML
<!doctype HTML>
<html><head>
<script src="https://dl.dropboxusercontent.com/s/llt6sv7y2yurn2v/promiseMeSpeedDEBUG.min.js?dl=0" defer=""></script>
<script src="/path/to/my/script.js" defer=""></script>
</head><body>
    ...
</body></html>
```

# API
PromiseMeSpeed gives you one and only one new global on the window object: `window.SPromise`. `window.SPromise` is the exact same as the native `window.Promise` as documented by MDN EXCEPT:

1. It is called without the `new` operator.
2. It has a `window.SPromise.isPromise` method you can use to determine if something is a promise.
3. It is a hell of a lot faster than native Chromium promises, even with (suprise, suprise!) `await`.

Example code snippets:
```HTML
<!DOCTYPE HTML>
<html><head>
</head><body>
<script>
(function(){
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
  ]).then(function(){
    
  });
  (async function(){
    document.writeln(await SPromise(function(accept, reject){
    // Don't ask me why synthetic promises are allowed to work with await. I myself am still
    // confused, but hey: it works and SPromise even somehow shockingly makes them faster!
      setTimeout(function(){
        accept("Hello from await!")
      }, 750);
    });
  })();
})();
</script>
</body></html>
```

# Benchmarks
If you are a sensible guy like me, then you shouldn't take my word for the speed of PromiseMeSpeed. Rather, take the word of these benchmarks:

### Casual Promising
Benchmark Code (executed in the console at https://cdnjs.cloudflare.com/ajax/libs/bluebird/2.11.0/bluebird.min.js)
```Javascript
(async function(){
	"use strict";
	var resStr = "";
	var nativePromise = window.Promise;
	function test(str, f){
		return new nativePromise(function(acc){
            var tests=[], tmp=0, SPromise = window.SPromise;
            var cycleCount=13, intV=requestIdleCallback(function theeFunc(){
                "use strict";
                if (--cycleCount < 0) {
                    var res = tests.reduce((a, b) => a + b) / tests.length;
                    resStr += "\n" + str + res + "ms";
					acc();
                    return;
                }
                var k = performance.now(), i = 0, Len = 8;
                (function test(v){
                    f(function(k){
                        k(v+(v*13%11));
                    }).then(function(v){
                        if (i++ < Len) {
                            test(v%7);
                        } else {
                            tmp += v;
                            tests.push((performance.now() - k)/Len);
                        }
                    });
                })(Math.random()*40|0);
                requestIdleCallback(theeFunc);
            });
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
	var SPromise = window.SPromise;
	await test("SPromiseR1: ", function(x){return SPromise(x)});
	await test("SPromiseR2: ", function(x){return SPromise(x)});
	await test("SPromiseR3: ", function(x){return SPromise(x)});
	await test("SPromiseR4: ", function(x){return SPromise(x)});
	window.Promise = nativePromise;
	console.log(resStr);
})();
```
Console output (lower numbers = lower promise delay = better):
```
NativeR1:   0.20504807692307517ms
NativeR2:   0.2591346153846574ms
NativeR3:   0.15860576923077693ms
NativeR4:   0.20966346153842935ms
BluebirdR1: 0.34370192307694825ms
BluebirdR2: 0.27802884615383705ms
BluebirdR3: 0.289326923076907ms
BluebirdR4: 0.2948076923076909ms
SPromiseR1: 0.031778846153848954ms
SPromiseR2: 0.05201923076922937ms
SPromiseR3: 0.01673076923074964ms
SPromiseR4: 0.030432692307683213ms
```

### Synchronous Hellhole of Death Promising
Benchmark code (executed in the console at https://cdnjs.cloudflare.com/ajax/libs/bluebird/2.11.0/bluebird.min.js):
```Javascirpt
(async function(){
	"use strict";
	var resStr = "";
	var nativePromise = window.Promise;
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
                var k = performance.now(), i = 0, Len = 32768;
                (function test(v){
                    f(function(k){
                        k(v+(v*13%11));
                    }).then(function(v){
                        if (i++ < Len) {
                            test(v%7);
                        } else {
                            tmp += v;
                            tests.push((performance.now() - k)/Len);
                        }
                    });
                })(Math.random()*40|0);
                requestIdleCallback(theeFunc);
            });
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
	var SPromise = window.SPromise;
	await test("SPromiseR1: ", function(x){return SPromise(x)});
	await test("SPromiseR2: ", function(x){return SPromise(x)});
	await test("SPromiseR3: ", function(x){return SPromise(x)});
	await test("SPromiseR4: ", function(x){return SPromise(x)});
	window.Promise = nativePromise;
	console.log(resStr);
})();
```
Console output (lower numbers = lower promise delay = better):
```
NativeR1:   0.08879110717773404ms
NativeR2:   0.09138412475585973ms
NativeR3:   0.09104553222656211ms
NativeR4:   0.09136700439453165ms
BluebirdR1: 0.0021338195800783668ms
BluebirdR2: 0.001447601318359837ms
BluebirdR3: 0.0014637451171877203ms
BluebirdR4: 0.001489685058594148ms
SPromiseR1: 0.0010407409667971379ms
SPromiseR2: 0.0008829040527349008ms
SPromiseR3: 0.0009582824707029758ms
SPromiseR4: 0.0009214782714849435ms
```

### Await Promising
Benchmark Code (executed in the console at https://cdnjs.cloudflare.com/ajax/libs/bluebird/2.11.0/bluebird.min.js):
```Javascript
(async function(){
	"use strict";
	var resStr="";
	var nativePromise = window.Promise;
	function test(str, f){
		return new nativePromise(function(acc){
            var tests=[], tmp=0, SPromise = window.SPromise;
            var cycleCount=33, intV=requestIdleCallback(function theeFunc(){
                "use strict";
                if (--cycleCount < 0) {
                    var res = tests.reduce((a, b) => a + b) / tests.length;
                    resStr += "\n" + str + res + "ms";
					          acc();
                    return;
                }
                var k = performance.now(), i = 0, Len = 64;
                (async function test(v){
                    var v = await f(function(k){
                        k(v+(v*13%11));
                    });
                    if (i++ < Len) {
                        test(v%7);
                    } else {
                        tmp += v;
                        tests.push((performance.now() - k)/Len);
                		requestIdleCallback(theeFunc);
                    }
                })(Math.random()*40|0);
            });
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
	var SPromise = window.SPromise;
	await test("SPromiseR1: ", function(x){return SPromise(x)});
	await test("SPromiseR2: ", function(x){return SPromise(x)});
	await test("SPromiseR3: ", function(x){return SPromise(x)});
	window.Promise = nativePromise;
	console.log(resStr);
})();
```
Console output (lower numbers = lower promise delay = better):
```
NativeR1:   0.19717092803028374ms
NativeR2:   0.21796875000000276ms
NativeR3:   0.2995241477272595ms
BluebirdR1: 5.19542140151517ms
BluebirdR2: 5.168622159090939ms
BluebirdR3: 5.096112689393976ms
SPromiseR1: 0.2274715909090832ms
SPromiseR2: 0.18396306818184519ms
SPromiseR3: 0.1810298295454507ms
```
[Caution: please don't read the follow paragraph if you are easily disturbed by vivid images of emesis.] The signifigance of the above tests is that trying to force a native method like `await` into using a user-created function like `SPromise` is comparable to trying to swallow someone else's barf. If you are going to swallow barf (as in `await`), you would likely want to swallow your own *native* barf instead of trying to swallow the barf of someone else (like Bluebird or SPromise). Yet in spite of this, SPromise makes the barf tastey (fast and performant) enough for Chrome to swallow it with greater efficiency.


# PromiseMeSpeed.min.js VS PromiseMeSpeedDEBUG.min.js
The main difference between the two versions is that PromiseMeSpeedDEBUG is intended for development. It adds many extra type checks and notifies you when the wrong type of object is passed to the SPromise API. For some of the errors, it even gives a suggestion on how to fix them. However, these checks come at a cost: performance. If you have already written your code well enough to not need these checks, then use PromiseMeSpeed.min.js for even better performance. PromiseMeSpeed.js will run blind untill it gets done running or it hits a wall and crashes. For example, if you pass something that is not a function to `window.SPromise` from PromiseMeSpeedDEBUG.min.js, then it will print a pretty error message saying you passed a wrong type to the function. But with PromiseMeSpeed.min.js, the console will say something along the lines of 'cannot call null or undefined' or 'null or undefined is not a function.' To use PromiseMeSpeed without the DEBUG, insert the following alternative code into your `<head>`:

```HTML
<script src="https://dl.dropboxusercontent.com/s/i8om2fcz5izdeoj/promiseMeSpeed.min.js?dl=0"></script>
```

# Think Before You Pull!
The purpose of PromiseMeSpeed is to be a transitional speed-polyfill to bridge the gap between current browser promise performance and native browser promise performance. The purpose of PromiseMeSpeed is **not** to be a full featured Golliath standing over 100+kb in size. Do not open up any pull requests or commits suggesting new features or promise utilities. Even if they may be good ideas, I will never integrate them into this library. Rather, you should fork this library and then put all of your changes into that fork instead. Or, alternatively, you can just use BlueBird instead. In any event, it would be pointless for the creator of this library to be working on any extra promise utilies since he is currently creating something that will make every library in every language obsolete.

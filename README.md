# PromiseMeSpeed
PromiseMeSpeed is currently the fastest javascript library, *promising* speedy ES6 promises that are ~9-12x faster than Chrome's native promises and ~2-9x faster than Bluebird's promises. The purpose of PromiseMeSpeed is to provide a speedy alternative to ES6 promises until browsers implement faster native promises.

# Quick Start

To use, simply drop the following snippet of HTML code into your `<head>` before all of the scripts that use PromiseMeSpeed.
```HTML
<script src="https://www.dropbox.com/s/llt6sv7y2yurn2v/promiseMeSpeedDEBUG.min.js?dl=2"></script>
```
Or, alternatively if you want faster page loading, add a defer to every script to let the browser know that you don't call `document.write` inside your script.<br /><br />
*Before:*
```HTML
<!doctype HTML>
<html><head>
<script src="https://www.dropbox.com/s/llt6sv7y2yurn2v/promiseMeSpeedDEBUG.min.js?dl=2"></script>
<script src="/path/to/my/script.js"></script>
</head><body>
    ...
</body></html>
```
*After*
```HTML
<!doctype HTML>
<html><head>
<script src="https://www.dropbox.com/s/llt6sv7y2yurn2v/promiseMeSpeedDEBUG.min.js?dl=2" defer=""></script>
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
	var nativePromise = window.Promise;
	function test(str, f){
		return new nativePromise(function(acc){
            var tests=[], tmp=0, SPromise = window.SPromise;
            var cycleCount=222, intV=requestIdleCallback(function theeFunc(){
                "use strict";
                if (--cycleCount < 0) {
                    var res = tests.reduce((a, b) => a + b) / tests.length;
                    console.log(str, res + "ms");
					acc();
                    return;
                }
                var k = performance.now(), i = 0, Len = 16;
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
})();
```
Console output:
```
NativeR1:    0.14081925676211607ms
NativeR2:    0.13913006756637195ms
NativeR3:    0.17233389639426736ms
BluebirdR1:  0.17266328829059563ms
BluebirdR2:  0.1277702702715393ms
BluebirdR3:  0.11450028153312569ms
SPromiseR1:  0.01383164414489927ms
SPromiseR2:  0.010425112613472618ms
SPromiseR3:  0.012870213962348833ms
```

### Synchronous Hellhole of Death Promising
Benchmark code (executed in the console at https://cdnjs.cloudflare.com/ajax/libs/bluebird/2.11.0/bluebird.min.js):
```Javascirpt
(async function(){
	"use strict";
	var nativePromise = window.Promise;
	function test(str, f){
		return new nativePromise(function(acc){
            var tests=[], tmp=0, SPromise = window.SPromise;
            var cycleCount=22, intV=requestIdleCallback(function theeFunc(){
                "use strict";
                if (--cycleCount < 0) {
                    var res = tests.reduce((a, b) => a + b) / tests.length;
                    console.log(str, res + "ms");
					acc();
                    return;
                }
                var k = performance.now(), i = 0, Len = 8192; // 8192 is, well, very abusive to promises
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
})();
```
Console output:
```
NativeR1:    0.09172130237926134ms
NativeR2:    0.09093966397372148ms
NativeR3:    0.0929469992897726ms
BluebirdR1:  0.0035457541725850998ms
BluebirdR2:  0.0022960870916192647ms
BluebirdR3:  0.0025248579545454593ms
SPromiseR1:  0.0021386163884940775ms
SPromiseR2:  0.0014447021484376356ms
SPromiseR3:  0.001690507368607945ms
```

### Await Promising
Benchmark Code (executed in the console at https://cdnjs.cloudflare.com/ajax/libs/bluebird/2.11.0/bluebird.min.js):
```Javascript
(async function(){
	"use strict";
	var nativePromise = window.Promise;
	function test(str, f){
		return new nativePromise(function(acc){
            var tests=[], tmp=0, SPromise = window.SPromise;
            var cycleCount=33, intV=requestIdleCallback(function theeFunc(){
                "use strict";
                if (--cycleCount < 0) {
                    var res = tests.reduce((a, b) => a + b) / tests.length;
                    console.log(str, res + "ms");
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
})();
```
Console output:
```
NativeR1:    0.22994554924265354ms
NativeR2:    0.1941098484843899ms
NativeR3:    0.23938920454516352ms
BluebirdR1:  5.123219696969362ms
BluebirdR2:  5.130170454544978ms
BluebirdR3:  5.053499053030189ms
SPromiseR1:  0.18391335227263908ms
SPromiseR2:  0.18936316287991675ms
SPromiseR3:  0.22957859848468093ms
```
[Caution: please don't read the follow paragraph if you are easily disturbed by vivid images of emesis.] The signifigance of the above tests is that trying to force a native method like `await` into using a user-created function like `SPromise` is comparable to trying to swallow someone else's barf. If you are going to swallow barf (as in `await`), you would likely want to swallow your own native barf instead of trying to swallow someone else's barf (Bluebird). Yet in spite of this, SPromise makes the barf tastey (fast and performant) enough for Chrome to swallow it with greater efficiency.


# PromiseMeSpeed.min.js VS PromiseMeSpeedDEBUG.min.js
The main difference between the two versions is that PromiseMeSpeedDEBUG is intended for development. It adds many extra type checks and notifies you when the wrong type of object is passed to the SPromise API. For some of the errors, it even gives a suggestion on how to fix them. However, these checks come at a cost: performance. If you have already written your code well enough to not need these checks, then use PromiseMeSpeed.min.js for even better performance. PromiseMeSpeed.js will run blind untill it gets done running or it hits a wall and crashes. For example, if you pass something that is not a function to `window.SPromise` from PromiseMeSpeedDEBUG.min.js, then it will print a pretty error message saying you passed a wrong type to the function. But with PromiseMeSpeed.min.js, the console will say something along the lines of 'cannot call null or undefined' or 'null or undefined is not a function.' To use PromiseMeSpeed without the DEBUG, insert the following alternative code into your `<head>`:

```HTML
<script src="https://www.dropbox.com/s/i8om2fcz5izdeoj/promiseMeSpeed.min.js?dl=2"></script>
```

# Think Before You Pull!
The purpose of PromiseMeSpeed is to be a transitional speed-polyfill to bridge the gap between current browser promise performance and native browser promise performance. The purpose of PromiseMeSpeed is **not** to be a full featured Golliath standing over 100+kb in size. Do not open up any pull requests or commits suggesting new features or promise utilities. Even if they may be good ideas, I will never integrate them into this library. Rather, you should fork this library and then put all of your changes into that fork instead. Or, alternatively, you can just use BlueBird instead. In any event, it would be pointless for the creator of this library to be working on any extra promise utilies since he is currently creating something that will make every library in every language obsolete.

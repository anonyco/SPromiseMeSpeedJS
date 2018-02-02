// The javascript promise library that promises you SPEED, and lots of it
(function(){
	"use strict";
	// the reason I use a variable like this is because closure compiler automaticly inlines and optimizes it
	///////////////////////
	const DEBUGMODE = true;
	///////////////////////
	const persuadoStack = []; // Defered loading of promises to outermost promise scope so as to not exceed the stack level
	const proxy = function(func){func(this)};
	const exec = function(x){x()};
	const promiseBufferLvl = 64; // length of the promise buffer for double stack buffering
	const Promise = window.Promise || Object.create(null);
	const isPromise = SPromise["isPromise"] = function(x){
		return !!x && (x.constructor === SPromise || x.constructor === Promise);//(x instanceof SPromise) || (x instanceof Promise);
	};
	var promiseLevel = 0;
	var isInsidePromise = false; // because javascript is single threaded, we can use this to determine if there is an outermost promise
	var pStackLength = 0;		 // the current size of the persuadoStack
	
	function SPromise(func){
		// simple/super/speedy/synchronous promise
		var retVal, stage, thenFuncs = null, catchFuncs = null, finallies = null;
		// stage undefined = unfurfilled
		// stage true = accepted
		// stage false = rejected

		function acceptP(x){
			// This specific order should allow for max GZip compression
			catchFuncs = null;
			retVal = x;
			stage = true;
			if (thenFuncs !== null)	thenFuncs.forEach(proxy, x),  thenFuncs  = null;
			if (finallies !== null)	finallies.forEach(exec),	  finallies  = null;
			catchFuncs = null;
		}
		function rejectP(x){
			thenFuncs = null;
			retVal = x;
			stage = false;
			if (catchFuncs !== null) catchFuncs.forEach(proxy, x), catchFuncs = null;
			if (finallies  !== null) finallies.forEach(exec),	  finallies  = null;
			catchFuncs = thenFuncs = finallies = null;
		}
		// synchonously defered stacking allows for super performance
		if (isInsidePromise) {
			persuadoStack.push(
				func.bind(undefined, acceptP, rejectP)
			);
			++pStackLength;
		} else {
			++promiseLevel;
			if (promiseLevel > promiseBufferLvl) isInsidePromise = true;
			func(acceptP, rejectP);
			--promiseLevel;
			if (!promiseLevel) {
				var i = 0;
				while (i !== pStackLength) persuadoStack[i++]();
				persuadoStack.length = pStackLength = 0;
				isInsidePromise = false;
			}
		}
		var retObj = {
			"then": function(tFunc, cFunc){
				if (DEBUGMODE){
					if (tFunc && typeof tFunc !== "function"){
						console.error(Object.prototype.toString.call(tFunc) + " is not valid function to be called after a successful promise");
					}
					if (cFunc && typeof cFunc !== "function"){
						console.error(Object.prototype.toString.call(cFunc) + " is not valid function to be called after a rejected promise");
					}
				}

				return SPromise(function(accept, reject){
					if (tFunc){
						if (thenFuncs !== null)  thenFuncs.push(tFunc);	 else thenFuncs	 = [ tFunc ];
					}
					if (cFunc) {
						if (catchFuncs !== null) catchFuncs.push(cFunc); else catchFuncs = [ cFunc ];
					}
					if (stage === undefined){
						if (tFunc) thenFuncs.push(function(){return accept(tFunc(_))});
						if (cFunc) catchFuncs.push(function(){return reject(cFunc(_))});
					} else if (stage === true) {
						if (tFunc) accept( tFunc(retVal) );
					} else {
						if (cFunc) reject( cFunc(retVal) );
					}
				});
			},
			"catch": function(cFunc){
				if (DEBUGMODE){
					if (cFunc && typeof cFunc !== "function"){
						console.error(Object.prototype.toString.call(cFunc) + " is not valid function to be called after a rejected promise");
					}
				}
				if (cFunc) {
					if (catchFuncs !== null) catchFuncs.push(cFunc); else catchFuncs = [ cFunc ];
				}

				return SPromise(function(accept, reject){
					if (stage === undefined){
						if (cFunc) catchFuncs.push(function(){return reject(cFunc(_))});
					} else {
						if (cFunc) reject( cFunc(retVal) );
					}
				});
			},
			"finally": function(fFunc){
				if (DEBUGMODE){
					if (typeof fFunc !== "function"){
						console.error(Object.prototype.toString.call(fFunc) + " is not valid function to be called 'finally' after promise");
					}
				}
				if (stage === undefined) {
					if (finallies)
						finallies.push(fFunc);
					else
						finallies = [ fFunc ];
				} else {
					fFunc();
				}
			}
		};
		return retObj;
	}
	SPromise["resolve"] = function resolve(val){
		var curObj = {
			"then": function(f){
				// synchonously defered stacking allows for super performance
				if (isInsidePromise) {
					return SPromise(function(accept, reject){
						persuadoStack.push(
							accept.bind(undefined, f.bind(undefined, val))
						);
						++pStackLength;
					});
				} else {
					++promiseLevel;
					if (promiseLevel > promiseBufferLvl) isInsidePromise = true;
					var newVal = f(val);
					--promiseLevel;
					if (!promiseLevel) {
						var i = 0;
						while (i !== pStackLength) persuadoStack[i++]();
						persuadoStack.length = pStackLength = 0;
						isInsidePromise = false;
					}
					return resolve(newVal);
				}
			},
			"finally": function(f){
				// synchonously defered stacking allows for super performance
				if (isInsidePromise) {
					persuadoStack.push(
						f.bind(undefined, val)
					);
				} else {
					++promiseLevel;
					if (promiseLevel > promiseBufferLvl) isInsidePromise = true;
					f(val);
					--promiseLevel;
					if (!promiseLevel) {
						var i = 0;
						while (i !== pStackLength) persuadoStack[i++]();
						persuadoStack.length = pStackLength = 0;
						isInsidePromise = false;
					}
				}
				return curObj;
			},
			"catch": function(){
				return curObj;
			}
		}
		return curObj;
	};
	var hasWarnedAboutArguments = false;
	SPromise["race"] = function(arr){
		if (DEBUGMODE){
			if (!arr || !arr.forEach || !Array.prototype.every.call(arr, function(x){return SPromise.isPromise(x)})){
				// check to see if it is an array or an iterable object
				console.error(Object.prototype.toString.call(fFunc) + " is not a valid iterable array of promises. If you are using an array-like object, then you must call Array.prototype.slice.call on the object before passing it to SPromise.race.");
				return SPromise.resolve();
			}
			if (!hasWarnedAboutArguments && !arr.length){
				hasWarnedAboutArguments = true;
				console.warn(Object.prototype.toString.call(fFunc) + " is an empty array of promises passed to SPromise")
			}
		}
		return SPromise(function(accept, reject){
			var furfilled = false;
			promisesArray.forEach(function(Cur){
				Cur.then(function(Val){
					if (furfilled === false) {
						furfilled = true;
						accept(Val);
						console.warn
					} 
				});
			});
		});
	}
	SPromise["all"] = function(arr){
		if (DEBUGMODE){
			if (!promisesArray || !promisesArray.forEach || !promisesArray.every || !promisesArray.every(function(x){return SPromise.isPromise(x)})){
				// check to see if it is an array or an iterable object
				console.error(Object.prototype.toString.call(fFunc) + " is not a valid iterable array of promises. If you are using an array-like object, then you must call Array.prototype.slice.call on the object before passing it to Promise.race.");
				return SPromise.resolve();
			}
		}
		return SPromise(function(accept, reject){
			var leftToGo = arr.length;
			promisesArray.forEach(function(Cur){
				Cur.then(function(Val){
					if (!--leftToGo){
						accept(Val);
					}
				});
			});
		});
	}
	window["SPromise"] = SPromise;
})();

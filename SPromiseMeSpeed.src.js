// ==ClosureCompiler==
// @compilation_level ADVANCED_OPTIMIZATIONS
// @language_out ECMASCRIPT6_STRICT
// ==/ClosureCompiler==

// The javascript promise library that promises you SPEED, and lots of it
(function(window){
	"use strict";
	// the reason I use a variable like this is because closure compiler automatically inlines and optimizes it
	///////////////////////
	const DEBUGMODE = true;
	///////////////////////
	const persuadoStack = []; // Defered loading of promises to outermost promise scope so as to not exceed the stack level
	const proxy = function(func){func(this);};
	const exec = function(x){x();};
	const promiseBufferLvl = 128; // length of the promise buffer for double stack buffering
	const isPromise = SPromise["isPromise"] = function(x){ // determines whether something is able to be used as a promise
		return typeof x === "object" && x !== null && typeof x["then"] === "function";
	};
	var promiseLevel = 0;
	var isInsidePromise = false; // because javascript is single threaded, we can use this to determine if there is an outermost promise
	var pStackLength = 0;		 // the current size of the persuadoStack
	var _Symbol_toStringTag = typeof Symbol !== "undefined" && Symbol.toStringTag;
	var undefinedResolve = resolve();

	function resolvePends(){
		if (pStackLength) {
			do {
				isInsidePromise = false;
				persuadoStack.shift()();
			} while (--pStackLength);
		}
		isInsidePromise = false;
	}
	
	/** @constructor */
	function SPromise_construct(then, error, final) {
		this["then"] = then;
		this["catch"] = error;
		this["finally"] = final;
	}
	if (typeof _Symbol_toStringTag === "symbol") SPromise_construct.prototype[_Symbol_toStringTag] = "Promise"; // to disguise SPromise as internal

	function SPromise(func){
		// simple/super/speedy/synchronous promise
		var retVal, stage=0, thenFuncs = null, catchFuncs = null, finallies = null,  retObj = new SPromise_construct(
			function(tFunc, cFunc){
				if (DEBUGMODE){
					if (tFunc != undefined && typeof tFunc !== "function"){
						console.warn(Object.prototype.toString.call(tFunc) + " is not a valid function to be called after a successful promise");
					}
					if (cFunc != undefined && typeof cFunc !== "function"){
						console.warn(Object.prototype.toString.call(cFunc) + " is not a valid function to be called after a rejected promise");
					}
				}
				if (stage === 0){
					// promise has not yet completed...
					return _NOCHECK_SPromise(function(accept, reject){
						var finalAcceptor = typeof tFunc === "function" ? function(){accept(tFunc(retVal));} : accept;
						var finalRejector = typeof cFunc === "function" ? function(){reject(cFunc(retVal));} : reject;
						
						if (thenFuncs !== null) {
							if (typeof thenFuncs === "function") {
								thenFuncs = [ thenFuncs, finalAcceptor ];
							} else {
								thenFuncs.push(finalAcceptor);
							}
						} else thenFuncs = finalAcceptor;
						
						if (catchFuncs !== null) {
							if (typeof catchFuncs === "function") {
								catchFuncs = [ catchFuncs, finalRejector ];
							} else {
								catchFuncs.push(finalRejector);
							}
						} else catchFuncs = finalRejector;
					});
				} else try {
					return stage === 2 ? (
						typeof tFunc === "function" ? _NOCHECK_resolve( tFunc(retVal) ) : undefinedResolve
					) : (
						typeof cFunc === "function" ? _NOCHECK_reject( cFunc(retVal) ) : undefinedResolve
					);
				} catch(e) {return _NOCHECK_reject(e);}
			},
			function(cFunc){
				if (DEBUGMODE){
					if (cFunc != undefined && typeof cFunc !== "function"){
						console.warn(Object.prototype.toString.call(cFunc) + " is not a valid function to be called after a rejected promise");
					}
				}
				if (stage === 0){
					// promise has not yet completed...
					return _NOCHECK_SPromise(function(accept){
						if (catchFuncs !== null) {
							if (typeof catchFuncs === "function") {
								catchFuncs = [ catchFuncs, function(){accept(cFunc(retVal));} ];
							} else {
								catchFuncs.push(function(){accept(cFunc(retVal));});
							}
						} else catchFuncs = function(){accept(cFunc(retVal));};
						if (thenFuncs !== null) {
							if (typeof thenFuncs === "function") {
								thenFuncs = [ thenFuncs, accept ];
							} else {
								thenFuncs.push(accept);
							}
						} else thenFuncs = accept;
					});
				} else if (stage === 2) { // if success, then merely propagate the response transparently
					return _NOCHECK_resolve(retVal);
				} else {
					try {
						return typeof cFunc === "function" ? _NOCHECK_resolve( cFunc(retVal) ) : undefinedResolve;
					} catch(e) {
						return _NOCHECK_reject(e);
					}
				}
			},
			function(fFunc){
				if (DEBUGMODE){
					if (fFunc != undefined && typeof fFunc !== "function"){
						console.warn(Object.prototype.toString.call(fFunc) + " is not a valid function to be called 'finally' after promise");
					}
				}
				if (stage === 0) {
					if (finallies !== null) {
						if (typeof finallies === "function") {
							finallies = [ finallies, fFunc ];
						} else {
							finallies.push(fFunc);
						}
					} else finallies = fFunc;
				} else try {
					fFunc();
				} catch(e) {
					return _NOCHECK_reject(e);
				}
				return retObj;
			}
		);
		// stage undefined = unfulfilled
		// stage true = accepted
		// stage false = rejected

		function acceptP(x){
			// This specific order should allow for max GZip compression
			if (stage === 0) {
				if (isPromise(x)) {
					x.then(acceptP, rejectP); // wait for further commitment before resolving. [FYI: this takes a non-compliant shortcut]
				} else {
					retVal = x;
					stage = 2;
					if (thenFuncs !== null)	{
						if (typeof thenFuncs === "function") {
							thenFuncs(x);
						} else {
							thenFuncs.forEach(proxy, x);
						}
						thenFuncs  = null;
					}
					catchFuncs = null;
					if (finallies !== null)	{
						if (typeof finallies === "function") {
							finallies();
						} else {
							finallies.forEach(exec);
						}
						finallies  = null;
					}
				}
			}
		}
		function rejectP(x){
			if (stage === 0) {
				retVal = x;
				stage = 1;
				if (catchFuncs !== null)	{
					if (typeof catchFuncs === "function") {
						catchFuncs(x);
					} else {
						catchFuncs.forEach(proxy, x);
					}
					catchFuncs  = null;
				}
				thenFuncs = null;
				if (finallies !== null)	{
					if (typeof finallies === "function") {
						finallies();
					} else {
						finallies.forEach(exec);
					}
					finallies  = null;
				}
			}
		}
		// synchonously defered stacking allows for super performance
		if (isInsidePromise === true) {
			persuadoStack.push(
				function(){
					try {
						func(acceptP, rejectP);
					} catch(e) {
						rejectP(e);
					}
				}
			);
			pStackLength = pStackLength + 1|0;//+= 3;
		} else {
			promiseLevel = promiseLevel + 1|0;
			if (isInsidePromise = promiseLevel === promiseBufferLvl){
				try {
					func(acceptP, rejectP);
				} catch(e) {
					rejectP(e);
				}
			} else {
				try {
					func(acceptP, rejectP);
				} catch(e) {
					rejectP(e);
				}
				if (isInsidePromise === true && promiseLevel === 1) { // if this is the outermost promise
					resolvePends();
				}
			}
			promiseLevel = promiseLevel - 1|0;
		}
		return retObj;
	}
	function _NOCHECK_SPromise(func){
		// simple/super/speedy/synchronous promise
		var retVal, stage=0, thenFuncs = null, catchFuncs = null, finallies = null, retObj = new SPromise_construct(
			function(tFunc, cFunc){
				if (DEBUGMODE){
					if (tFunc && typeof tFunc !== "function"){
						console.error(Object.prototype.toString.call(tFunc) + " is not a valid function to be called after a successful promise");
					}
					if (cFunc && typeof cFunc !== "function"){
						console.error(Object.prototype.toString.call(cFunc) + " is not a valid function to be called after a rejected promise");
					}
				}

				if (stage === 0){
					// promise has not yet completed...
					return SPromise(function(accept, reject){
						var finalAcceptor = typeof tFunc === "function" ? function(){accept(tFunc(retVal));} : accept;
						var finalRejector = typeof cFunc === "function" ? function(){reject(cFunc(retVal));} : reject;
						
						if (thenFuncs !== null) {
							if (typeof thenFuncs === "function") {
								thenFuncs = [ thenFuncs, finalAcceptor ];
							} else {
								thenFuncs.push(finalAcceptor);
							}
						} else thenFuncs = finalAcceptor;
						
						if (catchFuncs !== null) {
							if (typeof catchFuncs === "function") {
								catchFuncs = [ catchFuncs, finalRejector ];
							} else {
								catchFuncs.push(finalRejector);
							}
						} else catchFuncs = finalRejector;
					});
				} else try {
					return stage === 2 ? (
						typeof tFunc === "function" ? resolve( tFunc(retVal) ) : undefinedResolve
					) : (
						typeof cFunc === "function" ? _NOCHECK_reject( cFunc(retVal) ) : undefinedResolve
					);
				} catch(e) {return _NOCHECK_reject(e);}
			},
			function(cFunc){
				if (DEBUGMODE){
					if (cFunc && typeof cFunc !== "function"){
						console.error(Object.prototype.toString.call(cFunc) + " is not a valid function to be called after a rejected promise");
					}
				}
				/*if (cFunc) {
					if (catchFuncs !== null) catchFuncs.push(cFunc); else catchFuncs = [ cFunc ];
				}*/

				if (stage === 0){
					// promise has not yet completed...
					return SPromise(function(accept){
						if (catchFuncs !== null) {
							if (typeof catchFuncs === "function") {
								catchFuncs = [ catchFuncs, function(){accept(cFunc(retVal));} ];
							} else {
								catchFuncs.push(function(){accept(cFunc(retVal));});
							}
						} else catchFuncs = function(){accept(cFunc(retVal));};
						if (thenFuncs !== null) {
							if (typeof thenFuncs === "function") {
								thenFuncs = [ thenFuncs, accept ];
							} else {
								thenFuncs.push(accept);
							}
						} else thenFuncs = accept;
					});
				} else if (stage === 2) { // if success, then merely propagate the response transparently
					return resolve(retVal);
				} else try {
					return typeof cFunc === "function" ? resolve( cFunc(retVal) ) : undefinedResolve;
				} catch(e) {
					return _NOCHECK_reject(e);
				}
			},
			function(fFunc){
				if (DEBUGMODE){
					if (typeof fFunc !== "function"){
						console.error(Object.prototype.toString.call(fFunc) + " is not a valid function to be called 'finally' after promise");
					}
				}
				if (stage === 0) {
					if (finallies !== null) {
						if (typeof finallies === "function") {
							finallies = [ finallies, fFunc ];
						} else {
							finallies.push(fFunc);
						}
					} else finallies = fFunc;
				} else {
					fFunc();
				}
				return retObj; // transparently propagate events
			}
		);
		// stage undefined = unfulfilled
		// stage true = accepted
		// stage false = rejected
		// synchonously defered stacking allows for super performance
		function rejectP(x){
			if (stage === 0) {
				retVal = x;
				stage = 1;
				if (catchFuncs !== null) {
					if (typeof catchFuncs === "function") {
						catchFuncs(x);
					} else {
						catchFuncs.forEach(proxy, x);
					}
					catchFuncs  = null;
				}
				thenFuncs = null;
				if (finallies !== null)	{
					if (typeof finallies === "function") {
						finallies();
					} else {
						finallies.forEach(exec);
					}
					finallies  = null;
				}
			}
		}
		try {
			func(function acceptP(x){
				// This specific order should allow for max GZip compression
				if (stage === 0) {
					if (isPromise(x)) {
						x.then(acceptP, rejectP); // wait for further commitment to resolve
					} else {
						retVal = x;
						stage = 2;
						if (thenFuncs !== null)	{
							if (typeof thenFuncs === "function") {
								thenFuncs(x);
							} else {
								thenFuncs.forEach(proxy, x);
							}
							thenFuncs  = null;
						}
						if (finallies !== null)	{
							if (typeof finallies === "function") {
								finallies();
							} else {
								finallies.forEach(exec);
							}
							finallies  = null;
						}
						catchFuncs = null;
					}
				}
			}, rejectP);
		} catch(e) {rejectP(e);}
		return retObj;
	}
	function resolve(val){
		//if (isPromise(val)) {
		if (typeof val === "object" && val !== null && typeof val["then"] === "function") { // this is such a hot function that I decided to inline the call to isPromise
			return val/*_NOCHECK_SPromise(function(accept, reject) {
				val.then(accept, reject);
			})*/;
		}
		var curObj = new SPromise_construct(
			function(f){
				// synchonously defered stacking allows for super performance
				if (typeof f !== "function") return curObj;
				if (isInsidePromise === true) {
					return _NOCHECK_SPromise(function(accept, reject){
						persuadoStack.push(
							function(){
								try {
									/*var maybePromise = f(val);
									if (isPromise(maybePromise)) {
										maybePromise.then(accept);
									} else {
										accept(maybePromise);
									}*/
									accept( f(val) );
								} catch(e) {
									reject(e);
								}
							}//, null, null
						);
						pStackLength = pStackLength + 1|0;//+= 3;
					});
				} else {
					promiseLevel = promiseLevel + 1|0;
					var newVal = null;
					try {
						if (isInsidePromise = promiseLevel === promiseBufferLvl){
							persuadoStack.push(function(){ f(val); });
						} else {
							newVal = f(val);
							if (isInsidePromise === true && promiseLevel === 1) { // if this is the outermost promise
								resolvePends();
							}
						}
					} catch(e) {
						return _NOCHECK_reject(e);
					} finally {promiseLevel = promiseLevel - 1|0;}
					return _NOCHECK_resolve(newVal);
				}
			},
			function(){return curObj;},
			function(f){
				// synchonously defered stacking allows for super performance
				if (typeof f === "function") {
					if (isInsidePromise === true) {
						persuadoStack.push(
							f//, null, null 
						);
						pStackLength = pStackLength + 1|0;
					} else {
						promiseLevel = promiseLevel + 1|0;
						try {
							if (isInsidePromise = promiseLevel === promiseBufferLvl){
								f();
								isInsidePromise = false;
							} else {
								f();
								if (isInsidePromise === true && promiseLevel === 1) { // if this is the outermost promise
									resolvePends();
								}
							}
						} catch(e) {
							return _NOCHECK_reject(e);
						} finally {promiseLevel = promiseLevel - 1 |0;}
					}
				}
				return curObj;
			}
		);
		return curObj;
	}
	function _NOCHECK_resolve(val){
		if (typeof val === "object" && val !== null && typeof val["then"] === "function") { // this is such a hot function that I decided to inline the call to isPromise
			return val;
		}
		// Only perform the check half the time. It greatly boosts performance because most times very few promise levels are used.
		var curObj = new SPromise_construct(
			function(thenFunc){
				try {
					return typeof thenFunc === "function" ? resolve( thenFunc(val) ) : undefinedResolve;
				} catch(e) {
					return _NOCHECK_reject(e);
				}
			},
			function(){return curObj;},
			function(f) {
				try {
					typeof f === "function" && f();
				} catch(e) {
					return _NOCHECK_reject(e);
				}
				return curObj;
			}
		);
		return curObj;
	};
	SPromise["resolve"] = _NOCHECK_resolve;
	function _NOCHECK_reject(val){
		if (typeof val === "object" && val !== null && typeof val["then"] === "function") { // this is such a hot function that I decided to inline the call to isPromise
			return val;
		}
		var curObj = new SPromise_construct(
			function(thenFunc, catchFunc){
				try {
					return typeof catchFunc === "function" ? resolve( catchFunc(val) ) : undefinedResolve;
				} catch(e) {
					return _NOCHECK_reject(e);
				}
			},
			function(f){
				// synchonously defered stacking allows for super performance
				try {
					// .catch succeeds by default
					return typeof f === "function" ? resolve(f(val)) : undefinedResolve;
				} catch(e) {
					return _NOCHECK_reject(e);
				}
			},
			function(f) {
				try {
					typeof f === "function" && f();
				} catch(e) {
					return _NOCHECK_reject(e);
				}
				return curObj;
			}
		);
		return curObj;
	}
	SPromise["reject"] = _NOCHECK_reject; // There is no need for a checking version of reject because of its limited lifespan
	var hasWarnedAboutArguments = false;
	function maybeWarnAboutArguments(promisesArray, name) {
		if (DEBUGMODE){
			if (typeof promisesArray !== "object" || typeof promisesArray.forEach !== "function"){
				// check to see if it is an array or an iterable object
				console.error(Object.prototype.toString.call(promisesArray) + " is not a valid iterable array of promises. If you are using an array-like object, you must call Array.prototype.slice.call on the object before passing it to SPromise." + name);
				return undefinedResolve;
			}
		}
	}
	SPromise["race"] = function(promisesArray){
		if (DEBUGMODE){
			maybeWarnAboutArguments(promisesArray, "race");
			if (!hasWarnedAboutArguments && !promisesArray.length){
				hasWarnedAboutArguments = true;
				console.warn(Object.prototype.toString.call(promisesArray) + " is an empty array of promises passed to SPromise");
			}
		}
		return SPromise(function(accept, reject){
			var unFurfilled = 1, index=0, Cur;
			function acceptionCondition(Val){
				if (unFurfilled) unFurfilled = 0, accept(Val);
			}
			function rejectionCondition(Val){
				if (unFurfilled) unFurfilled = 0, reject(Val);
			}
			for (; index<promisesArray.length && unFurfilled; index=index+1|0) {
				if (isPromise(Cur = promisesArray[index])) {
					Cur.then(acceptionCondition, rejectionCondition);
				} else acceptionCondition(Cur); // exit early
			}
		});
	};
	SPromise["all"] = function(promisesArray){
		if (DEBUGMODE) maybeWarnAboutArguments(promisesArray, "all");
		
		return SPromise(function(accept, reject){
			function attachListener(index){
				curItem.then(function(val){
					resultingValues[index|0] = val;
					leftToGo = leftToGo - 1|0;
					if (leftToGo === 0) accept( resultingValues );
				}, function(reason){
					if (leftToGo > 0){
						leftToGo = -1;
						reject(reason);
					}
				});
			}
			var lastValue = null, len=promisesArray.length|0, leftToGo = len, resultingValues = [], index=0, curItem;
			for (; index < len; index = index + 1|0)
				if (isPromise(curItem = promisesArray[index])) {
					resultingValues[index] = lastValue;
					attachListener( index );
				} else {
					leftToGo = leftToGo - 1|0;
					resultingValues[index] = lastValue = curItem;
				}
			if (leftToGo === 0) accept( resultingValues );
		});
	};
	if (typeof module !== "undefined") {
		module["exports"] = SPromise;
	} else {
		window["SPromise"] = SPromise;
	}
})(typeof self === "undefined" ? this || global : self);

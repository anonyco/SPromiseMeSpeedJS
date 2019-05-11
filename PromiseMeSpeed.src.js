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
		return typeof x === "object" && x !== null && typeof x["then"] === "function" /*&& typeof x["catch"] === "function" && typeof x["finally"] === "function"*/;
	};
	var promiseLevel = 0;
	var isInsidePromise = false; // because javascript is single threaded, we can use this to determine if there is an outermost promise
	var pStackLength = 0;		 // the current size of the persuadoStack
	var _Symbol_toStringTag = typeof Symbol !== "undefined" && Symbol.toStringTag;

	function resolvePends(){
		if (pStackLength) {
			do {
				isInsidePromise = false;
				persuadoStack.shift()();
			} while (--pStackLength);
		}
		isInsidePromise = false;
	}

	function SPromise(func){
		// simple/super/speedy/synchronous promise
		var retVal, stage=0, thenFuncs = null, catchFuncs = null, finallies = null,  retObj = {
			"then": function(tFunc, cFunc){
				if (DEBUGMODE){
					if (tFunc && typeof tFunc !== "function"){
						console.error(Object.prototype.toString.call(tFunc) + " is not a valid function to be called after a successful promise");
					}
					if (cFunc && typeof cFunc !== "function"){
						console.error(Object.prototype.toString.call(cFunc) + " is not a valid function to be called after a rejected promise");
					}
				}

				/*return _NOCHECK_SPromise(function(accept, reject){
					if (stage === 0){
						if (typeof tFunc === "function"){
							if (thenFuncs !== null) {
								if (typeof thenFuncs === "function") {
									thenFuncs = [ thenFuncs, function(){accept(tFunc(retVal));} ];
								} else {
									thenFuncs.push(function(){accept(tFunc(retVal));});
								}
							} else thenFuncs = function(){accept(tFunc(retVal));};
						}
						if (typeof cFunc === "function") {
							if (catchFuncs !== null) {
								if (typeof catchFuncs === "function") {
									catchFuncs = [ catchFuncs, function(){accept(cFunc(retVal));} ];
								} else {
									catchFuncs.push(function(){accept(cFunc(retVal));});
								}
							} else catchFuncs = function(){accept(cFunc(retVal));};
						}
					} else if (stage === 2) {
						if (tFunc) accept( tFunc(retVal) );
					} else { // if (stage === 1)
						if (cFunc) reject( cFunc(retVal) );
					}
				});*/
				if (stage === 0){
					// promise has not yet completed...
					return _NOCHECK_SPromise(function(accept, reject){
						if (typeof tFunc === "function"){
							if (thenFuncs !== null) {
								if (typeof thenFuncs === "function") {
									thenFuncs = [ thenFuncs, function(){accept(tFunc(retVal));} ];
								} else {
									thenFuncs.push(function(){accept(tFunc(retVal));});
								}
							} else thenFuncs = function(){accept(tFunc(retVal));};
						}
						if (typeof cFunc === "function") {
							if (catchFuncs !== null) {
								if (typeof catchFuncs === "function") {
									catchFuncs = [ catchFuncs, function(){accept(cFunc(retVal));} ];
								} else {
									catchFuncs.push(function(){accept(cFunc(retVal));});
								}
							} else catchFuncs = function(){accept(cFunc(retVal));};
						}
					});
				} else try {
					var maybeInnerPromise = null;
					if (stage === 2) {
						if (typeof tFunc === "function") {
							maybeInnerPromise = tFunc(retVal);
						}
					} else { // if (stage === 1)
						if (typeof cFunc === "function") {
							maybeInnerPromise = _NOCHECK_reject( cFunc(retVal) );
						}
					}
					return isPromise(maybeInnerPromise) ? maybeInnerPromise : _NOCHECK_resolve(maybeInnerPromise);
				} catch(e) {return _NOCHECK_reject(e);}
			},
			"catch": function(cFunc){
				if (DEBUGMODE){
					if (cFunc && typeof cFunc !== "function"){
						console.error(Object.prototype.toString.call(cFunc) + " is not a valid function to be called after a rejected promise");
					}
				}
				/*if (cFunc) {
					if (catchFuncs !== null) catchFuncs.push(cFunc); else catchFuncs = [ cFunc ];
				}*/

				/*return _NOCHECK_SPromise(function(accept){
					if (stage === 0){
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
					} else {
						accept( stage === 2 ? retVal : cFunc( retVal ) );
					}
				});*/
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
						} else thenFuncs = accept
					});
				} else if (stage === 2) { // if success, then merely propagate the response transparently
					return _NOCHECK_resolve(retVal);
				} else {
					try {
						var maybeInnerPromise = cFunc( retVal )
						return isPromise(maybeInnerPromise) ? maybeInnerPromise : _NOCHECK_resolve( maybeInnerPromise );
					} catch(e) {
						return _NOCHECK_reject(e);
					}
				}
			},
			"finally": function(fFunc){
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
				} else try {
					fFunc();
				} catch(e) {
					return _NOCHECK_reject(e);
				}
				return retObj;
			}
		};
		if (_Symbol_toStringTag !== false) retObj[_Symbol_toStringTag] = "Promise"; // to disguise SPromise as internal
		// stage undefined = unfulfilled
		// stage true = accepted
		// stage false = rejected

		function acceptP(x){
			// This specific order should allow for max GZip compression
			if (stage === 0) {
				if (isPromise(x)) {
					x.then(acceptP, rejectP); // wait for further commitment to resolve
					return;
				}
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
		if (isInsidePromise) {
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
			if (promiseLevel === promiseBufferLvl){
				isInsidePromise = true;
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
				if (isInsidePromise && promiseLevel === 1) { // if this is the outermost promise
					resolvePends();
				}
			}
			promiseLevel = promiseLevel - 1|0;
		}
		return retObj;
	}
	function _NOCHECK_SPromise(func){
		// simple/super/speedy/synchronous promise
		var retVal, stage=0, thenFuncs = null, catchFuncs = null, finallies = null, retObj = {
			"then": function(tFunc, cFunc){
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
						if (typeof tFunc === "function"){
							if (thenFuncs !== null) {
								if (typeof thenFuncs === "function") {
									thenFuncs = [ thenFuncs, function(){accept(tFunc(retVal));} ];
								} else {
									thenFuncs.push(function(){accept(tFunc(retVal));});
								}
							} else thenFuncs = function(){accept(tFunc(retVal));};
						}
						if (typeof cFunc === "function") {
							if (catchFuncs !== null) {
								if (typeof catchFuncs === "function") {
									catchFuncs = [ catchFuncs, function(){accept(cFunc(retVal));} ];
								} else {
									catchFuncs.push(function(){accept(cFunc(retVal));});
								}
							} else catchFuncs = function(){accept(cFunc(retVal));};
						}
					});
				} else try {
					var maybeInnerPromise = null;
					if (stage === 2) {
						if (typeof tFunc === "function") {
							maybeInnerPromise = tFunc(retVal);
						}
					} else { // if (stage === 1)
						if (typeof cFunc === "function") {
							maybeInnerPromise = _NOCHECK_reject( cFunc(retVal) );
						}
					}
					return isPromise(maybeInnerPromise) ? maybeInnerPromise : resolve(maybeInnerPromise);
				} catch(e) {return _NOCHECK_reject(e);}
			},
			"catch": function(cFunc){
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
						} else thenFuncs = accept
					});
				} else if (stage === 2) { // if success, then merely propagate the response transparently
					return resolve(retVal);
				} else try {
					var maybeInnerPromise = cFunc( retVal )
					return isPromise(maybeInnerPromise) ? maybeInnerPromise : resolve( maybeInnerPromise );
				} catch(e) {
					return _NOCHECK_reject(e);
				}
			},
			"finally": function(fFunc){
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
				return retObj;
			}
		};
		if (_Symbol_toStringTag !== false) retObj[_Symbol_toStringTag] = "Promise"; // to disguise SPromise as internal
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
			func(function(x){ // acceptP
				// This specific order should allow for max GZip compression
				if (stage === 0) {
					if (isPromise(x)) {
						x.then(acceptP, rejectP); // wait for further commitment to resolve
						return;
					}
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
			}, rejectP);
		} catch(e) {rejectP(e);}
		return retObj;
	}
	function resolve(val){
		if (isPromise(val)) {
			return _NOCHECK_SPromise(function(accept, reject) {
				val.then(accept, reject);
			});
		}
		var curObj = {
			"then": function(f){
				// synchonously defered stacking allows for super performance
				if (isInsidePromise) {
					return _NOCHECK_SPromise(function(accept, reject){
						persuadoStack.push(
							function(){
								try {
									var maybePromise = f(val);
									if (isPromise(maybePromise)) {
										maybePromise.then(accept, reject);
									} else {
										accept(maybePromise);
									}
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
						if (promiseLevel === promiseBufferLvl){
							isInsidePromise = true;
							newVal = f(val);
						} else {
							newVal = f(val);
							if (isInsidePromise && promiseLevel === 1) { // if this is the outermost promise
								resolvePends();
							}
						}
					} catch(e) {
						return _NOCHECK_reject(e);
					} finally {promiseLevel = promiseLevel - 1|0}
					return isPromise(newVal) ? newVal : _NOCHECK_resolve(newVal);
				}
			},
			"catch": function(){return curObj},
			"finally": function(f){
				// synchonously defered stacking allows for super performance
				if (isInsidePromise) {
					persuadoStack.push(
						f//, null, null 
					);
					pStackLength = pStackLength + 1|0;//+= 3;
				} else {
					promiseLevel = promiseLevel + 1|0;
					try {
						if (promiseLevel === promiseBufferLvl){
							isInsidePromise = true;
							f();
							isInsidePromise = false;
						} else {
							f();
							if (isInsidePromise && promiseLevel === 1) { // if this is the outermost promise
								resolvePends();
							}
						}
					} catch(e) {
						return _NOCHECK_reject(e);
					} finally {promiseLevel = promiseLevel - 1 |0}
				}
				return curObj;
			}
		};
		if (_Symbol_toStringTag !== false) curObj[_Symbol_toStringTag] = "Promise"; // to disguise SPromise as internal
		return curObj;
	};
	function _NOCHECK_resolve(val){
		if (isPromise(val)) {
			return _NOCHECK_SPromise(function(accept, reject) {
				val.then(accept, reject);
			});
		}
		// Only perform the check half the time. It greatly boosts performance because most times very few promise levels are used.
		var curObj = {
			"then": function(f){
				try {
					var maybePromise = f(val);
					return isPromise(maybePromise) ? maybePromise : resolve(maybePromise);
				} catch(e) {
					return _NOCHECK_reject(e);
				}
			},
			"finally": function(f){
				try {
					f();
				} catch(e) {
					return _NOCHECK_reject(e);
				}
				return curObj;
			},
			"catch": function(){return curObj}
		};
		if (_Symbol_toStringTag !== false) curObj[_Symbol_toStringTag] = "Promise"; // disguise SPromise as internal
		return curObj;
	};
	SPromise["resolve"] = _NOCHECK_resolve;
	function _NOCHECK_reject(val){
		var curObj = {
			"then": function(thenFunc, catchFunc){
				try {
					var maybePromise = typeof catchFunc === "function" ? catchFunc(val) : curObj;
					return isPromise(maybePromise) ? maybePromise : resolve(maybePromise);
				} catch(e) {
					return _NOCHECK_reject(e);
				}
			},
			"finally": function(f){
				try {
					f();
				} catch(e) {
					return _NOCHECK_reject(e);
				}
				return curObj;
			},
			"catch": function(f){
				// synchonously defered stacking allows for super performance
				try {
					// .catch succeeds by default
					var maybePromise = f(val);
					return isPromise(maybePromise) ? maybePromise : resolve(maybePromise);
				} catch(e) {
					return _NOCHECK_reject(e);
				}
			}
		};
		if (_Symbol_toStringTag !== false) curObj[_Symbol_toStringTag] = "Promise"; // to disguise SPromise as internal
		return curObj;
	};
	SPromise["reject"] = _NOCHECK_reject; // There is no need for a checking version of reject because of its limited lifespan
	var hasWarnedAboutArguments = false;
	SPromise["race"] = function(promisesArray){
		if (DEBUGMODE){
			if (!promisesArray || !promisesArray.forEach){
				// check to see if it is an array or an iterable object
				console.error(Object.prototype.toString.call(promisesArray) + " is not a valid iterable array of promises. If you are using an array-like object, then you must call Array.prototype.slice.call on the object before passing it to SPromise.race.");
				return resolve();
			}
			if (!hasWarnedAboutArguments && !promisesArray.length){
				hasWarnedAboutArguments = true;
				console.warn(Object.prototype.toString.call(promisesArray) + " is an empty array of promises passed to SPromise")
			}
		}
		return SPromise(function(accept, reject){
			var furfilled = false;
			for (var index=0; index<promisesArray.length; index=index+1|0) {
				var Cur = promisesArray[index];
				if (isPromise(Cur)) {
					Cur.then(function(Val){
						if (furfilled === false) {
							furfilled = true;
							accept(Val);
						} 
					}, function(Val){
						if (furfilled === false) {
							furfilled = true;
							reject(Val);
						} 
					});
					if (furfilled) {
						// if the promise is already furfilled, then exit early
						return;
					}
				} else {
					furfilled = true;
					accept( Cur );
					return; // exit early
				} 
			}
		});
	};
	SPromise["all"] = function(promisesArray){
		if (DEBUGMODE){
			if (!promisesArray || !promisesArray.forEach){
				// check to see if it is an array or an iterable object
				console.error(Object.prototype.toString.call(promisesArray) + " is not a valid iterable array of promises. If you are using an array-like object, then you must call Array.prototype.slice.call on the object before passing it to SPromise.all.");
				return resolve();
			}
		}
		return SPromise(function(accept, reject){
			var leftToGo = 0, resultingValues = [];
			for (var index=0; index < promisesArray.length; index = index + 1|0) {
				var Cur = promisesArray[ index ];
				if (isPromise(Cur)) {
					leftToGo = leftToGo + 1|0;
					Cur.then(function(Val){
						resultingValues[index] = Val;
						leftToGo = leftToGo - 1|0;
						if (leftToGo === 0){
							accept( resultingValues );
						}
					}, function(reason){
						if (leftToGo > 0){
							leftToGo = -1;
							reject(reason);
						}
					});
				} else {
					resultingValues[index] = Cur;
				}
			}
			if (!leftToGo){
				accept( resultingValues );
			}
		});
	};
	window["SPromise"] = SPromise;
})(typeof self === "undefined" ? this : self);

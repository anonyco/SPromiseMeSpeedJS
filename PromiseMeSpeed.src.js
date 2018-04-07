// The javascript promise library that promises you SPEED, and lots of it
(typeof self === "undefined" ? this : self)["SPromise"] = (function(){
	"use strict";
	// the reason I use a variable like this is because closure compiler automatically inlines and optimizes it
	///////////////////////
	const DEBUGMODE = true;
	///////////////////////
	const persuadoStack = []; // Defered loading of promises to outermost promise scope so as to not exceed the stack level
	const proxy = function(func){func(this)};
	const exec = function(x){x()};
	const promiseBufferLvl = 128; // length of the promise buffer for double stack buffering
	const isPromise = _NOCHECK_SPromise["isPromise"] = function(x){ // determines whether something is able to be used as a promise
		return !!x && typeof x["then"] === "function" && typeof x["catch"] === "function" && typeof x["finally"] === "function";
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

				return _NOCHECK_SPromise(function(accept, reject){
					if (stage === 0){
						if (tFunc){
							if (thenFuncs !== null) {
								if (typeof thenFuncs === "function") {
									thenFuncs = [ thenFuncs, function(){accept(tFunc(retVal))} ];
								} else {
									thenFuncs.push(function(){accept(tFunc(retVal))});
								}
							} else thenFuncs = function(){accept(tFunc(retVal))};
						}
						if (cFunc) {
							if (catchFuncs !== null) {
								if (typeof catchFuncs === "function") {
									catchFuncs = [ catchFuncs, function(){accept(cFunc(retVal))} ];
								} else {
									catchFuncs.push(function(){accept(cFunc(retVal))});
								}
							} else catchFuncs = function(){accept(cFunc(retVal))};
						}
					} else if (stage === 2) {
						if (tFunc) accept( tFunc(retVal) );
					} else { // if (stage === 1)
						if (cFunc) reject( cFunc(retVal) );
					}
				});
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

				return _NOCHECK_SPromise(function(accept){
					if (stage === 0){
						if (catchFuncs !== null) {
							if (typeof catchFuncs === "function") {
								catchFuncs = [ catchFuncs, function(){accept(cFunc(retVal))} ];
							} else {
								catchFuncs.push(function(){accept(cFunc(retVal))});
							}
						} else catchFuncs = function(){accept(cFunc(retVal))};
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
				});
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

		function acceptP(x){
			// This specific order should allow for max GZip compression
			if (stage === 0) {
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
				func.bind(null, acceptP, rejectP)
			);
			pStackLength ++;//+= 3;
		} else {
			++promiseLevel;
			if (promiseLevel === promiseBufferLvl){
				isInsidePromise = true;
				func(acceptP, rejectP);
			} else {
				func(acceptP, rejectP);
				if (isInsidePromise && promiseLevel === 1) { // if this is the outermost promise
					resolvePends();
				}
			}
			--promiseLevel;
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

				return SPromise(function(accept, reject){
					if (stage === 0){
						if (tFunc){
							if (thenFuncs !== null) {
								if (typeof thenFuncs === "function") {
									thenFuncs = [ thenFuncs, function(){accept(tFunc(retVal))} ];
								} else {
									thenFuncs.push(function(){accept(tFunc(retVal))});
								}
							} else thenFuncs = function(){accept(tFunc(retVal))};
						}
						if (cFunc) {
							if (catchFuncs !== null) {
								if (typeof catchFuncs === "function") {
									catchFuncs = [ catchFuncs, function(){accept(cFunc(retVal))} ];
								} else {
									catchFuncs.push(function(){accept(cFunc(retVal))});
								}
							} else catchFuncs = function(){accept(cFunc(retVal))};
						}
					} else if (stage === 2) {
						if (tFunc) accept( tFunc(retVal) );
					} else { // if (stage === 1)
						if (cFunc) reject( cFunc(retVal) );
					}
				});
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

				return SPromise(function(accept){
					if (stage === 0){
						if (catchFuncs !== null) {
							if (typeof catchFuncs === "function") {
								catchFuncs = [ catchFuncs, function(){accept(cFunc(retVal))} ];
							} else {
								catchFuncs.push(function(){accept(cFunc(retVal))});
							}
						} else catchFuncs = function(){accept(cFunc(retVal))};
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
				});
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
		func(function(x){ // acceptP
			// This specific order should allow for max GZip compression
			if (stage === 0) {
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
		}, function(x){ // rejectP
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
		});
		return retObj;
	}
	function resolve(val){
		var curObj = {
			"then": function(f){
				// synchonously defered stacking allows for super performance
				if (isInsidePromise) {
					return _NOCHECK_SPromise(function(accept, reject){
						persuadoStack.push(
							function(){ accept(f(val)) }//, null, null
						);
						pStackLength ++;//+= 3;
					});
				} else {
					++promiseLevel;
					if (promiseLevel === promiseBufferLvl){
						isInsidePromise = true;
						var newVal = f(val);
					} else {
						var newVal = f(val);
						if (isInsidePromise && promiseLevel === 1) { // if this is the outermost promise
							resolvePends();
						}
					}
					--promiseLevel;
					return _NOCHECK_resolve(newVal);
				}
			},
			"finally": function(f){
				// synchonously defered stacking allows for super performance
				if (isInsidePromise) {
					persuadoStack.push(
						f//, null, null 
					);
					pStackLength ++;//+= 3;
				} else {
					++promiseLevel;
					if (promiseLevel === promiseBufferLvl){
						isInsidePromise = true;
						f();
					} else {
						f();
						if (isInsidePromise && promiseLevel === 1) { // if this is the outermost promise
							resolvePends();
						}
					}
					--promiseLevel;
				}
				return curObj;
			},
			"catch": function(){return curObj}
		};
		if (_Symbol_toStringTag !== false) curObj[_Symbol_toStringTag] = "Promise"; // to disguise SPromise as internal
		return curObj;
	};
	function _NOCHECK_resolve(val){
		// Only perform the check half the time. It greatly boosts performance because most times very few promise levels are used.
		var curObj = {
			"then": function(f){
				return resolve(f(val));
			},
			"finally": function(f){
				return curObj;
			},
			"catch": function(){return curObj}
		};
		if (_Symbol_toStringTag !== false) curObj[_Symbol_toStringTag] = "Promise"; // disguise SPromise as internal
		return curObj;
	};
	_NOCHECK_SPromise["resolve"] = _NOCHECK_resolve;
	function _NOCHECK_reject(val){
		var curObj = {
			"then": function(thenFunc, catchFunc){
				return catchFunc ? resolve(catchFunc(val)) : curObj;
			},
			"finally": function(f){
				return curObj;
			},
			"catch": function(f){
				// synchonously defered stacking allows for super performance
				return resolve(f(val));
			}
		};
		if (_Symbol_toStringTag !== false) curObj[_Symbol_toStringTag] = "Promise"; // to disguise SPromise as internal
		return curObj;
	};
	_NOCHECK_SPromise["reject"] = _NOCHECK_reject; // There is no need for a checking version of reject because of its limited lifespan
	var hasWarnedAboutArguments = false;
	_NOCHECK_SPromise["race"] = function(promisesArray){
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
			promisesArray.forEach(function(Cur){
				if (furfilled !== false) return;
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
                } else {
					furfilled = true;
					accept(Cur);
				} 
			});
		});
	}
	_NOCHECK_SPromise["all"] = function(promisesArray){
		if (DEBUGMODE){
			if (!promisesArray || !promisesArray.forEach){
				// check to see if it is an array or an iterable object
				console.error(Object.prototype.toString.call(promisesArray) + " is not a valid iterable array of promises. If you are using an array-like object, then you must call Array.prototype.slice.call on the object before passing it to SPromise.all.");
				return resolve();
			}
		}
		return SPromise(function(accept, reject){
			var leftToGo = 0, resultingValues = [];
			promisesArray.forEach(function(Cur, index){
				if (isPromise(Cur)){
                    leftToGo++;
                    Cur.then(function(Val){
                        resultingValues[index] = Val;
                        if (!--leftToGo){
                            accept(Val);
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
			});
			if (!leftToGo){
				accept(resultingValues);
            }
		});
	}
	return _NOCHECK_SPromise;
})();
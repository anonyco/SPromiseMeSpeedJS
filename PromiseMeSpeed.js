// The javascript promise library that promises you SPEED, and lots of it
(function(){
	"use strict";
	// the reason I use a variable like this is because closure compiler automatically inlines and optimizes it
	///////////////////////
	const DEBUGMODE = true;
	///////////////////////
	const persuadoStack = []; // Defered loading of promises to outermost promise scope so as to not exceed the stack level
	const proxy = function(func){func(this)};
	const exec = function(x){x()};
	const promiseBufferLvl = 256; // length of the promise buffer for double stack buffering
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
		// stage undefined = unfulfilled
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
			pStackLength ++;//+= 3;
		} else {
			if (promiseLevel === promiseBufferLvl){
				isInsidePromise = true;
				func(acceptP, rejectP);
			} else {
				++promiseLevel;
				func(acceptP, rejectP);
				if (promiseLevel === 1) { // if this is the outermost promise
					if (pStackLength) {
						do {
							isInsidePromise = false;
							persuadoStack.shift()();
						} while (--pStackLength);
					}
					isInsidePromise = false;
				}
				--promiseLevel;
			}
		}
		var retObj = {
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
					if (stage === undefined){
						if (tFunc){
							if (thenFuncs !== null)  thenFuncs.push(tFunc);	 else thenFuncs	 = [ tFunc ];
						}
						if (cFunc) {
							if (catchFuncs !== null) catchFuncs.push(cFunc); else catchFuncs = [ cFunc ];
						}
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
						console.error(Object.prototype.toString.call(cFunc) + " is not a valid function to be called after a rejected promise");
					}
				}
				if (cFunc) {
					if (catchFuncs !== null) catchFuncs.push(cFunc); else catchFuncs = [ cFunc ];
				}

				return SPromise(function(accept, reject){
					if (stage === undefined){
						if (cFunc) catchFuncs.push(function(){return reject(cFunc(retVal))});
					} else {
						if (cFunc) reject( cFunc(retVal) );
					}
				});
			},
			"finally": function(fFunc){
				if (DEBUGMODE){
					if (typeof fFunc !== "function"){
						console.error(Object.prototype.toString.call(fFunc) + " is not a valid function to be called 'finally' after promise");
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
							function(){ accept(f(val)) }//, null, null
						);
						pStackLength ++;//+= 3;
					});
				} else {
					if (promiseLevel === promiseBufferLvl){
						isInsidePromise = true;
						var newVal = f(val);
					} else {
						++promiseLevel;
						var newVal = f(val);
						if (promiseLevel === 1) { // if this is the outermost promise
							if (pStackLength) {
								do {
									isInsidePromise = false;
									persuadoStack.shift()();
								} while (--pStackLength);
							}
							isInsidePromise = false;
						}
						--promiseLevel;
					}
					return resolve(newVal);
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
					if (promiseLevel === promiseBufferLvl){
						isInsidePromise = true;
						f();
					} else {
						++promiseLevel;
						f();
						if (promiseLevel === 1 && isInsidePromise) { // if this is the outermost promise
							do {
								isInsidePromise = false;
								persuadoStack.shift()();
							} while (--pStackLength);
							isInsidePromise = false;
						}
						--promiseLevel;
					}
				}
				return curObj;
			},
			"catch": function(){return curObj}
		}
		return curObj;
	};
	SPromise["reject"] = function reject(val){
		var curObj = {
			"then": function(){return curObj},
			"finally": function(f){
				// synchonously defered stacking allows for super performance
				if (isInsidePromise) {
					persuadoStack.push(
						f//, null, null 
					);
					pStackLength ++;//+= 3;
				} else {
					if (promiseLevel === promiseBufferLvl){
						isInsidePromise = true;
						f();
					} else {
						++promiseLevel;
						f();
						if (promiseLevel === 1) { // if this is the outermost promise
							if (pStackLength) {
								do {
									isInsidePromise = false;
									persuadoStack.shift()();
								} while (--pStackLength);
							}
							isInsidePromise = false;
						}
						--promiseLevel;
					}
				}
				return curObj;
			},
			"catch": function(f){
				// synchonously defered stacking allows for super performance
				if (isInsidePromise) {
					return SPromise(function(accept, reject){
						persuadoStack.push(
							function(){ accept(f(val)) }//, null, null
						);
						pStackLength ++;//+= 3;
					});
				} else {
					if (promiseLevel === promiseBufferLvl){
						isInsidePromise = true;
						var newVal = f(val);
					} else {
						++promiseLevel;
						var newVal = f(val);
						if (promiseLevel === 1) { // if this is the outermost promise
							if (pStackLength) {
								do {
									isInsidePromise = false;
									persuadoStack.shift()();
								} while (--pStackLength);
							}
							isInsidePromise = false;
						}
						--promiseLevel;
					}
					return reject(newVal);
				}
			}
		}
		return curObj;
	};
	var hasWarnedAboutArguments = false;
	SPromise["race"] = function(promisesArray){
		if (DEBUGMODE){
			if (!promisesArray || !promisesArray.forEach || !Array.prototype.every.call(promisesArray, function(x){return SPromise.isPromise(x)})){
				// check to see if it is an array or an iterable object
				console.error(Object.prototype.toString.call(promisesArray) + " is not a valid iterable array of promises. If you are using an array-like object, then you must call Array.prototype.slice.call on the object before passing it to SPromise.race.");
				return SPromise.resolve();
			}
			if (!hasWarnedAboutArguments && !promisesArray.length){
				hasWarnedAboutArguments = true;
				console.warn(Object.prototype.toString.call(promisesArray) + " is an empty array of promises passed to SPromise")
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
	SPromise["all"] = function(promisesArray){
		if (DEBUGMODE){
			if (!promisesArray || !promisesArray.forEach || !promisesArray.every || !promisesArray.every(function(x){return SPromise.isPromise(x)})){
				// check to see if it is an array or an iterable object
				console.error(Object.prototype.toString.call(promisesArray) + " is not a valid iterable array of promises. If you are using an array-like object, then you must call Array.prototype.slice.call on the object before passing it to SPromise.all.");
				return SPromise.resolve();
			}
		}
		return SPromise(function(accept, reject){
			var leftToGo = promisesArray.length;
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

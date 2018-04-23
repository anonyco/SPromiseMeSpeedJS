// The javascript promise library that promises you SPEED, and lots of it
// DO NOT INCLUDE THIS FILE OR RUN THIS IN THE GLOBAL SCOPE!!! YOUR CODE WILL BE SOOOO SLOOOOW!!!!
// Rather, insert the following directly into your code, but not in the global scope.
// The following will only be faster after being incorperated into your code via closure compiler minification.
// Otherwise, the following is a lot slower than the regular version of promiseMeSpeed.
"use strict";
const ENUM_SPROMISE_THEN = 0;
const ENUM_SPROMISE_CATCH = 1;
const ENUM_SPROMISE_FINALLY = 2;
const ENUM_SPROMISE_INDICATOR = 3;
// the reason I use a variable like this is because closure compiler automatically inlines and optimizes it
///////////////////////
const DEBUGMODE = false;
///////////////////////
const persuadoSPromiseStack = []; // Defered loading of promises to outermost promise scope so as to not exceed the stack level
const proxy = function(func){func(this)};
const exec = function(x){x()};
const promiseBufferLvl = 128; // length of the promise buffer for double stack buffering
const SPromiseIndicator = {};
const globalPromiseObject = Promise;
const SPromise_isPromise = function(x){ // determines whether something is able to be used as a promise
	return !!x && x[ENUM_SPROMISE_INDICATOR] === SPromiseIndicator || x.constructor === globalPromiseObject;
};
function SPromise_standardize(oldPromise){
	return (oldPromise[ENUM_SPROMISE_INDICATOR] === SPromiseIndicator) ? {
		"then":			oldPromise[ENUM_SPROMISE_THEN],
		"catch":		oldPromise[ENUM_SPROMISE_CATCH],
		"finally":		oldPromise[ENUM_SPROMISE_FINALLY],
		"constructor":	globalPromiseObject
	} : oldPromise;
}
function SPromise_fasterize(oldPromise){
	return (oldPromise[ENUM_SPROMISE_INDICATOR] !== SPromiseIndicator) ? [
		oldPromise["then"],		// ENUM_SPROMISE_THEN
		oldPromise["catch"],	// ENUM_SPROMISE_CATCH
		oldPromise["finally"],	// ENUM_SPROMISE_FINALLY
		SPromiseIndicator		// ENUM_SPROMISE_INDICATOR
	] : oldPromise;
}
var promiseLevel = 0;
var isInsidePromise = false; // because javascript is single threaded, we can use this to determine if there is an outermost promise
var pStackLength = 0;		 // the current size of the persuadoSPromiseStack

function SPromise(func){
	// simple/super/speedy/synchronous promise
	var retVal, stage=0, thenFuncs = null, catchFuncs = null, finallies = null,  retObj = [
		(tFunc, cFunc) => { // ENUM_SPROMISE_THEN
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
		cFunc => { // ENUM_SPROMISE_CATCH
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
			fFunc => { // ENUM_SPROMISE_FINALLY
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
			},
			SPromiseIndicator // ENUM_SPROMISE_INDICATOR
		];

		function acceptP(x){
			// This specific order should allow for max GZip compression
			if (stage === 0) {
				retVal = x;
				stage = 2;
				if (thenFuncs !== null)	{
					if (typeof thenFuncs === "function") {
						thenFuncs(x);
					} else {
						thenFuncs["forEach"](proxy, x);
					}
					thenFuncs  = null;
				}
				catchFuncs = null;
				if (finallies !== null)	{
					if (typeof finallies === "function") {
						finallies();
					} else {
						finallies["forEach"](exec);
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
						catchFuncs["forEach"](proxy, x);
					}
					catchFuncs  = null;
				}
				thenFuncs = null;
				if (finallies !== null)	{
					if (typeof finallies === "function") {
						finallies();
					} else {
						finallies["forEach"](exec);
					}
					finallies  = null;
				}
			}
		}
		// synchonously defered stacking allows for super performance
		if (isInsidePromise) {
			persuadoSPromiseStack.push(
				() => func(acceptP, rejectP)
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
					if (pStackLength) {
						do {
							isInsidePromise = false;
							persuadoSPromiseStack.shift()();
						} while (--pStackLength);
					}
					isInsidePromise = false;
				}
			}
			--promiseLevel;
		}
		return retObj;
	}
function SPromise_resolve(val){
	var curObj = [
		f => { // ENUM_SPROMISE_THEN
			// synchonously defered stacking allows for super performance
			if (isInsidePromise) {
				return SPromise((accept, reject) => {
					persuadoSPromiseStack.push(
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
						if (pStackLength) {
							do {
								isInsidePromise = false;
								persuadoSPromiseStack.shift()();
							} while (--pStackLength);
						}
						isInsidePromise = false;
					}
				}
				--promiseLevel;
				return SPromise_resolve(newVal);
			}
		},
		f => curObj, // ENUM_SPROMISE_CATCH
		f => { // ENUM_SPROMISE_FINALLY
			// synchonously defered stacking allows for super performance
			if (isInsidePromise) {
				persuadoSPromiseStack.push(
					f
				);
				pStackLength ++;
			} else {
				++promiseLevel;
				if (promiseLevel === promiseBufferLvl){
					isInsidePromise = true;
					f();
				} else {
					f();
					if (isInsidePromise && promiseLevel === 1) { // if this is the outermost promise
						if (pStackLength) {
							do {
								isInsidePromise = false;
								persuadoSPromiseStack.shift()();
							} while (--pStackLength);
						}
						isInsidePromise = false;
					}
				}
				--promiseLevel;
			}
			return curObj;
		},
		SPromiseIndicator // ENUM_SPROMISE_INDICATOR
	];
	return curObj;
};
function SPromise_reject(val){
	var curObj = [
		(thenFunc, catchFunc) => catchFunc ? SPromise_resolve(catchFunc(val)) : curObj,  // ENUM_SPROMISE_THEN
		f => SPromise_resolve(f(val)), // ENUM_SPROMISE_CATCH
		f => (f(), curObj), // ENUM_SPROMISE_FINALLY
		SPromiseIndicator // ENUM_SPROMISE_INDICATOR
	];
	return curObj;
};
var hasWarnedAboutArguments = false;
function SPromise_race(promisesArray){
	if (DEBUGMODE){
		if (!promisesArray || !promisesArray.forEach){
			// check to see if it is an array or an iterable object
			console.error(Object.prototype.toString.call(promisesArray) + " is not a valid iterable array of promises. If you are using an array-like object, then you must call Array.prototype.slice.call on the object before passing it to SPromise.race.");
			return SPromise_resolve();
		}
		if (!hasWarnedAboutArguments && !promisesArray.length){
			hasWarnedAboutArguments = true;
			console.warn(Object.prototype.toString.call(promisesArray) + " is an empty array of promises passed to SPromise")
		}
	}
	return SPromise((accept, reject) => {
		var furfilled = false;
		promisesArray["forEach"](function(Cur){
			if (furfilled !== false) return;
			if (SPromise_isPromise(Cur)) {
				(Cur[ENUM_SPROMISE_THEN] || Cur["then"])(Val => {
					if (furfilled === false) {
						furfilled = true;
						accept(Val);
					} 
				}, Val => {
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
function SPromise_all(promisesArray){
	if (DEBUGMODE){
		if (!promisesArray || !promisesArray["forEach"]){
			// check to see if it is an array or an iterable object
			console.error(Object.prototype.toString.call(promisesArray) + " is not a valid iterable array of promises. If you are using an array-like object, then you must call Array.prototype.slice.call on the object before passing it to SPromise.all.");
			return SPromise_resolve();
		}
	}
	return SPromise((accept, reject) => {
		var leftToGo = 0, resultingValues = [];
		promisesArray["forEach"]((Cur, index) => {
			if (SPromise_isPromise(Cur)){
				leftToGo++;
				(Cur[ENUM_SPROMISE_THEN] || Cur["then"])(Val => {
					resultingValues[index] = Val;
					if (!--leftToGo){
						accept(Val);
					}
				}, reason => {
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

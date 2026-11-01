// Copyright 2006 Erik Arvidsson
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
// 
//    http://www.apache.org/licenses/LICENSE-2.0
// 
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.


(function () { // hide from global scope

// Mozilla 1.8 has support for indexOf, lastIndexOf, forEach, filter, map, some, every
// http://developer-test.mozilla.org/docs/Core_JavaScript_1.5_Reference:Objects:Array:lastIndexOf
if (!Array.prototype.indexOf) {
  Array.prototype.indexOf = function (obj, fromIndex) {
    if (fromIndex == null) {
      fromIndex = 0;
    } else if (fromIndex < 0) {
      fromIndex = Math.max(0, this.length + fromIndex);
    }
    for (var i = fromIndex; i < this.length; i++) {
      if (this[i] === obj)
        return i;
    }
    return -1;
  };
}

// http://developer-test.mozilla.org/docs/Core_JavaScript_1.5_Reference:Objects:Array:lastIndexOf
if (!Array.prototype.lastIndexOf) {
  Array.prototype.lastIndexOf = function (obj, fromIndex) {
    if (fromIndex == null) {
      fromIndex = this.length - 1;
    } else if (fromIndex < 0) {
      fromIndex = Math.max(0, this.length + fromIndex);
    }
    for (var i = fromIndex; i >= 0; i--) {
      if (this[i] === obj)
        return i;
    }
    return -1;
  };
}


// http://developer-test.mozilla.org/docs/Core_JavaScript_1.5_Reference:Objects:Array:forEach
if (!Array.prototype.forEach) {
  Array.prototype.forEach = function (f, obj) {
    var l = this.length;  // must be fixed during loop... see docs
    for (var i = 0; i < l; i++) {
      f.call(obj, this[i], i, this);
    }
  };
}

// http://developer-test.mozilla.org/docs/Core_JavaScript_1.5_Reference:Objects:Array:filter
if (!Array.prototype.filter) {
  Array.prototype.filter = function (f, obj) {
    var l = this.length;  // must be fixed during loop... see docs
    var res = [];
    for (var i = 0; i < l; i++) {
      if (f.call(obj, this[i], i, this)) {
        res.push(this[i]);
      }
    }
    return res;
  };
}

// http://developer-test.mozilla.org/docs/Core_JavaScript_1.5_Reference:Objects:Array:map
if (!Array.prototype.map) {
  Array.prototype.map = function (f, obj) {
    var l = this.length;  // must be fixed during loop... see docs
    var res = [];
    for (var i = 0; i < l; i++) {
      res.push(f.call(obj, this[i], i, this));
    }
    return res;
  };
}

// http://developer-test.mozilla.org/docs/Core_JavaScript_1.5_Reference:Objects:Array:some
if (!Array.prototype.some) {
  Array.prototype.some = function (f, obj) {
    var l = this.length;  // must be fixed during loop... see docs
    for (var i = 0; i < l; i++) {
      if (f.call(obj, this[i], i, this)) {
        return true;
      }
    }
    return false;
  };
}

// http://developer-test.mozilla.org/docs/Core_JavaScript_1.5_Reference:Objects:Array:every
if (!Array.prototype.every) {
  Array.prototype.every = function (f, obj) {
    var l = this.length;  // must be fixed during loop... see docs
    for (var i = 0; i < l; i++) {
      if (!f.call(obj, this[i], i, this)) {
        return false;
      }
    }
    return true;
  };
}

// Part of
if (!String.prototype.quote) {
  String.prototype.quote = function () {
    return '"' + this.replace(/\\/g, "\\\\").replace(/\"/g, "\\\"") + '"';
  };
}


// Make generic versions of instance methods
var makeGeneric = [{
  "class": Array,
  methods: [
      "join",
      "reverse",
      "sort",
      "push",
      "pop",
      "shift",
      "unshift",
      "splice",
      "concat",
      "slice",
      "indexOf",
      "lastIndexOf",
      "forEach",
      "map",
      "filter",
      "some",
      "every"]
},
{
  "class": String,
  methods: [
      "quote",
      "substring",
      "toLowerCase",
      "toUpperCase",
      "charAt",
      "charCodeAt",
      "indexOf",
      "lastIndexOf",
      "toLocaleLowerCase",
      "toLocaleUpperCase",
      "localeCompare",
      "match",
      "search",
      "replace",
      "split",
      "substr",
      "concat",
      "slice"]
}];

function extend(constr, name) {
  if (!constr[name]) {
	constr[name] = function (s) {
      var args = Array.prototype.slice.call(arguments, 1);
      return constr.prototype[name].apply(s, args);
    };
  }
}

for (var i = 0; i < makeGeneric.length; i++) {
  var constr = makeGeneric[i]["class"];
  var methods = makeGeneric[i].methods;
  for (var j = 0; j < methods.length; j++) {
	extend(constr, methods[j]);
  }
}

})();

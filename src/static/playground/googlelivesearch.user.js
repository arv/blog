// Google Live Search Greasemonkey script
// version 0.1.2
// 2005-06-10
//
// Released under the GPL license: http://www.gnu.org/copyleft/gpl.html
// See http://erik.eae.net/archives/2005/06/10/22.21.42/
//
// Changelog:
// 2005-06-10 - Initial version
// 2005-06-10 - Added hash to the URI so that going back works better
// 2005-06-23 - Updating links to image seatrch and so on to go to the right page
//              Also made the scripting a bit more defensive in case someone used
//              innerHTML
//
// --------------------------------------------------------------------
//
// This is a Greasemonkey user script.
//
// To install, you need Greasemonkey: http://greasemonkey.mozdev.org/
// Then restart Firefox and revisit this script.
// Under Tools, there will be a new menu item to "Install User Script".
// Accept the default configuration and install.
//
// To uninstall, go to Tools/Manage User Scripts, select this script,
// and click Uninstall.
//
// --------------------------------------------------------------------
//
// ==UserScript==
// @name            Google Live Search
// @namespace       http://erik.eae.net/greasemonkey
// @description     Implements a live search for Google search page
// @include         http://www.google.*/*
// ==/UserScript==

var googleLiveSearch = {
	init: function () {
		var inputs = this.getInputs();
		if (inputs.length == 0) {
			return;
		}
		
		var loc = document.location;
		this.uriBase = loc.protocol + "//" + loc.hostname + "/search?q=";

		var hash = loc.hash;
		var q;
		if (/gls=([^;&]+)/.test(hash)) {
			q = RegExp.$1;
		}

		var self = this;
		this._onTimer = function (e) { self.onTimer(); };
		for (var i = inputs.length - 1; i >= 0; i--) {
			if (q) {
				inputs[i].value = q;
			}
			inputs[i].addEventListener("input", this, false);
		}
		if (q) {
			this.getResults(q);
		}
	},
	
	getInputs: function () {
		return document.getElementsByName("q");
	},

	timer: null,
	timerDelay: 300,

	updatePage: function (s) {
		// find existing parts of page coming from the original
		if (!this.headerElement) {
			this.headerElement = document.evaluate("/html/body/center/form[1] | /html/body/table[2]", document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue;
		}
		if (!this.footerElement) {
			// start page
			this.footerElement = document.evaluate("/html/body/center/br[3]", document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue;
			if (!this.footerElement) {
				// result page
				this.footerElement = document.evaluate("/html/body/center[1]", document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue;
			}
		}
	
		// if we don't have these element we create elements now
		// these elements might have become orphans as well
		if (!this.headerElement || !this.headerElement.parentNode) {
			this.headerElement = document.createElement("div");
			document.body.appendChild(this.headerElement);
		}
		if (!this.footerElement || !this.footerElement.parentNode) {
			this.footerElement = document.createElement("div");
			document.body.appendChild(this.footerElement);
		}
		
		// now we need to find the text in the resulting page
		var html = "&nbsp;";
		var i1 = s.indexOf("<style>");
		if (i1 != -1) {
			i1 = s.indexOf("<style>", i1 + 7);
			var i2 = s.indexOf("<center>", i1);
			if (i1 != -1 && i2 != -1) {
				html = s.substring(i1, i2);
			}
		}
		
		var dummy = document.createElement("div");
		// http://www.google.com centers everything
		dummy.style.textAlign = "left";
		dummy.innerHTML = html;
		
		var el = this.headerElement.nextSibling;
		while (el != null && el != this.footerElement) {
			el.parentNode.removeChild(el);
			el = this.headerElement.nextSibling;
		}

		// if loading from main page. fake focus()
		if (!document.gs) {
			document.gs = {q: {focus: function () {}}};
		}

		this.footerElement.parentNode.insertBefore(dummy, this.footerElement);
		
		if (/<input.*?name=q.*?value="([^"]*)"/.test(s)) {
			this.updateLinks(RegExp.$1);
		}
	},
	
	updateLinks: function (q) {
		var links = document.getElementsByTagName("a");
		var l = links.length;
		var href, a;
		for (var i = 0; i < l; i++) {
			a = links[i];
			if (a.className == "q") {
				href = a.getAttribute("href");
				if (/(^.*q=)(.*?)(&?.*$)/.test(href)) {
					href = RegExp.$1 + q + RegExp.$2;
				} else {
					href += "&q=" + q;
				}
				a.setAttribute("href", href);
			}			
		}
	},
	
	replaceHash: function (s) {
		var hash = document.location.hash;
		var l = document.location.href;
		var i = l.lastIndexOf("#");
		if (i != -1) {
			l = l.substr(0, i)
		}
		s = String(s);
		if (s.length > 0 && s.charAt(0) != "#") {
			s = "#" + s;
		}
		document.location.replace(l + s);
	},	
	
	getResults: function (q) {
		if (!this.xmlHttp) {
			this.xmlHttp = new XMLHttpRequest;
			this.xmlHttp.addEventListener("load", this, false);
			this.xmlHttp.addEventListener("error", this, false);
		}
		
		var uri = this.uriBase + encodeURIComponent(q);
		this.xmlHttp.open("GET", uri, false);
		this.xmlHttp.send(null);
		this.replaceHash("gls=" + q);
	},
	
	// EventListener interface
	handleEvent: function (e) {
		switch (e.type) {
			case "input":
				return this.onInput(e);
			case "load":
				return this.onLoad(e);
			case "error":
				return this.onError(e);
			default:
				throw "Missing handler for: " + e.type;
		}
	},
	
	onInput: function (e) {
		if (this.timer) {
			window.clearTimeout(this.timer);
		}
		if (this.xmlHttp) {
			this.xmlHttp.abort();
		}
		this.timer = window.setTimeout(this._onTimer, this.timerDelay);
		
		// sync inputs
		var inputs = this.getInputs();
		for (var i = inputs.length - 1; i >= 0; i--) {
			if (e.target != inputs[i]) {
				inputs[i].removeEventListener("input", this, false);
				inputs[i].value = e.target.value;
				inputs[i].addEventListener("input", this, false);
			}
		}
	},
	
	onTimer: function () {
		// now we can send of the XmlHttpRequest
		this.timer = null;
		
		var inp = this.getInputs()[0];
		var v = inp.value;
		// exit if only whitespace or empty
		if (/^\s*$/.test(v)) {
			return;
		}
		
		this.getResults(v);
	},
	
	onLoad: function () {
		if (!this.xmlHttp || this.xmlHttp.status == 0 || this.xmlHttp.status >= 400) {
			this.onError();
		}
		this.updatePage(this.xmlHttp.responseText);
		this.xmlHttp = null;
	},
	
	onError: function () {
		this.xmlHttp = null;
	}
};

googleLiveSearch.init();

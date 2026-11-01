// Copyright 2004 Erik Arvidsson. All Rights Reserved.
//
// This code is triple licensed using Apache Software License 2.0,
// Mozilla Public License or GNU Public License
//
///////////////////////////////////////////////////////////////////////////////
//
// Licensed under the Apache License, Version 2.0 (the "License"); you may not
// use this file except in compliance with the License.  You may obtain a copy
// of the License at http://www.apache.org/licenses/LICENSE-2.0
//
///////////////////////////////////////////////////////////////////////////////
//
// The contents of this file are subject to the Mozilla Public License
// Version 1.1 (the "License"); you may not use this file except in
// compliance with the License. You may obtain a copy of the License at
// http://www.mozilla.org/MPL/
//
// Software distributed under the License is distributed on an "AS IS"
// basis, WITHOUT WARRANTY OF ANY KIND, either express or implied. See the
// License for the specific language governing rights and limitations
// under the License.
//
// The Original Code is Simple HTML Parser.
//
// The Initial Developer of the Original Code is Erik Arvidsson.
// Portions created by Erik Arvidssson are Copyright (C) 2004. All Rights
// Reserved.
//
///////////////////////////////////////////////////////////////////////////////
//
// This program is free software; you can redistribute it and/or
// modify it under the terms of the GNU General Public License
// as published by the Free Software Foundation; either version 2
// of the License, or (at your option) any later version.
//
// This program is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
// GNU General Public License for more details.
//
// You should have received a copy of the GNU General Public License
// along with this program; if not, write to the Free Software
// Foundation, Inc., 51 Franklin Street, Fifth Floor, Boston, MA  02110-1301, USA.

//
///////////////////////////////////////////////////////////////////////////////


/**
 * This class creates a simple handler for SimpleHtmlParser that filters out
 * potentially unsafe HTML code
 */
function FilterHtmlHandler()
{
	this._sb = [];
}

FilterHtmlHandler.prototype = {

	_inBlocked:	null,

	clear:	function ()
	{
		this._sb = [];
	},

	toString:	function ()
	{
		return this._sb.join("");
	},

// handler interface

	startElement:   function (sTagName, attrs)
	{
		if (this._inBlocked)
			return;

		var ls = sTagName.toLowerCase();
		switch (ls) {
			case "script":
			case "style":
			case "applet":
			case "object":
			case "embed":	//does embed have optional end tag?
				this._inBlocked = ls;
				break;
			default:
				this._sb.push("<" + sTagName);
		}

		for (var i = 0; i < attrs.length; i++)
		{
			this.attribute(sTagName, attrs[i].name, attrs[i].value);
		}

		if (!this._inBlocked)
			this._sb.push(">");
	},

	endElement:     function (s)
	{
		var ls = s.toLowerCase();
		if (this._inBlocked)
		{
			if (this._inBlocked == ls)
				this._inBlocked = null;
			return;
		}
		this._sb.push("</" + s + ">");
	},

	attribute:  function (sTagName, sName, sValue)
	{
		if (this._inBlocked)
			return;

		var nl = sName.toLowerCase();
		var vl = String(sValue).toLowerCase();	// might be null

		if (nl == "type" && vl == "text/css" ||
			nl == "rel" && vl == "stylesheet")
		{
			this._sb.push(" " + sName + "=\"BLOCKED\"");
		}
		else if (nl.substr(0,2) == "on")
		{
			//noop
		}
		else if ((nl == "href" || nl == "src" || nl == "data" || nl == "codebase") &&
				 /^javascript\:/i.test(vl))
		{
			//noop
		}
		else if (nl == "style")
		{
			sValue = sValue.replace(/\-moz\-binding/gi, "BLOCKED")
					.replace(/binding/gi, "BLOCKED")
					.replace(/behavior/gi, "BLOCKED")
					.replace(/\:\s*expression\s*\(/gi, ":BLOCKED(");
			this._sb.push(" " + sName + "=\"" + sValue + "\"");
		}
		else
		{
			if (sValue == null)
				this._sb.push(" " + sName);
			else
				this._sb.push(" " + sName + "=\"" + sValue + "\"");
		}
	},

	characters:	function (s)
	{
		if (!this._inBlocked)
			this._sb.push(s);
	},

	comment:	function (s)
	{
		//this._sb.push(s);
	}
};

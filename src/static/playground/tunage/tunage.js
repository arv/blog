function Tunage(sUri) {
	if (sUri) {
		this.setUri(sUri);
	}
}

Tunage.prototype.setUri = function (sUri) {
	if (this._uri != sUri) {
		this._uri = sUri;
		this.reload();
	}
};

Tunage.prototype.getUri = function () {
	return this._uri;
};

Tunage.prototype.reload = function () {
	if (this._xmlHttp) {
		this._xmlHttp.abort();
	}
	if (window.XMLHttpRequest) {
		this._xmlHttp = new XMLHttpRequest;
	} else if (window.ActiveXObject) {
		this._xmlHttp = new ActiveXObject("Microsoft.XmlHttp");
	}
	var xmlHttp = this._xmlHttp;
	var self = this;
	xmlHttp.onreadystatechange = function () {
		if (xmlHttp.readyState == 4) {
			self.onLoad();
		}
	};
	xmlHttp.open("GET", this._uri, true);
	xmlHttp.send(null);
};

Tunage.prototype.onLoad = function () {
	var hadData = this._data != null;
	var xmlHttp = this._xmlHttp;
	var s = xmlHttp.responseText;
	try {
		this._data = eval("(" + s + ")");
	} catch (ex) {
		this._data = {error: ex.message};			
	}
	
	// schedule a reload
	var data = this._data;
	var sleepTime;
	if (data.error || !("remaining" in data) || data.remaining <= 0) {
		sleepTime = 60;
	} else {
		// add a second to be on the safe side
		sleepTime = data.remaining + 1;
	}
	sleepTime *= 1000;
	var self = this;
	window.setTimeout(function () { self.reload(); }, sleepTime );
	
	if (typeof this.onchange == "function") {
		this.onchange();
	}
};

Tunage.prototype.getHasData = function () {
	return this._data && !("error" in this._data);
};

Tunage.prototype.getHasDataField = function (sProp) {
	return this.getHasData() && sProp in this._data;
	
};

Tunage.prototype.getDataField = function (sProp) {
	if (this.getHasDataField(sProp)) {
		return this._data[sProp];
	}
	return null;
};

Tunage.prototype.getArtist = function () {
	return this.getDataField("artist");
};

Tunage.prototype.getAlbum = function () {
	return this.getDataField("album");
};

Tunage.prototype.getTitle = function () {
	return this.getDataField("title");
};

Tunage.prototype.getStartedAt = function () {
	return new Date(this.getDataField("dateTimeStamp") * 1000);
};

Tunage.prototype.getDurationString = function () {
	return this.getDataField("duration");
};

Tunage.prototype.getDuration = function () {
	return Number(this.getDataField("durationSeconds"));
};

Tunage.prototype.getRating = function () {
	return Number(this.getDataField("rating"));
};

Tunage.prototype.getIsPlaying = function () {
	if (!this.getHasDataField("remaining")) {
		return false;
	}
	var r = this.getDataField("remaining");
	return r > 0;
};

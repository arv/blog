function bindTunageToElement(sId) {
	function appendElementText(el, s, tagName, attributeMap) {
		var node;
		if (tagName) {
			node = document.createElement(tagName);
			for (var attrName in attributeMap) {
				node.setAttribute(attrName, attributeMap[attrName]);
			}				
			node.appendChild(document.createTextNode(s));
		} else {
			node = document.createTextNode(s)
		}
		el.appendChild(node);
		return node;
	}
	
	function niceDate(d) {
		var now = new Date;
		if (d.getFullYear() == now.getFullYear() &&
			d.getMonth() == now.getMonth() &&
			d.getDate() == now.getDate()) {
			return d.toLocaleTimeString();
		}
		return d.toLocaleString();
	}
	
	var t = new Tunage;
	t.setUri("http://erik.eae.net/playground/tunage/?action=currentlyplaying");
	t.onchange = function () {
		// long version
		var el = document.getElementById(sId);
		while (el.hasChildNodes()) {
			el.removeChild(el.lastChild);
		}
		appendElementText(el, t.getIsPlaying() ? "Currently listening to " : "Last song listened to was ");
		appendElementText(el, t.getTitle(), "strong");
		appendElementText(el, " by ");
		appendElementText(el, t.getArtist(), "a", {href: "http://www.discogs.com/artist/" +
														  encodeURIComponent(t.getArtist()),
												   title: "Information provided by Discogs"});
		appendElementText(el, " from ");
		appendElementText(el, t.getAlbum(), "a", {href: "http://www.discogs.com/search?type=releases&q=" +
														 encodeURIComponent(t.getAlbum()),
												  title: "Information provided by Discogs"});
		if (!t.getIsPlaying()) {
			appendElementText(el, " at " + niceDate(t.getStartedAt()));
		}	
	};

}
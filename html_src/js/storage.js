/**
* HTML5 storage helper
*/

var HTML5Storage =
{
	isSupported: ('localStorage' in window && window['localStorage'] !== null),

	prefix: "Jukebox", // Cannot use Jukebox.name because of minification

	/**
	* Fetch data from HTML5 storage + parse it into an object
	* @param {string} key - Storage identifier
	* @return {object} Saved object, or null
	*/
	get: function(key)
	{
		var str = localStorage[HTML5Storage.prefix + "-" + key],
			obj = null;
		if(str)
		{
			try
			{
				obj = str.evalJSON();
			}
			catch(e)
			{
				obj = null;
			}
		}
		return obj;
	},

	/**
	* Save data to HTML5 storage
	* @param {string} key - Storage identifier
	* @param {object} value - Storage data
	*/
	set: function(key, value)
	{
		localStorage[HTML5Storage.prefix + "-" + key] = Object.toJSON(value);
	}
};
Object.freeze(HTML5Storage); // Non-extensible, Non-removable, Non-modifiable

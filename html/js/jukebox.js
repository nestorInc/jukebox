(function(){ // Protect scope

// Notifications levels
var LEVELS =
{
	debug: 1,
	info: 2,
	warning: 3,
	error: 4,
	fatal: 5
};
Object.freeze(LEVELS);

// Notifications that are currently on screen
var activeNotifications = [];

// Passed notifications (for history)
var passedNotifications = [];

//==================================================

// Main class containing notification stuff.
// It is capable of appearing, updating its content, and disappearing.
function Notification(level, message)
{
	if(!level || !message)
	{
		var msg = "Notification: Invalid parameters (level, message)";
		new Notification(LEVELS.error, msg); // Couldn't resist
		throw new Error(msg);
	}

	// Notification infos
	this.level = level;
	this.message = message;

	// Default display time in seconds
	var delay = 8;
	
	// The id has to be unique.
	this.id = new Date().getTime() + "." + Math.round(Math.random()*100000);
	
	// Assign correct style and time according to given level.
	var style = "notification-wrapper-";
	switch(level)
	{
	case LEVELS.debug:
		style += "debug";
		delay = 3;
		break;
	case LEVELS.info:
		style += "info";
		delay = 4;
		break;
	case LEVELS.warning:
		style += "warning";
		delay = 4;
		break;
	case LEVELS.error:
		style += "error";
		delay = 20;
		break;
	case LEVELS.fatal:
		style += "fatal";
		delay = 20;
		break;
	default:
		style += "default";
		break;
	}

	activeNotifications.push(this);
	
	// Insert notification wrapper in the page
	var html = '' +
	'<div class="notification-wrapper" id="notification-' + this.id + '">' +
		'<div class="' + style + '" id="notification-content-' + this.id + '">' +
			'<p>' + message + ' </p>' +
		'</div>' +
	'</div>';
	$('notifications').insert(html);
	
	this.startTime = new Date();
	this.endTime = null; // Declare property for Object.seal

	// Hide notification, then make it appear with an animation
	$('notification-' + this.id).hide();

	var notif = this;
	Effect.SlideDown('notification-' + this.id,
	{
		duration: 0.6,
		restoreAfterFinish: false,
		afterFinish: function(effect)
		{
			// Once the notification appeared, make the click on its wrapper close it.
			Event.observe(effect.element, 'click', function()
			{
				notif.remove();
			});
		}
	});

	// Self-destruction
	this._timer = setTimeout(function()
	{
		notif.remove();
	}, delay * 1000);

	Object.seal(this); // Non-extensible, Non-removable
}

// Make a notification disappear
Notification.prototype.remove = function()
{
	// Handle case where somebody still got a reference on this notif and call remove() again
	if(!this._timer) {return;}

	var notif = this;
	Effect.SlideUp('notification-' + this.id,
	{
		duration: 0.4,
		afterFinish: function(effect)
		{
			effect.element.remove();
			notif.endTime = new Date();

			// Remove the notive from the active list
			for(var i = 0; i < activeNotifications.length; i++)
			{
				if(activeNotifications[i] == notif)
				{
					activeNotifications.splice(i, 1);

					Object.freeze(notif);
					passedNotifications.push(notif);
					break;
				}
			}
		}
	});

	// Stop timer (remove can be called before the timer timeout)
	clearTimeout(this._timer);
	this._timer = null;
};

//==================================================

// Expose a Notifications object on global scope
this.Notifications =
{
	LEVELS: LEVELS,
	//list: activeNotifications, // User can mess up this array, either make notification copies inside, or do not expose it
	history: passedNotifications, // User can mess up this array, but we don't care because each notif has been frozen
	Display: function(level, message)
	{
		/* return is commented to avoid Notification modification.
		Indeed, you don't want to allow an external piece of code to edit (anytime) the text or force a remove (too fast) !!
		A notif is a notif.... It stays alive until timeout or user action.*/

		/*return */new Notification(level, message);
	}
};
Object.freeze(this.Notifications);

})();

(function(){

// Structure is done to allow direct access, thus reducing loops usage.
var genres =
{
	0:		"Blues",
	1:		"Classic Rock",
	2:		"Country",
	3:		"Dance",
	4:		"Disco",
	5:		"Funk",
	6:		"Grunge",
	7:		"Hip-Hop",
	8:		"Jazz",
	9:		"Metal",
	10:		"New Age",
	11:		"Oldies",
	12:		"Other",
	13:		"Pop",
	14:		"R&B",
	15:		"Rap",
	16:		"Reggae",
	17:		"Rock",
	18:		"Techno",
	19:		"Industrial",
	20:		"Alternative",
	21:		"Ska",
	22:		"Death Metal",
	23:		"Pranks",
	24:		"Soundtrack",
	25:		"Euro-Techno",
	26:		"Ambient",
	27:		"Trip-Hop",
	28:		"Vocal",
	29:		"Jazz+Funk",
	30:		"Fusion",
	31:		"Trance",
	32:		"Classical",
	33:		"Instrumental",
	34:		"Acid",
	35:		"House",
	36:		"Game",
	37:		"Sound Clip",
	38:		"Gospel",
	39:		"Noise",
	40:		"Alternative Rock",
	41:		"Bass",
	43:		"Punk",
	44:		"Space",
	45:		"Meditative",
	46:		"Instrumental Pop",
	47:		"Instrumental Rock",
	48:		"Ethnic",
	49:		"Gothic",
	50:		"Darkwave",
	51:		"Techno-Industrial",
	52:		"Electronic",
	53:		"Pop-Folk",
	54:		"Eurodance",
	55:		"Dream",
	56:		"Southern Rock",
	57:		"Comedy",
	58:		"Cult",
	59:		"Gangsta",
	60:		"Top 40",
	61:		"Christian Rap",
	62:		"Pop/Funk",
	63:		"Jungle",
	64:		"Native US",
	65:		"Cabaret",
	66:		"New Wave",
	67:		"Psychadelic",
	68:		"Rave",
	69:		"Showtunes",
	70:		"Trailer",
	71:		"Lo-Fi",
	72:		"Tribal",
	73:		"Acid Punk",
	74:		"Acid Jazz",
	75:		"Polka",
	76:		"Retro",
	77:		"Musical",
	78:		"Rock & Roll",
	79:		"Hard Rock",
	80:		"Folk",
	81:		"Folk-Rock",
	82:		"National Folk",
	83:		"Swing",
	84:		"Fast Fusion",
	85:		"Bebob",
	86:		"Latin",
	87:		"Revival",
	88:		"Celtic",
	89:		"Bluegrass",
	90:		"Avantgarde",
	91:		"Gothic Rock",
	92:		"Progressive Rock",
	93:		"Psychedelic Rock",
	94:		"Symphonic Rock",
	95:		"Slow Rock",
	96:		"Big Band",
	97:		"Chorus",
	98:		"Easy Listening",
	99:		"Humour",
	100:	"Acoustic",
	101:	"Speech",
	102:	"Chanson",
	103:	"Opera",
	104:	"Chamber Music",
	105:	"Sonata",
	106:	"Symphony",
	107:	"Booty Bass",
	108:	"Primus",
	109:	"Porn Groove",
	110:	"Satire",
	111:	"Slow Jam",
	112:	"Club",
	113:	"Tango",
	114:	"Samba",
	115:	"Folklore",
	116:	"Ballad",
	117:	"Power Ballad",
	118:	"Rhytmic Soul",
	119:	"Freestyle",
	120:	"Duet",
	121:	"Punk Rock",
	122:	"Drum Solo",
	123:	"Acapella",
	124:	"Euro-House",
	125:	"Dance Hall",
	126:	"Goa",
	127:	"Drum & Bass",
	128:	"Club-House",
	129:	"Hardcore",
	130:	"Terror",
	131:	"Indie",
	132:	"BritPop",
	133:	"Negerpunk",
	134:	"Polsk Punk",
	135:	"Beat",
	136:	"Christian Gangsta",
	137:	"Heavy Metal",
	138:	"Black Metal",
	139:	"Crossover",
	140:	"Contemporary C",
	141:	"Christian Rock",
	142:	"Merengue",
	143:	"Salsa",
	144:	"Thrash Metal",
	145:	"Anime",
	146:	"JPop",
	147:	"SynthPop"
};

// Because of browsers custom implementation of for(var genre in genres), we have to sort the array.
// Note that we do that only once

var genresOrdered = []; // Array of {id:, name:}
for(var genre in genres)
{
	genresOrdered.push({id: genre, name: genres[genre]});
}
genresOrdered.sort(function(a, b)
{
	if(a.name < b.name)
	{
		return -1;
	}
	else if(a.name > b.name)
	{
		return 1;
	}
	return 0;
});
/**
* Merge the contents of two or more objects together into the first object
* Inspired from jQuery.extend
* Keep in mind that the target object (first argument) will be modified, and will also be returned.
* If, however, we want to preserve both of the original objects, we can do so by passing an empty object as the target.
* 
* @param {bool} [deep] - If true, the merge becomes recursive (aka. deep copy).
* @param {object} target - An object that will receive the new properties.
* @param {object} obj1 - An object containing additional properties to merge in.
* @param {object} [objN] - Additional objects containing properties to merge in.
* @return {object} The target with merged properties.
*/
function Extend(/*deep, */target/*, obj1, obj2, obj3, objN*/)
{
	var deep = false,
		i = 1;

	// Handle a deep copy situation
	if(typeof target === "boolean")
	{
		deep = target;
		target = arguments[1] || {};
		// Skip the boolean and the target
		i = 2;
	}

	// Handle case when target is a string or something (possible in deep copy)
    if(typeof target !== "object" && typeof target !== "function")
    {
        target = {};
    }

	for(var len = arguments.length; i < len; ++i)
	{
		var options = arguments[i];
		if(options != null) // Only deal with non-null/undefined values
		{
			for(var name in options)
			{
				var src = target[name],
					copy = options[name];

				// Prevent never-ending loop
				if(target === copy)
				{
					continue;
				}

				// Recurse if we're merging object literal values or arrays
				if(deep && copy && (Object.isArray(copy) || typeof copy == "object")) // typeof operator is a bad shortcut here and on next line
				{
					var clone = src && (Object.isArray(src) || typeof src == "object" ) ? src : Object.isArray(copy) ? [] : {};

					// Never move original objects, clone them
					target[name] = Extend(deep, clone, copy);
				}
				else if(copy !== undefined) // Don't bring in undefined values
				{
					// Added custom check to avoid prototypejs functions added on Array.prototype for instance
					if(options.hasOwnProperty(name))
					{
						target[name] = copy;
					}
				}
			}
		}
	}
	return target; // Return the modified object
}


// UI Tools
//----------

/**
* Format a timestamp to a string in the format: [h:]m:s
* 0 are only added to minutes and seconds if necessary.
* @param {string|number} t - The timestamp.
* @return {string} The formatted timestamp.
*/
function FormatTime(t)
{
	var str = null;
	t = Number(t);
	if(!isNaN(t))
	{
		var h = Math.floor(t / 3600),
			m = Math.floor(t % 3600 / 60),
			s = Math.floor(t % 3600 % 60);
		str = ((h > 0 ? h + ":" : "") + (m > 0 ? (h > 0 && m < 10 ? "0" : "") + m + ":" : "0:") + (s < 10 ? "0" : "") + s);
	}
	return str;
}

function sort_unique(arr)
{
	arr = arr.sort(function(a, b)
	{
		return a * 1 - b * 1;
	});
	var ret = [arr[0]];
	for(var i = 1; i < arr.length; i++)
	{
		if(arr[i - 1] !== arr[i])
		{
			ret.push(arr[i]);
		}
	}
	return ret;
}

function JsonPrettyPrint(input)
{
	var json_hr = JSON.stringify(input, null, "\t");
	json_hr = json_hr.replace(/\n/g, "<br />");
	json_hr = json_hr.replace(/\t/g, "&nbsp;&nbsp;&nbsp;");
	return json_hr;
}
var Tab = this.Tab = Class.create(
{
	initialize: function(identifier, name)
	{
		this.identifier = identifier;
		this.name = name;
	},

	getName: function()
	{
		return this.name; 
	},

	getIdentifier: function()
	{
		return this.identifier;
	}
});

//==================================================

this.Tabs = Class.create(
{
	initialize: function(tabsCollectionName)
	{
		this.tabsCollectionName = tabsCollectionName;
		this.tabs = [];
		this.currentTabUniqueId = -1;
		this.lastUniqueId = null;
	},

	getTabFromUniqueId: function(identifier)
	{
		for(var i = 0; i < this.tabs.length; ++i)
		{
			if(this.tabs[i].identifier == identifier)
			{
				return this.tabs[i];
			}
		}
		return null;
	},

	getTabIndexFromUniqueId: function(identifier)
	{
		for(var i = 0; i < this.tabs.length; ++i)
		{
			if(this.tabs[i].identifier == identifier)
			{
				return i;
			}
		}
		return -1;
	},
	
	getFirstTabIdentifierByClassName: function(tabClassName)
	{
		for(var i = 0; i < this.tabs.length; ++i)
		{
			if(this.tabs[i].unique !== undefined && this.tabs[i].unique == tabClassName)
			{
				return this.tabs[i].identifier;
			}
		}
		return null;
	},

	getFirstTabByClassName: function(tabClassName)
	{
		for(var i = 0; i < this.tabs.length; ++i)
		{
			if(this.tabs[i].unique !== undefined && this.tabs[i].unique == tabClassName)
			{
				return this.tabs[i];
			}
		}
		return null;
	},

	// Add the tab in the html layout and in the tabs array
	addTab: function(tab)
	{
		var rootClass = tab.constructor;
		while(rootClass.superclass != null)
		{
			rootClass = rootClass.superclass;
		}
		if(rootClass != Tab)
		{
			throw new Error("Invalid tab instance");
		}

		// Compute a new valid uniqueid 
		if(this.lastUniqueId == null)
		{
			this.lastUniqueId = 0;
		}
		else
		{
			this.lastUniqueId++;
		}

		// Set the new tab identifier
		var id = tab.identifier = this.tabsCollectionName + '-' + this.lastUniqueId;
		this.tabs.push(tab);

		// init html containers
		if(this.tabs.length == 1)
		{
			$('tabsHeader').update('<ul id="tabs-list"></ul>');
		}

		// Add tab Header
		var toggleTab = new Element('a', {href: 'javascript:;'}).update('<span>' + tab.name + '</span>');
		var removeTab = new Element('a', {href: 'javascript:;'}).update('<span> X </span>');

		var that = this; // Tool for closure
		toggleTab.on("click", function()
		{
			that.toggleTab(id);
		});
		removeTab.on("click", function()
		{
			that.removeTab(id);
		});

		var tabDisplay = new Element('li',
		{
			style: 'margin-left: 1px',
			id: 'tabHeader-' + id
		}).insert(
		{
			top: toggleTab,
			bottom: removeTab
		});
		if(this.tabs.length == 1)
		{
			tabDisplay.addClassName('tabHeaderActive');
		}

		var tabContentContainer = new Element('div', {id: 'tabContent-' + id});
		tabContentContainer.style.display = this.tabs.length == 1 ? 'block' : 'none';

		// DOM insertion
		$('tabs-list').insert({'bottom': tabDisplay});
		$('tabscontent').insert({'bottom': tabContentContainer});

		// Start to init static tab content
		if(typeof tab.updateContent === 'function')
		{
			tab.updateContent();
		}

		return id;
	},

	removeTab: function(identifier)
	{
		var index = this.getTabIndexFromUniqueId(identifier);
		if(index != -1)
		{
			// If the tab to delete is the current active tab we want to select the first available tab
			var tabHeader = $('tabHeader-' + identifier),
				tabContent = $('tabContent-' + identifier);
			if(tabHeader && tabHeader.hasClassName("tabHeaderActive"))
			{
				// Find the tabs position index available near from tab
				if(index !== 0)
				{
					this.toggleTab(this.tabs[index - 1].identifier);
				}
				else if(this.tabs.length > 1)
				{
					this.toggleTab(this.tabs[index + 1].identifier);
				}
			}

			// Remove the tab
			this.tabs.splice(index, 1);

			if(tabHeader) {tabHeader.remove();}
			if(tabContent) {tabContent.remove();}
		}
	},

	toggleTab: function(identifier)
	{
		for(var i = 0; i < this.tabs.length; i++)
		{
			var id = this.tabs[i].identifier,
				tabHeader = $('tabHeader-' + id),
				tabContent = $('tabContent-' + id);
			if(id == identifier)
			{
				tabContent.style.display = 'block';
				tabHeader.addClassName('tabHeaderActive');
			}
			else
			{
				tabContent.style.display = 'none';
				tabHeader.removeClassName('tabHeaderActive');
			}
		}
	}
});

this.SearchTab = Class.create(Tab,
{
	initialize: function(jukebox, server_results)
	{
		this.reloadControllers = true;
		this.pages = [];
		this.sliders = [];
		this.tableKit = null;

		this.jukebox = jukebox;
		this.identifier = server_results.identifier;
		this.updateNewSearchInformations(server_results);
	},

	updateNewSearchInformations: function(server_results)
	{
		// Tab name
		var search = server_results.search_value,
			field = server_results.search_field;
		if(search === '')
		{
			this.name = 'Library';
		}
		else if(server_results.search_comparison == 'equal')
		{
			if(field == 'artist')
			{
				this.name = 'Artist: ' + search;
			}
			else if(field == 'album')
			{
				this.name = 'Album: ' + search;
			}
			else if(field == 'genre')
			{
				this.name = 'Genre: ' + genres[search];
			}
		}
		else
		{
			this.name = search;
		}

		this.select_fields = server_results.select_fields;
		this.search_value = server_results.search_value;
		this.search_comparison = server_results.search_comparison;
		this.search_field = server_results.search_field;
		this.first_result = server_results.first_result;
		this.result_count = server_results.result_count;
		this.order_by = server_results.order_by;
		this.total_results = server_results.total_results;
		this.server_results = server_results.results;

		// Gets the number of pages
		this.page_count = Math.floor(this.total_results / this.result_count);
		if(this.total_results % this.result_count > 0)
		{
			this.page_count = this.page_count + 1;
		}

		// Gets the current page number
		this.current_page = Math.floor(this.first_result / this.result_count) + 1;
		if(this.current_page > this.page_count)
		{
			this.current_page = 1;
		}
		this.locked = [];
	},

	goToPage: function(page)
	{
		this.jukebox.search((page - 1) * this.result_count,
			this.identifier,
			this.select_fields,
			this.search_value,
			this.search_comparison,
			this.search_field,
			this.order_by,
			this.result_count);
	},

	sort: function(order_by)
	{
		this.jukebox.search(this.page,
			this.identifier,
			this.select_fields,
			this.search_value,
			this.search_comparison,
			this.search_field,
			order_by,
			this.result_count);
	},

	updateContent: function()
	{
		if(this.reloadControllers)
		{
			// Clean
			$$('collection-pagelist-' + this.identifier).each(function(s)
			{
				s.remove();
			});

			var collection_content = $('collection-content-' + this.identifier);
			if(collection_content)
			{
				collection_content.remove();
			}

			// Pre-init html structure
			var search_page = '' +
			'<div class="collection-pagelist" name="collection-pagelist-' + this.identifier + '"></div>' +
			'<div id="collection-content-' + this.identifier + '"></div>' +
			'<div class="collection-pagelist" name="collection-pagelist-' + this.identifier + '"></div>';
			$('tabContent-' + this.identifier).update(search_page);

			// Display sliders and links and init sliders behvior
			this.initAndDisplaySearchControllers();
			this.reloadControllers = false;
		}
		else
		{
			// Refresh displayed pages
			this.generatePagesLinks();

			// Refresh slider position
			for(var k in this.sliders)
			{
				if(typeof this.sliders[k].setValue === 'function')
				{
					this.locked[k] = true;
					this.sliders[k].setValue(this.current_page);
					this.locked[k] = false;
				}
			}
		}

		// Display search results and init dragabble items
		this.initAndDisplaySearchResults();
	},

	// Update sliders and pages
	initAndDisplaySearchControllers: function()
	{
		var tabId = this.identifier;

		// Display sliders and links
		var pageListCollection = $$('[name=collection-pagelist-' + tabId + ']');
		pageListCollection.each(function(s)
		{
			s.update(); // empty
		});

		// Only display slider and pages results links if nb pages > 1
		if(this.total_results > 0 && this.page_count > 1)
		{
			// We have to specified a fixed width, 100% doesn't work : the slider is lost
			var music_wrapper_width = $('music-wrapper').getWidth();

			var slider = '' +
			'<div name="results-slider-' + tabId + '" class="slider" style="width:' + music_wrapper_width + 'px;">' +
				'<div class="handle"></div>' +
			'</div>';
			var links = '<div class="page-links" name="page-links-' + tabId + '"></div>';

			pageListCollection[0].update('<p>' + slider + links + '</p>');
			pageListCollection[1].update('<p>' + links + slider + '</p>');
		}

		// Fill the pages array used by sliders
		for(var k = 0; k < this.page_count; ++k)
		{
			this.pages.push(k + 1);
		}

		// Init the link list
		this.generatePagesLinks();

		// Init each sliders behavior
		var resultsSlider = $$('[name=results-slider-' + tabId + ']'),
			that = this,
			i = 0;
		resultsSlider.each(function(sliderBox)
		{
			var slider = new Control.Slider(sliderBox.down('.handle'), sliderBox,
			{
				range: $R(1, that.pages.length),
				values: that.pages,
				sliderValue: that.current_page || 1,
				id: i++,
				timeout: null,
				lastSelectedValue: null,
				onSlide: function(value)
				{
					that.generatePagesLinks(value);

					// Update others sliders values by setting value with the current slider sliding value
					for(var k = 0; k < that.sliders; ++k)
					{
						if(k != this.id)
						{
							that.locked[k] = true;
							if(typeof that.sliders[k].setValue === 'function')
							{
								// Caution this instruction fire onChange slider event
								that.sliders[k].setValue(value);
							}
							that.locked[k] = false;
						}
					}

					// Auto page selection if stuck on a page
					if(this.lastSelectedValue != value)
					{
						clearTimeout(this.timeout);
						this.timeout = setTimeout(function()
						{
							that.goToPage(value);
						}, 400);
					}

					this.lastSelectedValue = value;
				},
				onChange: function(value)
				{
					// Because we use multi slider we don't want to fire onChange event when sliding the other slider
					if(!that.locked[this.id]) // Current slider not locked
					{
						clearTimeout(this.timeout);
						if(that.current_page != value)
						{
							that.goToPage(value);
						}
					}
				}
			});

			// Workaround to get correct handle position, whether current tab is visible or not
			// The following methods all return 0 when tab is created in background (display:none)
			/*var h = sliderBox.down('.handle');
			console.log(h.getWidth());
			console.log(h.measure('width'));
			console.log(h.getLayout().get('width'));
			console.log(h.clientWidth);
			*/
			// So we have to hard code the width specified in CSS div.slider div.handle{}
			slider.handleLength = 25;			

			that.sliders.push(slider);
		});
	},

	declareTableHeader: function()
	{
		var firstSort = this.order_by.split(",")[0],
			J = this.jukebox,
			tr = new Element('tr'),
			cellTag = 'th',
			sql;

		//-----

		var that = this;
		function addColumn(column, sql, text)
		{
			var cell = new Element(cellTag, {id: "duration"}).update(text);

			var order = "DESC";
			if(firstSort.indexOf(column) != -1)
			{
				if(firstSort.indexOf(order) == -1)
				{
					cell.className = "sortcol sortasc";
				}
				else
				{
					cell.className = "sortcol sortdesc";
					order = "ASC";
				}
			}
			sql = sql.replace('${ORDER}', order);
			cell.on("click", function()
			{
				that.sort(sql);
			});

			tr.insert(cell);
		}

		sql = 'artist COLLATE NOCASE ${ORDER}, album COLLATE NOCASE DESC, track DESC, title COLLATE NOCASE DESC';
		addColumn('artist', sql, 'Artist');

		sql = 'album COLLATE NOCASE ${ORDER}, track DESC, title COLLATE NOCASE DESC';
		addColumn('album', sql, 'Album');

		sql = 'title COLLATE NOCASE ${ORDER}, artist COLLATE NOCASE DESC, album COLLATE NOCASE DESC, track DESC';
		addColumn('title', sql, 'Title');
		
		sql = 'track ${ORDER}, artist COLLATE NOCASE DESC, album COLLATE NOCASE DESC, title COLLATE NOCASE DESC';
		addColumn('track', sql, 'Track');
		
		sql = 'genre ${ORDER}, artist COLLATE NOCASE DESC, album COLLATE NOCASE DESC, track DESC, title COLLATE NOCASE DESC';
		addColumn('genre', sql, 'Genre');

		sql = 'duration ${ORDER}, artist COLLATE NOCASE DESC, album COLLATE NOCASE DESC, track DESC, title COLLATE NOCASE DESC';
		addColumn('duration', sql, 'Duration');

		//-----
		// Controls
		
		function funcRandom()
		{
			J.addSearchToPlayQueueRandom(that.search_value, that.search_comparison, that.search_field, that.order_by, that.first_result, that.result_count);
		}
		function funcTop()
		{
			J.addSearchToPlayQueueTop(that.search_value, that.search_comparison, that.search_field, that.order_by, that.first_result, that.result_count);
		}
		function funcBottom()
		{
			J.addSearchToPlayQueueBottom(that.search_value, that.search_comparison, that.search_field, that.order_by, that.first_result, that.result_count);
		}
		var cell = this.createControlsCell(cellTag, funcRandom, funcTop, funcBottom);
		cell.writeAttribute('id', 'actions');
		tr.insert(cell);

		return tr;
	},

	// Utility to create the 3 buttons in the last cell of each row (standards rows and header row of the table)
	createControlsCell: function(cellTag, funcRandom, funcTop, funcBottom)
	{
		var cell = new Element(cellTag),
			addRandom = new Element('a').update('<span class="add-to-play-queue-rand"></span>'),
			addTop = new Element('a').update('<span class="add-to-play-queue-top"></span>'),
			addBottom = new Element('a').update('<span class="add-to-play-queue-bottom"></span>');

		cell.insert(addTop).insert(
		{
			top: addRandom,
			bottom: addBottom
		});

		addRandom.on('click', funcRandom);
		addTop.on('click', funcTop);
		addBottom.on('click', funcBottom);

		return cell;
	},

	initAndDisplaySearchResults: function()
	{
		var tbody = new Element('tbody'),
			count = this.result_count,
			$content = $('collection-content-' + this.identifier),
			k,
			isOdd = true,
			style,
			J = this.jukebox;
		
		function doSearch(search, category)
		{
			J.search(1, null, null, search.toString(), 'equal', category, 'artist,album,track,title', count, true);
		}
		function createLink(text, search, category)
		{
			var item = new Element('a', {href: 'javascript:void(0)'}).update(text);
			item.on('click', function()
			{
				doSearch(search, category);
			});
			return item;
		}

		if(this.total_results > 0)
		{
			var that = this,
				id = this.identifier,
				i = 0;
			this.server_results.each(function(s)
			{
				style = isOdd ? "rowodd" : "roweven";
				isOdd = !isOdd;

				var artist = createLink(s.artist, s.artist, 'artist'),
					album = createLink(s.album, s.album, 'album');

				var tds =
				[
					new Element('td').insert(artist),
					new Element('td').insert(album),
					new Element('td').update(s.title),
					new Element('td').update(s.track),
					new Element('td'), // genre
					new Element('td').update(FormatTime(s.duration))
				];

				if(genres[s.genre])
				{
					var genre = createLink(genres[s.genre], s.genre, 'genre');
					tds[4].insert(genre);
				}

				//---
				// Controls

				function funcRandom()
				{
					J.addToPlayQueueRandom(s.mid);
				}
				function funcTop()
				{
					J.addToPlayQueueTop(s.mid);
				}
				function funcBottom()
				{
					J.addToPlayQueueBottom(s.mid);
				}
				var controls = that.createControlsCell('td', funcRandom, funcTop, funcBottom);
				tds.push(controls);

				//---

				var tr = new Element('tr',
				{
					id: 'library-song-' + id + '-' + i++
				}).addClassName('library-draggable ' + style);

				for(k = 0; k < tds.length; ++k)
				{
					tr.insert(tds[k]);
				}
				tbody.insert(tr);
			});

			// Compute the table
			var temp = new Date().getTime(),
				tableid = 'results-filelist-' + this.identifier + '-' + temp,
				table = new Element('table', {id: tableid}).addClassName('resizable').addClassName('search-table');

			table.insert(tbody).insert(
			{
				top: new Element('thead').insert(this.declareTableHeader()),
				bottom: new Element('tfoot').insert(this.declareTableHeader())
			});

			// Replace the DOM
			$content.update(table);

			this.tableKit = new TableKit(tableid,
			{
				'sortable': false,
				'editable': false,
				'trueResize': true,
				'keepWidth': true
			});
		}
		else // this.total_results == 0
		{
			$content.update("No results found");
		}

		// Create all draggables, once update is done
		if(this.server_results != null)
		{
			for(k = 0; k < this.server_results.length; k++)
			{
				new Draggable('library-song-' + this.identifier + '-' + k,
				{
					scroll: window,
					ghosting: true,
					revert: function(element)
					{
						element.style.position = "relative";
					}
				});
			}
		}
	},

	generatePagesLinks: function(currentSelection)
	{
		var i,
			len,
			pages = [],
			threshold = 5, // TODO put this constant in a javascript config file
			currentPage = this.current_page,
			nbPages = this.page_count;

		if(typeof currentSelection == "undefined")
		{
			currentSelection = this.current_page;
		}

		// If nb pages to display > 25 we show only first pages, current selection page, and last pages links
		if(nbPages > 25)
		{
			// TODO put the + 2 in a javascript config file
			for(i = 1, len = Math.ceil(threshold) + 2; i < len; ++i)
			{
				if(i > 0 && i <= nbPages)
				{
					pages.push(i);
				}
			}
		}
		else
		{
			for(i = 1; i <= nbPages; ++i)
			{
				pages.push(i);
			}
		}

		// If we want to add focus on another variable we just need to add an entry in this array
		var focusElements = [];
		focusElements[0] = currentPage;
		
		// Uncomment the next line to show 3 pages links around slider selection page
		// focusElements[1] = currentSelection;
		
		pages.push(currentSelection);
		
		// Hide too far pages algorithm
		for(var k = 0; k < focusElements.length; ++k)
		{
			var currentCount = Math.ceil(threshold / 2),
				currentCount2 = currentCount;

			for(i = focusElements[k] - currentCount; i < focusElements[k]; ++i)
			{
				if(i > 0 && i <= nbPages)
				{
					currentCount--;
					pages.push(i);
				}
			}

			pages.push(focusElements[k]);

			for(i = focusElements[k] + 1, len = focusElements[k] + Math.ceil(threshold / 2) + 1; i < len; ++i)
			{
				if(i > 0 && i <= nbPages)
				{
					currentCount2--;
					pages.push(i);
				}
			}

			// Add missed before pages at the end of the array
			if(currentCount > 0)
			{
				for(i = focusElements[k] + Math.ceil(threshold / 2), len = focusElements[k] + Math.ceil(threshold); i < len; ++i)
				{
					if(i > 0 && i <= nbPages)
					{
						pages.push(i);
					}
				}
			}
			else if(currentCount2 > 0)
			{
				for(i = focusElements[k] - Math.ceil(threshold), len = focusElements[k] + Math.ceil(threshold / 2); i < len; ++i)
				{
					if(i > 0 && i <= nbPages)
					{
						pages.push(i);
					}
				}
			}
		}

		for(i = nbPages - Math.ceil(threshold); i <= nbPages; ++i)
		{
			if(i > 0 && i <= nbPages)
			{
				pages.push(i);
			}
		}

		pages = sort_unique(pages);

		var tab = this;
		function createLink(num, className)
		{
			var item = new Element('a', {href: 'javascript:void(0)'}).addClassName(className).update(num + " ");
			item.on('click', function()
			{
				tab.goToPage(num);
			});
			return item;
		}

		$$('[name=page-links-' + this.identifier + ']').each(function(s)
		{
			s.update(); // Remove all childnodes

			var lastdisplayedValue = null;
			for(i = 0; i < pages.length; ++i)
			{
				if(lastdisplayedValue != null && lastdisplayedValue != pages[i] - 1)
				{
					s.insert(" ..... ");
				}

				var className;
				if(pages[i] == currentPage)
				{
					className = "slider-link-current-page";
				}
				else if(pages[i] == currentSelection)
				{
					className = "slider-link-current-selection";
				}
				else
				{
					className = "slider-link";
				}

				var link = createLink(pages[i], className);
				s.insert(link);

				lastdisplayedValue = pages[i];
			}
		});
	}
});

var UploadTab = Class.create(Tab,
{
	initialize: function(identifier, tabName, jukebox)
	{
		this.identifier = identifier;
		this.name = tabName;
		this.uploader = null;
		this.unique = "UploadTab";
		this.uploadedFiles = null;
		this.uploadedFilesEdition = null;
		this.lastSendingDeletionIdentifier = null;
		this.lastSendingUpdateIdentifier = null;
		this.lastSendingValidationIdentifier = null;
		this.refresher = null;
		this.tableId = new Date().getTime();
		this.jukebox = jukebox;
	},

	deleteUploadedSong: function(file_name)
	{
		if(this.lastSendingDeletionIdentifier === null)
		{
			var fname = unescape(file_name);
			this.lastSendingDeletionIdentifier = fname;
			this.jukebox.deleteUploadedFile(fname);
		}
	},

	getUploadedFileEditionFromFilename: function(file_name)
	{
		if(this.uploadedFilesEdition === null)
		{
			return null;
		}
		for(var i = 0, len = this.uploadedFilesEdition.length; i < len; ++i)
		{
			if(this.uploadedFilesEdition[i].filename == file_name)
			{
				return this.uploadedFilesEdition[i];
			}
		}
		return null;
	},

	updateUploadedSong: function(file_name)
	{
		if(this.lastSendingUpdateIdentifier === null)
		{
			var fname = unescape(file_name);
			this.lastSendingUpdateIdentifier = fname;
			var tmp = this.getUploadedFileEditionFromFilename(fname);
			var opts =
			{
				file_name: fname,
				title: tmp.title,
				album: tmp.album,
				artist: tmp.artist,
				year: tmp.year,
				track: tmp.track,
				genre: tmp.genre
			};
			this.jukebox.updateUploadedFile(opts);
		}
	},

	validateUploadedSong: function(file_name)
	{
		if(this.lastSendingValidationIdentifier === null)
		{
			var fname = unescape(file_name);
			this.lastSendingValidationIdentifier = fname;
			this.jukebox.validateUploadedFile(fname);
		}
	},

	deletionResponse: function(ret, message)
	{
		if(ret == "success")
		{
			if(this.lastSendingDeletionIdentifier !== null)
			{
				// Delete entry
				for(var i = 0, len = this.uploadedFiles.length; i < len; ++i)
				{
					if(this.uploadedFiles[i].filename == this.lastSendingDeletionIdentifier)
					{
						this.uploadedFiles.splice(i, 1);
						this.uploadedFilesEdition.splice(i, 1); // at same index
						break;
					}
				}

				// Delete html part
				$('upload-line-' + escape(this.lastSendingDeletionIdentifier)).remove();
				Notifications.Display(2, "Song " + this.lastSendingDeletionIdentifier + " sucessfully deleted");

				this.lastSendingDeletionIdentifier = null;

				this.reinitTable();
			}
		}
		else if(ret == "error")
		{
			this.lastSendingDeletionIdentifier = null;
			Notifications.Display(4, message);
		}
	},

	updateResponse: function(ret, message)
	{
		if(ret == "success")
		{
			Notifications.Display(1, message);

			var lastId = escape(this.lastSendingUpdateIdentifier),
				selector = 'upload-line-' + lastId,
				$selector = $(selector);

			// Delete all modified styles
			$selector.select('[class="modified"]').each(function(e)
			{
				e.removeClassName("modified");
			});

			// Hide update
			$selector.select('[class="update"]').each(function(e)
			{
				e.hide();
			});

			// Show validate
			$selector.select('[class="validate"]').each(function(e)
			{
				e.show();
			});
		}
		else if(ret == "error")
		{
			Notifications.Display(4, message);
		}
		this.lastSendingUpdateIdentifier = null;
	},

	validationResponse: function(ret, message)
	{
		if(ret == "success")
		{
			Notifications.Display(1, message);
			if(this.lastSendingValidationIdentifier !== null)
			{
				// Delete entry
				for(var i = 0, len = this.uploadedFiles.length; i < len; ++i)
				{
					if(this.uploadedFiles[i].filename == this.lastSendingValidationIdentifier)
					{
						this.uploadedFiles.splice(i, 1);
						this.uploadedFilesEdition.splice(i, 1); // at same index
						break;
					}
				}

				// Delete html part
				$('upload-line-' + escape(this.lastSendingValidationIdentifier)).remove();

				this.lastSendingValidationIdentifier = null;

				this.reinitTable();
			}
		}
		else if(ret == "error")
		{
			this.lastSendingValidationIdentifier = null;
			Notifications.Display(4, message);
		}
	},

	reinitTable: function()
	{
		var $uploaded_files = $('uploaded-files');
		if($uploaded_files.down('tbody').childElementCount === 0)
		{
			$uploaded_files.update("No file uploaded yet.");
			this.uploadedFilesEdition = null;
			this.uploadedFiles = null;
		}
		else
		{
			var temp = new Date().getTime();
			$('uploaded-filelist-' + this.tableId).id = 'uploaded-filelist-' + temp;
			this.tableId = temp;
			this.tableKit = new TableKit('uploaded-filelist-' + this.tableId,
			{
				'sortable': true,
				'editable': true,
				'trueResize': true,
				'keepWidth': true
			});
		}
	},

	treatResponse: function(resp)
	{
		if(resp.action_response)
		{
			var obj = resp.action_response,
				ret = obj["return"],
				msg = obj["message"];
			switch(obj.name)
			{
				case "validate_uploaded_file":
					this.validationResponse(ret, msg);
					break;
				case "delete_uploaded_file":
					this.deletionResponse(ret, msg);
					break;
				case "update_uploaded_file":
					this.updateResponse(ret, msg);
					break;
			}
		}

		if(resp.files)
		{
			this.displayUploadedFiles(resp.files);
		}
	},

	getUploadedFileHtml: function(obj)
	{
		var html = '<td class="static">' + obj.filename + '</td><td>';
		if(obj.artist) {html += obj.artist;}
		html += '</td><td>';
		if(obj.album) {html += obj.album;}
		html += '</td><td>';
		if(obj.title) {html += obj.title;}
		html += '</td><td>' + obj.year + '</td><td>';

		var trackSlashIndex = obj.track.toString().indexOf("/");
		if(trackSlashIndex != -1) {html += obj.track.split("/")[0];}
		else {html += obj.track;}
		html += '</td><td>';
		if(trackSlashIndex != -1) {html += obj.track.split("/")[1];}
		else {html += 0;}
		html += '</td><td>';
		if(genres[obj.genre])
		{
			html += genres[obj.genre];
		}
		html += '</td>' +
		'<td class="static actions">' +
			'<div>' +
				'<a href="javascript:void(0);">X</a>' +
			'</div>' +
			
			'<div class="update" style="display:none;">' +
				'<a href="javascript:void(0);">&nbsp;Update&nbsp;</a>' +
			'</div>' +

			'<div class="validate">' +
				'<a href="javascript:void(0);">&nbsp;Validate&nbsp;</a>' +
			'</div>' +
		'</td>';

		var fname = escape(obj.filename),
			tr = new Element('tr', {'id': 'upload-line-' + fname}).update(html),
			divs = tr.select('div'),
			that = this;
		
		divs[0].on("click", function(){that.deleteUploadedSong(fname);});
		divs[1].on("click", function(){that.updateUploadedSong(fname);});
		divs[2].on("click", function(){that.validateUploadedSong(fname);});

		return tr;
	},

	displayUploadedFiles: function(uploaded_files)
	{
		var i, j,
			len,
			found,
			$uploaded_files = $('uploaded-files'),
			$uploaded_files_tbody = $uploaded_files.down('tbody'),
			that = this;

		// Check for new files every 5 seconds
		clearTimeout(this.refresher);
		this.refresher = setTimeout(function()
		{
			that.getUploadedFiles();
		}, 5000);

		/*TODO:
		The following code doesn't work in a multi-users scenario where users upload/delete/validate files at the same time
		For example, the case this.uploadedFiles.length == uploaded_files.length but with different files is not handle
		=> recreate the whole table each time? Recheck all items to delete/add ?
		*/

		// Insertion when there was no item in the array in the previous state
		if(this.uploadedFiles === null /*|| this.uploadedFilesEdition == null*/ ||
			(
				$uploaded_files_tbody === null ||
				$uploaded_files_tbody.childElementCount === 0 && uploaded_files.length > 0
			)
		)
		{
			if(uploaded_files.length > 0)
			{
				// trick used to clone ; TODO: replace with Extend
				this.uploadedFiles = JSON.parse(JSON.stringify(uploaded_files));
				this.uploadedFilesEdition = JSON.parse(JSON.stringify(uploaded_files));

				var html = '<table id="uploaded-filelist-' + this.tableId + '" class="sortable resizable editable upload-table">';
				var tr = '<tr>' +
					'<th>Filename</th>' +
					'<th class="artist">Artist</th>' +
					'<th class="album">Album</th>' +
					'<th class="title">Title</th>' +
					'<th class="year">Year</th>' +
					'<th class="track">Track</th>' +
					'<th class="trackNb">TrackNb</th>' +
					'<th class="genre">Genre</th>' +
					'<th>Actions</th>' +
				'</tr>';
				html += '<thead>' + tr + '</thead><tfoot>' + tr + '</tfoot></table>';
				$uploaded_files.update(html);

				// Construct <tbody>
				var tbody = new Element('tbody');
				for(i = 0; i < uploaded_files.length; ++i)
				{
					tbody.insert(this.getUploadedFileHtml(uploaded_files[i]));
					this.removeFileFromQQUpload(uploaded_files[i].filename);
				}
				$uploaded_files.down('table').insert(tbody);

				this.makeCellEditable("artist");
				this.makeCellEditable("album");
				this.makeCellEditable("title");
				this.makeCellEditable("year");
				this.makeCellEditable("track");
				this.makeCellEditable("trackNb");
				this.makeCellEditable("genre");

				this.tableKit = new TableKit('uploaded-filelist-' + this.tableId,
				{
					'sortable': true,
					'editable': true,
					'trueResize': true,
					'keepWidth': true
				});
			}
			else // uploaded_files.length == 0
			{
				// The array is empty and nothing to insert
				$uploaded_files.update("No file uploaded yet.");
			}
		}
		else if(this.uploadedFiles.length > uploaded_files.length)
		{
			// Find files to delete
			var deleteLines = [];
			for(j = 0, len = this.uploadedFiles.length; j < len; ++j)
			{
				found = false;
				for(i = 0; i < uploaded_files.length; ++i)
				{
					if(uploaded_files[i].filename == this.uploadedFiles[j].filename)
					{
						found = true;
						break;
					}
				}
				if(!found)
				{
					deleteLines.push(this.uploadedFiles[j].filename);
				}
			}

			// Deletes unneeded references
			for(i = 0; i < deleteLines.length; ++i)
			{
				// Delete unmodified reference entry
				for(j = 0, len = this.uploadedFiles.length; j < len; ++j)
				{
					if(this.uploadedFiles[i].filename == deleteLines[i].filename)
					{
						this.uploadedFiles.splice(i, 1);
						this.uploadedFilesEdition.splice(i, 1); // at same index
						break;
					}
				}

				// Remove the html Element
				$('upload-line-' + escape(deleteLines[i])).remove();
			}
		}
		else if(this.uploadedFiles.length < uploaded_files.length)
		{
			// Find files to add
			var newLines = [];
			for(i = 0, len = uploaded_files.length; i < len; ++i)
			{
				found = false;
				for(j = 0; j < this.uploadedFiles.length; ++j)
				{
					if(uploaded_files[i].filename == this.uploadedFiles[j].filename)
					{
						found = true;
						break;
					}
				}
				if(!found)
				{
					newLines.push(uploaded_files[i]);
				}
			}

			// Add files to references
			for(i = 0, len = newLines.length; i < len; ++i)
			{
				//TODO: clone with Extend(true, {}, object);
				this.uploadedFiles.push(JSON.parse(JSON.stringify(newLines[i])));
				this.uploadedFilesEdition.push(JSON.parse(JSON.stringify(newLines[i])));
				$('uploaded-filelist-' + this.tableId).down('tbody').insert(this.getUploadedFileHtml(newLines[i]));

				this.removeFileFromQQUpload(newLines[i].filename);
			}

			if(this.uploadedFiles.length !== 0 && newLines.length > 0)
			{
				this.reinitTable();
			}
		}
	},

	makeCellEditable: function(name)
	{
		var obj = new MusicFieldEditor(name, this.uploadedFiles, this.uploadedFilesEdition);
		TableKit.Editable.addCellEditor(obj);
	},

	removeFileFromQQUpload: function(filename)
	{
		$$('.qq-upload-success').each(function(element)
		{
			if(element.down('.qq-upload-file').innerHTML == filename)
			{
				element.remove();
				Notifications.Display(1, 'Informations for ' + filename + 'successfully retrieved.');
			}
		});
	},

	getUploadedFiles: function()
	{
		this.jukebox.getUploadedFiles();
	},

	clear: function()
	{
		clearTimeout(this.refresher);
		this.refresher = null;

		if(this.uploader._handler._queue.length > 0)
		{
			Notifications.Display(1, "All current uploads canceled.");
		}
		this.uploader._handler.cancelAll();		
	},

	updateContent: function()
	{
		var upload_form = '<div id="file-uploader' + this.identifier + '"></div>' +
			'<h2>Uploaded files</h2>' +
			'<div id="uploaded-files" style="overflow:auto;"></div>';

		$('tabContent-' + this.identifier).update(upload_form);

		// Init upload button behavior
		this.uploader = new qq.FileUploader(
		{
			element: document.getElementById('file-uploader' + this.identifier),
			action: 'upload',
			params:
			{
				id: this.identifier
			},
			debug: true
		});

		// Send a json query to obtain the list off uploaded files
		this.getUploadedFiles();
	}
});

this.DebugTab = Class.create(Tab, 
{
	initialize: function(identifier, tabName)
	{
		this.identifier = identifier;
		this.name = tabName;
		this.unique = 'DebugTab';
	},

	updateSendingQuery: function(query)
	{
		this.$debug1.update('<h2>Data sent</h2><p>' + JsonPrettyPrint(query) + '</p>');
		this.$debug2.update('<h2>Waiting for response...</h2>');
	},

	updateResponse: function(responseText)
	{
		if(!responseText)
		{
			this.$debug2.update('<img src="images/server_down.jpg" />');
		}
		else
		{
			this.$debug2.update('<h2>Data received:</h2>' +
				'<p> ' + responseText + '</p>' +
				'<h2>JSON response: </h2>' +
				'<p>' + JsonPrettyPrint(responseText.evalJSON()) + '</p>'
			);
		}
	},

	updateContent: function()
	{
		var debug_display = '' +
		'<h1>Debug console</h1>' +
		'<table width="100%">' +
		'<tr>' +
			'<td width="50%">' +
				'<div></div>' +
			'</td>' +
			'<td width="50%">' +
				'<div></div>' +
			'</td>' +
		'</tr>' +
		'</table>';
		var $content = $('tabContent-' + this.identifier);
		$content.update(debug_display);

		this.$debug1 = $content.down('div:first');
		this.$debug2 = $content.down('div:last');
	}
});


this.CustomQueriesTab = Class.create(Tab,
{
	initialize: function(identifier, tabName)
	{
		this.identifier = identifier;
		this.name = tabName;
		this.unique = 'CustomQueriesTab';
	},

	updateContent: function()
	{
		var custom_queries_display = '' +
		'<h1>Custom Json Query</h1>' +
		'<table width="100%">' +
		'<tr>' +
			'<td colspan="2">' +
			'<center>' +
				'<textarea style="width:100%;height:160px;"></textarea>' +
			'</center>' +
			'</td>' +
		'</tr>' +
		'<tr>' +
			'<td>' +
				'Query filler : ' +
				'<select>' +
					'<option value="clear_form">clear_form</option>' +
					'<option value="dummy" selected="selected">--------</option>' +
					'<option value="empty">empty</option>' +
					'<option value="next">next</option>' +
					'<option value="previous">previous</option>' +
					'<option value="add_to_play_queue">add_to_play_queue</option>' +
					'<option value="remove_from_play_queue">remove_from_play_queue</option>' +
					'<option value="move_in_play_queue">move_in_play_queue</option>' +
					'<option value="join_channel">join_channel</option>' +
					'<option value="get_news">get_news</option>' +
					'<option value="search">search</option>' +
				'</select>' +
			'</td>' +
			'<td><input type="button" value="send custom query"/></td>' +
		'</tr>' +
		'</table>';
		var $content = $('tabContent-' + this.identifier);
		$content.update(custom_queries_display);

		var $textarea = $content.down('textarea'),
			query,
			actions;

		//----------
		// Combobox

		var $select = $content.down('select');
		$select.on("change", function fillCustomJsonQuery()
		{
			var opts = {},
				value = this.value; // this.options[this.selectedIndex].value;
			
			switch(value)
			{
				case "dummy":
					return false;
				case "clear_form":
					$textarea.value = '';
					this.selectedIndex = 1;
					return false;
				case "add_to_play_queue":
				case "remove_from_play_queue":
				case "move_in_play_queue":
					opts = 
					{
						mid: 123,
						play_queue_index: 1
					};
					break;
				case "join_channel":
					opts =
					{
						channel: "trashman"
					};
					break;
				case "get_news":
					opts = 
					{
						first_result: 0,
						result_count: 5
					};
					break;
				case "search":
					opts = 
					{
						search_value: "muse",
						search_field: "artist",
						order_by: "artist",
						first_result: 0,
						result_count: 10
					};
					break;
			}
			if(value == "move_in_play_queue")
			{
				opts.new_play_queue_index = 0;		
			}

			actions = value == "empty" ? [] : [new Action(value, opts)];
			query = new Query(1317675258, actions);	
			$textarea.value = JSON.stringify(query.valueOf(), null, "\t"); // query.toJSON(); doesn't support custom indentation
			this.selectedIndex = 1;

			return false; // Stop event
		});

		//----------
		// Button

		var $input = $content.down('input');
		$input.on("click", function checkAndSendJson()
		{
			// Check if the textarea is filled
			if($textarea.value === '')
			{
				Notifications.Display(Notifications.LEVELS.warning, 'Please fill the textarea');
				return;
			}

			// Check if the textarea contains a valid json query
			var json = JSON.parse($textarea.value);
			if(json && json.action)
			{
				query = new Query(json.timestamp ? json.timestamp : 0);
				if(Object.isArray(json.action))
				{
					actions = json.action;
				}
				else
				{
					actions = [json.action];
				}

				for(var i = 0; i < actions.length; ++i)
				{
					var action = new Action(actions[i].name, actions[i]);
					query.addAction(action);
				}

				sendQueryProxy(query);
			}
		});
	}
});

this.NotificationTab = Class.create(Tab,
{
	initialize: function(identifier, tabName)
	{
		this.identifier = identifier;
		this.name = tabName;
		this.uploader = null;
		this.unique = "NotificationTab";
	},

	updateContent: function()
	{
		var $tabContent = $('tabContent-' + this.identifier);
		$tabContent.update('<h1>Notification tests:</h1>');

		function addButton(level)
		{
			var btn = new Element('input', {type: 'button', value: 'Test ' + level});
			btn.on("click", function()
			{
				Notifications.Display(Notifications.LEVELS[level], "Notification: " + level);
			});
			$tabContent.insert(btn);
		}

		for(var level in Notifications.LEVELS)
		{
			addButton(level);
		}
	}
});

/**
* Represents an Action that is going to be sent to server.
* @constructor
* @param {string} name - The name of the action.
* @param {object} [opts] - The facultative options.
* @return {Action} The Action object.
*/
function Action(name, opts)
{
	if(!(this instanceof arguments.callee))
	{
		// If user accidentally omits the new keyword, this will silently correct the problem...
		return new Action(name, opts);
	}

	this.name = name;
	switch(name)
	{
		case "join_channel":
			this.channel = opts.channel;
			break;
		case "next":
		case "previous":
		case "shuffle_play_queue":
		case "get_uploaded_files":
			// Nothing particular, but declared as valid actions
			break;
		case "add_to_play_queue":
		case "remove_from_play_queue":
			this.mid = opts.mid;
			this.play_queue_index = opts.play_queue_index;
			break;
		case "move_in_play_queue":
			this.mid = opts.mid;
			this.play_queue_index = opts.play_queue_index;
			this.new_play_queue_index = opts.new_play_queue_index;
			break;
		case "get_news":
			this.first_result = opts.first_result;
			this.result_count = opts.result_count;
			break;
		case "select_plugin":
			// TODO : get rid of channel. Server should know in which channel client is.
			this.channel = opts.channel;
			this.plugin_name = opts.plugin_name;
			break;
		case "search":
		case "update_uploaded_file":
		case "add_search_to_play_queue":
			Extend(this, opts);
			break;
		case "delete_uploaded_file":
		case "validate_uploaded_file":
			this.file_name = opts.file_name;
			break;
		default:
			throw new Error("Invalid action");
	}

	Object.seal(this);
}

/**
* Helper to compute a search Action
* @param {int} page 
* @param {int} identifier 
* @param {string} select_fields 
* @param {string} search_value 
* @param {string} search_comparison 
* @param {string} search_field 
* @param {string} order_by 
* @param {int} result_count 
* @param {bool} select 
* @return {Action} The search action.
*/
Action.search = function(page, identifier, select_fields, search_value, search_comparison, search_field, order_by, result_count, select)
{
	var opts =
	{
		identifier: identifier ? identifier : null,
		select: !!select,

		search_value: search_value,
		search_comparison: search_comparison ? search_comparison : search_field != 'genre' ? 'like' : 'equal',
		search_field: search_field,

		first_result: (!page || page == 1) ? 0 : page,
		result_count: result_count
	};
	if(order_by)
	{
		opts.order_by = order_by;
	}
	if(select_fields)
	{
		opts.select_fields = select_fields;
	}

	var searchOpts = Extend({}, Action.search.defaultOptions, opts);
	return new Action('search', searchOpts);
};

Action.search.defaultOptions =
{
	search_value: '',
	search_comparison: 'like', // strict, like, equal
	search_field: '', // ex.: title, artist, album
	order_by: 'artist,album,track,title', // ex.: title COLLATE NOCASE DESC, artist ASC, album
	select_fields: 'mid,title,album,artist,track,genre,duration',
	first_result: 0,
	result_count: 20
};

/**
* Represents a Query that is going to be sent to server.
* @constructor
* @param {string} lastTimestamp - The last timestamp the client received from server.
* @param {Array<Action>} [actions] - A facultative array of Action.
* @return {Query} The Query object.
*/
function Query(lastTimestamp, actions)
{
	if(!(this instanceof arguments.callee))
	{
		// If user accidentally omits the new keyword, this will silently correct the problem...
		return new Query(lastTimestamp, actions);
	}

	this.lastTimestamp = lastTimestamp;
	this.actions = [];
	this.search = null;

	if(actions)
	{
		for(var i = 0; i < actions.length; ++i)
		{
			if(actions[i] instanceof Action)
			{
				this.actions.push(actions[i]);
			}
		}
	}

	// http://www.piotrwalat.net/preventing-javascript-object-modification/
	Object.seal(this); // Non-extensible, Non-removable
}
/**
* Add an action to the query.
* We do not check if the very same action is already in the list.
* The action is not cloned. Therefore you can modify it even after a call to this method.
* @param {Action} action - The action to add.
*/
Query.prototype.addAction = function(action)
{
	if(action instanceof Action)
	{
		if(action.name == "search")
		{
			this.search = action;
		}
		else
		{
			this.actions.push(action);
		}
	}
	else
	{
		throw new Error("Invalid action parameter");
	}
};
/**
* @param {int} timestamp - The last timestamp the client received from server
*/
Query.prototype.setTimestamp = function(timestamp)
{
	this.lastTimestamp = timestamp;
};
/**
* Remove all registered actions.
*/
Query.prototype.removeAllActions = function()
{
	this.actions = [];
};
/**
* Output a JSON string representing the query (stringify).
* @return {string} The stringified JSON query.
*/
Query.prototype.toJSON = function()
{
	return Object.toJSON(this.valueOf());
};
/**
* Output an object representing the query.
* @return {object} The query object.
*/
Query.prototype.valueOf = function()
{
	var obj;

	if(this.actions.length === 0)
	{
		obj = {timestamp: this.lastTimestamp}; // Nothing asked
	}
	else
	{
		obj =
		{
			timestamp: this.lastTimestamp,
			action: (this.actions.length == 1 ? this.actions[0] : this.actions)
		};
	}
	if(this.search)
	{
		obj.search = this.search;
	}

	return obj;
};

function MusicFieldEditor(name, uploadedFiles, uploadedFilesEdition)
{
	this.name = name;
	this.uploadedFiles = uploadedFiles;
	this.uploadedFilesEdition = uploadedFilesEdition;
}

MusicFieldEditor.prototype._cancel = function(e)
{
	var cell = Event.findElement(e,'td');
	Event.stop(e);
	this.cancel(cell);
};
MusicFieldEditor.prototype.cancel = function(cell)
{
	var data = TableKit.getCellData(cell);
	cell.innerHTML = data.htmlContent;
	data.htmlContent = '';
	data.active = false;
};

MusicFieldEditor.prototype._undo = function(e)
{
	var cell = Event.findElement(e,'td');
	Event.stop(e);
	this.undo(cell);
};
MusicFieldEditor.prototype.undo = function(cell)
{
	var row = cell.up('tr'),
		identifier = row.id; // // Get the line filename ( identifier )

	// Update html
	for(var i = 0, len = this.uploadedFiles.length; i < len; ++i)
	{
		var fname = escape(this.uploadedFiles[i].filename);
		if("upload-line-" + fname == identifier)
		{
			// Show validate
			var selector = 'upload-line-' + fname,
				$selector = $(selector);
			if($selector.select('[class="modified"]').length == 1)
			{
				$selector.select('[class="update"]').each(function(e){e.hide();});
				$selector.select('[class="validate"]').each(function(e){e.show();});
			}
			if(this.name == "track")
			{
				cell.update(this.uploadedFiles[i]["track"].split('/')[0]);
			}
			else if (this.name == "trackNb")
			{
				cell.update(this.uploadedFiles[i]["track"].split('/')[1]);
			}
			else
			{
				cell.update(this.uploadedFiles[i][this.name]);
			}
			this.uploadedFilesEdition[i][this.name] = this.uploadedFiles[i][this.name];
			break;
		}
	}

	// Remove cell style modified
	cell.removeClassName("modified");

	var data = TableKit.getCellData(cell);
	data.active = false;
};

MusicFieldEditor.prototype._submit = function(e)
{
	var cell = Event.findElement(e,'td');
	var form = Event.findElement(e,'form');
	Event.stop(e);
	this.submit(cell,form);
};

MusicFieldEditor.prototype.submit = function(cell, form)
{
	form = form ? form : cell.down('form');

	var row = cell.up('tr'),
		identifier = row.id, // Get the line filename ( identifier )
		firstChild = form.firstChild,
		firstChildVal = firstChild.value;

	// Update html
	if(this.name == "genre" && genres[firstChildVal])
	{
		cell.update(genres[firstChildVal]);
	}
	else
	{
		cell.update(firstChildVal);
	}

	// Update new value
	for(var i = 0, len = this.uploadedFilesEdition.length; i < len; ++i)
	{
		var fileE = this.uploadedFilesEdition[i],
			fname = escape(fileE.filename);
		if("upload-line-" + fname == identifier)
		{
			if(this.name == "genre")
			{
				fileE[this.name] = firstChild.options[firstChild.selectedIndex].value;
			}
			else if(this.name == "track")
			{
				if(fileE[this.name].toString().indexOf("/") == -1)
				{
					fileE[this.name] = firstChildVal + "/0";
				}
				else
				{
					fileE[this.name] = firstChildVal + "/" + fileE[this.name].split("/")[1];
				}
			}
			else if(this.name == "trackNb")
			{
				if(fileE["track"].toString().indexOf("/") == -1)
				{
					fileE["track"] = fileE["track"] + "/" + firstChildVal;
				}
				else
				{
					fileE["track"] = fileE["track"].toString().split('/')[0] + "/" + firstChildVal;
				} 
			}
			else
			{
				fileE[this.name] = firstChildVal;
			}

			// Upload cell style ff the new value differs
			if( (
					( this.name == "track" && this.uploadedFiles[i][this.name].split('/')[0] != firstChildVal ) ||
					( this.name == "trackNb" && this.uploadedFiles[i]["track"].split('/')[1] != firstChildVal ) ||
					( this.name != "track" && this.name != "trackNb" && firstChildVal != this.uploadedFiles[i][this.name] )
				) &&
				!cell.hasClassName("modified"))
			{
				// Default behaviour
				cell.addClassName("modified");

				var $selector = $('upload-line-' + fname);
				$selector.select('[class="update"]').each(function(e){e.show();});
				$selector.select('[class="validate"]').each(function(e){e.hide();});

			}
			else if(firstChildVal == this.uploadedFiles[i][this.name] && cell.hasClassName("modified"))
			{
				cell.removeClassName("modified");
			}

			break;
		}
	}

	var data = TableKit.getCellData(cell);
	data.active = false;
};

MusicFieldEditor.prototype.edit = function(cell)
{
	cell = $(cell);
	if(cell.hasClassName("static"))
	{
		return;
	}
	
	var table = cell.up('table'),
		row = cell.up('tr'),
		identifier = row.id,
		len,
		i;

	// Change behaviour following the column name
	var form = $(document.createElement("form"));
	form.id = cell.id + '-form';
	form.addClassName(TableKit.option('formClassName', table.id)[0]);
	form.onsubmit = this._submit.bindAsEventListener(this);

	// Change behavior from field names
	var modified = false;

	if(this.name == "genre")
	{
		// Create genre element add fill options
		var select = document.createElement("select");
		select.id = "genre";
		form.appendChild(select);

		for(i = 0, len = genresOrdered.length; i < len; ++i)
		{
			var genre = genresOrdered[i];
			var option = document.createElement('option');
			option.value = genre.id;
			option.appendChild(document.createTextNode(genre.name));
			select.appendChild(option);
		}

		for(i = 0, len = this.uploadedFilesEdition.length; i < len; ++i)
		{
			if("upload-line-" + escape(this.uploadedFilesEdition[i].filename) == identifier)
			{
				if(this.uploadedFilesEdition[i]["genre"] != this.uploadedFiles[i]["genre"])
				{
					modified = true;
				}
			}
		}
	}
	else
	{
		var input = document.createElement("input");
		input.type = "text";

		// Update new value
		for(i = 0, len = this.uploadedFilesEdition.length; i < len; ++i)
		{
			var fileE = this.uploadedFilesEdition[i];
			if("upload-line-" + escape(fileE.filename) == identifier)
			{
				if(this.name == "track")
				{
					if(fileE["track"].toString().indexOf('/') == -1)
					{
						input.value = fileE["track"];
					}
					else
					{
						input.value = fileE["track"].toString().split('/')[0];
						if(fileE["track"].toString().split('/')[1] != this.uploadedFiles[i]["track"].toString().split('/')[1])
						{
							modified = true;
						}
					}
				}
				else if(this.name == "trackNb")
				{
					if(fileE["track"].toString().indexOf('/') == -1)
					{
						input.value = "0";
					}
					else
					{
						input.value = fileE["track"].toString().split('/')[1];
						if(fileE["track"].toString().split('/')[1] != this.uploadedFiles[i]["track"].toString().split('/')[1])
						{
							modified = true;
						}
					}
				}
				else
				{
					input.value = fileE[this.name];
					if(fileE[this.name] != this.uploadedFiles[i][this.name])
					{
						modified = true;
					}
				}

				break;
			}
		}
		form.appendChild(input);
	}

	var okButton = document.createElement("input");
	okButton.type = "submit";
	okButton.value = "submit";
	okButton.className = 'editor-ok-button';
	form.appendChild(okButton);

	if(modified)
	{
		var undoLink = document.createElement("a");
		undoLink.href = "#";
		undoLink.appendChild(document.createTextNode("undo "));
		undoLink.onclick = this._undo.bindAsEventListener(this);
		undoLink.className = 'editor-undo';      
		form.appendChild(undoLink);
		form.appendChild(document.createTextNode(" "));
	}
	
	var cancelLink = document.createElement("a");
	cancelLink.href = "#";
	cancelLink.appendChild(document.createTextNode("cancel"));
	cancelLink.onclick = this._cancel.bindAsEventListener(this);
	cancelLink.className = 'editor-cancel';      
	form.appendChild(cancelLink);

	cell.innerHTML = '';
	cell.appendChild(form);

	// Update new value
	for(i = 0, len = this.uploadedFilesEdition.length; i < len; ++i)
	{
		if("upload-line-" + escape(this.uploadedFilesEdition[i].filename) == identifier)
		{
			// Automatically select genre
			var options = $$('select#genre option');
			var len2 = options.length;
			if(len2 > 0 && len2 < this.uploadedFilesEdition[i][this.name])
			{
				options[len2-1].selected = true;
			}
			for(var j = 0; j < len2; j++)
			{
				if(options[j].value == this.uploadedFilesEdition[i][this.name])
				{
					options[j].selected = true;
					break;
				}
			}
		}
	}
};

var uniqid = 0,
	sendQueryProxy;

/**
* Represents a Jukebox controller.
* @constructor
* @param {string} element - The DOM element that contains the jukebox.
* @param {object} [opts] - The facultative options.
* @return {Jukebox} The Jukebox object.
*/
function Jukebox(element, opts)
{
	if(!(this instanceof arguments.callee))
	{
		// If user accidentally omits the new keyword, this will silently correct the problem...
		// See: http://stackoverflow.com/questions/383402/is-javascript-s-new-keyword-considered-harmful
		return new Jukebox(element, opts);
	}

	//---
	// [Public] Variables

	this.id = "Jukebox" + (++uniqid);
	this.stream = "";
	this.channel = "";
	this.song = null; // Mapped to _current_song
	this.listenersCount = 0; // Mapped to _last_nb_listening_users
	this.streaming = false;
	this.playing = false;
	this.lastServerResponse = null;

	//---
	// [Private] Variables

	// `this` refers to current object, because we're in a "new" object creation
	// Can be used in private methods, privileged methods and events handlers
	var $this = this,

		_opts = Extend(true, {}, Jukebox.defaults, opts), // Recursively merge options

		_timestamp = 0, // last timestamp sent by server
		_channel = null, // current channel we're connected to
		_playQueueSongs = [], // songs in current playlist
		_current_song = null,

		// http://www.schillmania.com/projects/soundmanager2/
		_streamPlayer = null, // mp3 stream player (Flash/ActionScript)
		_volume = 100,

		// Utility
		_last_nb_listening_users = 0,
		_nextQuery = new Query(0),
		_query_in_progress = false,
		_query_timer = null,
		_waitingQueries = [],
		_uploadedFiles = {},
		_readyCallback = null,

		_ui = null; // Graphic interface
	
	//---
	// [Privileged] Functions
	// (Publicly exposed with private data & methods access)

	/**
	* @param {function} callback - Execute callback when the jukebox is ready (.swf fully loaded). Might be immediately. Only last registered callback works.
	* @return {Jukebox} this.
	*/
	this.ready = function(callback)
	{
		if(typeof callback !== "function")
		{
			var msg = "Invalid parameter: .ready() needs a function";
			Notifications.Display(Notifications.LEVEL.error, msg);
			throw new Error(msg);
		}

		_readyCallback = callback;

		if(soundManager.enabled)
		{
			_startCallback();
		}

		return this;
	};

	/**
	* @param {bool} auto - Activate of deactivate autorefresh mode. This will update current song.
	* @return {Jukebox} this.
	*/
	this.autoRefresh = function(auto)
	{
		_opts.autorefresh = !!auto; // Cast to bool
		if(_opts.autorefresh) // Start autorefresh
		{
			_update();
		}
		return this;
	};

	/**
	* Force an update right now.
	* @return {Jukebox} this.
	*/
	this.refresh = function()
	{
		_timestamp = 0;
		_update();
		return this;
	};
	
	/**
	* @param {string} channel - The channel to join.
	* @return {Jukebox} this.
	*/
	this.joinChannel = function(channel)
	{
		_doAction(new Action("join_channel", {channel: channel}));
		return this;
	};

	/**
	* (Re-)Start the audio stream
	* @return {Jukebox} this.
	*/
	this.start = function()
	{
		_streamPlayer.play();
		this.streaming = true;
		_ui.playing(this.playing = true);
		return this;
	};

	/**
	* Stop the audio player. Does NOT stop the streaming.
	* @return {Jukebox} this.
	*/
	this.stop = function()
	{
		_streamPlayer.unload();
		this.streaming = false;
		_ui.playing(this.playing = false);
		return this;
	};

	/**
	* @param {int|string} [volume] - The volume to set in the [0-100] range.
	* @return {int} The volume in the [0-100] range.
	*/
	this.volume = function(volume)
	{
		if(arguments.length > 0) // Important: this condition allows volume==0 ; "if(!volume)" doesn't.
		{
			volume = Number(volume);
			if(volume < 0 || volume > 100)
			{
				var msg = "Invalid volume level: " + volume + " is not in 0-100 range";
				Notifications.Display(Notifications.LEVEL.error, msg);
				throw new Error(msg);
			}
			else
			{
				_streamPlayer.setVolume(volume); // 0-100
				_ui.volume(volume);
			}
		}
		_volume = _streamPlayer.volume;
		return _volume;
	};

	/**
	* Make a search
	* @param {int} page 
	* @param {int} identifier 
	* @param {string} select_fields 
	* @param {string} search_value 
	* @param {string} search_comparison 
	* @param {string} search_field 
	* @param {string} order_by 
	* @param {int} result_count 
	* @param {bool} select 
	* @return {Jukebox} this.
	*/
	this.search = function(/*page, identifier, select_fields, search_value, search_comparison, search_field, order_by, result_count, select*/)
	{
		var action = Action.search.apply(0, arguments); // trick to avoid copy/paste of args
		_doAction(action);
		return this;
	};

	/*TODO:

	this.PlayQueue =
	{
		addToRandom: function(mid | search, comparison, field, order, first, count)
		{
			
		},
		addToTop: function(mid | search, comparison, field, order, first, count)
		{
			
		},
		addToBottom: function(mid | search, comparison, field, order, first, count)
		{

		},
		delete: function(mid, play_queue_index)
		{

		},
		shuffle: function()
		{

		},
		move: function(mid, play_queue_index, new_play_queue_index)
		{

		},
		size: function()
		{

		}
	};

	function PlayQueue()
	{
		
	}
	PlayQueue.prototype.addToRandom = function(mid)
	{
	
	};

	*/

	/**
	* Add a song to the play queue at a certain position
	* @param {int} mid - The song id
	* @param {int} play_queue_index - Index to put the song to
	* @return {Jukebox} this.
	*/
	this.addToPlayQueue = function(mid, play_queue_index)
	{
		_addToPlayQueue(mid, play_queue_index);
		return this;
	};

	/**
	* Add a song at a random position in the play queue
	* @param {int} mid - The song id
	* @return {Jukebox} this.
	*/
	this.addToPlayQueueRandom = function(mid)
	{
		_addToPlayQueue(mid, Math.floor(Math.random() * _playQueueSongs.length));
		return this;
	};

	/**
	* Add a song at the top of the play queue
	* @param {int} mid - The song id
	* @return {Jukebox} this.
	*/
	this.addToPlayQueueTop = function(mid)
	{
		_addToPlayQueue(mid, 0);
		return this;
	};

	/**
	* Add a song at the end of the play queue
	* @param {int} mid - The song id
	* @return {Jukebox} this.
	*/
	this.addToPlayQueueBottom = function(mid)
	{
		_addToPlayQueue(mid, _playQueueSongs.length);
		return this;
	};

	/**
	* Shuffle the play queue
	* @return {Jukebox} this.
	*/
	this.playQueueShuffle = function()
	{
		_doAction(new Action("shuffle_play_queue"));
		return this;
	};

	/**
	* Delete a song or all songs from the play queue
	* @param {int} mid - The song id
	* @param {int} play_queue_index - Index of the song ; This parameter is used to check for a simultaneous deletion (by another user)
	* @return {Jukebox} this.
	*/
	this.playQueueDelete = function(mid, play_queue_index)
	{
		if(arguments.length === 0)
		{
			_playQueueDelete();
		}
		else
		{
			_playQueueDelete(mid, play_queue_index);
		}
		return this;
	};

	/**
	* Move a song position in the play queue.
	* @param {int} mid - The song id
	* @param {int} play_queue_index - Current song position ; Used to check for a simultaneous deletion (see playQueueDelete)
	* @param {int} new_play_queue_index - New song position
	* @return {Jukebox} this.
	*/
	this.playQueueMove = function(mid, play_queue_index, new_play_queue_index)
	{
		_doAction(new Action("move_in_play_queue",
			{
				mid: mid,
				play_queue_index: play_queue_index,
				new_play_queue_index: new_play_queue_index
			})
		);
		return this;
	};

	/**
	* Get current play queue length
	* @return {int} Play queue length.
	*/
	this.playQueueSize = function()
	{
		return _playQueueSongs.length;
	};

	/**
	* Add a whole search randomly to the play queue
	* @param {string} search 
	* @param {string} comparison 
	* @param {string} field 
	* @param {string} order 
	* @param {int} first 
	* @param {int} count 
	* @return {Jukebox} this.
	*/
	this.addSearchToPlayQueueRandom = function(search, comparison, field, order, first, count)
	{
		_addSearchToPlayQueue('rand', search, comparison, field, order, first, count);
		return this;
	};

	/**
	* Add a whole search to the top of the play queue
	* @param {string} search 
	* @param {string} comparison 
	* @param {string} field 
	* @param {string} order 
	* @param {int} first 
	* @param {int} count 
	* @return {Jukebox} this.
	*/
	this.addSearchToPlayQueueTop = function(search, comparison, field, order, first, count)
	{
		_addSearchToPlayQueue('head', search, comparison, field, order, first, count);
		return this;
	};

	/**
	* Add a whole search to the end of the play queue
	* @param {string} search 
	* @param {string} comparison 
	* @param {string} field 
	* @param {string} order 
	* @param {int} first 
	* @param {int} count 
	* @return {Jukebox} this.
	*/
	this.addSearchToPlayQueueBottom = function(search, comparison, field, order, first, count)
	{
		_addSearchToPlayQueue('tail', search, comparison, field, order, first, count);
		return this;
	};

	/*TODO; html5storage?
	Ability to save playlist and share them could be interesting
	this.savePlayList = function(name)
	{
		
	}

	this.restorePlayList = function(name)
	{
		
	}*/

	/**
	* Go to the next song
	* @return {Jukebox} this.
	*/
	this.next = function(/*TODO: index*/)
	{
		_doAction(new Action("next"));
		return this;
	};

	/**
	* Go to the previous song
	* @return {Jukebox} this.
	*/
	this.previous = function(/*TODO: index*/)
	{
		_doAction(new Action("previous"));
		return this;
	};

	/**
	* Load a server plugin
	* @param {string} name - The plugin name
	* @return {Jukebox} this.
	*/
	this.plugin = function(name)
	{
		_doAction(new Action('select_plugin',
			{
				channel: _channel.name,
				plugin_name: name
			})
		);
		return this;
	};

	/**
	* Ask the server for the list of uploaded files
	* @return {Jukebox} this.
	*/
	this.getUploadedFiles = function()
	{
		_doAction(new Action("get_uploaded_files"));
		return this;
	};

	/**
	* Get the uploaded files list from last fetch. You have to call getUploadedFiles() first.
	* @return {Array<File>} Uploaded files.
	*/
	this.uploadedFiles = function()
	{
		return _uploadedFiles.files ? _uploadedFiles.files.slice() : []; // Cloned: can be setted without impact
	};

	/**
	* Delete an uploaded file
	* @param {string} filename - The upload file to delete
	* @return {Jukebox} this.
	*/
	this.deleteUploadedFile = function(filename)
	{
		_doAction(new Action("delete_uploaded_file", {file_name: filename}));
		return this;
	};

	/**
	* Validate an uploaded file
	* @param {string} filename - The upload file to validate
	* @return {Jukebox} this.
	*/
	this.validateUploadedFile = function(filename)
	{
		_doAction(new Action("validate_uploaded_file", {file_name: filename}));
		return this;
	};

	/**
	* Update an uploaded file
	* @param {object} opts - The update instructions
	* @return {Jukebox} this.
	*/
	this.updateUploadedFile = function(opts)
	{
		_doAction(new Action("update_uploaded_file", opts));
		return this;
	};

	//-----
	// [Private] Functions

	/**
	* A little helper to add an action to the next query and do the query immediately
	* @param {Action} action - The action to add.
	*/
	function _doAction(action)
	{
		_nextQuery.addAction(action);
		_update();
	}

	// Prepare an AJAX query
	function _update()
	{
		_ui.activity(true);
		
		if(_query_in_progress === false)
		{
			// Timeout has ended or new query arrived and timeout still in progress
			if(_query_timer != null)
			{
				clearTimeout(_query_timer);
				_query_timer = null;
			}
		}
		else
		{
			// Query is being sent and new query has arrived
			_waitingQueries.push(_nextQuery);
			_nextQuery = new Query(); // Create a new nextQuery, that will not contain actions for previous _update()
			return;
		}

		_query_in_progress = true;

		var query = _nextQuery;
		_nextQuery = new Query();
		_sendQuery(query);
	}

	// Send an AJAX query
	function _sendQuery(query)
	{
		query.setTimestamp(_timestamp);

		_ui.sendingQuery(query.valueOf());

		var query_json = query.toJSON();
		new Ajax.Request(_opts.URL,
		{
			method: 'POST',
			postBody: query_json,

			// Note: Be carreful if you do simultaneous queries
			// This only work with 1 query at a time
			onSuccess: _events.querySuccess,
			onFailure: _events.queryFailure,
			onComplete: _events.queryComplete
		});
	}

	// Expose _sendQuery in current scope for customQueries.js
	sendQueryProxy = function(query)
	{
		_nextQuery = query; // current value of _nextQuery is lost
		_update();
	};

	/**
	* Parse a server response. In a way, does the opposite of new Action().
	* @param {object} json - The JSON response
	*/
	function _parseJSONResponse(json)
	{
		if(json.timestamp)
		{
			_timestamp = json.timestamp;
		}
		if(json.current_song)
		{
			_current_song = json.current_song;

			// Expose public infos
			$this.song = Extend(true, {}, _current_song); // Cloned: can be setted without impact

			$this.lastServerResponse = new Date();

			_ui.updateCurrentSong(_current_song);
			_ui.updateSongTime(_current_song, $this.lastServerResponse.getTime() / 1000);
		}
		/*TODO
		if(json.action_response)
		{
			
		}*/
		if(json.channel_infos)
		{
			_channel = json.channel_infos;
			$this.channel = _channel.name;

			var message = "",
				nb;			
			// Notification When new user connection or a user left
			if(_last_nb_listening_users > json.channel_infos.listener_count)
			{
				nb = _last_nb_listening_users - json.channel_infos.listener_count;
				message = nb + " user" + (nb > 1 ? "s" : "") + " left the channel";
				Notifications.Display(Notifications.LEVELS.debug, message);
			}
			else if(_last_nb_listening_users < json.channel_infos.listener_count)
			{
				nb = json.channel_infos.listener_count - _last_nb_listening_users;
				message = nb + " user" + (nb > 1 ? "s" : "") + " join the channel";
				Notifications.Display(Notifications.LEVELS.debug, message);
			}
			$this.listenersCount = _last_nb_listening_users = json.channel_infos.listener_count;
			_ui.updateNbUsers(_last_nb_listening_users);
		}
		if(json.play_queue)
		{
			_ui.cleanupPlayQueue();
			_playQueueSongs = json.play_queue.songs;

			var clone = Extend(true, [], _playQueueSongs); // Clone: can be setted (inside ui) without impact
			_ui.displayPlayQueue(clone, _last_nb_listening_users);
		}
		/*TODO
		if(json.news)
		{
			
		}*/
		if(json.search_results)
		{
			_ui.displaySearchResults(json.search_results);
		}
		if(json.messages)
		{
			json.messages.each(function(message)
			{
				Notifications.Display(message.level, message.message);
			});
		}
		if(json.uploaded_files)
		{
			_uploadedFiles = json.uploaded_files;
			_ui.displayUploadedFiles(_uploadedFiles);
		}
	}

	/**
	* Add a song to the play queue at a certain position
	* @param {int} mid - The song id
	* @param {int} play_queue_index - Index to put the song to
	*/
	function _addToPlayQueue(mid, play_queue_index)
	{
		var action;
		if(Object.isArray(mid) && Object.isArray(play_queue_index))
		{
			//_nextQuery.removeAllActions();
			for(var i = 0, end = Math.min(mid.length, play_queue_index.length); i < end; i++)
			{
				action = new Action("add_to_play_queue",
				{
					mid: mid[i],
					play_queue_index: play_queue_index[i]
				});
				_nextQuery.addAction(action);
			}
		}
		else
		{
			action = new Action("add_to_play_queue",
			{
				mid: mid,
				play_queue_index: play_queue_index
			});
			_nextQuery.addAction(action);
		}
		_update();
	}

	/**
	* Delete a song from the play queue
	* @param {int} mid - The song id
	* @param {int} play_queue_index - Index of the song
	*/
	function _playQueueDelete(mid, play_queue_index)
	{
		var action;
		if(arguments.length === 0)
		{		
			// Nothing is passed as argument we want to clear all the playlist
			for(var i = _playQueueSongs.length - 1; i >= 0; --i)
			{
				action = new Action("remove_from_play_queue",
				{
					mid: i, // TODO: Caution this is not the currentSong mid must send the right id
					play_queue_index: i
				});
				_nextQuery.addAction(action);
			}
		}
		else if(Object.isArray(mid) && Object.isArray(play_queue_index))
		{
			// We delete all song passed as argument
			for(var j = 0, end = Math.min(mid.length, play_queue_index.length); j < end; ++j)
			{
				action = new Action("remove_from_play_queue",
				{
					mid: mid[j],
					play_queue_index: play_queue_index[j]
				});
				_nextQuery.addAction(action);
			}        
		}
		else
		{
			action = new Action("remove_from_play_queue",
			{
				mid: mid,
				play_queue_index: play_queue_index
			});
			_nextQuery.addAction(action);
		}
		_update();
	}

	/**
	* Add a whole search at a certain position of the play queue
	* @param {string} position - rand | head | tail 
	* @param {string} search 
	* @param {string} comparison 
	* @param {string} field 
	* @param {string} order 
	* @param {int} first 
	* @param {int} count 
	*/
	function _addSearchToPlayQueue(position, search, comparison, field, order, first, count) // TODO make args facultatives
	{
		// TODO add playqueue identifier to parameters
		var opts =
		{
			play_queue_position: position,
			select_fields: "mid",
			search_value: search,
			search_comparison: comparison,
			search_field: field,
			order_by: order,
			first_result: 0,
			result_count: null
		};

		if(comparison == "like")
		{
			opts.first_result = first;
			opts.result_count = count;
		}

		_doAction(new Action("add_search_to_play_queue", opts));
	}

	function _startCallback()
	{
		if(typeof _readyCallback == "function")
		{
			_readyCallback.call($this);
		}
	}

	//---
	// Events handlers
	
	var _events =
	{
		// AJAX response
		querySuccess: function(response)
		{
			if(_opts.autorefresh)
			{
				_query_timer = setTimeout(function()
				{
					// Call is wrapped in a dummy function to avoid parameter issue with setTimeout
					// See: https://developer.mozilla.org/en/DOM/window.setTimeout
					_update();
				}, _opts.autorefresh_delay);
			}

			if(response.readyState == 4 && response.status === 0) // No ajax response (server down) 
			{
				_ui.gotResponse(null);
				return;
			}

			_ui.gotResponse(response.responseText);

			try
			{
				var json = response.responseText.evalJSON();
				_parseJSONResponse(json);
			}
			catch(parseResponseEx)
			{
				Notifications.Display(Notifications.LEVELS.error, "Error while parsing server response: " + parseResponseEx.message);
			}

			if(_waitingQueries.length > 0)
			{
				// Only do latest request?
				_waitingQueries = []; // Actions of queries referenced in the array are lost
				_update(); // Will use latest _nextQuery
			}
		},
		queryFailure: function()
		{
			//TODO: display error details
			_ui.gotResponse(null);
		},
		queryComplete: function()
		{
			_query_in_progress = false;
			_ui.activity(false);
		}
	};
	
	//---
	// Constructor
	
	/**
	* @constructor
	*/
	function _initialize()
	{
		Object.seal($this); // Non-extensible, Non-removable

		soundManager.setup(
		{
			url: _opts.SM2Folder,
			flashVersion: 9, // 8 doesn't work with flash 11.4 & FF16/IE9
			useFlashBlock: true, // Allow recovery from flash blockers,
			debugMode: false,
			useHTML5Audio: true,
			preferFlash: false,
			onready: function()
			{
				var bufferchangeCount = 0,
					lastbufferChange = new Date();

				(function createNewSound(autoplay)
				{
					_streamPlayer = soundManager.createSound(
					{
						id: $this.id,
						url: _opts.streamURL + '?t=' + new Date().getTime(), // Has to be unique, else SM2 re-use previous stream...
						autoPlay: autoplay,
						onbufferchange: function()
						{
							// Check for too many calls to onbufferchange.
							// If we have more than 2 calls in 2 seconds, then something's wrong.
							// (happens on song change for browsers using the flash player)
							// => reload the stream
							// This is also interesting because it allows to free memory at the end of each song.
							
							bufferchangeCount++;
							if(bufferchangeCount > 2)
							{
								setTimeout(function() // Wait that onbufferchange is finished
								{
									bufferchangeCount = 0; // Reset counter

									var currentVolume = _streamPlayer.volume;

									// Reload the steam
									// [Note that .unload().play() isn't enough]									
									_streamPlayer.destruct(); // Good for memory
									createNewSound(true);

									_streamPlayer.setVolume(currentVolume); // Restore volume
								}, 0); // Immediately after current stack
							}

							var now = new Date();
							if(now.getTime() - lastbufferChange.getTime() > 2000)
							{
								bufferchangeCount = 0;
								lastbufferChange = now;
							}
						}
					});
				})(false);
				
				Notifications.Display(Notifications.LEVELS.debug, "Using " + (_streamPlayer.isHTML5 ? "HTML5" : "flash") + " audio player");

				_startCallback();
			},
			ontimeout: function()
			{
				var msg = "SM2 could not start";
				Notifications.Display(Notifications.LEVELS.error, msg);
				throw new Error(msg);
			}
		});

		_ui = new JukeboxUI($this, element,
		{
			replaceTitle: _opts.replaceTitle
		});

		if(_opts.autorefresh)
		{
			_update();
		}
	}
	_initialize();
}

//---
// [Public] Functions
// (No access to private data and methods)
// (Access to public members/methods and privileged methods)

var jukebox_public_methods =
{
	status: function()
	{
		var status = this.id + ' is ' + (this.streaming ? '':'NOT ') + 'connected to url ' + this.stream + ' and currently ' + (this.playing ? '':'NOT ') + 'playing. Current channel is: ' + this.channel + '. ' + this.listenersCount + ' user' + (this.listenersCount > 1 ? 's are':' is') + ' currently listening. Current song is: ' + this.song.title + ' - ' + this.song.artist + '.';
		return status;
	},
	// Time remaining before next song in seconds
	remaining: function()
	{
		var result = 0;
		if(this.song && this.lastServerResponse instanceof Date)
		{
			var timeAfterLastQuery = (new Date().getTime() - this.lastServerResponse.getTime()) / 1000;
			return Math.round(this.song.duration - this.song.elapsed - timeAfterLastQuery);
		}
		return result;
	}
};

// Add them nicely to the prototype
/*for(var jmethod in jukebox_public_methods)
{
	Jukebox.prototype[jmethod] = jukebox_public_methods[jmethod];
}*/
Extend(Jukebox.prototype, jukebox_public_methods);

// [Static] Variables
Jukebox.defaults =
{
	URL: '/api/json',
	streamURL: '/stream',
	SM2Folder: '/',
	autorefresh: true,
	autorefresh_delay: 3000,
	replaceTitle: true
};

Object.freeze(Jukebox); // Non-extensible, Non-removable, Non-modifiable
Object.freeze(Jukebox.prototype); // 1337 strict mode

this.Jukebox = Jukebox; // Expose on global scope

/**
* Represents a Jukebox graphical interface.
* @constructor
* @param {object} jukebox - The jukebox instance.
* @param {string} element - The DOM element that contains the jukebox.
* @param {object} [opts] - The facultative options.
* @return {JukeboxUI} The JukeboxUI object.
*/
function JukeboxUI(jukebox, element, opts)
{
	if(!(this instanceof arguments.callee))
	{
		// If user accidentally omits the new keyword, this will silently correct the problem...
		return new JukeboxUI(element, opts);
	}

	//---
	// [Public] Variables

	this.skin = JukeboxUI.skins[0];

	//---
	// [Private] Variables
	
	// `this` refers to current object, because we're in a "new" object creation
	// Useful for private methods and events handlers
	var $this = this,
		
		_opts = Extend(true, {}, JukeboxUI.defaults, opts), // Recursively merge options

		J = jukebox, // short jukebox reference
		_tabs = new Tabs('tab'),
		_tabsManager = {},
		_volumeSlider,

		_refreshSongTimer = null,
		_lastCurrentSongElapsedTime = null;

	// Selectors cache
	var _$ =
	{
		elem: $(element),
		music_wrapper: $('music-wrapper'), // TODO: replace thoses id by (sub)classes
		expand_button: $('expand-button'),
		collapse_button: $('collapse-button'),
		page_wrapper: $('page-wrapper'),
		search_input: $('search-input'),
		search_field: $('search-field'),
		search_genres: $('search-genres'),
		results_per_page: $('results-per-page'),
		btn_search: $('btn-search'),
		progressbar: $('progressbar'),
		player_song_time: $('player-song-time'),
		activity_monitor: $('activity-monitor'),
		play_stream: $('play-stream'),
		stop_stream: $('stop-stream'),
		channel: $('channel'),
		btn_join_channel: $('btn-join-channel'),
		previous_button: $('previous-button'),
		next_button: $('next-button'),
		cb_autorefresh: $('cb-autorefresh'),
		btn_refresh: $('btn-refresh'),
		player_song_artist: $('player-song-artist'),
		player_song_album: $('player-song-album'),
		player_song_title: $('player-song-title'),
		play_queue_content: $('play-queue-content'),
		selection_plugin: $('music-selection-plugin'),
		btn_apply_plugin: $('btn-apply-plugin'),
		volume_box_slider: $('volume-box-slider')
	};

	//---
	// [Privileged] Functions
	// (Publicly exposed with private data & methods access)
	
	/**
	* Update the activity light to inform the user a processing is ongoing or not
	* @param {bool} status - The current activity status (true = active, false = inactive).
	*/
	this.activity = function(status)
	{
		var color = _opts.ActivityMonitorColor.inactive;
		if(status === true)
		{
			color = _opts.ActivityMonitorColor.active;
		}
		_$.activity_monitor.setStyle({backgroundColor: color});
	};

	/**
	* @param {int|string} [volume] - The volume to display.
	*/
	this.volume = function(volume)
	{
		_volumeSlider.setValue(volume);
	};

	/**
	* Update the song time (progressbar + chrono)
	* @param {object} songObj - The current song to display.
	* @param {date} lastServerResponse - The last server response timestamp on client side.
	*/
	this.updateSongTime = function(song, lastServerResponse)
	{
		if(_refreshSongTimer)
		{
			clearTimeout(_refreshSongTimer);
		}
		
		//---
		
		// Rather than calling updateSongTime() every 100ms as before (+when manual call after a json response),
		// only call when necessary: each time the display needs to be updated = every second (of the song)
		//		=> less refresh calls
		// default value = refresh frequency when there is no song
		var nextSongSecondIn = 100; // in ms

		if(song)
		{
			var currentSongElapsedTime = song.elapsed + (new Date().getTime() / 1000) - lastServerResponse;
			nextSongSecondIn = (Math.ceil(currentSongElapsedTime) - currentSongElapsedTime) * 1000;
			
			if(currentSongElapsedTime > song.duration) // Avoid >100%
			{
				currentSongElapsedTime = song.duration;
			}
		 
			if(_lastCurrentSongElapsedTime == null || currentSongElapsedTime > _lastCurrentSongElapsedTime)
			{
				var percent = Math.round(currentSongElapsedTime / song.duration * 100);
				_$.progressbar.setStyle({width: percent + '%'});
				_$.player_song_time.update(FormatTime(currentSongElapsedTime) + "/" + FormatTime(song.duration));
			}
			_lastCurrentSongElapsedTime = currentSongElapsedTime;
		}
		else // No song
		{
			_lastCurrentSongElapsedTime = null;
			_$.progressbar.setStyle({width: 0});
			_$.player_song_time.update("--- / ---");
		}

		//---
		
		_refreshSongTimer = setTimeout(function()
		{
			$this.updateSongTime(song, lastServerResponse);
		}, nextSongSecondIn + 1); // +1ms to be extra sure that a second has passed
	};

	/**
	* Update the song artist, album and title
	* @param {object} songObj - The current song to display.
	*/
	this.updateCurrentSong = function(songObj)
	{
		if(songObj)
		{
			_$.player_song_artist.update(songObj.artist).stopObserving().on("click", function()
			{
				_searchCategory(songObj.artist, 'artist');
			});
			_$.player_song_album.update(songObj.album).stopObserving().on("click", function()
			{
				_searchCategory(songObj.album, 'album');
			});
			_$.player_song_title.update(songObj.title);

			// Change the page title with the current song played
			if(_opts.replaceTitle)
			{
				document.title = "Jukebox - " + songObj.artist + " - " + songObj.album + " - " + songObj.title;
			}
		}
	};

	/**
	* Update the current number of listeners
	* @param {int} count - Number of users listening to the channel.
	*/
	this.updateNbUsers = function(count)
	{
		var items = $$('span.count-user-listening');
		if(items.length > 0)
		{
			items.each(function(e)
			{
				e.update(count.toString());
			});
		}
	};

	/**
	* Update the playing status
	* @param {bool} audio - It is playing?
	*/
	this.playing = function(audio)
	{
		if(audio)
		{
			_$.play_stream.hide();
			_$.stop_stream.style.display = 'inline';
		}
		else
		{
			_$.play_stream.show();
			_$.stop_stream.hide();
		}
	};

	this.cleanupPlayQueue = function()
	{
		var len = _$.play_queue_content.select('li').length - 1;
		for(var i = 0; i < len; ++i)
		{
			Droppables.remove('play-queue-song-' + i);
		}
	};

	this.displayPlayQueue = function(playQueueSongs)
	{
		var ul = new Element('ul');
		var li = '' +
		'<li id="play-queue-li-first" class="droppable">Play queue' +
			'<div>' +
				'<span class="nb-listening-users"></span>' +
				'<span class="count-user-listening">' + J.listenersCount + '</span>' +
			'</div>' +
			'<a><span class="play-queue-shuffle"></span></a>' +
			'<a><span class="play-queue-delete"></span></a>' +
		'</li>';
		ul.insert(li);

		ul.down(".play-queue-shuffle").on("click", function()
		{
			J.playQueueShuffle();
		});
		ul.down(".play-queue-delete").on("click", function()
		{
			J.playQueueDelete();  // no args = all
		});

		var currentPQSongIndex = 0,
			lastPQIndex = playQueueSongs.length - 1;
		playQueueSongs.each(function(song)
		{
			li = '' +
			'<li id="play-queue-li-' + currentPQSongIndex + '" class="droppable">' +
				'<div id="play-queue-song-' + currentPQSongIndex + '" class="play-queue-draggable">' +
					'<div id="play-queue-handle-' + currentPQSongIndex + '" class="play-queue-handle">' +
						'<a href="javascript:void(0)">' + song.artist + '</a>' +
						' - ' +
						'<a href="javascript:void(0)">' + song.album + '</a>' +
						' - ' +
						song.title + ' (' + FormatTime(song.duration) + ')' +
					'</div>' +
					'<a><span class="play-queue-move-top"></span></a>' +
					'<a><span class="play-queue-move-bottom"></span></a>' +
					'<a><span class="play-queue-delete"></span></a>' +
				'</div>' +
			'</li>';
			ul.insert(li);

			// Store mid
			ul.down('li:last > div').store('mid', song.mid);

			// Declare listeners

			// Artist
			ul.down('li:last .play-queue-handle a:first').on("click", function()
			{
				_search(1, null, null, song.artist, 'equal', 'artist', 'artist,album,track,title', 20, false);
			});
			// Album
			ul.down('li:last .play-queue-handle a:last').on("click", function()
			{
				_search(1, null, null, song.album, 'equal', 'album', 'artist,album,track,title', 20, false);
			});

			var localcurrentPQSongIndex = currentPQSongIndex; // Avoid closure issue
			ul.down('li:last .play-queue-move-top').on("click", function()
			{
				J.playQueueMove(1, localcurrentPQSongIndex, 0);
			});
			ul.down('li:last .play-queue-move-bottom').on("click", function()
			{
				J.playQueueMove(1, localcurrentPQSongIndex, lastPQIndex);
			});
			ul.down('li:last .play-queue-delete').on("click", function()
			{
				J.playQueueDelete(1, localcurrentPQSongIndex);
			});

			currentPQSongIndex++;
		});
		
		_$.play_queue_content.update(ul);
		
		// Create all draggables, once update is done.
		for(var i = 0, len = playQueueSongs.length; i < len; i++)
		{
			new Draggable('play-queue-song-' + i,
			{
				scroll: window,
				constraint: 'vertical',
				revert: true,
				handle: 'play-queue-handle-' + i,
				onStart: function(dragged)
				{
					var id = dragged.element.id;
					id = id.substring(16);
					$('play-queue-li-' + id).addClassName('being-dragged');
				},
				onEnd: function(dragged)
				{
					var id = dragged.element.id;
					id = id.substring(16);
					$('play-queue-li-' + id).removeClassName('being-dragged');
				}
			});
			_makePlayQueueSongDroppable('play-queue-li-' + i, playQueueSongs);
		}
		_makePlayQueueSongDroppable('play-queue-li-first', playQueueSongs);
	};

	this.displaySearchResults = function(results)
	{
		// A new search could be initiated from the left pannel so we must automatically expand the right pannel
		_expand();

		// Create a new searchTab
		if(!results.identifier)
		{
			// Adds the new created tab to the tabs container
			var searchTab = new SearchTab(J, results);
			var id = _tabs.addTab(searchTab);
			if(results.select !== false)
			{
				_tabs.toggleTab(id);
			}
		}
		else
		{
			// If the user send a search query with an identifier he wants to update the tab content so we refresh the displayed results
			_tabs.getTabFromUniqueId(results.identifier).updateNewSearchInformations(results);
			_tabs.getTabFromUniqueId(results.identifier).updateContent();
		}
	};

	this.sendingQuery = function(query)
	{
		var tab = _tabs.getFirstTabByClassName("DebugTab");
		if(tab)
		{
			tab.updateSendingQuery(query);
		}
	};

	this.gotResponse = function(response)
	{
		/*TODO: use syntax like that?
		if(TabManager.DebugTag.isDisplayed())
		{
			TabManager.DebugTag.updateResponse(null);
		}
		*/

		var tab = _tabs.getFirstTabByClassName("DebugTab");
		if(tab)
		{
			tab.updateResponse(response);
		}
	};

	this.displayUploadedFiles = function(uploaded_files)
	{
		//TODO: TabManager.UploadTab
		var tab = _tabs.getFirstTabByClassName("UploadTab");
		if(tab)
		{
			tab.treatResponse(uploaded_files);
		}
	};

	//-----
	// [Private] Functions
	
	function _expand()
	{
		_$.music_wrapper.style.display = 'inline';
		_$.expand_button.hide();
		_$.collapse_button.style.display = 'block'; // .show is stupid (ignores css)
		_$.page_wrapper.setStyle({width: '900px'});
	}

	function _collapse()
	{
		_$.music_wrapper.hide();
		_$.expand_button.show();
		_$.collapse_button.hide();
		_$.page_wrapper.setStyle({width: '280px'});
	}

	function _search(page, identifier, select_fields, search_value, search_comparison, search_field, order_by, result_count, select)
	{
		if(!search_field)
		{ 
			search_field = _$.search_field.value;
		}
		if(!search_value)
		{
			if(search_field != 'genre')
			{
				search_value = _$.search_input.value;
			}
			else
			{
				search_value = _$.search_genres.value;
			}
		}
		if(!result_count)
		{ 
			result_count = _$.results_per_page.value;
		}
		J.search(page, identifier, select_fields, search_value, search_comparison, search_field, order_by, result_count, select);
	}

	function _searchCategory(search, category)
	{
		_search(1, null, null, search, 'equal', category, 'artist,album,track,title', null, false);
	}

	function _makePlayQueueSongDroppable(droppable_id, playQueueSongs)
	{
		Droppables.add(droppable_id,
		{ 
			accept: ['play-queue-draggable', 'library-draggable'],
			overlap: 'vertical',
			hoverclass: 'droppable-hover',
			onDrop: function(dragged, dropped/*, event*/)
			{
				var old_index,
					song_mid;
				if(dragged.hasClassName("play-queue-draggable"))
				{
					old_index = parseInt(dragged.id.substring(16), 10);
					song_mid = dragged.retrieve('mid');
					
					var new_index = -1;
					if(dropped.id != "play-queue-li-first")
					{
						new_index = parseInt(dropped.id.substring(14), 10);
					}
					if(new_index <= old_index)
					{
						new_index++;
					}
					if(new_index != old_index)
					{
						J.playQueueMove(song_mid, old_index, new_index);
						
						$this.cleanupPlayQueue();
						var tmp = playQueueSongs[old_index];
						playQueueSongs.splice(old_index, 1);
						playQueueSongs.splice(new_index, 0, tmp);						
						$this.displayPlayQueue(playQueueSongs);
					}
				}
				else if(dragged.hasClassName("library-draggable"))
				{
					var idregexp = new RegExp(".*-([^\\-]*-[^\\-]*)-([0-9]*)");
					var tab_index = dragged.id.replace(idregexp, "$1");
					old_index = parseInt(dragged.id.replace(idregexp, "$2"), 10);
					var song = _tabs.getTabFromUniqueId(tab_index).server_results[old_index];
					song_mid = song.mid;
					
					var play_queue_index = -1;
					if(dropped.id != "play-queue-li-first")
					{
						play_queue_index = parseInt(dropped.id.substring(14), 10);
					}
					play_queue_index++;

					J.addToPlayQueue(song_mid, play_queue_index);

					playQueueSongs.splice(play_queue_index, 0, song);
					$this.displayPlayQueue(playQueueSongs);
				}
			}
		});
	}

	//---
	// Events handlers

	var _events = // UI actions trigger thoses events
	{
		expand: function()
		{
			_expand();
		},
		collapse: function()
		{
			_collapse();
		},
		joinChannel: function()
		{
			J.joinChannel(_$.channel.value);
		},
		previousSong: function()
		{
			J.previous();
		},
		nextSong: function()
		{
			J.next();
		},
		playStream: function()
		{
			J.start();
		},
		stopStream: function()
		{
			J.stop();
		},
		volume: function(val)
		{
			if(J.volume() != val) // Avoid infinite loop with .onChange
			{
				J.volume(val);
			}
		},
		search: function()
		{
			_search(); // no params
		},
		searchInputKeyPress: function(event)
		{
			if(event.keyCode == Event.KEY_RETURN)
			{
				_search();
				Event.stop(event);
			}
		},
		/**
		* Display the select_genre input in place of input_value if the selected field is genre.
		* Also fills the select_genre list if empty.
		*/
		selectAndFillGenres: function()
		{
			if(_$.search_field.options[_$.search_field.selectedIndex].value =='genre')
			{
				if(_$.search_genres.options.length === 0) // Fill it, before display
				{
					for(var i = 0, len = genresOrdered.length; i < len; ++i)
					{
						var genre = genresOrdered[i];
						var option = document.createElement('option');
						option.value = genre.id;
						option.appendChild(document.createTextNode(genre.name));
						_$.search_genres.appendChild(option);
					}
				}

				_$.search_input.hide();
				_$.search_genres.show();
			}
			else
			{
				_$.search_input.show();
				_$.search_genres.hide();
			}
		},
		autoRefreshChange: function()
		{
			J.autoRefresh(_$.cb_autorefresh.getValue());
		},
		refresh: function()
		{
			J.refresh();
		},
		plugin: function()
		{
			J.plugin(_$.selection_plugin.value);
		}
	};
	
	//---
	// Constructor
	
	function _initialize()
	{
		Object.seal($this); // Non-extensible, Non-removable

		// Register listeners
		_$.expand_button.on("click", _events.expand);
		_$.collapse_button.on("click", _events.collapse);

		_$.play_stream.on("click", _events.playStream);
		_$.stop_stream.on("click", _events.stopStream);

		_$.btn_join_channel.on("click", _events.joinChannel);
		_$.btn_search.on("click", _events.search);
		_$.search_field.on("change", _events.selectAndFillGenres);
		_$.search_input.observe("keypress", _events.searchInputKeyPress);

		_$.previous_button.on("click", _events.previousSong);
		_$.next_button.on("click", _events.nextSong);

		_$.cb_autorefresh.on("change", _events.autoRefreshChange);
		_$.btn_refresh.on("click", _events.refresh);

		_$.btn_apply_plugin.on("click", _events.plugin);

		var range0to100 = $R(0, 100);
		_volumeSlider = new Control.Slider(_$.volume_box_slider.down('.handle'), _$.volume_box_slider,
		{
			range: range0to100,
			values: range0to100,
			sliderValue: 100, // Hardcoded because we can't call J.volume() right now (flash not yet loaded)
			onSlide: _events.volume,
			onChange: _events.volume // Mostly for click anywhere on the slider
		});

		(function() // Tabs
		{
			function createShowTab(tab)
			{
				_tabsManager["Show" + tab.classN] = function()
				{
					var identifier = _tabs.getFirstTabIdentifierByClassName(tab.classN);
					if(identifier == null)
					{
						var newTab = new tab.classC(tab.identifier, tab.name, J);
						identifier = _tabs.addTab(newTab);
					}
					_tabs.toggleTab(identifier);
				};
			}
			
			var possibleTabs =
			[
				{
					classN: "UploadTab",
					classC: UploadTab,
					identifier: "Uploader",
					name: "Uploader"
				},
				{
					classN: "DebugTab",
					classC: DebugTab,
					identifier: "Debug",
					name: "Debug"
				},
				{
					classN: "NotificationTab",
					classC: NotificationTab,
					identifier: "Notifications",
					name: "Notifications"
				},
				{
					classN: "CustomQueriesTab",
					classC: CustomQueriesTab,
					identifier: "Custom queries",
					name: "Custom queries"
				}
			];

			for(var i = 0; i < possibleTabs.length; ++i)
			{
				createShowTab(possibleTabs[i]);
			}

			$("tab-upload").on("click", _tabsManager.ShowUploadTab);
			$("tab-query").on("click", _tabsManager.ShowCustomQueriesTab);
			$("tab-notifs").on("click", _tabsManager.ShowNotificationTab);
			$("tab-debug").on("click", _tabsManager.ShowDebugTab);
		})();
	}
	_initialize();
}

//---
// [Public] Functions
// (No access to private data and methods)
// (Access to public members/methods and privileged methods)

/*
var jukeboxui_public_methods =
{

};

// Add them nicely to the prototype
Extend(JukeboxUI.prototype, jukeboxui_public_methods);
*/

// [Static] Variables
JukeboxUI.defaults =
{
	ActivityMonitorColor:
	{
		active: "orange",
		inactive: "green"
	},
	css:
	{

	}
};

JukeboxUI.skins = ["default"/*, "light", "dark"*/];

Object.freeze(JukeboxUI); // Non-extensible, Non-removable, Non-modifiable
Object.freeze(JukeboxUI.prototype); // 1337 strict mode

})();

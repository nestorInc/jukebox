/* global HTML5Storage */

var Tab = this.Tab = Class.create(
{
	initialize: function(tabName, rootCSS, jukebox, template)
	{
		this.name = tabName;
		this.rootCSS = rootCSS;
		this.jukebox = jukebox;
		this.template = template;
	}
});

//==================================================

this.Tabs = Class.create(
{
	initialize: function(DOM, rootCSS)
	{
		this.DOM = DOM;
		this.rootCSS = rootCSS;
		this.tabs = [];
		this.currentTabUniqueId = -1;
		this.lastUniqueId = null;
	},

	getTabFromUniqueId: function(identifier)
	{
		for(var i = 0, len = this.tabs.length; i < len; ++i)
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
		for(var i = 0, len = this.tabs.length; i < len; ++i)
		{
			if(this.tabs[i].identifier == identifier)
			{
				return i;
			}
		}
		return -1;
	},

	getFirstTabByClass: function(tabClass)
	{
		for(var i = 0; i < this.tabs.length; ++i)
		{
			if(this.tabs[i] instanceof tabClass)
			{
				return this.tabs[i];
			}
		}
		return null;
	},

	// Add the tab in the html layout and in the tabs array
	addTab: function(tab, className)
	{
		// Check tab class
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
			this.lastUniqueId = 1;
		}
		else
		{
			this.lastUniqueId++;
		}

		// Set the new tab identifier and add tab
		var id = tab.identifier = this.lastUniqueId;
		this.tabs.push(tab);

		// Init html containers
		if(this.tabs.length == 1)
		{
			this.DOM.down('.'+this.rootCSS+'-tabs-header').update('<ul class="'+this.rootCSS+'-tabs-list"></ul>');
		}

		// Add tab Header
		var noHref = 'javascript:;',
			toggleTab = new Element('a', {href: noHref}).update('<span>' + tab.name + '</span>'),
			removeTab = new Element('a', {href: noHref}).update('<span> X </span>');

		toggleTab.on("click", this.toggleTab.bind(this, id));
		removeTab.on("click", this.removeTab.bind(this, id, className));

		var tabDisplay = new Element('li', {"class": this.rootCSS + '-tabHeader-' + id}).insert(
		{
			top: toggleTab,
			bottom: removeTab
		});
		if(this.tabs.length == 1)
		{
			tabDisplay.addClassName(this.rootCSS+'-tabs-active');
		}

		var tabContentContainer = new Element('div', {"class": this.rootCSS + '-tabContent-' + id});
		if(this.tabs.length > 1)
		{
			tabContentContainer.hide();
		}

		// DOM insertion
		this.DOM.down('.'+this.rootCSS+'-tabs-list').insert(tabDisplay);
		this.DOM.down('.'+this.rootCSS+'-tabs-content').insert(tabContentContainer);

		// Init tab content
		if(typeof tab.updateContent === 'function')
		{
			tab.updateContent(tabContentContainer);
		}

		// Store that tab is opened
		if(HTML5Storage.isSupported)
		{
			var tabDescriptor =
			{
				type: className
			};

			if(className == "SearchTab")
			{
				var toSave = ['select_fields', 'search_value', 'search_comparison', 'search_field', 'order_by', 'result_count', 'current_page'],
					obj = {};
				for(var i = 0; i < toSave.length; ++i)
				{
					var prop = toSave[i];
					obj[prop] = tab[prop];
				}
				tabDescriptor.options = obj;
			}

			var openedTabs = HTML5Storage.get("tabs") || [];
			if(this.getTabIndexInStorage(openedTabs, className, tab) == -1) // Not found
			{
				//openedTabs.splice(index, 0, className); // insert at a specific index
				openedTabs.push(tabDescriptor);
			}
			HTML5Storage.set("tabs", openedTabs);
		}

		return id;
	},

	getTabIndexInStorage: function(openedTabs, className, tab)
	{
		var index = -1;
		for(var i = 0; i < openedTabs.length; ++i)
		{
			if(openedTabs[i].type == className)
			{
				var opts = openedTabs[i].options;
				if(
					className != "SearchTab" ||
					// Do not resave tab on restore
					(className == "SearchTab" && // We cannot use identifier
						tab.select_fields == opts.select_fields &&
						tab.search_value == opts.search_value &&
						tab.search_comparison == opts.search_comparison &&
						tab.search_field == opts.search_field &&
						tab.order_by == opts.order_by &&
						tab.result_count == opts.result_count &&
						tab.current_page == opts.current_page
					)
				)
				{
					index = i;
					break;
				}
			}
		}
		return index;
	},

	removeTab: function(identifier, className)
	{
		var index = this.getTabIndexFromUniqueId(identifier);
		if(index != -1)
		{
			// If the tab to delete is the current active tab we want to select the first available tab
			var tabHeader = this.DOM.down('.'+this.rootCSS+'-tabs-list').down('.'+this.rootCSS+'-tabHeader-'+identifier),
				tabContent = this.DOM.down('.'+this.rootCSS+'-tabs-content').down('.'+this.rootCSS+'-tabContent-'+identifier);
			if(tabHeader && tabHeader.hasClassName(this.rootCSS + '-tabs-active'))
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
			var tab = this.tabs.splice(index, 1)[0];

			if(tabHeader) {tabHeader.remove();}
			if(tabContent) {tabContent.remove();}

			// Remove tab from opened list
			if(HTML5Storage.isSupported)
			{
				var openedTabs = HTML5Storage.get("tabs") || [],
					tabIndex = this.getTabIndexInStorage(openedTabs, className, tab);
				if(tabIndex != -1)
				{
					openedTabs.splice(tabIndex, 1);
				}
				HTML5Storage.set("tabs", openedTabs);
			}
		}
	},

	toggleTab: function(identifier)
	{
		for(var i = 0, len = this.tabs.length; i < len; ++i)
		{
			var tab = this.tabs[i],
				id = tab.identifier,
				tabHeader = this.DOM.down('.'+this.rootCSS+'-tabs-list').down('.'+this.rootCSS+'-tabHeader-'+id),
				tabContent = this.DOM.down('.'+this.rootCSS+'-tabs-content').down('.'+this.rootCSS+'-tabContent-'+id);
			if(tab.identifier == identifier)
			{
				tabContent.show();
				tabHeader.addClassName(this.rootCSS + '-tabs-active');
			}
			else
			{
				tabContent.hide();
				tabHeader.removeClassName(this.rootCSS + '-tabs-active');
			}
		}
	}
});

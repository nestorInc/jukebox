var Tab = this.Tab = Class.create(
{
	initialize: function(name, jukebox, domContainer, rootCSS)
	{
		this.name = name;
		this.jukebox = jukebox;
		this.DOM = domContainer;
		this.rootCSS = rootCSS;
	}
});

//==================================================

this.Tabs = Class.create(
{
	initialize: function(rootCSS)
	{
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

	setRootNode: function(node)
	{
		this.DOM = node;
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
			this.lastUniqueId = 0;
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

		var that = this; // Tool for closure
		toggleTab.on("click", function()
		{
			that.toggleTab(id);
		});
		removeTab.on("click", function()
		{
			that.removeTab(id, className);
		});

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
			setTimeout(function()
			{
				tab.updateContent();
			}, 0); // Workaround issue when restoring UploadTab on jukebox instanciation (execute _update() but _ui undefined yet)
		}

		// Store that tab is opened
		if(className != "SearchTab" && HTML5Storage.isSupported)
		{
			var openedTabs = HTML5Storage.get("tabs") || [];
			if(openedTabs.indexOf(className) == -1)
			{
				//openedTabs.splice(index, 0, className); // insert at a specific index
				openedTabs.push(className);
			}
			HTML5Storage.set("tabs", openedTabs);
		}

		return id;
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
			this.tabs.splice(index, 1);

			if(tabHeader) {tabHeader.remove();}
			if(tabContent) {tabContent.remove();}

			// Remove tab from opened list
			if(className != "SearchTab" && HTML5Storage.isSupported)
			{
				var openedTabs = HTML5Storage.get("tabs") || [],
					tabIndex = openedTabs.indexOf(className);
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

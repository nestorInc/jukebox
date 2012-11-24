var Tab = this.Tab = Class.create(
{
	initialize: function(identifier, name, jukebox, domContainer)
	{
		this.identifier = identifier;
		this.name = name;
		this.jukebox = jukebox;
		this.dom = domContainer;
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

	setRootNode: function(node)
	{
		this.DOM = node;
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
			this.DOM.down('.jukebox-tabs-header').update('<ul class="jukebox-tabs-list"></ul>');
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

		var tabContentContainer = new Element('div', {id: 'tabContent-' + id}); // todo: use classes to not pollute ids
		tabContentContainer.style.display = this.tabs.length == 1 ? 'block' : 'none';

		// DOM insertion
		this.DOM.down('.jukebox-tabs-list').insert({bottom: tabDisplay});
		this.DOM.down('.jukebox-tabs-content').insert({bottom: tabContentContainer});

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

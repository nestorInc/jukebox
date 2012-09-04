var Tabs = Class.create(
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
			if(this.tabs[i].getIdentifier() == identifier)
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
			if(this.tabs[i].getIdentifier() == identifier)
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
			if(undefined != this.tabs[i].unique && this.tabs[i].unique == tabClassName)
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
			if(undefined != this.tabs[i].unique && this.tabs[i].unique == tabClassName)
			{
				return this.tabs[i];
			}
		}
		return null;
	},

	// Add the tab in the html layout and in the tabs Array in javascript
	addTab: function(tab)
	{
		var tabContentContainer = '';
		var tabDisplay = '';

		// Compute a new valid uniqueid 
		if(null == this.lastUniqueId)
		{
			this.lastUniqueId = 0;
		}
		else
		{
			this.lastUniqueId = this.lastUniqueId + 1;
		}

		// Set the new tab identifier
		tab.identifier = this.tabsCollectionName + '_' + this.lastUniqueId;
		this.tabs.push(tab);

		// init html containers
		if(1 == this.tabs.length)
		{
			$('tabsHeader').update('<ul id="tabs_list"></ul>');
		}

		// Add tab Header
		tabDisplay += '<li style="margin-left: 1px" id="tabHeader_' + tab.getIdentifier() + '"';
		if(1 == this.tabs.length)
		{
			tabDisplay += ' class="tabHeaderActive">';
		}
		else
		{
			tabDisplay += '>';
		}
		tabDisplay += '<a href="javascript:void(0)" onclick="tabs.toggleTab(\'' + tab.getIdentifier() + '\')">';
		tabDisplay += '<span>' + tab.getName() + '</span>';
		tabDisplay += '</a>';
		tabDisplay += '<a href="javascript:void(0)" onclick="tabs.removeTab(\'' + tab.getIdentifier() + '\')">';
		tabDisplay += '<span> X </span>';
		tabDisplay += '</a>';
		tabDisplay += '</li>';

		tabContentContainer += '<div id="tabContent_' + tab.getIdentifier() + '"';

		if(1 == this.tabs.length)
		{
			tabContentContainer += 'style="display:block;"></div>';
		}
		else
		{
			tabContentContainer += 'style="display:none;"></div>';
		}

		$('tabs_list').insert({'bottom':tabDisplay});
		$('tabscontent').insert({'bottom':tabContentContainer});

		// start to init static tab content
		if(typeof tab.updateContent === 'function')
		{
			tab.updateContent();
		}

		return tab.identifier;
	},

	removeTab: function(identifier)
	{
		var index = this.getTabIndexFromUniqueId(identifier);

		if(-1 != index)
		{
			// If the tab to delete is the current active tab we want to select the first available tab
			if($('tabHeader_' + identifier).hasClassName("tabHeaderActive"))
			{
				// Find the tabs position index available near from tab
				if(index != 0)
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

			// remove tabHeader
			$('tabHeader_' + identifier).remove();
			
			// remove tabContent
			$('tabContent_' + identifier).remove();
		}
	},

	toggleTab: function(identifier)
	{
		for(var i = 0; i < this.tabs.length; i++)
		{
			var temph = 'tabHeader_' + this.tabs[i].identifier;
			var h = $(temph);
			if(this.tabs[i].identifier == identifier)
			{
				$('tabContent_' + this.tabs[i].identifier ).style.display = 'block';
				h.addClassName("tabHeaderActive");
			}
			else
			{
				$('tabContent_' + this.tabs[i].identifier ).style.display = 'none';
				if(h.hasClassName('tabHeaderActive'))
				{
					h.removeClassName('tabHeaderActive');
				}
			}
		}
	}

});


var Tab = Class.create(
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

	getContent: function()
	{
		return '';
	},

	getIdentifier: function()
	{
		return this.identifier;
	}
});
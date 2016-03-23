/* global Tab, Class */

this.PlayQueueTab = Class.create(Tab,
{
	initialize: function(rootCSS, jukebox, template)
	{
		this.name = "On air";
		this.iconName = "hearing";
		this.category = "head";
		this.permanent = true;
		this.rootCSS = rootCSS;
		this.jukebox = jukebox;
		this.template = template;
	},

	updateContent: function(DOM)
	{
		this.DOM = DOM;
		var tpl = new Template(this.template.main),
		tplVars =
		{
			root: this.rootCSS
		},
		evaluated = tpl.evaluate(tplVars);

		this.DOM = DOM;
		this.DOM.update(evaluated);
	}
});

/* global Tab, Class */

this.AccountTab = Class.create(Tab,
{
	initialize: function(rootCSS, jukebox, template)
	{
		this.name = "Account";
		this.iconName = "account_box";
		this.category = "tail";
		this.permanent = true;
		this.nickname = null;
		this.token = null;
		this.sid = null;
		this.home = null;
		this.userAgent = null;
		this.userIp = null;
		this.rootCSS = rootCSS;
		this.jukebox = jukebox;
		this.template = template;
		this.jukebox.getUserAccountInformations();
	},

	treatResponse: function(resp)
	{
		this.nickname = resp.nickname;
		this.token = resp.token;
		this.sid = resp.sid;
		this.home = resp.home;
		this.userAgent = resp.user_agent;
		this.userIp = resp.ip;
		this.updateContent(this.DOM);
	},

	sendChangePasswordRequest: function()
	{
		Notifications.Display(Notifications.LEVELS["info"], "Change password request");
		var old_password = this.DOM.down('.'+this.rootCSS+'-account-old-password').value,
			new_password = this.DOM.down('.'+this.rootCSS+'-account-new-password').value,
			new_password2 = this.DOM.down('.'+this.rootCSS+'-account-new-password2').value;
		if(new_password == new_password2)
		{
			this.jukebox.sendChangePasswordRequest(this.nickname, old_password, new_password, new_password2);
		}
		else
		{
			Notifications.Display(Notifications.LEVELS["error"], "The passwords you typed do not match");
		}
	},
	createAccountHeader: function()
	{
		var nick = this.DOM.down("."+ this.rootCSS +"-user-header-create-nickname").value,
			pwd1 = this.DOM.down("."+ this.rootCSS +"-user-header-create-password").value,
			pwd2 = this.DOM.down("."+ this.rootCSS +"-user-header-create-password2").value;
		if( pwd1 != pwd2 )
		{
			Notifications.Display(Notifications.LEVELS.error, "Passwords are differents");
		}
		else
		{
			this.jukebox.sendCreateAccountRequest(nick, pwd1);
		}
	},
	joinChannel: function()
	{
		var channel = this.DOM.down('.'+this.rootCSS+'-channel').value;
		this.jukebox.joinChannel(channel);
	},
	updateContent: function(DOM)
	{
		if(this.nickname == null)
		{
			this.DOM = DOM;
			this.DOM.update("Wait until you receive account informations");
		}
		else
		{
			var accountTpl = new Template(this.template.main),
			accountTplVars =
			{
				root: this.rootCSS,
				user: this.nickname,
				token: this.token,
				sid: this.sid,
				home: this.home,
				userAgent: this.userAgent,
				ip: this.userIp
			},
			account_form = accountTpl.evaluate(accountTplVars);

			this.DOM = DOM;
			this.DOM.update(account_form);
			var submit_button = this.DOM.down('.'+this.rootCSS+'-account-change-password-submit');
			submit_button.on("click", this.sendChangePasswordRequest.bind(this));

			var create_account_submit = this.DOM.down('.'+this.rootCSS+'-user-header-create-submit');
			create_account_submit.on("click", this.createAccountHeader.bind(this));

			var btn_join_channel = this.DOM.down('.'+this.rootCSS+'-channel-button');
			btn_join_channel.on("click", this.joinChannel.bind(this));
		}
	}
});

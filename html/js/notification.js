(function(){

// Notifications levels
var LEVELS =
{
	debug: 1,
	info: 2,
	warning: 3,
	error: 4,
	fatal: 5
};

// Notifications that are currently on screen
var activeNotifications = [];

// Passed notifications (for history)
var passedNotifications = [];

//==================================================

// Main class containing notification stuff.
// It is capable of appearing, updating its content, and disappearing.
function Notification(level, message)
{
	// Notification infos
	this.level = level;
	this.message = message;

	// Default display time in seconds
	var delay = 8;
	
	// The id has to be unique.
	this.id = new Date().getTime() + "." + Math.round(Math.random()*100000);
	
	// Assign correct style and time according to given level.
	var style = "notification_wrapper_";
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
	'<div class="notification_wrapper" id="notification' + this.id + '">' +
		'<div class="' + style + '" id="notification_content' + this.id + '">' +
			'<p>' + message + ' </p>' +
		'</div>' +
	'</div>';
	$('notifications').insert(html);
	
	// Hide notification, then make it appear with an animation
	$('notification' + this.id).hide();
	this.startTime = new Date();

	var notif = this;
	Effect.SlideDown('notification' + this.id,
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

	return true;
}

// Make a notification disappear
Notification.prototype.remove = function()
{
	// Handle case where somebody still got a reference on this notif and call remove() again
	if(!this._timer) {return;}

	var notif = this;
	Effect.SlideUp('notification' + this.id,
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
					passedNotifications.push(notif);
					break;
				}
			}
		}
	});

	// Stop timer (remove can be called before the timer timeout)
	clearTimeout(this._timer);
	this._timer = null;
}

//==================================================

// Expose a Notifications object on global scope
var Notifications =
{
	LEVELS: LEVELS,
	// Display a new notification on screen
	Display: function(level, message)
	{
		/*return */new Notification(level, message);
	}
};
this.Notifications = Notifications;

//==================================================

// Expose a NotificationTab object on global scope
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
		var $tabContent = $('tabContent_' + this.identifier);
		$tabContent.update('<h1>Notification tests:</h1>');

		for(var level in LEVELS)
		{
			addButton(level);
		}

		function addButton(level)
		{
			var btn = new Element('input', {type: 'button', value: 'Test ' + level});
			btn.on("click", function()
			{
				Notifications.Display(LEVELS[level], "Notification: " + level);
			});
			$tabContent.insert(btn);
		}
	}

});

})();

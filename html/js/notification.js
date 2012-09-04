// Array of notifications that are currently on screen.
var activeNotifications = [];

// This has to be loaded first. It starts the update loop and show a welcome / test notification.
function initNotifications()
{
	setTimeout(updateNotifications, 1000);
	showNotification(2, "Client loaded.");
}

// Main update loop. It checks whether notifications should be removed.
function updateNotifications()
{
	for(var i = 0; i < activeNotifications.length; i++)
	{
		var notification = activeNotifications[i];
		notification.remainingTime -= 1;
		if(notification.remainingTime <= 0)
		{
			removeNotificationFromIndex(i);
			i--;
		}
	}
	setTimeout(updateNotifications, 1000);
}


// Find a notification from its DOM id and if found, removes it.
function removeNotificationFromId(id)
{
	for(var i = 0; i < activeNotifications.length; i++)
	{
		var notification = activeNotifications[i];
		if(notification.id == id)
		{
			removeNotificationFromIndex(i);
			break;
		}
	}
}

// Remove the given notification.
function removeNotificationFromIndex(index)
{
	var notification = activeNotifications[index];
	notification.remove();
	activeNotifications.splice(index, 1);
}

function showNotification(level, message)
{
	activeNotifications.push(new Notification(level, message));
}

// Main class containing notification stuff.
// It is capable of appearing, updating its content, and disappearing.
function Notification(level, message)
{
	// Notification infos
	this.level = level;
	this.message = message;

	// Default display time is 8 seconds.
	this.remainingTime = 8;
	
	// The id has to be unique. Generating one from time and current array length.
	this.id = activeNotifications.length + 1 + (last_time = new Date().getTime() / 1000);
	
	
	this.style = "notification_wrapper_";

	// Assign correct style and time according to given level.
	switch(level)
	{
	case 1:
		this.style += "debug";
		this.remainingTime = 3;
		break;
	case 2:
		this.style += "info";
		this.remainingTime = 4;
		break;
	case 3:
		this.style += "warning";
		this.remainingTime = 4;
		break;
	case 4:
		this.style += "error";
		this.remainingTime = 20;
		break;
	case 5:
		this.style += "fatal";
		this.remainingTime = 20;
		break;
	default:
		this.style += "default";
		break;
	}
	
	// Insert notification wrapper in the page
	$('notifications').insert('<div class="notification_wrapper" id="notification' + this.id + '"><div class="' + this.style + '" id="notification_content'+this.id+'"></div></div>');

	// Update content of notification
	this.update();
	
	// Hide notification, then make it appear
	$('notification'+this.id).hide();
	Effect.SlideDown('notification' + this.id,
	{
	 	duration: 0.6,
		restoreAfterFinish: false,
		afterFinish: function(effect)
		{
			// Once the notification appeared, make the click on its wrapper close it.
			Event.observe(effect.element, 'click', function(event)
			{
				var element_id = $(Event.element(event)).up('.notification_wrapper').id.substring(12);
				removeNotificationFromId(element_id);
			});
		}
	});
	return true;
}

// Updates the content of a notification
Notification.prototype.update = function()
{
	$('notification_content' + this.id).update('<p>' + this.message + ' </p>');
};

// Make a notification disappear
Notification.prototype.remove = function()
{
	Effect.SlideUp('notification' + this.id,
	{
		duration: 0.4,
		afterFinish: function(effect)
		{
			effect.element.remove();
		}
	});
}


var NotificationTab = Class.create(Tab,
{
	initialize: function(identifier, tabName)
	{
		// Search parameters 
		this.identifier = identifier;
		this.name = tabName;
		this.uploader = null;
		this.unique = "NotificationTab";
	},

	updateContent: function()
	{
		var notification_display = '' +
		'<h1>Notification sender</h1>' +
		'<input type="button" value="test notification debug" onclick="showNotification(1,\'Notification notification notification\');" />' +
		'<input type="button" value="test notification info" onclick="showNotification(2,\'Notification notification notification\');" />' +
		'<input type="button" value="test notification warning" onclick="showNotification(3,\'Notification notification notification\');" />' +
		'<input type="button" value="test notification error" onclick="showNotification(4,\'Notification notification notification\');" />' +
		'<input type="button" value="test notification fatal" onclick="showNotification(5,\'Notification notification notification\');" />';
		$('tabContent_' + this.identifier).update(notification_display);
	}

});

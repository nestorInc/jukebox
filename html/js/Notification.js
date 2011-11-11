var activeNotifications = new Array();

function initNotifications () {
    setTimeout(updateNotifications, 1000);
    showNotification(2,"Client loaded.");
}

function updateNotifications () {
    for (var i = 0; i < activeNotifications.length; i++) {
	var notification = activeNotifications[i];
	notification.remainingTime -= 1;
	if (notification.remainingTime <= 0) {
	    removeNotificationFromIndex(i);
//	    notification.remove();
//	    activeNotifications.splice(i, 1);
	    i--;
	} else {
	    notification.update();
	}
    }
    setTimeout(updateNotifications, 1000);
}

function removeNotificationFromId(id) {
    for (var i = 0; i < activeNotifications.length; i++) {
	var notification = activeNotifications[i];
	if (notification.id == id) {
	    removeNotificationFromIndex(i);
	    break;
	}
    }
}

function removeNotificationFromIndex(index) {
    var notification = activeNotifications[index];
    notification.remove();
    activeNotifications.splice(index, 1);
}

function showNotification(level, message) {
    activeNotifications.push(new Notification(level, message));
}

function Notification (level, message) {
    this.level = level;
    this.message = message;
    this.remainingTime = 8;
    this.id = activeNotifications.length + 1 + (last_time = new Date().getTime() / 1000);
    
    
    this.style = "notification_wrapper_";
    switch(level) {
    case 1:
	this.style += "debug";
	break;
    case 2:
	this.style += "info";
	break;
    case 3:
	this.style += "warning";
	break;
    case 4:
	this.style += "error";
	break;
    case 5:
	this.style += "fatal";
	break;
    default:
	this.style += "default";
	break;
    }
    
    $('notifications').insert('<div class="notification_wrapper" id="notification' + this.id + '"><div class="' + this.style + '" id="notification_content'+this.id+'"></div></div>');
    this.update();
    $('notification'+this.id).hide();
    Effect.SlideDown('notification'+this.id, { duration: 0.6 , afterFinish: function(effect) {
	Event.observe(effect.element, 'click', function(event) {
	    var element_id = $(Event.element(event)).up('.notification_wrapper').id.substring(12);
	    removeNotificationFromId(element_id);
	});	
    }});
    return true;
}

Notification.prototype.update = function()
{
    $('notification_content'+this.id).update('<p>' + this.message + ' (' + this.remainingTime + ')</p>');
};

Notification.prototype.remove = function()
{
    Effect.SlideUp('notification'+this.id, {duration: 0.4, afterFinish: function(effect) { 
	effect.element.remove(); 
    }});
}

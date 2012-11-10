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
* @throws {Error} Action is invalid
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

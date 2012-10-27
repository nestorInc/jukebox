/**
* Merge the contents of two or more objects together into the first object
* Inspired from jQuery.extend
* Keep in mind that the target object (first argument) will be modified, and will also be returned.
* If, however, we want to preserve both of the original objects, we can do so by passing an empty object as the target.
* 
* @param {bool} [deep] - If true, the merge becomes recursive (aka. deep copy).
* @param {object} target - An object that will receive the new properties.
* @param {object} obj1 - An object containing additional properties to merge in.
* @param {object} [objN] - Additional objects containing properties to merge in.
* @return {object} The target with merged properties.
*/
function Extend(/*deep, */target/*, obj1, obj2, obj3, objN*/)
{
	var deep = false,
		i = 1;

	// Handle a deep copy situation
	if(typeof target === "boolean")
	{
		deep = target;
		target = arguments[1] || {};
		// Skip the boolean and the target
		i = 2;
	}

	// Handle case when target is a string or something (possible in deep copy)
    if(typeof target !== "object" && typeof target !== "function")
    {
        target = {};
    }

	for(var len = arguments.length; i < len; ++i)
	{
		var options = arguments[i];
		if(options != null) // Only deal with non-null/undefined values
		{
			for(var name in options)
			{
				var src = target[name],
					copy = options[name];

				// Prevent never-ending loop
				if(target === copy)
				{
					continue;
				}

				// Recurse if we're merging object literal values or arrays
				if(deep && copy && (Object.isArray(copy) || typeof copy == "object")) // typeof operator is a bad shortcut here and on next line
				{
					var clone = src && (Object.isArray(src) || typeof src == "object" ) ? src : Object.isArray(copy) ? [] : {};

					// Never move original objects, clone them
					target[name] = Extend(deep, clone, copy);
				}
				else if(copy !== undefined) // Don't bring in undefined values
				{
					// Added custom check to avoid prototypejs functions added on Array.prototype for instance
					if(options.hasOwnProperty(name))
					{
						target[name] = copy;
					}
				}
			}
		}
	}
	return target; // Return the modified object
}


// UI Tools
//----------

/**
* Format a timestamp to a string in the format: [h:]m:s
* 0 are only added to minutes and seconds if necessary.
* @param {string|number} t - The timestamp.
* @return {string} The formatted timestamp.
*/
function FormatTime(t)
{
	var str = null;
	t = Number(t);
	if(!isNaN(t))
	{
		var h = Math.floor(t / 3600),
			m = Math.floor(t % 3600 / 60),
			s = Math.floor(t % 3600 % 60);
		str = ((h > 0 ? h + ":" : "") + (m > 0 ? (h > 0 && m < 10 ? "0" : "") + m + ":" : "0:") + (s < 10 ? "0" : "") + s);
	}
	return str;
}

function sort_unique(arr)
{
	arr = arr.sort(function(a, b)
	{
		return a * 1 - b * 1;
	});
	var ret = [arr[0]];
	for(var i = 1; i < arr.length; i++)
	{
		if(arr[i - 1] !== arr[i])
		{
			ret.push(arr[i]);
		}
	}
	return ret;
}
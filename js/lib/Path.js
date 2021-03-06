var Shared = require('./Shared');

/**
 * Path object used to resolve object paths and retrieve data from
 * objects by using paths.
 * @param {String=} path The path to assign.
 * @constructor
 */
var Path = function (path) {
	this.init.apply(this, arguments);
};

Path.prototype.init = function (path) {
	if (path) {
		this.path(path);
	}
};

Shared.addModule('Path', Path);
Shared.mixin(Path.prototype, 'Mixin.ChainReactor');

/**
 * Gets / sets the given path for the Path instance.
 * @param {String=} path The path to assign.
 */
Path.prototype.path = function (path) {
	if (path !== undefined) {
		this._path = this.clean(path);
		this._pathParts = this._path.split('.');
		return this;
	}

	return this._path;
};

/**
 * Tests if the passed object has the paths that are specified and that
 * a value exists in those paths.
 * @param {Object} testKeys The object describing the paths to test for.
 * @param {Object} testObj The object to test paths against.
 * @returns {Boolean} True if the object paths exist.
 */
Path.prototype.hasObjectPaths = function (testKeys, testObj) {
	var result = true,
		i;

	for (i in testKeys) {
		if (testKeys.hasOwnProperty(i)) {
			if (testObj[i] === undefined) {
				return false;
			}

			if (typeof testKeys[i] === 'object') {
				// Recurse object
				result = this.hasObjectPaths(testKeys[i], testObj[i]);

				// Should we exit early?
				if (!result) {
					return false;
				}
			}
		}
	}

	return result;
};

/**
 * Counts the total number of key endpoints in the passed object.
 * @param {Object} testObj The object to count key endpoints for.
 * @returns {Number} The number of endpoints.
 */
Path.prototype.countKeys = function (testObj) {
	var totalKeys = 0,
		i;

	for (i in testObj) {
		if (testObj.hasOwnProperty(i)) {
			if (testObj[i] !== undefined) {
				if (typeof testObj[i] !== 'object') {
					totalKeys++;
				} else {
					totalKeys += this.countKeys(testObj[i]);
				}
			}
		}
	}

	return totalKeys;
};

/**
 * Tests if the passed object has the paths that are specified and that
 * a value exists in those paths and if so returns the number matched.
 * @param {Object} testKeys The object describing the paths to test for.
 * @param {Object} testObj The object to test paths against.
 * @returns {Object} Stats on the matched keys
 */
Path.prototype.countObjectPaths = function (testKeys, testObj) {
	var matchData,
		matchedKeys = {},
		matchedKeyCount = 0,
		totalKeyCount = 0,
		i;

	for (i in testObj) {
		if (testObj.hasOwnProperty(i)) {
			if (typeof testObj[i] === 'object') {
				// The test / query object key is an object, recurse
				matchData = this.countObjectPaths(testKeys[i], testObj[i]);

				matchedKeys[i] = matchData.matchedKeys;
				totalKeyCount += matchData.totalKeyCount;
				matchedKeyCount += matchData.matchedKeyCount;
			} else {
				// The test / query object has a property that is not an object so add it as a key
				totalKeyCount++;

				// Check if the test keys also have this key and it is also not an object
				if (testKeys && testKeys[i] && typeof testKeys[i] !== 'object') {
					matchedKeys[i] = true;
					matchedKeyCount++;
				} else {
					matchedKeys[i] = false;
				}
			}
		}
	}

	return {
		matchedKeys: matchedKeys,
		matchedKeyCount: matchedKeyCount,
		totalKeyCount: totalKeyCount
	};
};

/**
 * Takes a non-recursive object and converts the object hierarchy into
 * a path string.
 * @param {Object} obj The object to parse.
 * @param {Boolean=} withValue If true will include a 'value' key in the returned
 * object that represents the value the object path points to.
 * @returns {Object}
 */
Path.prototype.parse = function (obj, withValue) {
	var paths = [],
		path = '',
		resultData,
		i, k;

	for (i in obj) {
		if (obj.hasOwnProperty(i)) {
			// Set the path to the key
			path = i;

			if (typeof(obj[i]) === 'object') {
				if (withValue) {
					resultData = this.parse(obj[i], withValue);

					for (k = 0; k < resultData.length; k++) {
						paths.push({
							path: path + '.' + resultData[k].path,
							value: resultData[k].value
						});
					}
				} else {
					resultData = this.parse(obj[i]);

					for (k = 0; k < resultData.length; k++) {
						paths.push({
							path: path + '.' + resultData[k].path
						});
					}
				}
			} else {
				if (withValue) {
					paths.push({
						path: path,
						value: obj[i]
					});
				} else {
					paths.push({
						path: path
					});
				}
			}
		}
	}

	return paths;
};

/**
 * Takes a non-recursive object and converts the object hierarchy into
 * an array of path strings that allow you to target all possible paths
 * in an object.
 *
 * @returns {Array}
 */
Path.prototype.parseArr = function (obj, options) {
	options = options || {};
	return this._parseArr(obj, '', [], options);
};

Path.prototype._parseArr = function (obj, path, paths, options) {
	var i,
		newPath = '';

	path = path || '';
	paths = paths || [];

	for (i in obj) {
		if (obj.hasOwnProperty(i)) {
			if (!options.ignore || (options.ignore && !options.ignore.test(i))) {
				if (path) {
					newPath = path + '.' + i;
				} else {
					newPath = i;
				}

				if (typeof(obj[i]) === 'object') {
					this._parseArr(obj[i], newPath, paths, options);
				} else {
					paths.push(newPath);
				}
			}
		}
	}

	return paths;
};

/**
 * Gets the value(s) that the object contains for the currently assigned path string.
 * @param {Object} obj The object to evaluate the path against.
 * @param {String=} path A path to use instead of the existing one passed in path().
 * @returns {Array} An array of values for the given path.
 */
Path.prototype.value = function (obj, path) {
	if (obj !== undefined && typeof obj === 'object') {
		var pathParts,
			arr,
			arrCount,
			objPart,
			objPartParent,
			valuesArr = [],
			i, k;

		if (path !== undefined) {
			path = this.clean(path);
			pathParts = path.split('.');
		}

		arr = pathParts || this._pathParts;
		arrCount = arr.length;
		objPart = obj;

		for (i = 0; i < arrCount; i++) {
			objPart = objPart[arr[i]];

			if (objPartParent instanceof Array) {
				// Search inside the array for the next key
				for (k = 0; k < objPartParent.length; k++) {
					valuesArr = valuesArr.concat(this.value(objPartParent, k + '.' + arr[i]));
				}

				return valuesArr;
			} else {
				if (!objPart || typeof(objPart) !== 'object') {
					break;
				}
			}

			objPartParent = objPart;
		}

		return [objPart];
	} else {
		return [];
	}
};

/**
 * Sets a value on an object for the specified path.
 * @param {Object} obj The object to update.
 * @param {String} path The path to update.
 * @param {*} val The value to set the object path to.
 * @returns {*}
 */
Path.prototype.set = function (obj, path, val) {
	if (obj !== undefined && path !== undefined) {
		var pathParts,
			part;

		path = this.clean(path);
		pathParts = path.split('.');

		part = pathParts.shift();

		if (pathParts.length) {
			// Generate the path part in the object if it does not already exist
			obj[part] = obj[part] || {};

			// Recurse
			this.set(obj[part], pathParts.join('.'), val);
		} else {
			// Set the value
			obj[part] = val;
		}
	}

	return obj;
};

Path.prototype.get = function (obj, path) {
	return this.value(obj, path)[0];
};

/**
 * Push a value to an array on an object for the specified path.
 * @param {Object} obj The object to update.
 * @param {String} path The path to the array to push to.
 * @param {*} val The value to push to the array at the object path.
 * @returns {*}
 */
Path.prototype.push = function (obj, path, val) {
	if (obj !== undefined && path !== undefined) {
		var pathParts,
			part;

		path = this.clean(path);
		pathParts = path.split('.');

		part = pathParts.shift();

		if (pathParts.length) {
			// Generate the path part in the object if it does not already exist
			obj[part] = obj[part] || {};

			// Recurse
			this.set(obj[part], pathParts.join('.'), val);
		} else {
			// Set the value
			obj[part] = obj[part] || [];

			if (obj[part] instanceof Array) {
				obj[part].push(val);
			} else {
				throw('ForerunnerDB.Path: Cannot push to a path whose endpoint is not an array!');
			}
		}
	}

	return obj;
};

/**
 * Gets the value(s) that the object contains for the currently assigned path string
 * with their associated keys.
 * @param {Object} obj The object to evaluate the path against.
 * @param {String=} path A path to use instead of the existing one passed in path().
 * @returns {Array} An array of values for the given path with the associated key.
 */
Path.prototype.keyValue = function (obj, path) {
	var pathParts,
		arr,
		arrCount,
		objPart,
		objPartParent,
		objPartHash,
		i;

	if (path !== undefined) {
		path = this.clean(path);
		pathParts = path.split('.');
	}

	arr = pathParts || this._pathParts;
	arrCount = arr.length;
	objPart = obj;

	for (i = 0; i < arrCount; i++) {
		objPart = objPart[arr[i]];

		if (!objPart || typeof(objPart) !== 'object') {
			objPartHash = arr[i] + ':' + objPart;
			break;
		}

		objPartParent = objPart;
	}

	return objPartHash;
};

/**
 * Removes leading period (.) from string and returns it.
 * @param {String} str The string to clean.
 * @returns {*}
 */
Path.prototype.clean = function (str) {
	if (str.substr(0, 1) === '.') {
		str = str.substr(1, str.length -1);
	}

	return str;
};

Shared.finishModule('Path');
module.exports = Path;
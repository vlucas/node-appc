/**
 * Bootstraps mocha and handles code coverage testing setup.
 *
 * @copyright
 * Copyright (c) 2009-2013 by Appcelerator, Inc. All Rights Reserved.
 *
 * @license
 * Licensed under the terms of the Apache Public License
 * Please see the LICENSE included with this distribution for details.
 */

var fs = require('fs'),
	path = require('path'),
	colors = require('colors'),
	should = require('should'),
	Mocha = require(__dirname + '/../node_modules/mocha/lib/mocha.js'),
	Base = require(__dirname + '/../node_modules/mocha/lib/reporters/base'),
	runTest = process.argv.slice(2).shift(),
	mocha = new Mocha,
	reporter = 'spec';

// if we're running coverage testing, then we need to use our custom reporter
if (process.env.APPC_COV) {
	reporter = function (runner) {
		var jade = require('jade'),
			JSONCov = require(__dirname + '/../node_modules/mocha/lib/reporters/json-cov'),
			file = path.join(fs.existsSync(process.env.APPC_COV) ? process.env.APPC_COV : __dirname + '/templates', 'coverage.jade'),
			fn = jade.compile(fs.readFileSync(file), { filename: file }),
			packageJson = require('../package.json'),
			self = this;

		JSONCov.call(this, runner, false);

		runner.on('end', function () {
			process.stdout.write(fn({
				title: packageJson.name + ' Code Coverage',
				version: packageJson.version,
				cov: self.cov,
				coverageClass: function (n) {
					if (n >= 75) return 'high';
					if (n >= 50) return 'medium';
					if (n >= 25) return 'low';
					return 'terrible';
				}
			}));
		});
	};
}

// most of the logic below is the same as what the standalone mocha process does
Error.stackTraceLimit = Infinity;
Base.useColors = process.argv.indexOf('--no-colors') == -1;

mocha.reporter(reporter).ui('bdd').checkLeaks();
mocha.suite.slow('1s');

if (runTest) {
	// running a single test
	mocha.files = [ path.join(__dirname, 'test-' + runTest + '.js') ];
	if (!fs.existsSync(mocha.files[0])) {
		console.error(('\nERROR: Invalid test "' + runTest + '"\n').red);
		process.exit(1);
	}
} else {
	// running all tests
	mocha.files = (function walk(dir) {
		var ff = [];
		fs.readdirSync(dir).forEach(function (name) {
			var file = path.join(dir, name);
			if (fs.statSync(file).isDirectory()) {
				ff = ff.concat(walk(file));
			} else if ((runTest && name == runTest) || (!runTest && /^test\-.+\.js$/.test(name))) {
				ff.push(file);
			}
		});
		return ff;
	}(__dirname));
}

// run the tests
mocha.run(function (err) {
	// if doing coverage tests, we don't care about failures
	process.exit(process.env.APPC_COV || !err ? 0 : 1);
});

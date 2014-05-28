var fs = require('fs'),
	path = require('path'),
	edi = require('./lib/edi'),
	colors = require('colors'),
	xmldoc = require('xmldoc'),
	events = require('events'),
	eventEmitter = new events.EventEmitter(),
	edifiles = './edifiles/',
	options = {
		encoding: 'ascii'
	};
/* COLORS:
bold
italic
underline
inverse
yellow
cyan
white
magenta
green
red
grey
blue
rainbow
zebra
random
*/

function UnknownSegmentException(segment) {
	this.segment = segment;
	this.message = "er et ukendt segment";
	this.toString() = function () {
		return this.segment + ' ' + this.message;
	}
}

function WrongSegmentException(segment, expectedSegment) {
	this.segment = segment;
	this.message = "er et ukendt segment, forventede";
	this.toString() = function () {
		return this.segment + ' ' + this.message + ' ' + expectedSegment;
	}
}

function formatEdiFile(file) {
	var output = '';
	edi().fromPath(edifiles + file, options)
		.on('data', function (data, index) {
			if (data[0] === '') {
				output += '[' + file + ']\n';
				return null;
			}
			if (data[0] === 'UNH' || data[0] === 'UNZ') {
				output += '--------------------------------------------------------------------------\n';
			}
			output += '#' + index + ' ' + JSON.stringify(data) + '\n';
		})
		.on('end', function (count) {
			output += '[' + file + '] contains ' + count + ' lines';
			console.log(output);
		})
		.on('error', function (error) {
			var str = '' + error.message + '';
			console.log(str.red);
		});
}

function findSegment(segments, structure, segmentNumber, ediSegment) {
	console.log('findSegment');
	console.log(segments.name);
	console.log(structure.name);
	console.log(segmentNumber);
	console.log(ediSegment);
	// fetch the next node from the structure
	var structureNode = structure.children[segmentNumber];
	if (!structureNode) {
		// Nothing exists at the current segmentNumber
		throw new UnknownSegmentException(ediSegment);
	}
	if (structureNode.attr.id === ediSegment) {
		// The edisegment matches the current node
		if (structureNode.attr.position) {
			// The node is a variant of a non unique segment, find the correct segment by the position
			var possibleSegments = segments.childrenNamed(structureNode.attr.id).filter(function (x) {
				return x.attr.position === structureNode.attr.position;
			});
			if (possibleSegments && possibleSegments.length === 1) {
				// If a segment was found then return that segment
				return possibleSegments[0];
			} else {
				// Either no segment was found or multiple matching segments where found
				throw new UnknownSegmentException(ediSegment);
			}
		} else {
			// The segment node is an instance of a unique segment
			return segments.childWithAttribute('id',ediSegment);
		}
	} else if (!structureNode.attr.required && structureNode.attr.min === '0') {
		// The current node does not match the current edi segment, but the node is not required nor has a minimum repeat
		return findSegment(segments, structure, segmentNumber + 1, ediSegment);
	} else if (structureNode.name === 'group') {
		try {
			// The current node is a group, validate if the edisegment matches one of the children in the group
			return findSegment(segments, structureNode.children, 0, ediSegment);
		} catch (e) {
			// The ediSegment did not match any of the children
			if (!structureNode.attr.required && structureNode.attr.min === '0') {
				// The group is not required, validate the next node
				return findSegment(segments, structure, segmentNumber + 1, ediSegment);
			} else {
				throw new WrongSegmentException(ediSegment, structureNode.children[0].name);
			}
		}
	} else {
		throw new WrongSegmentException(ediSegment, structureNode.name);
	}
}

function readEdiFile(segments, structure, file) {
	console.time("reading-file");
	var str = 'reading [' + file + ']';
	console.log(str.bold.yellow);
	var segmentNumber = 0;
	var groupSegmentNumber = 0;
	var segmentCount = 1;
	edi().fromPath(edifiles + file, options)
	/*
		.transform(function (data, index) {
			var str = '' + data + '';
			console.log(str.green);
			data.unshift(data.pop());
			return data;
		})
		*/
	.on('data', function (data, index) {
		if (data[0] === '' || data[0] === 'UNB') {
			return null;
		}
		var segment = findSegment(segments, structure, index - 2, data[0]);
		console.log('#' + index + ' ediSegment [' + data[0] + '] xmlSegment [' + segment + ']');
		//process.exit(1);
		//segmentNumber++;
	})
		.on('end', function (count) {
			var str = '[' + file + '] contains ' + count + ' lines';
			console.log(str.bold.yellow);
			console.timeEnd("reading-file");
		})
		.on('error', function (error) {
			var str = '' + error.message + '';
			console.log(str.red);
		});
}

console.time("reading-segments");
fs.readFile(path.join(__dirname, "pant.xml"), 'utf8', function (err, data) {

	if (err) {
		return console.log(err);
	}

	// Parse the XML
	var results = new xmldoc.XmlDocument(data);
	console.log('Segment definition [%s] version [%s] description [%s]', results.attr.type, results.attr.version, results.attr.description);
	// Demonstrate toString() with an option to abbreviate long strings and compress the output
	//console.log("Parsed: \n%s", results.toString({trimmed:true, compressed:true}));

	var segmentsNode = results.childNamed("segments");


	/*
	segmentsNode.eachChild(function (segment) {
		console.log("Found segment with ID '%s'", segment.attr.id);
	});
	var segments = segmentsNode.childrenNamed("segment");

	console.log("Found %s segments.", segments.length);
	*/

	var structureNode = results.childNamed("structure");

	console.timeEnd("reading-segments");
	eventEmitter.emit('segments-read', segmentsNode, structureNode);
});

eventEmitter.on('segments-read', function (segments, structure) {
	fs.readdir(edifiles, function (err, files) {
		if (err) throw err;
		files.forEach(function (file) {
			//formatEdiFile(file);
			readEdiFile(segments, structure, file);
		});
	});
});

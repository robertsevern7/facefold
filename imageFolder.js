function ImageFolder(imagePath, canvas, horizontalFolds, largestSize) {
    var context = canvas.getContext('2d');
	
	addMouseEventListeners(canvas);
    var image = new Image();

    this.yScrunches = horizontalFolds || [];
	
    var that = this;
    var DEFAULT_LARGEST_SIZE = 800;
    image.addEventListener('load', function () {
	    sizeCanvasAndImage(largestSize || DEFAULT_LARGEST_SIZE, this, canvas);
	    applyScrunches(that.yScrunches, context, canvas, true);
    }, false);

    image.src = imagePath;
  
	function sizeCanvasAndImage(maxWidth, image, canvas) {
		var aspectRatio = image.height/image.width;
		
		if (image.width > maxWidth){
			canvas.width = maxWidth;
			canvas.height = maxWidth*aspectRatio;
		} else {
			canvas.width = image.width;
			canvas.height = image.height;
		}
	}

	function applyScrunches(scrunches, context, canvas, horizontal) {
		var sections = getSectionRanges(scrunches, horizontal ? image.height : image.width);
		context.clearRect(0, 0, canvas.width, canvas.height);
		for (var i = 0, len = sections.length; i < len; ++i) {
			var section = sections[i];
			var sectionSize = Math.max(0, section.size);
			if (horizontal) {
				context.drawImage(image, 0, section.actualStart, canvas.width, sectionSize, 0, section.drawnStart, canvas.width, sectionSize);
			} else {
				context.drawImage(image, section.actualStart, 0, sectionSize, canvas.height, section.drawnStart, 0, sectionSize, canvas.height);
			}
			
			if (i !== (length - 1)) {
				raggedLine(context, canvas, section.drawnStart, horizontal);
			}
		}
	}

	function getSectionRanges(scrunches, imageSize) {
		var clonedScrunches = cloneArray(scrunches);
		var accumulatedScrunch = 0;
		var accumulatedScrunchPrev = 0;
		
		var finalPosition = {
			startPoint: imageSize,
			grabSize: 0
		};
		
		clonedScrunches.push(finalPosition);
		
		var previousDrag = {
			startPoint: 0,
			grabSize: 0
		};
		
		var sectionRanges = [];
		
		for (var i = 0, len = clonedScrunches.length; i < len; ++i) {
			var scrunchI = clonedScrunches[i];
			var startPoint = scrunchI.startPoint;
			
			sectionRanges.push({
				actualStart: previousDrag.startPoint + previousDrag.grabSize,
				drawnStart: previousDrag.startPoint - accumulatedScrunch,
				size: startPoint - (previousDrag.startPoint + previousDrag.grabSize)
			});
			
			accumulatedScrunch += previousDrag.grabSize;
			previousDrag = scrunchI;
		}
		
		return sectionRanges;
	}

	//Note this only clone the array so that adding to it doesn't change the original object - the objects themselves are still references
	function cloneArray(array) {
		var cloneArray = [];
		
		for (var i = 0, len = array.length; i < len; ++i) {
			cloneArray.push(array[i]);
		}
		
		return cloneArray;
	}

	function raggedLine(context, canvas, startPoint, horizontal) {
		var grd;
		if (horizontal) {
			grd = context.createLinearGradient(0, startPoint, 0.1, startPoint + 10);
		} else {
			grd = context.createLinearGradient(startPoint, 0, startPoint + 10, 0.1);
		}
		
		grd.addColorStop(0.05,"black");
		grd.addColorStop(0.95,"transparent");
		context.fillStyle = grd;
		
		if (horizontal) {
			context.fillRect(0, startPoint, canvas.width, canvas.height);
		} else {
			context.fillRect(startPoint, 0, canvas.width, canvas.height);
		}
	}

	function addScrunch(startPoint, size, horizontal) {
		//TODO when I properly support combining x and y scrunches then don't just return yScrunches all the time
		var scrunchArray = horizontal ? that.yScrunches : that.yScrunches;
		var scrunch = {
			startPoint: startPoint,
			grabSize: size
		}
		scrunchArray.push(scrunch);
		orderScrunches(scrunchArray);
		return scrunch;
	}
	
	function orderScrunches(scrunches) {
		scrunches.sort(function(scrunch1, scrunch2) {
			return scrunch1.startPoint > scrunch2.startPoint;
		})
	}
	
	function addMouseEventListeners(canvas) {
		canvas.addEventListener('mousedown',  mouseDownHandler, false);
		canvas.addEventListener('mousemove',  mouseMoveHandler, false);
		canvas.addEventListener('mouseup',  mouseUpHandler, false);
	}
	
	function insideRenderedRegion(clickLocation, scrunches, maxSize) {
		var scrunchesSize = maxSize;
		for (var i = 0, size = scrunches.length; i < size; ++i) {
			scrunchesSize -= scrunches[i].grabSize;
		}
		return (clickLocation > scrunchesSize);
	}
	
	function mouseDownHandler(ev) {
		var position = getMousePosition(ev);
		
		if (insideRenderedRegion(position.y, that.yScrunches, image.height)) {
			
			return true;
		}
		that.xStart = position.x;
		that.yStart = position.y;
		started = true;
	}
	
	function mouseUpHandler(ev) {
		if (!started) {
			return;
		}
		started = false;
		var position = getMousePosition(ev);
		renderNewFold(position.x, position.y);
		delete that._currentScrunch;
		delete that._precedingScrunch;
		delete that._followingScrunch;
		delete that._currentPrecedingScrunch;
	}
	
	function renderNewFold(x, y) {
		var startPoint = Math.min(that.yStart, y) + (that._currentPrecedingScrunch || 0);
		var grabSize = Math.abs(that.yStart - y);
		
		if (!that._currentScrunch) {
			that._currentScrunch = addScrunch(startPoint, grabSize, true);
			var index = that.yScrunches.indexOf(that._currentScrunch);
			that._precedingScrunch = (index > 0) ? that.yScrunches[index - 1] : undefined;
			that._followingScrunch = (index + 1 < that._currentScrunch.length) ? that.yScrunches[index + 1] : undefined;
			that._currentPrecedingScrunch = getPrecedingTotalScrunch(that.yScrunches, index);
		} else {
			min = that._precedingScrunch && (that._precedingScrunch.startPoint + that._precedingScrunch.grabSize + 5) || 0;
			max = that._followingScrunch && (that._followingScrunch.startPoint + that._followingScrunch.grabSize - 5) || image.height;
		
			that._currentScrunch.startPoint = Math.max(startPoint, min);
			that._currentScrunch.grabSize = grabSize;
		}
		applyScrunches(that.yScrunches, context, canvas, true);
	}
	
	function getPrecedingTotalScrunch(scrunches, upto) {
		var totalScrunch = 0;

		for (var i = 0, len = scrunches.length; i < upto && i < len; ++i) {
			totalScrunch += scrunches[i].grabSize;
		}
		
		return totalScrunch;
	}
	
	var started = false;
	function mouseMoveHandler(ev) {
		if (!started) {
			return;
		}
		var position = getMousePosition(ev);
		renderNewFold(position.x, position.y);
	}
	
	function getMousePosition(ev) {
		if (ev.layerX || ev.layerX == 0) { // Firefox
			x = ev.layerX;
			y = ev.layerY;
		} else if (ev.offsetX || ev.offsetX == 0) { // Opera
			x = ev.offsetX;
			y = ev.offsetY;
		}
		
		return {
			x: x,
			y: y
		}
	}
	
	function testGetSectionRanges() {
		//No Scrunches
		var scrunches = [];

		var sectionRanges = getSectionRanges(scrunches, 400);
		
		assertEquals(0, scrunches.length);
		assertEquals(1, sectionRanges.length);
		
		var firstSection = sectionRanges[0];
		assertEquals(0, firstSection.actualStart);
		assertEquals(0, firstSection.drawnStart);
		assertEquals(400, firstSection.size);
		
		//One Scrunch
		scrunches = [{
			startPoint: 130,
			grabSize: 30
		}];

		sectionRanges = getSectionRanges(scrunches, 400);
		
		assertEquals(1, scrunches.length);
		assertEquals(2, sectionRanges.length);
		
		firstSection = sectionRanges[0];
		assertEquals(0, firstSection.actualStart);
		assertEquals(0, firstSection.drawnStart);
		assertEquals(130, firstSection.size);
		
		var secondSection = sectionRanges[1];
		assertEquals(160, secondSection.actualStart);
		assertEquals(130, secondSection.drawnStart);
		assertEquals(240, secondSection.size);
		
		//Two Scrunch
		scrunches = [{
			startPoint: 130,
			grabSize: 30
		},{
			startPoint: 200,
			grabSize: 20
		}];

		sectionRanges = getSectionRanges(scrunches, 400);
		
		assertEquals(2, scrunches.length);
		assertEquals(3, sectionRanges.length);
		
		firstSection = sectionRanges[0];
		assertEquals(0, firstSection.actualStart);
		assertEquals(0, firstSection.drawnStart);
		assertEquals(130, firstSection.size);
		
		secondSection = sectionRanges[1];
		assertEquals(160, secondSection.actualStart);
		assertEquals(130, secondSection.drawnStart);
		assertEquals(40, secondSection.size);
		
		var thirdSection = sectionRanges[2];
		assertEquals(220, thirdSection.actualStart);
		assertEquals(170, thirdSection.drawnStart);
		assertEquals(180, thirdSection.size);
	}
	
	function testOrderScrunches() {
		var scrunches = [{
			startPoint: 130,
			grabSize: 30
		},{
			startPoint: 100,
			grabSize: 20
		},{
			startPoint: 115,
			grabSize: 10
		}];
		
		orderScrunches(scrunches);
		
		assertEquals(3, scrunches.length);
		assertEquals(100, scrunches[0].startPoint);
		assertEquals(115, scrunches[1].startPoint);
		assertEquals(130, scrunches[2].startPoint);
		
		assertEquals(20, scrunches[0].grabSize);
		assertEquals(10, scrunches[1].grabSize);
		assertEquals(30, scrunches[2].grabSize);
	}

	return {
		addScrunch: addScrunch
	}
}

function assertEquals(expected, actual) {
	if (expected !== actual) {
		alert('Mismatch! Expected: ' + expected + ', got: ' + actual);
	}
}
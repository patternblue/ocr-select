$(document).ready(main);

function renderBox(){
    // render box
    $('#box-select').css({
        'width': this.w,
        'height': this.h
    });
    if(this.mouseX <= this.initX && this.mouseY >= this.initY){
    	// lower-left quad of init point
        $("#box-select").css({
            'left': this.mouseX,
            'top': this.initY
        });
    } else if (this.mouseY <= this.initY && this.mouseX >= this.initX) {
    	// upper-right quad of init point
        $("#box-select").css({
            'top': this.mouseY,
            'left': this.initX
        });
    } else if (this.mouseY < this.initY && this.mouseX < this.initX) {
    	// upper-left quad of init point
        $("#box-select").css({
            'left': this.mouseX,
            "top": this.mouseY
        });
    } else{
    	// lower-right quad of init point
        $("#box-select").css({
            'left': this.initX,
            "top": this.initY
        });    	
    }

}

function displayProgress(event){
	document.getElementById('progress').innerHTML = "Progress: " + 100*event.recognized + "%";
}

function display(textToDisplay) {
	document.getElementById('display').innerHTML += textToDisplay.text + "<br>";
}
function runOCR(img, ocrAPI){
	var outputMaybe = ocrAPI
		.recognize(img, {
			progress: displayProgress,
			lang: 'eng'
		})
	  	.then(display);
}

function initImageObj(){
	this.testArea = {};
	this.testArea.canvas = document.getElementById('test-area');
	this.testArea.context = this.testArea.canvas.getContext('2d');
	this.sourceArea = {};
	this.sourceArea.canvas = document.getElementById('uploaded-img');
	this.sourceArea.context = this.sourceArea.canvas.getContext('2d');

	// imageObject's methods
	this.removeBox = function(){
			$('#box-select').width(0).height(0);
			$('#box-select').removeClass('box-active');
	}
	this.initBox = function(e){

		// clear the box
		this.removeBox();

		// offset refers to position of parent relative to page
		$boxSelect = $('#box-select');
		$boxSelectParent = $boxSelect.parent();
		this.offset = $boxSelectParent.offset();
		this.initX = e.pageX - this.offset.left + $boxSelectParent.scrollLeft();
		this.initY = e.pageY - this.offset.top + $boxSelectParent.scrollTop();

		// view: set active class
		$("#box-select").addClass('box-active');

	    $(document).bind("mousemove", this.getSize);
	   	$(document).bind("mouseup", this.captureArea);
	    console.log('ran initBox');
	}
	this.getSize = function(e){
		// get width and length of box
		this.mouseX = e.pageX - this.offset.left + $boxSelectParent.scrollLeft();;
		this.mouseY = e.pageY - this.offset.top + $boxSelectParent.scrollTop();;
		this.w = Math.abs(this.initX - this.mouseX);
	    this.h = Math.abs(this.initY - this.mouseY);

	    // View
	    renderBox();
	}

	this.captureArea = function(){
		$(document).unbind('mousemove', this.getSize);
		$(document).unbind('mouseup', this.captureArea);

		// mouse position on testArea.canvas - initial mousedown position on testArea.canvas
		// where to start clipping
		if(this.mouseX < this.initX){
			var clipX = this.mouseX;
		}else{
			var clipX = this.initX;
		}
		if(this.mouseY < this.initY){
			var clipY = this.mouseY;
		}else{
			var clipY = this.initY;
		}
		
		// mouseup position - initial mousedown position
		var clipWidth = Math.max(1, Math.floor(this.w));
		var clipHeight = Math.max(1, Math.floor(this.h));
		var x = 0;
		var y = 0;

		// set up testArea.canvas dimensions and draw the image
		this.testArea.context.clearRect(0, 0, this.testArea.canvas.width, this.testArea.canvas.height);
		this.testArea.canvas.width = clipWidth;
		this.testArea.canvas.height = clipHeight;
		this.testArea.context.drawImage(this, clipX, clipY, clipWidth, clipHeight, x, y, clipWidth, clipHeight);

		// prepare testArea.canvas's drawn image for OCR API 
		var img = new Image();
		img.src = this.testArea.canvas.toDataURL("image/jpeg", 1.0);
		console.log(img.src);
		// image must load first before running OCR!
		img.onload = function(){
			runOCR(this, Tesseract);
		}
	}
}

function main(){

	var imgInput = document.getElementById('img-input');

	// init my image object
	var imageObj = new Image();	
	initImageObj.call(imageObj);
    imageObj.initBox = imageObj.initBox.bind(imageObj);
    imageObj.getSize = imageObj.getSize.bind(imageObj);
    imageObj.captureArea = imageObj.captureArea.bind(imageObj);
    renderBox = renderBox.bind(imageObj);


    // prevent dragging the image when you click to drag a box
    $('#uploaded-img').on('dragstart', function(event) { event.preventDefault(); });


    // upload an image
	imgInput.onchange = function(){
		$('#uploaded-img').unbind('mousedown', imageObj.initBox);

		var fileTypesIMG = ['jpg', 'jpeg', 'png'];
		var fileTypesPDF = ['pdf']; 
		var inputExtension = this.files[0].name.split('.').pop().toLowerCase(),
		// console.log(inputExtension);
			isPDF = fileTypesPDF.indexOf(inputExtension) > -1,
			isIMG = fileTypesIMG.indexOf(inputExtension) > -1;

		if (isPDF){
		        var tmpPath = URL.createObjectURL(this.files[0]);
				PDFJS.getDocument(tmpPath).then(function(pdf){
  					pdf.getPage(1).then(function(page){
  						var scale = 1;
						var viewport = page.getViewport(scale);

						// var canvas = document.getElementById('the-canvas');
						// var context = canvas.getContext('2d');
						imageObj.sourceArea.context.clearRect(0, 0, viewport.width, viewport.height);
						imageObj.sourceArea.canvas.width = viewport.width;
						imageObj.sourceArea.canvas.height = viewport.height;

						var renderContext = {
						  canvasContext: imageObj.sourceArea.context,
						  viewport: viewport
						};
						page.render(renderContext).promise.then(function(){
	  						imageObj.src = imageObj.sourceArea.canvas.toDataURL("image/jpeg", 1.0);
	  						console.log(imageObj.src);
	  						imageObj.onload = function(){
	  							$('#uploaded-img').on('mousedown', imageObj.initBox);
	  						}
	  					});
						
  					});
				});

		}else if(isIMG){
			// change src of uploaded img
		    var reader = new FileReader();

	    	reader.onload = function (e) {

		        // for canvas files
				imageObj.src = e.target.result;

				imageObj.sourceArea.context.clearRect(0, 0, imageObj.width, imageObj.height);
				imageObj.sourceArea.canvas.width = imageObj.width;
				imageObj.sourceArea.canvas.height = imageObj.height;
				imageObj.sourceArea.context.drawImage(imageObj, 0, 0, imageObj.width, imageObj.height);	

		        // attach listener to create a box whenever the upload-img is clicked on
		        $('#uploaded-img').on('mousedown', imageObj.initBox);
		    };

		    // read image file as data URL
	        reader.readAsDataURL(this.files[0]);		
		}else{
			// console log error
			console.log('error! invalid file type');
		}


	}



// model:
// imageObj
// box

// view:
// img-input
// img-uploaded
// img-testArea
// box
// 	render

	console.log('ran main');

}

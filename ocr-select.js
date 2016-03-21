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
	this.canvas = document.getElementById('test-area');
	this.context = this.canvas.getContext('2d');

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

		// mouse position on canvas - initial mousedown position on canvas
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

		// set up canvas dimensions and draw the image
		this.context.clearRect(0, 0, this.canvas.width, this.canvas.height);
		this.canvas.width = clipWidth;
		this.canvas.height = clipHeight;
		this.context.drawImage(this, clipX, clipY, clipWidth, clipHeight, x, y, clipWidth, clipHeight);

		// prepare canvas's drawn image for OCR API 
		var img = new Image();
		img.src = this.canvas.toDataURL("image/jpeg", 0.1);
		// image must load first before running OCR!
		img.onload = function(){
			runOCR(this, Tesseract);
		}
	}
}

function main(){

	var yourImg = document.getElementById('your-img');

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
	yourImg.onchange = function(){
		$('#uploaded-img').unbind('mousedown', imageObj.initBox);
		// change src of uploaded img
	    var reader = new FileReader();

    	reader.onload = function (e) {
    		// view:
	        var uploadedImg = document.getElementById("uploaded-img");
	        uploadedImg.src = e.target.result;
	        
	        // model:
	        imageObj.src = uploadedImg.src;
	        $('#uploaded-img').on('mousedown', imageObj.initBox);
	    };
	    // read image file as data URL
        reader.readAsDataURL(this.files[0]);
	}


	console.log('ran main');

}

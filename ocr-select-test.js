$(document).ready(main);


// window.ocrSelectApp = {};

// Model
(function(window){
	function Model(){

		// model props
		this.box = {};
		this.img = new Image();
		this.imgToOCR = new Image();

		// model methods
		Model.prototype.initBox = function(x, y){
			this.box = {
				x: x,
				y: y
			}		
		};
		Model.prototype.sizeBox = function(x, y){
			// get width and length of box
			this.box.mouseX = x;
			this.box.mouseY = y;
			this.box.w = Math.abs(this.box.x - x);
		    this.box.h = Math.abs(this.box.y - y);
		};
		Model.prototype.boxFlip = function(){
			var x = this.box.x;
			var y = this.box.y;
			var mouseX = this.box.mouseX;
			var mouseY = this.box.mouseY;
			var left = 0;
			var top = 0;
		    if(mouseX <= x && mouseY >= y){
		    	// lower-left quad of init point
		    	left = mouseX;
		    	top = y;
		    } else if (mouseY <= y && mouseX >= x) {
		    	// upper-right quad of init point
		    	left = x;
		    	top = mouseY;
		    } else if (mouseY < y && mouseX < x) {
		    	// upper-left quad of init point
		    	left = mouseX;
		    	top = mouseY;
		    } else{
		    	// lower-right quad of init point
		    	left = x;
		    	top = y;
		    }
		    this.box.left = left;
		    this.box.top = top;
		};
		Model.prototype.updateImgSrc = function(aURL){
			this.img.src = aURL;
		};

	};

	window.ocrSelectApp = window.ocrSelectApp || {};
	window.ocrSelectApp.model = new Model();
})(window);

(function(window){

	function View(){

		// view props
		this.imgInput = document.getElementById('img-input');
		this.uploadedImg = document.getElementById('uploaded-img');
		this.$uploadedImg = $('#uploaded-img');
		this.uploadedImg.context = this.uploadedImg.getContext('2d');
		this.testArea = document.getElementById('test-area');
		this.testArea.context = this.testArea.getContext('2d');
		this.$box = $('#box-select');

		// view methods
		View.prototype.removeBox = function(){
			this.$box.width(0).height(0);
			this.$box.removeClass('box-active');
		};
		View.prototype.renderBox = function(left, top, w, h){
		    this.$box.css({
		    	'left': left,
		        'top': top,
		        'width': w,
		        'height': h
		    });
		    this.$box.addClass('box-active');
		};
		View.prototype.getMousePos = function(event){
			var $uploadedImgParent = this.$uploadedImg.parent();
			var offset = $uploadedImgParent.offset();
			var x = event.pageX - offset.left + $uploadedImgParent.scrollLeft();
			var y = event.pageY - offset.top + $uploadedImgParent.scrollTop();
			return [x, y];
		};
		View.prototype.renderTestArea = function(imageObj, left, top, w, h){	
			// set up testArea.canvas dimensions and draw the image
			var left = left;
			var top = top;
			var clipW = Math.max(1, Math.floor(w));
			var clipH = Math.max(1, Math.floor(h));

			var x = 0;
			var y = 0;
			this.testArea.context.clearRect(0, 0, this.testArea.width, this.testArea.height);
			this.testArea.width = clipW;
			this.testArea.height = clipH;
			this.testArea.context.drawImage(imageObj, left, top, clipW, clipH, x, y, clipW, clipH);
		};
		View.prototype.renderUploadedPDF = function(page, scale){
			var viewport = page.getViewport(scale);
			var renderContext = {
			  canvasContext: this.uploadedImg.context,
			  viewport: viewport
			}
			this.uploadedImg.context.clearRect(0, 0, viewport.width, viewport.height);
			this.uploadedImg.width = viewport.width;
			this.uploadedImg.height = viewport.height;

			return page.render(renderContext).promise;
		};
		View.prototype.renderUploadedImg = function(imageObj, w, h){
			this.uploadedImg.context.clearRect(0, 0, w, h);
			this.uploadedImg.width = w;
			this.uploadedImg.height = h;
			this.uploadedImg.context.drawImage(imageObj, 0, 0, w, h);	

		};
		View.prototype.displayProgress = function(event){
			document.getElementById('progress').innerHTML = "Progress: " + 100*event.recognized + "%";
		};
		View.prototype.displayResult = function(textToDisplay) {
			document.getElementById('display').innerHTML += textToDisplay.text + "<br>";

		};
	};



	window.ocrSelectApp = window.ocrSelectApp || {};
	window.ocrSelectApp.view = new View();
})(window);

(function(window){

	function Controller(){
		// Controller methods
		Controller.prototype.init = function(model, view){
			var self = this;
			view.$uploadedImg.on('dragstart', function(event){
				event.preventDefault(); 
			});
			this.initBoxOnMouseDown = this.initBoxOnMouseDown.bind(this);
			this.drawBoxOnMouseMove = this.drawBoxOnMouseMove.bind(this);
			this.captureAreaOnMouseUp = this.captureAreaOnMouseUp.bind(this);

			view.imgInput.onchange = function(event){
				self.getInputImgPDF.call(self, this, model, view);
			}


		};
		Controller.prototype.getInputImgPDF = function(el, model, view){
			var self = this;
			view.$uploadedImg.off('mousedown', self.initBoxOnMouseDown);

			var fileTypesIMG = ['jpg', 'jpeg', 'png'];
			var fileTypesPDF = ['pdf']; 
			var inputExtension = el.files[0].name.split('.').pop().toLowerCase(),
				isPDF = fileTypesPDF.indexOf(inputExtension) > -1,
				isIMG = fileTypesIMG.indexOf(inputExtension) > -1;
			if (isPDF){
			        var tmpPath = URL.createObjectURL(el.files[0]);
					PDFJS.getDocument(tmpPath).then(function(pdf){
						console.log(pdf);
	  					pdf.getPage(1).then(function(page){
	  						var scale = 1;
							view.renderUploadedPDF(page, scale).then(function(){
								var aDataURL = view.uploadedImg.toDataURL("image/jpeg", 1.0);
								model.updateImgSrc(aDataURL);
								model.img.onload = function(){
									view.$uploadedImg.on('mousedown', {arg1: model, arg2: view}, self.initBoxOnMouseDown);
								}
							});
	  					});
					});
			}else if(isIMG){
				// change src of uploaded img
			    var reader = new FileReader();
		    	reader.onload = function (event) {
					model.updateImgSrc(event.target.result);
					view.renderUploadedImg(model.img, model.img.width, model.img.height);

			        // attach listener to create a box whenever the upload-img is clicked on
					view.$uploadedImg.on('mousedown', {arg1: model, arg2: view}, self.initBoxOnMouseDown);

			    };

			    // read image file as data URL
		        reader.readAsDataURL(el.files[0]);		
			}else{
				// console log error
				console.log('error! invalid file type');
			}
		};
		Controller.prototype.initBoxOnMouseDown = function(event){
			var self = this;
			var model = event.data.arg1;
			var view = event.data.arg2;
			// unbind mousedown?
			var xy = view.getMousePos(event);
			view.removeBox();
			model.initBox(xy[0], xy[1]);
			$(document).on('mousemove', {arg1: model, arg2: view}, self.drawBoxOnMouseMove);
		};
		Controller.prototype.drawBoxOnMouseMove = function(event){
			var self = this;
			var model = event.data.arg1;
			var view = event.data.arg2;
			var xy = view.getMousePos(event);
			model.sizeBox(xy[0], xy[1]);
			model.boxFlip();
			var left = model.box.left;
			var top = model.box.top;
			var w = model.box.w;
			var h = model.box.h;
			view.renderBox(left, top, w, h);
			$(document).on("mouseup", {arg1: model, arg2: view}, self.captureAreaOnMouseUp);
		};
		Controller.prototype.captureAreaOnMouseUp = function(event){
			var self = this;
			var model = event.data.arg1;
			var view = event.data.arg2;
			$(document).off('mousemove', self.drawBoxOnMouseMove);
			$(document).off('mouseup', self.captureAreaOnMouseUp);

			var left = model.box.left;
			var top = model.box.top;
			var w = model.box.w;
			var h = model.box.h;
			
			view.renderTestArea(model.img, left, top, w, h);

			// prepare testArea.canvas's drawn image for OCR API 
			model.imgToOCR.src = view.testArea.toDataURL("image/jpeg", 1.0);

			// image must load first before running OCR!
			model.imgToOCR.onload = function(){
				console.log('ready to OCR!');
				self.runOCR(this, Tesseract, model, view);				
			}
		};
		Controller.prototype.runOCR = function(img, ocrAPI, model, view){
			ocrAPI
				.recognize(img, {
					progress: view.displayProgress,
					lang: 'eng'
				})
			  	.then(function(textToDisplay){
			  		view.displayResult(textToDisplay);
			  		img.onload = null;
			  	});
		};


	};

	window.ocrSelectApp = window.ocrSelectApp || {};
	window.ocrSelectApp.controller = new Controller();
})(window);



function main(){

	myModel = window.ocrSelectApp.model;
	myView = window.ocrSelectApp.view;
	myController = window.ocrSelectApp.controller;
	myController.init(myModel, myView);

	console.log('ran main');
}

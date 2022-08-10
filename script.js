let touchend;
window.addEventListener('load', () => {
    const canvas = document.getElementById('canvas');
    const ctx = canvas.getContext('2d')

    let isRecognized = false;

    let coord = { x: 0, y: 0 };
    document.addEventListener("mousedown", start);
    document.addEventListener("mouseup", stop);

    function reposition(event) {
        coord.x = event.x - canvas.offsetLeft;
        coord.y = event.y - canvas.offsetTop;
    }

    function start(event) {
        document.addEventListener("mousemove", draw);
        reposition(event);
    }

    function stop() {
        document.removeEventListener("mousemove", draw);
        setTimeout(() => {
            recognizeN().then(() => {
                ctx.clearRect(0,0,canvas.width,canvas.height);
                isRecognized = false;
            });
        }, 100);
    }

    function draw(event) {
        ctx.beginPath();
        ctx.beginPath();
        ctx.lineWidth = 20;
        ctx.lineCap="round";
        this.isDrawing = true;
        ctx.moveTo(coord.x, coord.y);
        reposition(event);
        ctx.lineTo(coord.x, coord.y);
        ctx.stroke();
    }

    function recognizeN() {
		return new Promise((resolve, reject) => {
            if (isRecognized) return;
            let imgData = ctx.getImageData(0, 0, 280, 280);

            grayscaleImg = imageDataToGrayscale(imgData);
            const trans = centerImage(grayscaleImg); 

            const canvasCopy = document.createElement("canvas");
            canvasCopy.width = imgData.width;
            canvasCopy.height = imgData.height;
            const copyCtx = canvasCopy.getContext("2d");
            const drawH = getScale(grayscaleImg);
            copyCtx.translate(canvas.width/2, canvas.height/2);
            copyCtx.scale(190/drawH, 190/drawH);
            copyCtx.translate(-canvas.width/2, -canvas.height/2);
            copyCtx.translate(trans.transX, trans.transY);

            copyCtx.drawImage(ctx.canvas, 0, 0);

            imgData = copyCtx.getImageData(0, 0, 280, 280);
            grayscaleImg = imageDataToGrayscale(imgData);

            const nnInput = new Array(784);
            const nnInput2 = [];
            for (var y = 0; y < 28; y++) {
	            for (var x = 0; x < 28; x++) {
	                let mean = 0;
	                for (let v = 0; v < 10; v++) {
	                    for (let h = 0; h < 10; h++) {
	                        mean += grayscaleImg[y*10 + v][x*10 + h];
	                    }
	                }
	                mean = (1 - mean / 100);
	                nnInput[x*28+y] = (mean - .5) / .5;
	            }
	        }

            if (true) {
	            ctx.clearRect(0, 0, canvas.width, canvas.height);
	            ctx.drawImage(copyCtx.canvas, 0, 0);
	            for (var y = 0; y < 28; y++) {
	                for (var x = 0; x < 28; x++) {
	                    const block = ctx.getImageData(x * 10, y * 10, 10, 10);
	                    const newVal = 255 * (0.5 - nnInput[x*28+y]/2);
	                    nnInput2.push(Math.round((255-newVal)/255*100)/100);
	                    for (let i = 0; i < 4 * 10 * 10; i+=4) {
	                        block.data[i] = newVal;
	                        block.data[i+1] = newVal;
	                        block.data[i+2] = newVal;
	                        block.data[i+3] = 255;
	                    }
	                    ctx.putImageData(block, x * 10, y * 10);
	                }
	            }
	        }


            const output = findMax(nnInput2);
            document.getElementById('result').innerText = output.toString();
            isRecognized = true;
			resolve()
        })

    }
}, false);

function net(input) {
  var netData = window["netData"]
  for (var i = 1; i < netData.layers.length; i++) {
    var layer = netData.layers[i];
    var output = {};

    for (var id in layer) {
      var node = layer[id];
      var sum = node.bias;

      for (var iid in node.weights) {
        sum += node.weights[iid] * input[iid];
      }
      output[id] = 1 / (1 + Math.exp(-sum));
    }
    input = output;
  }
  return output;
}

function findMax(input) {
  var output = net(input);
  return Object.keys(output).reduce((a, b) => output[a] > output[b] ? a : b);
}

function centerImage(img) {
    var meanX = 0;
    var meanY = 0;
    var rows = img.length;
    var columns = img[0].length;
    var sumPixels = 0;
    for (var y = 0; y < rows; y++) {
        for (var x = 0; x < columns; x++) {
            var pixel = (1 - img[y][x]);
            sumPixels += pixel;
            meanY += y * pixel;
            meanX += x * pixel;
        }
    }
    meanX /= sumPixels;
    meanY /= sumPixels;

    var dY = Math.round(rows/2 - meanY);
    var dX = Math.round(columns/2 - meanX);
    return {transX: dX, transY: dY};
}

function getScale(img) {
    let minH = img.length;
    let maxH = -1;
    for (x = 0; x < img[0].length; x++) {
        for ( y = 0; y < img.length; y++) {
            if (img[y][x] < 1) {
                if (minH > y) minH = y;
                if (maxH < y) maxH = y;
            }
        }
    }
    drawH = maxH - minH;
    return drawH;
}


function imageDataToGrayscale(imgData) {
    var grayscaleImg = [];
    for (i = 0; i < imgData.height; i++) {
        grayscaleImg[i]=[];

        for (j = 0; j < imgData.width; j++) {
            var offset = 4*i*imgData.width + 4*j;
            var alpha = imgData.data[offset+3];
            if (alpha == 0) {
                imgData.data[offset] = 255;
                imgData.data[offset+1] = 255;
                imgData.data[offset+2] = 255;
            }
            imgData.data[offset+3] = 255;
            grayscaleImg[i][j] = imgData.data[i*4*imgData.width + 4*j + 0] / 255;
        }
    }
    return grayscaleImg;
}

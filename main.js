window.addEventListener('load', function () {
  var canvas = document.getElementById('myCanvas');
  if (!canvas || !canvas.getContext) {
    return;
  }
  
  var context = canvas.getContext('2d');
  if (!context || !context.drawImage) {
    return;
  }
  
  var imageFolder = ImageFolder('rory.jpg', canvas);
}, false);
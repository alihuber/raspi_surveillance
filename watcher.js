const sane          = require('sane');
const motionWatcher = sane('/home/pi/motion', { glob: ['**/*.jpg'] });
const snapWatcher   = sane('/home/pi/motion', { glob: ['**/lastsnap.jpg'] });
const stamp         = '/home/pi/motion/stamp.txt';
const snapPath      = "/home/pi/motion/lastsnap.jpg";
const fs            = require('fs');
const Dropbox       = require('dropbox');
const email         = require('emailjs');
const server        = email.server.connect({
   user:     process.env.EMAIL,
   password: process.env.EMAIL_PW,
   host:     process.env.EMAIL_HOST,
   port:     "25",
   tls:      true
});

const emailImage = (fullPath, fileName) => {
  console.log("");
  console.log("******************************");
  console.log("Sending E-Mail with image file: " + fileName);
  fs.readFile(fullPath, function(err, cont) {
    const message = {
      text:    "intruder detected, image attached", 
      from:    process.env.EMAIL,
      to:      process.env.EMAIL,
      subject: "intruder alert",
      attachment: 
      [
          {data: cont, alternative: false},
          {path: fullPath, type: "image/jpeg", name: fileName}
      ]
    };
    server.send(message, function(err, message) {
      if(err) {
        console.log("error sending e-mail");
        console.log(err);
        console.log("******************************");
        console.log("");
      }
    });
    console.log("******************************");
    console.log("");
  });
};

const uploadImage = (fullPath, fileName) => {
    const dbx = new Dropbox({ accessToken: process.env.DBX_TOKEN });
    console.log("");
    console.log("******************************");
    console.log("Uploading image file: " + fileName);
    fs.readFile(fullPath, function(err, cont) {
      dbx.filesUpload({path: '/camera/' + fileName, contents: cont})
        .then(function(response) {
          console.log("file uploaded");
          console.log("******************************");
          console.log("");
        })
        .catch(function(error) {
          console.log("error uploading file");
          console.error(error);
          console.log("******************************");
          console.log("");
        });
    });
    return false;
};

module.exports.watch = () => {
  motionWatcher.on('add', function (filepath, root, stat) {
    fs.readFile(stamp, function(err, cont){
      var timeStamp = new Date(parseInt(cont)).getTime();
      if(Date.now() > timeStamp + 30000) {
        console.log('file added: ', filepath);
        const fullPath = "/home/pi/motion/" + filepath;
        if(!filepath.includes("snapshot") && !filepath.includes("lastsnap")) {
          emailImage(fullPath, filepath);
        }
      }
    });
  });

  const buildFileName = () => {
      var dateObj      = new Date();
      var isoDateArray = dateObj.toLocaleDateString().split("/");
      var date         =
        isoDateArray[1] + "-" + isoDateArray[0] + "-" + isoDateArray[2];
      var time         = dateObj.toTimeString().split(" ")[0].replace(/:/g, "-");
      return date + "--" + time + ".jpg";
  };

  snapWatcher.on('change', function (filepath, root, stat) {
    // wait to prevent file link errors
    setTimeout(function() {
      console.log('snapshot changed: ', filepath);
      uploadImage(snapPath, buildFileName());
    }, 1000);
  });

  snapWatcher.on('add', function (filepath, root, stat) {
    // wait to prevent file link errors
    setTimeout(function() {
      console.log('snapshot added: ', filepath);
      uploadImage(snapPath, buildFileName());
    }, 1000);
  });
};

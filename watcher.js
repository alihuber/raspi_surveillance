const sane          = require("sane");
const Dropbox       = require("dropbox");
const email         = require("emailjs");
const fs            = require("fs");
const os            = require("os");

const motionWatcher = sane("/home/pi/motion", { glob: ["**/*.jpg"] });
const snapWatcher   = sane("/home/pi/motion", { glob: ["**/lastsnap.jpg"] });
const stamp         = "/home/pi/motion/stamp.txt";
const snapPath      = "/home/pi/motion/lastsnap.jpg";

const server        = email.server.connect({
  user: process.env.EMAIL,
  password: process.env.EMAIL_PW,
  host: process.env.EMAIL_HOST,
  port: "25",
  tls: true,
});

const emailImage = (fullPath, fileName) => {
  console.log("");
  console.log("******************************");
  console.log(`Sending E-Mail with image file: ${fileName}`);
  fs.readFile(fullPath, (err, cont) => {
    const message = {
      text: "intruder detected, image attached",
      from: process.env.EMAIL,
      to: process.env.EMAIL,
      subject: "intruder alert",
      attachment:
      [
        { data: cont, alternative: false },
        { path: fullPath, type: "image/jpeg", name: fileName },
      ],
    };
    server.send(message, () => {
      if (err) {
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
  console.log(`Uploading image file: ${fileName}`);
  fs.readFile(fullPath, (err, cont) => {
    dbx.filesUpload({ path: `/camera/${fileName}`, contents: cont })
      .then(() => {
        console.log("file uploaded");
        console.log("******************************");
        console.log("");
      })
      .catch((error) => {
        console.log("error uploading file");
        console.error(error);
        console.log("******************************");
        console.log("");
      });
  });
  return false;
};

module.exports.watch = () => {
  motionWatcher.on("add", (filepath) => {
    fs.readFile(stamp, (err, cont) => {
      const timeStamp = new Date(parseInt(cont, 10)).getTime();
      if (Date.now() > timeStamp + 30000) {
        console.log("file added: ", filepath);
        const fullPath = `/home/pi/motion/${filepath}`;
        if (!filepath.includes("snapshot") && !filepath.includes("lastsnap")) {
          emailImage(fullPath, filepath);
        }
      }
    });
  });

  const buildFileName = () => {
    const dateObj = new Date();
    const date    = dateObj.toLocaleDateString();
    const time    = dateObj.toTimeString().split(" ")[0].replace(/:/g, "-");
    return `${os.hostname()} -- ${date} -- ${time}.jpg`;
  };

  snapWatcher.on("change", (filepath) => {
    // wait to prevent file link errors
    setTimeout(() => {
      console.log("snapshot changed: ", filepath);
      uploadImage(snapPath, buildFileName());
    }, 1000);
  });

  snapWatcher.on("add", (filepath) => {
    // wait to prevent file link errors
    setTimeout(() => {
      console.log("snapshot added: ", filepath);
      uploadImage(snapPath, buildFileName());
    }, 1000);
  });
};
